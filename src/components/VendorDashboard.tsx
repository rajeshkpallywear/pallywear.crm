import React, { useState, useEffect } from 'react';
import { Truck, Package, Clock, FileText, Upload, X, IndianRupee, FileCheck2, ShieldCheck } from 'lucide-react';
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
        // Filter expenses matching this vendor's name or show all vendor records if they match user name/email
        const vendorNameFilter = user?.name || '';
        const allExpenses = data.expenses || [];
        const filtered = allExpenses.filter((e: Expense) => 
          !vendorNameFilter || 
          e.vendorName.toLowerCase().includes(vendorNameFilter.toLowerCase()) ||
          vendorNameFilter.toLowerCase().includes(e.vendorName.toLowerCase())
        );
        // Fallback: If filtered is empty and user matches admin/ceo, show all vendor expenses, otherwise show all vendor expenses for demo
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
      // First delete the old expense record to replace it, or update it
      // Let's call POST expenses with same ID but with the billFile attached (POST handles INSERT or UPDATE)
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
  const pendingInvoices = expenses.filter(e => !e.billFile).length;
  const completedInvoices = expenses.filter(e => e.billFile).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Vendor Dashboard</h2>
          <p className="text-gray-500 mt-1">Submit invoice copies, upload delivery bills, and track supplier receipts</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck size={16} /> Verified Supplier
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Orders</p>
            <p className="text-3xl font-black text-gray-900 mt-1">{expenses.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <IndianRupee size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outstanding Bill Value</p>
            <p className="text-3xl font-black text-red-600 mt-1">₹{totalSpent.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
            <FileCheck2 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Submitted Bills</p>
            <p className="text-3xl font-black text-green-600 mt-1">{completedInvoices} / {expenses.length}</p>
          </div>
        </div>
      </div>

      {/* Main Vendor List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden", uploadingExpense ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Assigned Purchase Orders</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400">Loading purchase orders...</div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No purchase orders assigned to you yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Product Details</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Qty</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Colour / Size</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Bill Amount</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order Date</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Invoice copy</th>
                    <th className="px-5 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp, i) => (
                    <tr key={exp.id} className={cn("border-b border-gray-50 hover:bg-gray-50/30 transition-colors", i % 2 === 0 ? 'bg-white' : 'bg-gray-50/10')}>
                      <td className="px-5 py-4">
                        <p className="font-bold text-gray-900">{exp.productName}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-mono mt-0.5">{exp.vendorName}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-700 font-semibold">{exp.qty || '—'}</td>
                      <td className="px-5 py-4 text-gray-600 text-xs">{[exp.colour, exp.size].filter(Boolean).join(' / ') || '—'}</td>
                      <td className="px-5 py-4 font-bold text-gray-900">₹{Number(exp.amount).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4 text-gray-500 font-mono text-xs">{exp.date}</td>
                      <td className="px-5 py-4">
                        {exp.billFile ? (
                          <button onClick={() => setViewingBill(exp.billFile!)} className="flex items-center gap-1 text-emerald-600 hover:underline text-xs font-semibold">
                            <FileText size={14} /> View Invoice
                          </button>
                        ) : (
                          <span className="text-red-500 font-semibold text-xs flex items-center gap-1">
                            <Clock size={12} /> Pending Upload
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => {
                            setUploadingExpense(exp);
                            setBillFile(exp.billFile || '');
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                            exp.billFile 
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "bg-brand-primary text-white hover:opacity-90 shadow-md shadow-brand-primary/20"
                          )}
                        >
                          {exp.billFile ? 'Update Bill' : 'Upload Bill'}
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
          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 space-y-4 h-fit">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900">Attach Invoice</h3>
              <button onClick={() => setUploadingExpense(null)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-black tracking-widest">Product</p>
              <p className="font-bold text-gray-900">{uploadingExpense.productName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-black tracking-widest">Bill Amount</p>
              <p className="font-black text-red-600 text-lg">₹{Number(uploadingExpense.amount).toLocaleString('en-IN')}</p>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Select Invoice Image/PDF</label>
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-2xl border-2 border-dashed border-gray-200 hover:border-brand-primary/40 cursor-pointer transition-colors text-sm text-gray-500 bg-gray-50/50">
                  <Upload size={24} className="text-gray-400 mb-1" />
                  {billFile ? (
                    <span className="text-emerald-600 font-bold text-center">
                      Invoice File Attached ✓
                      <span className="block text-[10px] text-gray-400 font-normal mt-1">Ready to submit</span>
                    </span>
                  ) : (
                    <span className="text-center">
                      Click to choose file
                      <span className="block text-[10px] text-gray-400 font-normal mt-1">JPG, PNG or PDF (Max 5MB)</span>
                    </span>
                  )}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleBillUpload} />
                </label>
                {billFile && (
                  <button type="button" onClick={() => setBillFile('')} className="text-xs text-red-500 hover:text-red-700 mt-2 flex items-center gap-1 mx-auto">
                    <X size={12} /> Remove Attachment
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !billFile}
                  className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-brand-primary/20"
                >
                  Submit Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setUploadingExpense(null)}
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200"
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
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewingBill(null)}>
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">Invoice Copy</h3>
              <button onClick={() => setViewingBill(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-4">
              {viewingBill.startsWith('data:image') ? (
                <img src={viewingBill} alt="Invoice" className="w-full rounded-xl" />
              ) : (
                <iframe src={viewingBill} className="w-full h-96 rounded-xl" title="Invoice PDF" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
