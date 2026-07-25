import React, { useState, useEffect } from 'react';
import { Truck, Package, Clock, FileText, Upload, X, IndianRupee, FileCheck2, ShieldCheck, Phone, Users, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface Expense {
  id: string;
  vendorName: string;
  productName: string;
  qty: string;
  colour: string;
  size: string;
  amount: number;
  date: string;
  billFile?: string;
  notes?: string;
  createdAt: number;
}

interface VendorDashboardProps {
  user: any;
}

import { getApiBaseUrl } from '../lib/apiConfig';

const API_BASE = getApiBaseUrl() + '/api';

export default function VendorDashboard({ user }: VendorDashboardProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingExpense, setUploadingExpense] = useState<Expense | null>(null);
  const [billFile, setBillFile] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingBill, setViewingBill] = useState<string | null>(null);

  const fetchVendorExpenses = async () => {
    try {
      const res = await fetch(`${API_BASE}/expenses?type=vendor`);
      const data = await res.json();
      if (data.success) {
        const vendorNameFilter = user?.name || '';
        const allExpenses = data.expenses || [];
        const filtered = allExpenses.filter((e: Expense) => 
          !vendorNameFilter || 
          e.vendorName.toLowerCase().includes(vendorNameFilter.toLowerCase()) ||
          vendorNameFilter.toLowerCase().includes(e.vendorName.toLowerCase())
        );
        setExpenses(filtered.length > 0 ? filtered : allExpenses);
      }
    } catch (e) {
      console.error('Failed to fetch vendor expenses', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorExpenses();
  }, [user]);

  const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File too large. Max 5MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setBillFile(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingExpense || !billFile) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...uploadingExpense,
          billFile
        }),
      });
      const data = await res.json();
      if (data.success) {
        setUploadingExpense(null);
        setBillFile('');
        fetchVendorExpenses();
      } else {
        alert('Failed to upload bill.');
      }
    } catch (e) {
      alert('Error uploading file.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const completedInvoices = expenses.filter(e => e.billFile).length;

  return (
    <div className="bg-[#0B0F19] text-slate-100 p-6 rounded-[2.5rem] border border-slate-900 shadow-2xl space-y-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.25em] block mb-1">Pallywear CRM Portal</span>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Vendor & Vendor & User Management</h2>
        </div>
        <div className="flex items-center gap-2.5 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-2xl border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck size={16} /> Verified Supplier
        </div>
      </div>

      {/* Mockup Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-[#131B2E]/70 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Team Call Data (Today)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shadow-inner">
              <Phone size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight text-white">Team</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +10.0%
            </span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-[#131B2E]/70 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg. Call Time</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-inner">
              <Clock size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight text-white">3:15</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +3.3%
            </span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-[#131B2E]/70 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vendor Delivery Score</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-inner">
              <Truck size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight text-white">92.5%</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +4.1%
            </span>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-[#131B2E]/70 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Team Users</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shadow-inner">
              <Users size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight text-white">28</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +12%
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="lg:col-span-2 bg-[#131B2E]/50 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Team Call & Performance Timeline</h4>
            <span className="text-[9px] font-bold text-slate-400 bg-slate-850 px-2 py-0.5 rounded uppercase">Last 30 Days</span>
          </div>
          <div className="relative pt-4">
            <svg className="w-full h-40" viewBox="0 0 500 150">
              <defs>
                <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#1e293b" strokeDasharray="3 3" />
              
              <path d="M 0 120 Q 80 130 150 70 T 300 90 T 450 30 T 500 45 L 500 150 L 0 150 Z" fill="url(#glowGrad)" />
              <path d="M 0 120 Q 80 130 150 70 T 300 90 T 450 30 T 500 45" fill="none" stroke="#10B981" strokeWidth="3" />
              <circle cx="150" cy="70" r="4" fill="#10B981" stroke="#fff" strokeWidth="2" />
              <circle cx="300" cy="90" r="4" fill="#10B981" stroke="#fff" strokeWidth="2" />
              <circle cx="450" cy="30" r="4" fill="#10B981" stroke="#fff" strokeWidth="2" />
            </svg>
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pt-2 px-1">
              <span>Jan 6</span>
              <span>Jan 10</span>
              <span>Jan 15</span>
              <span>Jan 20</span>
              <span>Jan 25</span>
            </div>
          </div>
        </div>

        {/* Gauge Chart */}
        <div className="bg-[#131B2E]/50 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Vendor Performance Timeline</h4>
          </div>
          
          <div className="relative w-32 h-32 mx-auto flex items-center justify-center my-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#1e293b" strokeWidth="8" fill="transparent" />
              <circle cx="50" cy="50" r="40" stroke="#3b82f6" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset="65" />
              
              <circle cx="50" cy="50" r="31" stroke="#1e293b" strokeWidth="6" fill="transparent" />
              <circle cx="50" cy="50" r="31" stroke="#10b981" strokeWidth="6" fill="transparent" strokeDasharray="194.7" strokeDashoffset="45" />
              
              <circle cx="50" cy="50" r="22" stroke="#1e293b" strokeWidth="4" fill="transparent" />
              <circle cx="50" cy="50" r="22" stroke="#f59e0b" strokeWidth="4" fill="transparent" strokeDasharray="138.2" strokeDashoffset="35" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-black text-white">92.5%</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Overall</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 text-[9px] font-black uppercase text-slate-400 tracking-wider">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Repeat
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> New
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> VIP
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent CRM Activity Feed */}
        <div className="bg-[#131B2E]/50 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-900 pb-3">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Recent CRM Activity Feed</h4>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            <div className="flex gap-3 items-start text-xs border-b border-slate-900 pb-3">
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-white">John S. abandoned a 120 cart</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Abandoned 5 days ago</p>
              </div>
            </div>
            <div className="flex gap-3 items-start text-xs border-b border-slate-900 pb-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-white">Sarah M. submitted support ticket</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Submitted 6 days ago</p>
              </div>
            </div>
            <div className="flex gap-3 items-start text-xs border-b border-slate-900 pb-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <div>
                <p className="font-bold text-white">Telecarers updated agent records</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Synchronized 1 hour ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Activity & Purchase Orders */}
        <div className={cn("bg-[#131B2E]/50 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl space-y-4", uploadingExpense ? "lg:col-span-1" : "lg:col-span-2")}>
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Vendor Activity & Agent Performance</h4>
            <div className="text-[10px] font-black text-slate-400 bg-slate-900 px-3 py-1 rounded-xl">
              Value: ₹{totalSpent.toLocaleString('en-IN')}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">Loading purchase orders...</div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No purchase orders assigned.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 uppercase font-black text-[9px] tracking-wider border-b border-slate-800">
                    <th className="pb-3 px-2">Product Info</th>
                    <th className="pb-3 px-2">Size/Color</th>
                    <th className="pb-3 px-2">Qty</th>
                    <th className="pb-3 px-2">Value</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#1E294B]/20 transition-all">
                      <td className="py-3 px-2">
                        <p className="font-bold text-white">{exp.productName}</p>
                        <p className="text-[8px] font-mono text-slate-400 uppercase mt-0.5">{exp.vendorName}</p>
                      </td>
                      <td className="py-3 px-2 text-slate-300 font-semibold">{[exp.colour, exp.size].filter(Boolean).join(' / ') || '—'}</td>
                      <td className="py-3 px-2 text-slate-300 font-semibold">{exp.qty || '—'}</td>
                      <td className="py-3 px-2 text-white font-black">₹{Number(exp.amount).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-2">
                        {exp.billFile ? (
                          <button onClick={() => setViewingBill(exp.billFile!)} className="flex items-center gap-1 text-emerald-400 hover:underline text-[10px] font-bold bg-transparent border-none cursor-pointer">
                            <FileText size={12} /> View Invoice
                          </button>
                        ) : (
                          <span className="text-red-400 font-bold text-[10px] flex items-center gap-1">
                            <Clock size={10} /> Staged
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          onClick={() => {
                            setUploadingExpense(exp);
                            setBillFile(exp.billFile || '');
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border-none cursor-pointer",
                            exp.billFile 
                              ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                              : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/10"
                          )}
                        >
                          {exp.billFile ? 'Update' : 'Attach'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upload Bill Side Panel */}
        {uploadingExpense && (
          <div className="bg-[#131B2E]/90 border border-slate-800/80 rounded-[2rem] p-6 shadow-2xl space-y-4 h-fit">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white uppercase text-xs tracking-wider">Attach Invoice Copy</h3>
              <button onClick={() => setUploadingExpense(null)} className="text-slate-400 hover:text-white bg-transparent border-none text-lg">×</button>
            </div>
            <div>
              <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Product</p>
              <p className="font-bold text-white text-xs">{uploadingExpense.productName}</p>
            </div>
            <div>
              <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Bill Amount</p>
              <p className="font-black text-red-400 text-base">₹{Number(uploadingExpense.amount).toLocaleString('en-IN')}</p>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Select Invoice Image/PDF</label>
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-2xl border border-dashed border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-colors text-xs text-slate-400 bg-slate-950/40">
                  <Upload size={20} className="text-slate-400 mb-1" />
                  {billFile ? (
                    <span className="text-emerald-400 font-bold text-center">
                      Invoice File Attached ✓
                      <span className="block text-[8px] text-slate-400 font-normal mt-1">Ready to submit</span>
                    </span>
                  ) : (
                    <span className="text-center">
                      Click to choose file
                      <span className="block text-[8px] text-slate-400 font-normal mt-1">JPG, PNG or PDF (Max 5MB)</span>
                    </span>
                  )}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleBillUpload} />
                </label>
                {billFile && (
                  <button type="button" onClick={() => setBillFile('')} className="text-[9px] text-red-400 hover:text-red-500 mt-2 flex items-center gap-1 mx-auto bg-transparent border-none cursor-pointer">
                    <X size={10} /> Remove Attachment
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !billFile}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 border-none cursor-pointer"
                >
                  Submit Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setUploadingExpense(null)}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-[10px] uppercase border-none cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Bill Viewer Modal */}
      {viewingBill && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setViewingBill(null)}>
          <div className="relative max-w-2xl w-full bg-[#131B2E] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-900 bg-slate-950/40">
              <h3 className="font-black text-white uppercase text-sm">Invoice Copy</h3>
              <button onClick={() => setViewingBill(null)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 bg-transparent border-none cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6">
              {viewingBill.startsWith('data:image') ? (
                <img src={viewingBill} alt="Invoice" className="w-full rounded-2xl max-h-[60vh] object-contain" />
              ) : (
                <iframe src={viewingBill} className="w-full h-96 rounded-2xl border-none" title="Invoice PDF" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
