/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Upload,
  X,
  ChevronRight,
  FileText,
  CreditCard,
  Download,
  IndianRupee,
  Search,
  Calendar,
  Layers
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getApiBaseUrl } from '../lib/apiConfig';
import FileUpload from './FileUpload';

const API_BASE = getApiBaseUrl() + '/api';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const EXPENSE_CATEGORIES = [
  { id: 'asset', label: 'Asset', icon: '💼', color: '#3b82f6' },
  { id: 'e_setup', label: 'E-Setup', icon: '⚡', color: '#eab308' },
  { id: 'load_emi', label: 'Load EMI', icon: '🏦', color: '#ec4899' },
  { id: 'porter', label: 'Porter', icon: '🚚', color: '#f97316' },
  { id: 'digitizer_tailor', label: 'Digitizer & Tailor', icon: '✂️', color: '#8b5cf6' },
  { id: 'travel_expenses', label: 'Travel Expenses', icon: '✈️', color: '#06b6d4' },
  { id: 'staff_welfare', label: 'Staff Welfare', icon: '🍎', color: '#10b981' },
  { id: 'production_consumables', label: 'Production Consumables', icon: '🧪', color: '#f43f5e' },
  { id: 'bank_charges', label: 'Bank Charges', icon: '💳', color: '#6366f1' },
  { id: 'food_expenses', label: 'Food Expenses', icon: '🍔', color: '#d946ef' },
  { id: 'sample', label: 'Sample', icon: '🎁', color: '#14b8a6' },
  { id: 'stationary', label: 'Stationary', icon: '✏️', color: '#84cc16' },
  { id: 'production_expenses', label: 'Production Expenses', icon: '🏭', color: '#a855f7' },
  { id: 'bde_expenses', label: 'BDE Expenses', icon: '📈', color: '#f59e0b' },
  { id: 'renovation_expenses', label: 'Renovation Expenses', icon: '🛠️', color: '#6b7280' },
];

interface Expense {
  id: string;
  type: string;
  vendorName?: string;
  productName?: string;
  amount: number;
  date: string;
  billFile?: string;
  notes?: string;
  recipientName?: string;
  month?: string;
  userName: string;
  createdAt: number;
}

interface ExpensesHubProps {
  user: any;
}

export default function ExpensesHub({ user }: ExpensesHubProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('asset');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billFile, setBillFile] = useState<string>('');
  const [billFileName, setBillFileName] = useState<string>('');

  const [form, setForm] = useState({
    productName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    recipientName: '',
    month: MONTHS[new Date().getMonth()],
  });

  const activeCategory = EXPENSE_CATEGORIES.find(c => c.id === activeCategoryId) || EXPENSE_CATEGORIES[0];

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/expenses?type=${activeCategoryId}`);
      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
      }
    } catch (e) {
      console.error('Failed to fetch expenses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    setShowForm(false);
    setBillFile('');
    setBillFileName('');
  }, [activeCategoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) {
      alert('Please enter an amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const id = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const body = {
        id,
        type: activeCategoryId,
        userId: user?.uid || user?.id || 'unknown',
        userName: user?.name || 'Unknown',
        productName: form.productName,
        amount: parseFloat(form.amount) || 0,
        date: form.date,
        billFile: billFile || null,
        notes: form.notes || null,
        recipientName: form.recipientName || null,
        month: form.month || null,
      };

      const res = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setForm({
          productName: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
          recipientName: '',
          month: MONTHS[new Date().getMonth()],
        });
        setBillFile('');
        setBillFileName('');
        setShowForm(false);
        fetchExpenses();
        alert('Expense saved successfully to database.');
      } else {
        alert('Failed to save expense.');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
      setExpenses(ex => ex.filter(e => e.id !== id));
      alert('Expense record deleted.');
    } catch (e) {
      console.error(e);
      alert('Delete failed.');
    }
  };

  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left">
      {/* Category sub-sidebar */}
      <div className="lg:col-span-1 bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Layers className="text-brand-primary" size={18} />
          <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest">Expense Categories</h3>
        </div>

        <div className="space-y-1.5 max-h-[75vh] overflow-y-auto pr-1">
          {EXPENSE_CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategoryId(category.id)}
              className={cn(
                "w-full text-left px-3.5 py-3 rounded-xl border transition-all flex items-center justify-between font-bold text-xs cursor-pointer",
                activeCategoryId === category.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]"
                  : "bg-white border-gray-100 text-gray-700 hover:border-gray-300"
              )}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-base">{category.icon}</span>
                <span>{category.label}</span>
              </div>
              <ChevronRight size={14} className="opacity-50" />
            </button>
          ))}
        </div>
      </div>

      {/* Main workspace */}
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-50 pb-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1 font-bold">
                <span>Expenses Hub</span>
                <ChevronRight size={14} />
                <span className="font-extrabold uppercase tracking-wider" style={{ color: activeCategory.color }}>
                  {activeCategory.label}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{activeCategory.label} Ledger</h2>
              <p className="text-gray-500 text-xs font-medium mt-0.5">Upload PDFs and track details for {activeCategory.label}.</p>
            </div>

            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2.5 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer border-none"
              style={{ backgroundColor: activeCategory.color }}
            >
              {showForm ? <X size={14} /> : <Plus size={14} />}
              <span>{showForm ? 'Cancel Entry' : 'Add Expense'}</span>
            </button>
          </div>

          {/* Form */}
          <AnimatePresence>
            {showForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="bg-gray-50 p-6 rounded-2xl border border-gray-150 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Expense Name / Item Details</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Server hosting, travel allowance, tailor setup..."
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      value={form.productName}
                      onChange={e => setForm({ ...form, productName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Amount (INR)</label>
                    <input
                      type="number"
                      required
                      step="any"
                      placeholder="e.g. 5000"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Recipient / Vendor Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh, AWS, Blue Dart..."
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      value={form.recipientName}
                      onChange={e => setForm({ ...form, recipientName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Date</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Notes / Remarks</label>
                  <textarea
                    rows={3}
                    placeholder="Enter additional remarks or reasons..."
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold focus:ring-1 focus:ring-slate-900 focus:border-slate-900 resize-none"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                {/* PDF bill uploader */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Upload Billing PDF Receipt / File</label>
                  <FileUpload
                    label=""
                    accept=".pdf"
                    maxFiles={1}
                    onFilesSelected={(files) => {
                      if (files && files[0]) {
                        setBillFile(files[0]);
                        setBillFileName("bill_attachment.pdf");
                      }
                    }}
                  />
                  {billFile && (
                    <div className="flex justify-between items-center text-[10px] bg-white p-2 rounded-xl border border-gray-200 mt-2 font-bold font-mono">
                      <span className="truncate text-slate-800 flex items-center gap-1">
                        <FileText size={12} className="text-red-500" />
                        {billFileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setBillFile('');
                          setBillFileName('');
                        }}
                        className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all border-none cursor-pointer"
                  style={{ backgroundColor: activeCategory.color }}
                >
                  {isSubmitting ? 'Saving expense...' : 'Save Expense Entry'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Aggregate Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-150/40 text-left">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Total Entries</span>
              <p className="text-2xl font-black text-slate-900">{expenses.length}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-gray-150/40 text-left">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Aggregate Expense</span>
              <p className="text-2xl font-black text-slate-900" style={{ color: activeCategory.color }}>
                ₹{totalAmount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* List/Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Saved ledger records</h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400 animate-pulse">Loading ledger...</div>
            ) : expenses.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-gray-150">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Name / Details</th>
                      <th className="px-5 py-3">Recipient</th>
                      <th className="px-5 py-3 font-right text-right">Amount</th>
                      <th className="px-5 py-3 text-center">Receipt</th>
                      <th className="px-5 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-slate-700">
                    {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 font-bold">{new Date(exp.date).toLocaleDateString()}</td>
                        <td className="px-5 py-3.5">
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{exp.productName}</div>
                            {exp.notes && <div className="text-[10px] text-gray-400 font-medium italic mt-0.5">{exp.notes}</div>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-600">{exp.recipientName || '—'}</td>
                        <td className="px-5 py-3.5 text-right font-black text-slate-900 text-xs">₹{exp.amount.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-center">
                          {exp.billFile ? (
                            <a
                              href={exp.billFile}
                              download={`receipt_${exp.type}_${exp.id}`}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[9px] font-black uppercase inline-flex items-center gap-1 border border-red-200 transition-colors"
                            >
                              <Download size={10} /> PDF
                            </a>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">No file</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg border-none bg-transparent cursor-pointer transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center text-xs text-gray-400">
                No ledger records saved for this expense category yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
