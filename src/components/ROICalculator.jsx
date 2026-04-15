import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip as ChartTooltip, 
  Legend 
} from 'chart.js';
import { ChevronRight, ChevronLeft, Download, Building2, MonitorSmartphone, Clock, Users, CheckCircle, Presentation } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import emailjs from 'emailjs-com';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

// Animated Counter Component
const CountUp = ({ end, duration = 2000, prefix = "", suffix = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      const easeOut = 1 - Math.pow(1 - percentage, 4);
      setCount(Math.floor(end * easeOut));

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <>{prefix}{count.toLocaleString()}{suffix}</>;
};

const ROICalculator = () => {
  const [step, setStep] = useState(1);
  
  // 1. Multi-step State
  const [formData, setFormData] = useState({
    employees: 50,
    industry: '',
    softwareCosts: {
      accounting: 0,
      crm: 0,
      inventory: 0,
      ecommerce: 0,
      hr: 0,
      other: 0
    },
    manualHours: {
      dataEntry: 10,
      reporting: 5,
      inventory: 5,
      admin: 10
    },
    hourlyRate: 27,
    leadInfo: {
      name: '',
      email: '',
      company: ''
    }
  });

  const handleInputChange = (field, value, category = null) => {
    setFormData(prev => {
      if (category) {
        return { ...prev, [category]: { ...prev[category], [field]: Number(value) } };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleLeadChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      leadInfo: { ...prev.leadInfo, [field]: value }
    }));
  };

  const nextStep = () => {
    if (step < 6) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // 2. Exact Calculations
  const softwareMonthly = Object.values(formData.softwareCosts).reduce((a, b) => a + Number(b), 0);
  const currentSoftwareCost = softwareMonthly * 12; // Annualize 

  const manualHours = Object.values(formData.manualHours).reduce((a, b) => a + Number(b), 0);
  const currentLabourCost = manualHours * formData.hourlyRate * 52;
  
  const totalCurrentCost = currentSoftwareCost + currentLabourCost;

  const odooEnterpriseAnnual = (Math.min(formData.employees, 50) * 28 * 12) + 3000;
  const savingsCommunity = (currentSoftwareCost - 3000) + (currentLabourCost * 0.7);
  
  // Derive enterprise savings properly:
  // Assuming Enterprise saves 70% of labour, same as Community logic.
  // And costs odooEnterpriseAnnual instead of Current Software. 
  const savingsEnterprise = totalCurrentCost - (odooEnterpriseAnnual + (currentLabourCost * 0.3));
  
  const paybackPeriod = savingsEnterprise > 0 ? (3000 / (savingsEnterprise / 12)).toFixed(1) : 0;

  // Chart
  const chartData = {
    labels: ['Current Setup', 'Odoo Community', 'Odoo Enterprise'],
    datasets: [
      {
        label: 'Software Cost ($)',
        data: [currentSoftwareCost, 3000, odooEnterpriseAnnual],
        backgroundColor: '#1F4E79',
      },
      {
        label: 'Labour Cost ($)',
        data: [currentLabourCost, currentLabourCost * 0.3, currentLabourCost * 0.3],
        backgroundColor: '#2E75B6',
      }
    ]
  };

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { stacked: true },
      y: { stacked: true }
    },
    plugins: {
      legend: { position: 'top' }
    }
  };

  // 4. Functions
  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("BytechSol ROI Calculator - Executive Summary", 14, 22);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Company Name: ${formData.leadInfo.company || 'N/A'}`, 14, 32);
    doc.text(`Contact: ${formData.leadInfo.name || 'N/A'}`, 14, 40);
    doc.text(`Employees: ${formData.employees}`, 14, 48);
    doc.text(`Industry: ${formData.industry || 'Not Specified'}`, 14, 56);
    
    doc.setFont("helvetica", "bold");
    doc.text("Cost Table Comparison", 14, 70);
    
    autoTable(doc, {
        startY: 75,
        head: [['Metric', 'Current Setup', 'Odoo Community', 'Odoo Enterprise']],
        body: [
            ['Software Cost (Annual)', `$${currentSoftwareCost.toLocaleString()}`, '$3,000', `$${odooEnterpriseAnnual.toLocaleString()}`],
            ['Labour Cost (Annual)', `$${currentLabourCost.toLocaleString()}`, `$${(currentLabourCost * 0.3).toLocaleString()}`, `$${(currentLabourCost * 0.3).toLocaleString()}`],
            ['Total Cost (Annual)', `$${totalCurrentCost.toLocaleString()}`, `$${(3000 + currentLabourCost*0.3).toLocaleString()}`, `$${(odooEnterpriseAnnual + currentLabourCost*0.3).toLocaleString()}`],
            ['Annual Savings', '-', `$${savingsCommunity.toLocaleString()}`, `$${savingsEnterprise.toLocaleString()}`]
        ]
    });
    
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. MUST generate PDF synchronously here before any 'await' 
    // to prevent browsers from stripping the filename (security restriction)
    let pdfSuccess = false;
    try {
        generatePDF();
        pdfSuccess = true;
    } catch (pdfError) {
        console.error("PDF Generation error: ", pdfError);
        alert("Sorry, an error occurred while generating the PDF. Please check the console.");
    }
    
    // Using environment variables (from .env file)
    const MAKE_WEBHOOK_URL = import.meta.env.VITE_MAKE_WEBHOOK_URL; 
    const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    let isOfflineMode = false;

    // Webhook Execution
    if (MAKE_WEBHOOK_URL && MAKE_WEBHOOK_URL !== "place_your_make_webhook_url_here") {
        try {
            await fetch(MAKE_WEBHOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({...formData, savingsCommunity, savingsEnterprise, totalCurrentCost})
            });
        } catch (err) {
            console.error("Webhook failed", err);
        }
    } else {
        isOfflineMode = true;
    }
    
    // EmailJS Execution
    if (EMAILJS_SERVICE_ID && EMAILJS_SERVICE_ID !== "place_your_emailjs_service_id_here") {
        try {
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID, 
                {
                   to_name: formData.leadInfo.name,
                   to_email: formData.leadInfo.email,
                   company: formData.leadInfo.company,
                   savings_enterprise: savingsEnterprise,
                   savings_community: savingsCommunity
                },
                EMAILJS_PUBLIC_KEY
            );
        } catch (err) {
            console.error("EmailJS failed", err);
        }
    } else {
        isOfflineMode = true;
    }
    
    if (pdfSuccess) {
        if (isOfflineMode) {
            alert("Report PDF Opened in New Tab! (Note: API Keys missing in .env, so email was bypassed)");
        } else {
            alert("Report PDF Opened in New Tab & Sent to Data Pipeline!");
        }
    }
  };

  return (
    <div className="w-full max-w-[800px] mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col min-h-[600px]">
      <div className="bg-bytech-primary text-white p-6 relative">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Presentation className="w-6 h-6 text-bytech-bg" />
            <span className="font-bold text-xl tracking-tight">BytechSol</span>
          </div>
          <span className="text-sm font-medium opacity-80 uppercase tracking-wider">ROI Calculator</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-bytech-accent/30 rounded-full h-2 mt-4 overflow-hidden">
          <div 
            className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-2 opacity-80 font-medium">
          <span>Step {step} of 6</span>
          <span>{step === 6 ? 'Done!' : 'Almost there'}</span>
        </div>
      </div>

      <div className="p-6 md:p-8 flex-grow flex flex-col animate-fade-in-up" key={step}>
        
        {step === 1 && (
          <div className="space-y-6 flex-grow">
            <div className="flex items-center gap-3 mb-6 border-b pb-4">
              <div className="p-3 bg-blue-50 text-bytech-primary rounded-lg text-xl"><Building2 /></div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Company Profile</h2>
                <p className="text-gray-500 text-sm">Tell us a bit about your organization.</p>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  Number of Employees: <span className="text-bytech-primary text-lg ml-2">{formData.employees}</span>
                </label>
                <input 
                  type="range" 
                  min="1" max="500" 
                  value={formData.employees} 
                  onChange={(e) => handleInputChange('employees', e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-bytech-primary"
                />
                <div className="flex justify-between text-xs text-gray-400 font-medium">
                  <span>1</span>
                  <span>250</span>
                  <span>500+</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Industry</label>
                <select 
                  className="w-full p-4 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-bytech-accent outline-none transition-all"
                  value={formData.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                >
                  <option value="">Select an industry...</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="retail">Retail & E-commerce</option>
                  <option value="services">Professional Services</option>
                  <option value="software">Software / IT</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 flex-grow">
            <div className="flex items-center gap-3 mb-6 border-b pb-4">
              <div className="p-3 bg-blue-50 text-bytech-primary rounded-lg text-xl"><MonitorSmartphone /></div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Software Stack</h2>
                <p className="text-gray-500 text-sm">Enter your current MONTHLY software costs.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.keys(formData.softwareCosts).map(key => (
                <div key={key} className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {key}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                    <input 
                      type="number"
                      min="0"
                      className="w-full p-3 pl-8 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-bytech-accent outline-none transition-all"
                      value={formData.softwareCosts[key] || ''}
                      onChange={(e) => handleInputChange(key, e.target.value, 'softwareCosts')}
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 flex-grow">
             <div className="flex items-center gap-3 mb-6 border-b pb-4">
              <div className="p-3 bg-blue-50 text-bytech-primary rounded-lg text-xl"><Clock /></div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Manual Effort</h2>
                <p className="text-gray-500 text-sm">Hours spent per week on manual tasks across the team.</p>
              </div>
            </div>

            <div className="space-y-6">
              {[
                { key: 'dataEntry', label: 'Data Entry' },
                { key: 'reporting', label: 'Reporting & Analysis' },
                { key: 'inventory', label: 'Inventory / Resource Mgmt' },
                { key: 'admin', label: 'Other Admin Tasks' }
              ].map(item => (
                <div key={item.key} className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-semibold text-gray-700">{item.label}</label>
                    <span className="bg-white px-3 py-1 rounded-md border text-bytech-primary font-bold shadow-sm">
                      {formData.manualHours[item.key]} hrs
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="40" 
                    value={formData.manualHours[item.key]} 
                    onChange={(e) => handleInputChange(item.key, e.target.value, 'manualHours')}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-bytech-primary"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 flex-grow">
            <div className="flex items-center gap-3 mb-6 border-b pb-4">
              <div className="p-3 bg-blue-50 text-bytech-primary rounded-lg text-xl"><Users /></div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Staff Cost</h2>
                <p className="text-gray-500 text-sm">Help us calculate the monetary value of saved time.</p>
              </div>
            </div>

            <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Average Hourly Rate of Staff performing manual tasks</label>
              <select 
                className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bytech-accent outline-none shadow-sm transition-all"
                value={formData.hourlyRate}
                onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
              >
                <option value="8">Under $10/hr (Under $1,600/mo)</option>
                <option value="15">$10 - $20/hr ($1,600 - $3,200/mo)</option>
                <option value="27">$20 - $35/hr ($3,200 - $5,600/mo)</option>
                <option value="42">$35 - $50/hr ($5,600 - $8,000/mo)</option>
                <option value="60">Over $50/hr (Over $8,000/mo)</option>
              </select>
              <p className="text-xs text-gray-400 mt-4 text-center">We use industry standard midpoints for these ranges to ensure accurate ROI forecasting.</p>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 flex-grow">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Your ROI Projection</h2>
              <p className="text-gray-500 mt-2">See how much you can save with a unified ERP.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
               <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Current Annual Cost</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mt-2 truncate">
                  $<CountUp end={totalCurrentCost} />
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl text-white text-center shadow-lg transform hover:-translate-y-1 transition-all">
                <p className="text-[11px] font-medium text-blue-100 uppercase tracking-wide">Community Savings</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold mt-2 truncate">
                  +$<CountUp end={savingsCommunity > 0 ? savingsCommunity : 0} />
                </p>
              </div>
              <div className="bg-gradient-to-br from-bytech-primary to-bytech-accent p-4 rounded-2xl text-white text-center shadow-lg transform hover:-translate-y-1 transition-all">
                <p className="text-[11px] font-medium text-blue-100 uppercase tracking-wide">Enterprise Savings</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold mt-2 truncate">
                  +$<CountUp end={savingsEnterprise > 0 ? savingsEnterprise : 0} />
                </p>
              </div>
              <div className="bg-emerald-500 p-4 rounded-2xl text-white text-center shadow-lg transform hover:-translate-y-1 transition-all">
                <p className="text-[11px] font-medium text-emerald-100 uppercase tracking-wide">Payback</p>
                <p className="text-2xl font-bold mt-2">
                  <CountUp end={parseFloat(paybackPeriod)} duration={1500} suffix=" Mo" />
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm h-64 mb-2">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6 flex-grow">
             <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 text-bytech-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Get Your ROI Report</h3>
              <p className="text-gray-500 mt-2 text-sm">Enter your details to receive the comprehensive PDF breakdown directly to your inbox.</p>
            </div>
            
            <form className="space-y-4 max-w-sm mx-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                <input required type="text" value={formData.leadInfo.name} onChange={e => handleLeadChange('name', e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bytech-accent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Work Email</label>
                <input required type="email" value={formData.leadInfo.email} onChange={e => handleLeadChange('email', e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bytech-accent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Company</label>
                <input required type="text" value={formData.leadInfo.company} onChange={e => handleLeadChange('company', e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bytech-accent outline-none" />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 py-4 bg-bytech-primary text-white font-bold rounded-xl hover:bg-bytech-accent shadow-md transition-colors flex justify-center items-center gap-2"
                >
                  <Download className="w-5 h-5"/> View Full PDF Report
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Navigation Buttons (Steps 1-5) */}
        {step < 6 && (
          <div className="flex justify-between items-center mt-8 pt-6 border-t font-semibold">
            <button 
              onClick={prevStep}
              disabled={step === 1}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-colors ${step === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            
            <button 
              onClick={nextStep}
              className="flex items-center gap-1 bg-bytech-primary text-white px-6 py-3 rounded-xl hover:bg-bytech-accent focus:ring-4 focus:ring-blue-100 transition-all shadow-md active:scale-95"
            >
              {step === 5 ? 'Finalize & Download' : 'Next Step'} <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
        
        {/* Back button for step 6 */}
        {step === 6 && (
          <div className="flex justify-center mt-6">
            <button 
              onClick={prevStep}
              className="text-gray-500 font-semibold hover:text-gray-800 text-sm"
            >
              Back to Results
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ROICalculator;
