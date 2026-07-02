import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Upload, X, ChevronRight, IndianRupee, FileText } from 'lucide-react';
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
  userName: string;
  createdAt: number;
}

interface VendorExpensePageProps {
  user: any;
}

const API_BASE = '/api';

export default function VendorExpensePage({ user }: VendorExpensePageProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingBill, setViewingBill] = useState<string | null>(null);

  const [form, setForm] = useState({
    vendorName: '',
    productName: '',
    qty: '',
    colour: '',
    size: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    billFile: '',
    notes: '',
  });

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${API_BASE}/expenses?type=vendor`);
      const data = await res.json();
      if (data.success) setExpenses(data.expenses || []);
    } catch (e) {
      console.error('Failed to fetch vendor expenses', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File too large. Max 5MB.'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, billFile: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vendorName || !form.productName || !form.amount) {
      alert('Please fill in all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      const id = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, type: 'vendor',
          userId: user?.uid || user?.id || 'unknown',
          userName: user?.name || 'Unknown',
          ...form,
          amount: parseFloat(form.amount) || 0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ vendorName: '', productName: '', qty: '', colour: '', size: '', amount: '', date: new Date().toISOString().split('T')[0], billFile: '', notes: '' });
        setShowForm(false);
        fetchExpenses();
      } else {
        alert('Failed to save expense.');
      }
    } catch (e) {
      alert('Error saving expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
      setExpenses(ex => ex.filter(e => e.id !== id));
    } catch (e) { alert('Delete failed.'); }
  };

  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <span>Expense</span>
            <ChevronRight size={14} />
            <span className="text-brand-primary font-semibold">Vendor Expense</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Vendor Expenses</h2>
          <p className="text-gray-500 text-sm mt-0.5">Track product purchases from vendors</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all shadow-lg shadow-brand-primary/30"
        >
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Total Records</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{expenses.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Total Spent</p>
          <p className="text-3xl font-black text-red-600 mt-1">₹{totalAmount.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">This Month</p>
          <p className="text-3xl font-black text-gray-900 mt-1">
            ₹{expenses
              .filter(e => e.date?.startsWith(new Date().toISOString().slice(0, 7)))
              .reduce((s, e) => s + Number(e.amount), 0)
              .toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-3xl border-2 border-brand-primary/20 shadow-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Package size={20} className="text-brand-primary" />
            New Vendor Expense
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Vendor Name *</label>
                <input required value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm" placeholder="Vendor / Supplier name" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Product Name *</label>
                <input required value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm" placeholder="e.g. Jersey Fabric" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Quantity</label>
                <input value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm" placeholder="e.g. 50 meters / 100 pcs" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Colour</label>
                <input value={form.colour} onChange={e => setForm(f => ({ ...f, colour: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm" placeholder="e.g. Navy Blue, Red" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Size</label>
                <input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm" placeholder="e.g. S, M, L, XL / 2.5m" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Amount (₹) *</label>
                <input required type="number" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm" placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Date *</label>
                <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Attach Bill</label>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-primary/40 cursor-pointer transition-colors text-sm text-gray-500">
                  <Upload size={16} />
                  {form.billFile ? <span className="text-green-600 font-semibold">Bill attached ✓</span> : 'Upload image or PDF'}
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleBillUpload} />
                </label>
                {form.billFile && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, billFile: '' }))}
                    className="text-xs text-red-500 hover:text-red-700 mt-1 flex items-center gap-1">
                    <X size={12} /> Remove
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm resize-none" placeholder="Additional notes..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isSubmitting}
                className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50">
                {isSubmitting ? 'Saving...' : 'Save Expense'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses List */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center">
          <Package size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-semibold">No vendor expenses recorded yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Expense" to record your first vendor expense</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Vendor</th>
                <th className="text-left px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Product</th>
                <th className="text-left px-4 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Qty</th>
                <th className="text-left px-4 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Colour / Size</th>
                <th className="text-left px-4 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                <th className="text-left px-4 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="text-left px-4 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Bill</th>
                <th className="px-4 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp, i) => (
                <tr key={exp.id} className={cn("border-b border-gray-50 hover:bg-gray-50/50 transition-colors", i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                  <td className="px-5 py-4 font-semibold text-gray-900">{exp.vendorName}</td>
                  <td className="px-5 py-4 text-gray-700">{exp.productName}</td>
                  <td className="px-4 py-4 text-gray-600">{exp.qty || '—'}</td>
                  <td className="px-4 py-4 text-gray-600 text-xs">{[exp.colour, exp.size].filter(Boolean).join(' / ') || '—'}</td>
                  <td className="px-4 py-4 font-bold text-red-600">₹{Number(exp.amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-4 text-gray-500">{exp.date}</td>
                  <td className="px-4 py-4">
                    {exp.billFile ? (
                      <button onClick={() => setViewingBill(exp.billFile!)}
                        className="flex items-center gap-1 text-brand-primary hover:underline text-xs font-semibold">
                        <FileText size={14} /> View
                      </button>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-4">
                    <button onClick={() => handleDelete(exp.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bill Viewer Modal */}
      {viewingBill && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setViewingBill(null)}>
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">Bill / Receipt</h3>
              <button onClick={() => setViewingBill(null)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-4">
              {viewingBill.startsWith('data:image') ? (
                <img src={viewingBill} alt="Bill" className="w-full rounded-xl" />
              ) : (
                <iframe src={viewingBill} className="w-full h-96 rounded-xl" title="Bill PDF" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
