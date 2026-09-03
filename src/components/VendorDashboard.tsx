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
    <div className="bg-white/85 backdrop-blur-md text-gray-800 p-6 rounded-[2.5rem] border border-white/60 shadow-xl space-y-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.25em] block mb-1">Pallywear CRM Portal</span>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Vendor Portal</h2>
        </div>
        <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-200 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck size={16} className="text-emerald-600" /> Verified Supplier
        </div>
      </div>

      {/* Main Vendor Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vendor Activity & Purchase Orders */}
        <div className={cn("bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm space-y-4", uploadingExpense ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Assigned Purchase Orders</h4>
            <div className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-xl">
              Total Value: ₹{totalSpent.toLocaleString('en-IN')}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400">Loading purchase orders...</div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No purchase orders assigned.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-gray-400 uppercase font-black text-[9px] tracking-wider border-b border-gray-200">
                    <th className="pb-3 px-2">Product Info</th>
                    <th className="pb-3 px-2">Size/Color</th>
                    <th className="pb-3 px-2">Qty</th>
                    <th className="pb-3 px-2">Value</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50/50 transition-all">
                      <td className="py-3 px-2">
                        <p className="font-bold text-gray-900">{exp.productName}</p>
                        <p className="text-[8px] font-mono text-gray-400 uppercase mt-0.5">{exp.vendorName}</p>
                      </td>
                      <td className="py-3 px-2 text-gray-600 font-semibold">{[exp.colour, exp.size].filter(Boolean).join(' / ') || '—'}</td>
                      <td className="py-3 px-2 text-gray-600 font-semibold">{exp.qty || '—'}</td>
                      <td className="py-3 px-2 text-gray-900 font-black">₹{Number(exp.amount).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-2">
                        {exp.billFile ? (
                          <button onClick={() => setViewingBill(exp.billFile!)} className="flex items-center gap-1 text-emerald-600 hover:underline text-[10px] font-bold bg-transparent border-none cursor-pointer">
                            <FileText size={12} /> View Invoice
                          </button>
                        ) : (
                          <span className="text-red-500 font-bold text-[10px] flex items-center gap-1">
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
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-250"
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
          <div className="bg-gray-50 border border-gray-200 rounded-[2rem] p-6 shadow-sm space-y-4 h-fit">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="font-black text-gray-900 uppercase text-xs tracking-wider">Attach Invoice Copy</h3>
              <button onClick={() => setUploadingExpense(null)} className="text-gray-400 hover:text-gray-600 bg-transparent border-none text-lg cursor-pointer">×</button>
            </div>
            <div>
              <p className="text-[8px] text-gray-455 uppercase font-black tracking-widest">Product</p>
              <p className="font-bold text-gray-900 text-xs">{uploadingExpense.productName}</p>
            </div>
            <div>
              <p className="text-[8px] text-gray-455 uppercase font-black tracking-widest">Bill Amount</p>
              <p className="font-black text-red-500 text-base">₹{Number(uploadingExpense.amount).toLocaleString('en-IN')}</p>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-4">
              <div>
                <label className="text-[8px] font-black text-gray-455 uppercase tracking-widest block mb-1">Select Invoice Image/PDF</label>
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-2xl border border-dashed border-gray-200 hover:border-emerald-500/40 cursor-pointer transition-colors text-xs text-gray-500 bg-white shadow-xs">
                  <Upload size={20} className="text-gray-400 mb-1" />
                  {billFile ? (
                    <span className="text-emerald-600 font-bold text-center">
                      Invoice File Attached ✓
                      <span className="block text-[8px] text-gray-400 font-normal mt-1">Ready to submit</span>
                    </span>
                  ) : (
                    <span className="text-center text-gray-400">
                      Click to choose file
                      <span className="block text-[8px] text-gray-400 font-normal mt-1">JPG, PNG or PDF (Max 5MB)</span>
                    </span>
                  )}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleBillUpload} />
                </label>
                {billFile && (
                  <button type="button" onClick={() => setBillFile('')} className="text-[9px] text-red-500 hover:text-red-650 mt-2 flex items-center gap-1 mx-auto bg-transparent border-none cursor-pointer">
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
                  className="px-3.5 py-2.5 bg-gray-200 hover:bg-gray-250 text-gray-700 rounded-xl font-black text-[10px] uppercase border-none cursor-pointer"
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewingBill(null)}>
          <div className="relative max-w-2xl w-full bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-black text-gray-900 uppercase text-sm">Invoice Copy</h3>
              <button onClick={() => setViewingBill(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer"><X size={20} /></button>
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
