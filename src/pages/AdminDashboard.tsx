import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import {
  Layout, Bell, Settings, BarChart3,
  Users, Shield, Globe, TrendingUp, DollarSign,
  UserPlus, X, Clock, FileText, CheckCircle2, Mail,
  LogOut, Trash2, Download, ChevronLeft, Menu, Zap, Monitor, Smartphone,
  Edit, Plus, Phone, Flame
} from 'lucide-react';
import InvoiceFormModal from '../components/InvoiceFormModal';
import FileUpload from '../components/FileUpload';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import LeadManager from '../components/LeadManager';
import ProfileSettings from '../components/ProfileSettings';
import Logo from '../components/Logo';
import InvoiceModal from '../components/InvoiceModal';
import OrderDetailModal from '../components/OrderDetailModal';
import { Order, OrderStatus, Invoice } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { mockDataService } from '../service/mockDataService';
import SidebarChat from '../components/SidebarChat';
import { getApiUrl } from '../lib/apiConfig';

const COLORS = ['#3291B6', '#5CBFD4', '#EAF4F7', '#1F2937'];

const MOCK_LOGS = [
  { id: 1, action: 'User added lead', user: 'Mike L.', time: '2 mins ago', details: 'Added lead #TX-882' },
  { id: 2, action: 'Lead status changed', user: 'Sarah K.', time: '15 mins ago', details: 'Lead #TX-882 moved to Hot' },
  { id: 3, action: 'New user joined', user: 'System', time: '1 hour ago', details: 'Jonathan V. registered' },
  { id: 4, action: 'Exported leads', user: 'Mike L.', time: '3 hours ago', details: 'Exported Leads_Report.xlsx' },
];

// ─── Role Revenue Breakdown Sub-component ───────────────────────────────────
export function RoleBreakdown({ mktOrdersRevenue, otOrdersRevenue, mktDeliveredOrders, otDeliveredOrders, mktLeadsForecast, otLeadsForecast, mktLeadsConverted, otLeadsConverted, mktConvertedLeads, otConvertedLeads, mktLeadsCount, otLeadsCount, fmt, userNameMap, addOrder, deleteOrder, addLead, deleteLead }: any) {
  const [drillMode, setDrillMode] = React.useState<null | 'orders' | 'leads'>(null);
  const [orderSearch, setOrderSearch] = React.useState('');
  const [leadSearch, setLeadSearch] = React.useState('');
  const [monthFilter, setMonthFilter] = React.useState('');
  const [dateFilter, setDateFilter] = React.useState('');

  // Add Revenue modal state
  const [showAddRevenue, setShowAddRevenue] = React.useState(false);
  const [savingRevenue, setSavingRevenue] = React.useState(false);
  const [deletingOrderId, setDeletingOrderId] = React.useState<string | null>(null);
  const [manualRevenues, setManualRevenues] = React.useState<any[]>([]);

  // Add Lead Convert modal state
  const [showAddLeadConvert, setShowAddLeadConvert] = React.useState(false);
  const [savingLeadConvert, setSavingLeadConvert] = React.useState(false);
  const [deletingLeadId, setDeletingLeadId] = React.useState<string | null>(null);
  const [manualLeads, setManualLeads] = React.useState<any[]>([]);
  const [leadConvertForm, setLeadConvertForm] = React.useState({
    createdBy: '',
    leadName: '',
    companyName: '',
    leadType: 'Hot',
    convertedValue: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleAddLeadConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadConvertForm.createdBy || !leadConvertForm.convertedValue) {
      alert('Please fill in at least Created By and Converted Value.');
      return;
    }
    setSavingLeadConvert(true);
    try {
      const valAmount = Number(leadConvertForm.convertedValue) || 0;
      const dateTimestamp = leadConvertForm.date ? new Date(leadConvertForm.date).getTime() : Date.now();
      const newLeadData = {
        createdByName: leadConvertForm.createdBy,
        name: leadConvertForm.leadName || 'Manual Lead',
        companyName: leadConvertForm.companyName || '',
        leadType: leadConvertForm.leadType,
        totalOrderValue: valAmount,
        forecastedValue: valAmount,
        status: 'Converted',
        entryDate: leadConvertForm.date,
        createdAt: dateTimestamp,
        updatedAt: Date.now(),
        phone: '',
        email: '',
        address: '',
        notes: 'Admin manual lead convert entry',
        createdBy: '',
      } as any;
      if (addLead) {
        await addLead(newLeadData);
      } else {
        await (window as any).mockDataService?.saveLead(newLeadData);
      }
      const entry = {
        id: `manual-lead-${Date.now()}`,
        createdByName: leadConvertForm.createdBy,
        createdBy: '',
        name: leadConvertForm.leadName || 'Manual Lead',
        companyName: leadConvertForm.companyName,
        leadType: leadConvertForm.leadType,
        totalOrderValue: valAmount,
        entryDate: leadConvertForm.date,
        createdAt: dateTimestamp,
        isManual: true,
      };
      setManualLeads(prev => [entry, ...prev]);
      setLeadConvertForm({ createdBy: '', leadName: '', companyName: '', leadType: 'Hot', convertedValue: '', date: new Date().toISOString().split('T')[0] });
      setShowAddLeadConvert(false);
      setDrillMode('leads');
      alert('Lead Convert Revenue saved to Database!');
    } catch (err: any) {
      console.error('Error saving lead convert to DB:', err);
      alert('Failed to save: ' + (err?.message || 'Unknown error'));
    } finally {
      setSavingLeadConvert(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!leadId || !deleteLead) return;
    if (!window.confirm('Delete this lead convert entry? This cannot be undone.')) return;
    setDeletingLeadId(leadId);
    try {
      await deleteLead(leadId);
      setManualLeads(prev => prev.filter(l => l.id !== leadId));
    } catch (err: any) {
      alert('Failed to delete: ' + (err?.message || 'Unknown error'));
    } finally {
      setDeletingLeadId(null);
    }
  };
  const [revenueForm, setRevenueForm] = React.useState({
    createdBy: '',
    client: '',
    category: '',
    status: 'delivery',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleDeleteOrder = async (orderId: string) => {
    if (!orderId || !deleteOrder) return;
    if (!window.confirm('Delete this revenue entry? This cannot be undone.')) return;
    setDeletingOrderId(orderId);
    try {
      await deleteOrder(orderId);
      // Also remove from local manual list if it was manual
      setManualRevenues(prev => prev.filter(r => r.id !== orderId));
    } catch (err: any) {
      alert('Failed to delete: ' + (err?.message || 'Unknown error'));
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenueForm.createdBy || !revenueForm.amount) {
      alert('Please fill in at least Created By and Amount.');
      return;
    }

    setSavingRevenue(true);
    try {
      const amountVal = Number(revenueForm.amount) || 0;
      const dateTimestamp = revenueForm.date ? new Date(revenueForm.date).getTime() : Date.now();

      // Construct Order object to save to Database / API
      const newOrderData: Partial<Order> = {
        createdByName: revenueForm.createdBy,
        clientName: revenueForm.client,
        customerInfo: { name: revenueForm.client || 'Client', phone: '', address: '' },
        category: revenueForm.category || 'General',
        status: (revenueForm.status === 'delivery' ? OrderStatus.DELIVERY : revenueForm.status === 'delivered' ? OrderStatus.DELIVERED : OrderStatus.PENDING) as any,
        financials: {
          totalAmount: amountVal,
          advancePay: 0,
          balanceAmount: amountVal
        },
        createdAt: dateTimestamp,
        updatedAt: Date.now()
      };

      if (addOrder) {
        await addOrder(newOrderData);
      } else {
        await mockDataService.createOrder(newOrderData);
      }

      // Also append to local list for immediate visual confirmation
      const entry = {
        id: `manual-${Date.now()}`,
        createdByName: revenueForm.createdBy,
        createdBy: '',
        clientName: revenueForm.client,
        category: revenueForm.category,
        status: revenueForm.status,
        date: revenueForm.date,
        financials: { totalAmount: amountVal },
        isManual: true,
      };
      setManualRevenues(prev => [entry, ...prev]);

      setRevenueForm({ createdBy: '', client: '', category: '', status: 'delivery', amount: '', date: new Date().toISOString().split('T')[0] });
      setShowAddRevenue(false);
      setDrillMode('orders');
      alert('Revenue successfully saved to Database!');
    } catch (err: any) {
      console.error('Error saving revenue to DB:', err);
      alert('Failed to save to Database: ' + (err?.message || 'Unknown error'));
    } finally {
      setSavingRevenue(false);
    }
  };

  const allDeliveredOrders = [...manualRevenues, ...mktDeliveredOrders, ...otDeliveredOrders];
  const allConvertedLeads = [...manualLeads, ...mktConvertedLeads, ...otConvertedLeads];

  // Month / Date Filtering logic
  const matchesMonthAndDate = (itemDateStr?: string, itemCreatedAt?: number) => {
    let dateObj: Date | null = null;
    if (itemDateStr) {
      dateObj = new Date(itemDateStr);
    } else if (itemCreatedAt) {
      dateObj = new Date(itemCreatedAt);
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
      if (monthFilter || dateFilter) return false;
      return true;
    }

    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const itemMonth = `${yyyy}-${mm}`;
    const itemDate = `${yyyy}-${mm}-${dd}`;

    if (monthFilter && itemMonth !== monthFilter && mm !== monthFilter) {
      return false;
    }
    if (dateFilter && itemDate !== dateFilter) {
      return false;
    }
    return true;
  };

  const filteredOrders = allDeliveredOrders.filter(o => {
    const name = (o.createdByName || userNameMap[o.createdBy] || '').toLowerCase();
    const matchesSearch = !orderSearch || name.includes(orderSearch.toLowerCase()) || (o.clientName || '').toLowerCase().includes(orderSearch.toLowerCase());
    const matchesDate = matchesMonthAndDate(o.date, o.createdAt);
    return matchesSearch && matchesDate;
  });

  const filteredLeads = allConvertedLeads.filter(l => {
    const name = (l.createdByName || userNameMap[l.createdBy] || '').toLowerCase();
    const matchesSearch = !leadSearch || name.includes(leadSearch.toLowerCase()) || l.name?.toLowerCase().includes(leadSearch.toLowerCase());
    const matchesDate = matchesMonthAndDate(l.entryDate || l.date, l.createdAt);
    return matchesSearch && matchesDate;
  });

  const inputCls = "w-full text-xs border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all";
  const labelCls = "block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-brand-primary rounded-full" />
        <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Role Revenue Breakdown</h3>
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider ml-1">Marketing vs Online Team</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Orders Revenue Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="border-b border-gray-50 pb-3 flex items-start justify-between">
            <div>
              <p className="text-xs font-black text-gray-800">Orders Revenue</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">Delivered orders only</p>
            </div>
            <button onClick={() => setDrillMode(drillMode === 'orders' ? null : 'orders')} className="text-[9px] font-black text-brand-primary uppercase tracking-wider border border-brand-primary/20 px-2 py-0.5 rounded-lg hover:bg-brand-primary/5 transition-all cursor-pointer bg-transparent">
              {drillMode === 'orders' ? 'Close' : 'View'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-blue-50 text-blue-700 border-blue-100 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1.5">Marketing</p>
              <p className="text-base font-black">{fmt(mktOrdersRevenue)}</p>
              <p className="text-[9px] font-bold opacity-60 mt-0.5">{mktDeliveredOrders.length} delivered</p>
            </div>
            <div className="rounded-xl border bg-emerald-50 text-emerald-700 border-emerald-100 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1.5">Online Team</p>
              <p className="text-base font-black">{fmt(otOrdersRevenue)}</p>
              <p className="text-[9px] font-bold opacity-60 mt-0.5">{otDeliveredOrders.length} delivered</p>
            </div>
          </div>
        </div>

        {/* Leads Forecasted Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="border-b border-gray-50 pb-3">
            <p className="text-xs font-black text-gray-800">Leads Forecasted Value</p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Pipeline forecast from each department</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-indigo-50 text-indigo-700 border-indigo-100 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1.5">Marketing</p>
              <p className="text-base font-black">{fmt(mktLeadsForecast)}</p>
              <p className="text-[9px] font-bold opacity-60 mt-0.5">{mktLeadsCount} leads</p>
            </div>
            <div className="rounded-xl border bg-teal-50 text-teal-700 border-teal-100 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1.5">Online Team</p>
              <p className="text-base font-black">{fmt(otLeadsForecast)}</p>
              <p className="text-[9px] font-bold opacity-60 mt-0.5">{otLeadsCount} leads</p>
            </div>
          </div>
        </div>

        {/* Leads Converted Value Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="border-b border-gray-50 pb-3 flex items-start justify-between">
            <div>
              <p className="text-xs font-black text-gray-800">Leads Converted Value</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">Actual converted revenue from leads</p>
            </div>
            <button onClick={() => setDrillMode(drillMode === 'leads' ? null : 'leads')} className="text-[9px] font-black text-brand-primary uppercase tracking-wider border border-brand-primary/20 px-2 py-0.5 rounded-lg hover:bg-brand-primary/5 transition-all cursor-pointer bg-transparent">
              {drillMode === 'leads' ? 'Close' : 'View'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-violet-50 text-violet-700 border-violet-100 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1.5">Marketing</p>
              <p className="text-base font-black">{fmt(mktLeadsConverted)}</p>
              <p className="text-[9px] font-bold opacity-60 mt-0.5">{mktConvertedLeads.length} converted</p>
            </div>
            <div className="rounded-xl border bg-cyan-50 text-cyan-700 border-cyan-100 p-3">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1.5">Online Team</p>
              <p className="text-base font-black">{fmt(otLeadsConverted)}</p>
              <p className="text-[9px] font-bold opacity-60 mt-0.5">{otConvertedLeads.length} converted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Drill-down: Delivered Orders */}
      {drillMode === 'orders' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-gray-800 uppercase tracking-wider">Delivered Orders — All Staff</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{filteredOrders.length} of {allDeliveredOrders.length} entries shown</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Month Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Month:</span>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={e => setMonthFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer border-none"
                />
                {monthFilter && (
                  <button onClick={() => setMonthFilter('')} className="text-gray-400 hover:text-gray-600 text-xs font-bold border-none bg-transparent cursor-pointer ml-1">✕</button>
                )}
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Date:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer border-none"
                />
                {dateFilter && (
                  <button onClick={() => setDateFilter('')} className="text-gray-400 hover:text-gray-600 text-xs font-bold border-none bg-transparent cursor-pointer ml-1">✕</button>
                )}
              </div>

              {/* Add Revenue Button */}
              <button
                onClick={() => setShowAddRevenue(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white text-[10px] font-black uppercase tracking-wider rounded-xl border-none cursor-pointer transition-all shadow-sm shadow-brand-primary/20"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                Add Revenue
              </button>

              {/* Search Staff */}
              <div className="relative w-44">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" /></svg>
                <input type="text" placeholder="Filter by staff name..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} className="w-full text-xs border border-gray-200 bg-gray-50 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>

              {(monthFilter || dateFilter || orderSearch) && (
                <button
                  onClick={() => { setMonthFilter(''); setDateFilter(''); setOrderSearch(''); }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 underline bg-transparent border-none cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Created By</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400 italic">No delivery orders match the selected filters.</td></tr>
                ) : filteredOrders.map((o: any) => (
                  <tr key={o.id} className={`hover:bg-gray-50/50 transition-colors ${o.isManual ? 'bg-brand-primary/3' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${o.isManual ? 'bg-brand-primary text-white' : 'bg-brand-primary/10 text-brand-primary'}`}>
                          {(o.createdByName || userNameMap[o.createdBy] || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-gray-800">{o.createdByName || userNameMap[o.createdBy] || 'Unknown'}</span>
                        {o.isManual && <span className="text-[8px] font-black text-brand-primary/70 uppercase bg-brand-primary/10 px-1.5 py-0.5 rounded-md">Manual</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{o.clientName || o.customerInfo?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{o.category || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-emerald-50 text-emerald-700 border-emerald-100">{o.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono">{o.date ? new Date(o.date).toLocaleDateString('en-IN') : (o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—')}</td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">₹{(Number(o.financials?.totalAmount) || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteOrder(o.id)}
                        disabled={deletingOrderId === o.id}
                        title="Delete this revenue entry"
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 border border-red-100 transition-all cursor-pointer disabled:opacity-40"
                      >
                        {deletingOrderId === o.id ? (
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                        ) : (
                          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drill-down: Converted Leads */}
      {drillMode === 'leads' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-gray-800 uppercase tracking-wider">Converted Leads — All Staff</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{filteredLeads.length} of {allConvertedLeads.length} leads shown</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Month Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Month:</span>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={e => setMonthFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer border-none"
                />
                {monthFilter && (
                  <button onClick={() => setMonthFilter('')} className="text-gray-400 hover:text-gray-600 text-xs font-bold border-none bg-transparent cursor-pointer ml-1">✕</button>
                )}
              </div>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Date:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer border-none"
                />
                {dateFilter && (
                  <button onClick={() => setDateFilter('')} className="text-gray-400 hover:text-gray-600 text-xs font-bold border-none bg-transparent cursor-pointer ml-1">✕</button>
                )}
              </div>

              {/* Add Lead Convert Button */}
              <button
                onClick={() => setShowAddLeadConvert(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl border-none cursor-pointer transition-all shadow-sm shadow-violet-400/20"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                Add Lead Convert
              </button>

              {/* Search Staff */}
              <div className="relative w-44">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" /></svg>
                <input type="text" placeholder="Filter by staff name..." value={leadSearch} onChange={e => setLeadSearch(e.target.value)} className="w-full text-xs border border-gray-200 bg-gray-50 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
              </div>

              {(monthFilter || dateFilter || leadSearch) && (
                <button
                  onClick={() => { setMonthFilter(''); setDateFilter(''); setLeadSearch(''); }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-700 underline bg-transparent border-none cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Added By</th>
                  <th className="px-4 py-3">Lead Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Converted Value</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredLeads.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400 italic">No converted leads match the selected filters.</td></tr>
                ) : filteredLeads.map((l: any) => (
                  <tr key={l.id} className={`hover:bg-gray-50/50 transition-colors ${l.isManual ? 'bg-violet-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[9px] font-bold">
                          {(l.createdByName || userNameMap[l.createdBy] || 'U').charAt(0)}
                        </div>
                        <span className="font-bold text-gray-800">{l.createdByName || userNameMap[l.createdBy] || 'Unknown'}</span>
                        {l.isManual && <span className="text-[8px] font-black text-violet-600/70 uppercase bg-violet-100 px-1.5 py-0.5 rounded-md">Manual</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{l.name}</td>
                    <td className="px-4 py-3 text-gray-500">{l.companyName || '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${l.leadType === 'Hot' ? 'bg-red-50 text-red-700 border-red-100' : l.leadType === 'Warm' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{l.leadType}</span></td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">₹{(Number(l.totalOrderValue) || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        {l.description && (
                          <button
                            onClick={() => {
                              setSelectedAdminLeadForLogs(l);
                              setShowAdminLogsModal(true);
                            }}
                            title="View Call Logs"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 transition-all cursor-pointer"
                          >
                            <FileText size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLead(l.id)}
                          disabled={deletingLeadId === l.id}
                          title="Delete this lead convert entry"
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 border border-red-100 transition-all cursor-pointer disabled:opacity-40"
                        >
                          {deletingLeadId === l.id ? (
                            <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          ) : (
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Lead Convert Modal ─────────────────────────────────────────── */}
      {showAddLeadConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-violet-600 px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Admin Lead Entry</p>
                <h3 className="text-lg font-black text-white mt-0.5">Add Lead Convert Revenue (Saves to DB)</h3>
              </div>
              <button
                onClick={() => setShowAddLeadConvert(false)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border-none cursor-pointer"
              >
                <svg width="14" height="14" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddLeadConvert} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Created By <span className="text-red-400">*</span></label>
                  <input required type="text" placeholder="Staff / Person name" value={leadConvertForm.createdBy}
                    onChange={e => setLeadConvertForm({ ...leadConvertForm, createdBy: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Lead Name</label>
                  <input type="text" placeholder="Client / Lead name" value={leadConvertForm.leadName}
                    onChange={e => setLeadConvertForm({ ...leadConvertForm, leadName: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Company Name</label>
                  <input type="text" placeholder="Company" value={leadConvertForm.companyName}
                    onChange={e => setLeadConvertForm({ ...leadConvertForm, companyName: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Lead Type</label>
                  <select value={leadConvertForm.leadType}
                    onChange={e => setLeadConvertForm({ ...leadConvertForm, leadType: e.target.value })} className={inputCls}>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Converted Value (₹) <span className="text-red-400">*</span></label>
                  <input required type="number" min="0" placeholder="0" value={leadConvertForm.convertedValue}
                    onChange={e => setLeadConvertForm({ ...leadConvertForm, convertedValue: e.target.value })} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Date (Day / Month / Year)</label>
                  <input type="date" value={leadConvertForm.date}
                    onChange={e => setLeadConvertForm({ ...leadConvertForm, date: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-50">
                <button type="button" onClick={() => setShowAddLeadConvert(false)} disabled={savingLeadConvert}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 text-xs font-bold rounded-2xl hover:bg-gray-50 transition-all cursor-pointer bg-transparent disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={savingLeadConvert}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black rounded-2xl border-none cursor-pointer transition-all shadow-md shadow-violet-400/20 uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingLeadConvert ? 'Saving to DB...' : 'Add Lead Convert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Revenue Modal ───────────────────────────────────────────────── */}
      {showAddRevenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="bg-brand-primary px-6 py-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Admin Revenue Entry</p>
                <h3 className="text-lg font-black text-white mt-0.5">Add Revenue Record (Saves to DB)</h3>
              </div>
              <button
                onClick={() => setShowAddRevenue(false)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border-none cursor-pointer"
              >
                <svg width="14" height="14" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddRevenue} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Created By */}
                <div className="col-span-2">
                  <label className={labelCls}>Created By <span className="text-red-400">*</span></label>
                  <input
                    required
                    type="text"
                    placeholder="Staff / Person name"
                    value={revenueForm.createdBy}
                    onChange={e => setRevenueForm({ ...revenueForm, createdBy: e.target.value })}
                    className={inputCls}
                  />
                </div>

                {/* Client */}
                <div>
                  <label className={labelCls}>Client Name</label>
                  <input
                    type="text"
                    placeholder="Client / Company"
                    value={revenueForm.client}
                    onChange={e => setRevenueForm({ ...revenueForm, client: e.target.value })}
                    className={inputCls}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className={labelCls}>Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Jersey, T-Shirt..."
                    value={revenueForm.category}
                    onChange={e => setRevenueForm({ ...revenueForm, category: e.target.value })}
                    className={inputCls}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className={labelCls}>Status <span className="text-red-400">*</span></label>
                  <select
                    required
                    value={revenueForm.status}
                    onChange={e => setRevenueForm({ ...revenueForm, status: e.target.value })}
                    className={inputCls}
                  >
                    <option value="delivery">Delivery</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className={labelCls}>Amount (₹) <span className="text-red-400">*</span></label>
                  <input
                    required
                    type="number"
                    min="0"
                    placeholder="0"
                    value={revenueForm.amount}
                    onChange={e => setRevenueForm({ ...revenueForm, amount: e.target.value })}
                    className={inputCls}
                  />
                </div>

                {/* Date */}
                <div className="col-span-2">
                  <label className={labelCls}>Date (Day / Month / Year)</label>
                  <input
                    type="date"
                    value={revenueForm.date}
                    onChange={e => setRevenueForm({ ...revenueForm, date: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setShowAddRevenue(false)}
                  disabled={savingRevenue}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 text-xs font-bold rounded-2xl hover:bg-gray-50 transition-all cursor-pointer bg-transparent disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRevenue}
                  className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-black rounded-2xl border-none cursor-pointer transition-all shadow-md shadow-brand-primary/20 uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingRevenue ? 'Saving to DB...' : 'Add Revenue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
    const { user, logout, registeredUsers, deleteUser, updateUserRole, loading: authLoading, adminOnlyRegistration, setAdminOnlyRegistration } = useAuth();
    const { leads, invoices, orders, addLead, addOrder, updateOrder, deleteOrder, deleteLead, deleteInvoice, updateInvoice } = useLeads();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'invoices' | 'logs' | 'security' | 'user-logs' | 'online-leads'>('overview');
    const [userLogs, setUserLogs] = useState<any[]>([]);
    const [userLoginCounts, setUserLoginCounts] = useState<any[]>([]);
    const [adminLeadSearch, setAdminLeadSearch] = useState('');
    const [showAdminLogsModal, setShowAdminLogsModal] = useState(false);
    const [selectedAdminLeadForLogs, setSelectedAdminLeadForLogs] = useState<Lead | null>(null);
    const [userLogsLoading, setUserLogsLoading] = useState(false);

    const fetchUserLogs = async () => {
      setUserLogsLoading(true);
      try {
        const data = await mockDataService.getActivityLogs();
        if (data && data.success) {
          setUserLogs(data.logs || []);
          setUserLoginCounts(data.counts || []);
        }
      } catch (e) {
        console.error('Failed to fetch activity logs:', e);
      } finally {
        setUserLogsLoading(false);
      }
    };

    React.useEffect(() => {
      if (activeTab === 'user-logs') {
        fetchUserLogs();
      }
    }, [activeTab]);

    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [isInvoiceFormModalOpen, setIsInvoiceFormModalOpen] = useState(false);

    // Admin Create Order Form State
    const [isAdminOrderModalOpen, setIsAdminOrderModalOpen] = useState(false);
    const [adminOrderForm, setAdminOrderForm] = useState({
      customerName: '',
      phone: '',
      address: '',
      category: 'Jersey',
      totalAmount: '',
      advancePay: '',
      notes: '',
      isUrgent: false,
      status: OrderStatus.PENDING,
      staffImages: [] as string[]
    });

    const handleCreateAdminOrder = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const amt = Number(adminOrderForm.totalAmount) || 0;
        const adv = Number(adminOrderForm.advancePay) || 0;
        const newOrder = {
          customerInfo: {
            name: adminOrderForm.customerName,
            phone: adminOrderForm.phone,
            address: adminOrderForm.address
          },
          category: adminOrderForm.category,
          quantity: 1,
          financials: {
            totalAmount: amt,
            advancePay: adv,
            balanceAmount: amt - adv
          },
          status: adminOrderForm.status,
          isUrgent: adminOrderForm.isUrgent,
          notes: adminOrderForm.notes,
          designNotes: adminOrderForm.notes,
          staffImages: adminOrderForm.staffImages,
          staffPdfs: [] as string[],
          staffAttachments: adminOrderForm.staffImages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: user?.id || user?.uid || '',
          createdByName: user?.name || 'Admin'
        };
        await addOrder(newOrder);
        alert('Order created successfully!');
        setIsAdminOrderModalOpen(false);
        setAdminOrderForm({
          customerName: '',
          phone: '',
          address: '',
          category: 'Jersey',
          totalAmount: '',
          advancePay: '',
          notes: '',
          isUrgent: false,
          status: OrderStatus.PENDING,
          staffImages: [] as string[]
        });
      } catch (err: any) {
        alert('Failed to create order: ' + (err?.message || 'Error'));
      }
    };

    const handleEditInvoice = (invoice: Invoice) => {
      setEditingInvoice(invoice);
      setIsInvoiceFormModalOpen(true);
    };

    const handleEditInvoiceSubmit = async (invoiceData: any) => {
      if (editingInvoice) {
        try {
          await updateInvoice(editingInvoice.id, invoiceData);
          alert("Invoice updated successfully!");
          setIsInvoiceFormModalOpen(false);
          setEditingInvoice(null);
        } catch (err: any) {
          console.error("Failed to update invoice:", err);
          alert("Failed to update invoice.");
        }
      }
    };
    const [selectedDept, setSelectedDept] = useState<'staff' | 'accounts' | 'order_management' | 'production' | 'delivery' | 'designers'>('staff');
    const [selectedSection, setSelectedSection] = useState<'total' | 'hold' | 'completed'>('total');
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [invitations, setInvitations] = useState<any[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('marketing');
    const [inviteGeneratedLink, setInviteGeneratedLink] = useState('');
    const [invitesLoading, setInvitesLoading] = useState(false);

    const fetchInvitations = async () => {
      try {
        const data = await mockDataService.getInvitations();
        setInvitations(data);
      } catch (e) {
        console.error('Failed to load invitations:', e);
      }
    };

    React.useEffect(() => {
      fetchInvitations();
    }, []);

    const [showLogsModal, setShowLogsModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const [layoutMode, setLayoutMode] = React.useState<'mobile' | 'system'>(
      window.innerWidth < 768 ? 'mobile' : 'system'
    );

    React.useEffect(() => {
      const handleResize = () => {
        setLayoutMode(window.innerWidth < 768 ? 'mobile' : 'system');
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [notifications, setNotifications] = React.useState<any[]>([]);
    const [showNotifications, setShowNotifications] = React.useState(false);
    const notificationsRef = React.useRef(notifications);
    notificationsRef.current = notifications;

    const playNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);

        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15); // E5
        gain2.gain.setValueAtTime(0.15, audioContext.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
        osc2.start(audioContext.currentTime + 0.15);
        osc2.stop(audioContext.currentTime + 0.3);
      } catch (e) {
        console.warn('AudioContext failed:', e);
      }
    };

    React.useEffect(() => {
      if (!user) return;

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      const fetchNotifications = async (isInitial = false) => {
        try {
          const res = await fetch(getApiUrl(`/api/notifications?role=${user.role}`));
          const data = await res.json();
          if (data.success) {
            const newNotifs = data.notifications || [];
            const currentList = notificationsRef.current;
            if (!isInitial) {
              const hasNew = newNotifs.some((n: any) => n.isRead === 0 && !currentList.some(existing => existing.id === n.id));
              if (hasNew) {
                playNotificationSound();
                const firstNew = newNotifs.find((n: any) => n.isRead === 0 && !currentList.some(existing => existing.id === n.id));
                if (firstNew && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  new Notification(firstNew.title, { body: firstNew.message });
                }
              }
            }
            setNotifications(newNotifs);
          }
        } catch (e) {
          console.error(e);
        }
      };

      fetchNotifications(true);
      const interval = setInterval(() => fetchNotifications(false), 12000);
      return () => clearInterval(interval);
    }, [user?.role]);

    const handleToggleNotifications = async () => {
      const nextShow = !showNotifications;
      setShowNotifications(nextShow);
      if (nextShow) {
        try {
          await fetch(getApiUrl('/api/notifications/read'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: user?.role })
          });
          setNotifications(prev => prev.map(n => ({ ...n, isRead: 1 })));
        } catch (e) {
          console.error('Failed to mark notifications as read:', e);
        }
      }
    };

    const selectTab = (tab: typeof activeTab) => {
      setActiveTab(tab);
      setIsMobileOpen(false);
    };
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [cleaningUp, setCleaningUp] = useState(false);

    const handleToggleRegistration = () => {
      setAdminOnlyRegistration(!adminOnlyRegistration);
    };

    const isStaff = user?.role === 'staff';

    const handleRemoveUser = async (id: string) => {
      if (isStaff) {
        alert('Only administrators can remove users.');
        return;
      }
      if (confirm('Are you sure you want to remove this user? Their profile data will be deleted.')) {
        await deleteUser(id);
      }
    };

    const handleToggleUserRole = async (userId: string, currentRole: string) => {
      if (isStaff) {
        alert('Only administrators can change roles.');
        return;
      }
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
        try {
          await updateUserRole(userId, newRole as any);
        } catch (error) {
          console.error('Error updating user role:', error);
          alert('Failed to update user role.');
        }
      }
    };

    const handleClearAllLeads = async () => {
      if (isStaff) {
        alert('Only administrators can clear all leads.');
        return;
      }
      if (confirm('Are you sure you want to PERMANENTLY DELETE ALL LEADS? This cannot be undone.')) {
        setCleaningUp(true);
        try {
          await mockDataService.clearLeads();
          alert('All leads have been cleared successfully.');
        } catch (error) {
          console.error('Error clearing leads: ', error);
          alert('Failed to clear leads. Check console for details.');
        } finally {
          setCleaningUp(false);
        }
      }
    };

    const handleDeleteOrder = async (id: string) => {
      if (user?.role !== 'admin') {
        alert('Only administrators can delete orders.');
        return;
      }
      if (confirm('Are you sure you want to delete this order? This action is irreversible.')) {
        try {
          await deleteOrder(id);
        } catch (error) {
          console.error('Error deleting order:', error);
          alert('Failed to delete order.');
        }
      }
    };

    const handleDeleteInvoice = async (id: string) => {
      if (user?.role !== 'admin') {
        alert('Only administrators can delete invoices.');
        return;
      }
      if (confirm('Are you sure you want to delete this invoice? This action is irreversible.')) {
        try {
          await deleteInvoice(id);
        } catch (error) {
          console.error('Error deleting invoice:', error);
          alert('Failed to delete invoice.');
        }
      }
    };

    const handleLogout = () => {
      logout();
      navigate('/login');
    };

    // Redirect if not admin or staff (after loading)
    React.useEffect(() => {
      if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'staff'))) {
        navigate('/dashboard');
      }
    }, [user, authLoading]);

    const totalRevenue = leads.reduce((sum, l) => sum + l.totalOrderValue, 0);
    const totalOrdersValue = orders.reduce((sum, o) => sum + (o.financials?.totalAmount || 0), 0);
    const aggregateTotal = totalRevenue + totalOrdersValue;

    const getFilteredDeptOrders = () => {
      switch (selectedDept) {
        case 'staff':
          if (selectedSection === 'hold') {
            return orders.filter(o => o.status === OrderStatus.HOLD && (!o.previousStatus || o.previousStatus === OrderStatus.PENDING || o.previousStatus === OrderStatus.DRAFT));
          } else if (selectedSection === 'completed') {
            return orders.filter(o => {
              const effStatus = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
              return effStatus !== OrderStatus.PENDING && effStatus !== OrderStatus.DRAFT && !(o.status === OrderStatus.HOLD && (!o.previousStatus || o.previousStatus === OrderStatus.PENDING || o.previousStatus === OrderStatus.DRAFT));
            });
          } else {
            return orders;
          }

        case 'accounts':
          if (selectedSection === 'hold') {
            return orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS);
          } else if (selectedSection === 'completed') {
            return orders.filter(o => {
              const effStatus = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
              return effStatus && ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS].includes(effStatus) && !(o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS);
            });
          } else {
            return orders.filter(o => {
              const effStatus = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
              return effStatus && ![OrderStatus.DRAFT, OrderStatus.PENDING].includes(effStatus);
            });
          }

        case 'order_management':
          if (selectedSection === 'hold') {
            return orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT);
          } else if (selectedSection === 'completed') {
            return orders.filter(o => {
              const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
              return eff && [OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(eff);
            });
          } else {
            return orders.filter(o => {
              const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
              return eff && ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.DESIGN].includes(eff);
            });
          }

        case 'production':
          if (selectedSection === 'hold') {
            return orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION);
          } else if (selectedSection === 'completed') {
            return orders.filter(o => {
              const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
              return eff && [OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(eff);
            });
          } else {
            return orders.filter(o => {
              const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
              return eff && ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.DESIGN, OrderStatus.ORDER_MANAGEMENT].includes(eff);
            });
          }

        case 'delivery':
          if (selectedSection === 'hold') {
            return orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY);
          } else if (selectedSection === 'completed') {
            return orders.filter(o => o.status === OrderStatus.DELIVERED);
          } else {
            return orders.filter(o => {
              const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
              return eff && [OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(eff);
            });
          }

        case 'designers':
          if (selectedSection === 'hold') {
            return orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DESIGN);
          } else if (selectedSection === 'completed') {
            return orders.filter(o => {
              const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
              return eff && ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.DESIGN].includes(eff) && !(o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DESIGN);
            });
          } else {
            return orders.filter(o => {
              const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
              return eff && ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS].includes(eff);
            });
          }

        default:
          return orders;
      }
    };

    const getDeptStats = (dept: 'staff' | 'accounts' | 'order_management' | 'production' | 'delivery' | 'designers') => {
      let totalCount = 0;
      let holdCount = 0;
      let completedCount = 0;

      switch (dept) {
        case 'staff':
          holdCount = orders.filter(o => o.status === OrderStatus.HOLD && (!o.previousStatus || o.previousStatus === OrderStatus.PENDING || o.previousStatus === OrderStatus.DRAFT)).length;
          completedCount = orders.filter(o => {
            const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
            return eff !== OrderStatus.PENDING && eff !== OrderStatus.DRAFT && !(o.status === OrderStatus.HOLD && (!o.previousStatus || o.previousStatus === OrderStatus.PENDING || o.previousStatus === OrderStatus.DRAFT));
          }).length;
          totalCount = orders.length;
          break;
        case 'accounts':
          holdCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS).length;
          completedCount = orders.filter(o => {
            const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
            return eff && ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS].includes(eff) && !(o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS);
          }).length;
          totalCount = orders.filter(o => {
            const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
            return eff && ![OrderStatus.DRAFT, OrderStatus.PENDING].includes(eff);
          }).length;
          break;
        case 'order_management':
          holdCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT).length;
          completedCount = orders.filter(o => {
            const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
            return eff && [OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(eff);
          }).length;
          totalCount = orders.filter(o => {
            const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
            return eff && ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.DESIGN].includes(eff);
          }).length;
          break;
        case 'production':
          holdCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION).length;
          completedCount = orders.filter(o => {
            const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
            return eff && [OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(eff);
          }).length;
          totalCount = orders.filter(o => {
            const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
            return eff && ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.DESIGN, OrderStatus.ORDER_MANAGEMENT].includes(eff);
          }).length;
          break;
        case 'delivery':
          holdCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY).length;
          completedCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;
          totalCount = orders.filter(o => {
            const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
            return eff && [OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(eff);
          }).length;
          break;
        case 'designers':
          holdCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DESIGN).length;
          completedCount = orders.filter(o => {
            const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
            return eff && ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS, OrderStatus.DESIGN].includes(eff) && !(o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DESIGN);
          }).length;
          totalCount = orders.filter(o => {
            const eff = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
            return eff && ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS].includes(eff);
          }).length;
          break;
      }

      return { totalCount, holdCount, completedCount };
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-brand-light">Loading security context...</div>;

    return (
      <div className="flex bg-brand-light min-h-screen">
        {/* Mobile Sidebar Backdrop */}
        {layoutMode === 'system' && isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden animate-fade-in"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        {layoutMode === 'system' && (
          <aside className={cn(
            "bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 h-full z-40 shadow-sm transition-all duration-300",
            isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
            isSidebarCollapsed ? "md:w-20" : "md:w-64",
            "w-64"
          )}>
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              {(!isSidebarCollapsed || isMobileOpen) && <Logo />}
              <button
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setIsMobileOpen(false);
                  } else {
                    setIsSidebarCollapsed(!isSidebarCollapsed);
                  }
                }}
                className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-brand-primary transition-all flex-shrink-0"
              >
                {isSidebarCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>

            <nav className="p-4 space-y-1">
              <button
                onClick={() => selectTab('overview')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'overview' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Overview" : ""}
              >
                <TrendingUp className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Overview</span>}
              </button>
              <button
                onClick={() => selectTab('users')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'users' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Users" : ""}
              >
                <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Users</span>}
              </button>
              <button
                onClick={() => selectTab('orders')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'orders' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Global Orders" : ""}
              >
                <Zap className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Global Orders</span>}
              </button>
              <button
                onClick={() => selectTab('invoices')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'invoices' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Invoices" : ""}
              >
                <BarChart3 className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Invoices</span>}
              </button>
              <button
                onClick={() => selectTab('online-leads')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'online-leads' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Online Leads" : ""}
              >
                <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Online Leads</span>}
              </button>
              <button
                onClick={() => selectTab('logs')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'logs' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Audit Logs" : ""}
              >
                <FileText className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Audit Logs</span>}
              </button>
              <button
                onClick={() => selectTab('user-logs')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'user-logs' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "User Logins" : ""}
              >
                <Clock className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>User Logins</span>}
              </button>
              <button
                onClick={() => selectTab('security')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-sm transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'security' ? "bg-white text-brand-primary border border-brand-primary/10 shadow-sm" : "text-gray-500 hover:text-brand-primary hover:bg-gray-50"
                )}
                title={isSidebarCollapsed ? "Security" : ""}
              >
                <Shield className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Security</span>}
              </button>

              <div className="pt-4 mt-2 border-t border-gray-100 space-y-2">
                <button
                  onClick={() => setIsAdminOrderModalOpen(true)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-brand-primary text-white hover:bg-brand-primary/95 transition-all shadow-md shadow-brand-primary/15 border-none cursor-pointer",
                    isSidebarCollapsed && "md:justify-center md:px-0"
                  )}
                  title={isSidebarCollapsed ? "Create Order" : ""}
                >
                  <Plus className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Create Order</span>}
                </button>
                <button
                  onClick={() => {
                    setEditingInvoice(null);
                    setIsInvoiceFormModalOpen(true);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-650 transition-all shadow-md shadow-emerald-500/15 border-none cursor-pointer",
                    isSidebarCollapsed && "md:justify-center md:px-0"
                  )}
                  title={isSidebarCollapsed ? "Create Invoice" : ""}
                >
                  <Plus className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Create Invoice</span>}
                </button>
              </div>

            </nav>

            <div className="mt-auto p-4 border-t border-gray-50">
              <button onClick={handleLogout} className={cn(
                "text-gray-500 hover:text-red-400 font-bold w-full px-3 py-2 flex items-center gap-3 rounded-xl hover:bg-gray-50 transition-all text-sm",
                isSidebarCollapsed && "md:justify-center md:px-0"
              )} title={isSidebarCollapsed ? "Logout" : ""}>
                <LogOut className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Logout</span>}
              </button>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 min-h-screen transition-all duration-300 pb-20 md:pb-8",
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        )}>
          {/* Top Header */}
          <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-3 text-gray-400">
              <button
                onClick={() => setIsMobileOpen(true)}
                className="p-2 -ml-1 hover:bg-gray-50 rounded-xl text-gray-500 hidden flex-shrink-0"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold uppercase tracking-widest text-gray-700 flex items-center gap-2">
                Admin Control Panel
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setLayoutMode(prev => prev === 'mobile' ? 'system' : 'mobile')}
                className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Toggle Mobile/System View"
              >
                {layoutMode === 'mobile' ? <Smartphone className="w-3.5 h-3.5 text-brand-primary" /> : <Monitor className="w-3.5 h-3.5 text-gray-500" />}
                <span className="hidden sm:inline">{layoutMode === 'mobile' ? 'Mobile View' : 'System View'}</span>
              </button>
              <button
                onClick={() => navigate('/lead-dashboard')}
                className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border border-brand-primary/30 bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Lead Dashboard"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lead Dashboard</span>
              </button>
              <div className="relative">
                <button
                  onClick={handleToggleNotifications}
                  className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 relative cursor-pointer flex items-center justify-center"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.some(n => n.isRead === 0) && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden text-left">
                    <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Notifications</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                      {notifications.length > 0 ? (
                        notifications.map(n => (
                          <div key={n.id} className={cn("p-4 transition-colors", n.isRead === 0 ? "bg-purple-50/10" : "")}>
                            <p className="text-xs font-bold text-gray-900">{n.title}</p>
                            <p className="text-[10px] text-gray-500 font-semibold mt-1 leading-relaxed">{n.message}</p>
                            <span className="text-[9px] text-gray-400 font-bold block mt-2">{new Date(n.createdAt).toLocaleTimeString()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-xs text-gray-400">No notifications yet.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                className="p-2 hover:bg-gray-50 rounded-lg text-gray-500"
                onClick={() => setShowProfileModal(true)}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </header>

          <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
            {/* Header Action Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight capitalize">
                  {activeTab === 'overview' ? 'System Performance' : activeTab.replace(/([A-Z])/g, ' $1')}
                </h1>
                <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Managing administrative controls for {user?.name}</p>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <Button variant="outline" size="sm" className="bg-white text-xs whitespace-nowrap shadow-xs" onClick={() => setShowLogsModal(true)}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> Audit Logs
                </Button>
                <Button variant="outline" size="sm" className="bg-white gap-1.5 text-xs whitespace-nowrap shadow-xs" onClick={() => {
                  setInviteEmail('');
                  setInviteRole('marketing');
                  setInviteGeneratedLink('');
                  setShowInviteModal(true);
                }}>
                  <Mail className="w-3.5 h-3.5" /> Invite User
                </Button>
                <Button variant="secondary" size="sm" className="shadow-xs text-xs whitespace-nowrap" onClick={() => navigate('/register')}>
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Register User
                </Button>
              </div>
            </div>

            {activeTab === 'overview' ? (
              <>
                {/* Overview Stats - Ultra-Compact Mobile Responsive Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
                  {[
                    { label: 'Aggregate Value', val: `₹${Math.round(Number(aggregateTotal) || 0).toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-white', bg: 'bg-green-500', fullRowOnMobile: true },
                    { label: 'Total Leads', val: leads.length, icon: Users, color: 'text-white', bg: 'bg-brand-secondary' },
                    { label: 'Global Orders', val: orders.length, icon: Zap, color: 'text-white', bg: 'bg-orange-500' },
                    { label: 'Registered Team', val: registeredUsers.length, icon: Shield, color: 'text-white', bg: 'bg-brand-dark' },
                    { label: 'Invoices', val: invoices.length, icon: BarChart3, color: 'text-white', bg: 'bg-brand-primary' },
                  ].map((stat, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      key={i}
                      className={cn(
                        "bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 shadow-xs flex flex-row sm:flex-col items-center sm:items-start justify-start sm:justify-between gap-3 sm:gap-0 hover:shadow-md transition-all",
                        stat.fullRowOnMobile ? "col-span-2 sm:col-span-1" : ""
                      )}
                    >
                      <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-full flex items-center justify-center flex-shrink-0 sm:mb-4 shadow-sm", stat.bg, stat.color)}>
                        <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">{stat.label}</p>
                        <p className="text-sm sm:text-xl font-black text-gray-900 mt-0.5 truncate">{stat.val}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Role Revenue Breakdown: Marketing vs Online Team */}
                {(() => {
                  // Build a lookup: userId → role & name
                  const userRoleMap: Record<string, string> = {};
                  const userNameMap: Record<string, string> = {};
                  registeredUsers.forEach((u: any) => {
                    userRoleMap[u.id] = u.role;
                    userNameMap[u.id] = u.name;
                  });

                  const isOnlineTeam = (createdBy: string) => {
                    const role = userRoleMap[createdBy];
                    return role === 'onlineteam' || role === 'UserRole.ONLINETEAM';
                  };
                  const isMarketing = (createdBy: string) => {
                    return !isOnlineTeam(createdBy);
                  };

                  // Revenue orders: Delivery status only
                  const deliveredOrders = orders.filter(o =>
                    o.status === OrderStatus.DELIVERY
                  );

                  const mktDeliveredOrders = deliveredOrders.filter(o => isMarketing(o.createdBy || ''));
                  const otDeliveredOrders = deliveredOrders.filter(o => isOnlineTeam(o.createdBy || ''));
                  const mktOrdersRevenue = mktDeliveredOrders.reduce((sum, o) => sum + (Number(o.financials?.totalAmount) || 0), 0);
                  const otOrdersRevenue = otDeliveredOrders.reduce((sum, o) => sum + (Number(o.financials?.totalAmount) || 0), 0);

                  // Leads Forecasted Value
                  const mktLeadsForecast = leads.filter(l => isMarketing(l.createdBy))
                    .reduce((sum, l) => sum + (Number(l.forecastedValue) || 0), 0);
                  const otLeadsForecast = leads.filter(l => isOnlineTeam(l.createdBy))
                    .reduce((sum, l) => sum + (Number(l.forecastedValue) || 0), 0);

                  // Leads Converted Value
                  const mktConvertedLeads = leads.filter(l => isMarketing(l.createdBy) && (Number(l.totalOrderValue) || 0) > 0);
                  const otConvertedLeads = leads.filter(l => isOnlineTeam(l.createdBy) && (Number(l.totalOrderValue) || 0) > 0);
                  const mktLeadsConverted = mktConvertedLeads.reduce((sum, l) => sum + (Number(l.totalOrderValue) || 0), 0);
                  const otLeadsConverted = otConvertedLeads.reduce((sum, l) => sum + (Number(l.totalOrderValue) || 0), 0);

                  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

                  if (user?.email !== 'daniel.smpallywear@gmail.com') {
                    return null;
                  }

                  return (
                    <RoleBreakdown
                      mktOrdersRevenue={mktOrdersRevenue}
                      otOrdersRevenue={otOrdersRevenue}
                      mktDeliveredOrders={mktDeliveredOrders}
                      otDeliveredOrders={otDeliveredOrders}
                      mktLeadsForecast={mktLeadsForecast}
                      otLeadsForecast={otLeadsForecast}
                      mktLeadsConverted={mktLeadsConverted}
                      otLeadsConverted={otLeadsConverted}
                      mktConvertedLeads={mktConvertedLeads}
                      otConvertedLeads={otConvertedLeads}
                      mktLeadsCount={leads.filter(l => isMarketing(l.createdBy)).length}
                      otLeadsCount={leads.filter(l => isOnlineTeam(l.createdBy)).length}
                      fmt={fmt}
                      userNameMap={userNameMap}
                      addOrder={addOrder}
                      deleteOrder={deleteOrder}
                      addLead={addLead}
                      deleteLead={deleteLead}
                    />
                  );
                })()}


                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6">Aggregate Revenue</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={leads.map(l => ({ name: l.name, val: l.totalOrderValue }))}>
                          <defs>
                            <linearGradient id="colorAdmin" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3291B6" stopOpacity={0.1} />
                              <stop offset="95%" stopColor="#3291B6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                          <Area type="monotone" dataKey="val" stroke="#3291B6" strokeWidth={2} fillOpacity={1} fill="url(#colorAdmin)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6">Segments</h3>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Hot', value: leads.filter(l => l.leadType === 'Hot').length },
                              { name: 'Warm', value: leads.filter(l => l.leadType === 'Warm').length },
                              { name: 'Cold', value: leads.filter(l => l.leadType === 'Cold').length },
                            ]}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                      {['Hot', 'Warm', 'Cold'].map((type, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                          <span className="text-[10px] text-gray-500 font-bold uppercase">{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lead Management */}
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-brand-primary rounded-full" />
                    Global Lead Administration
                  </h2>
                  <LeadManager />
                </div>
              </>
            ) : activeTab === 'invoices' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-brand-primary rounded-full" />
                      Global Invoice Management
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">Monitoring all generated invoices across the platform</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="bg-white gap-2" onClick={() => {
                      const exportData = invoices.map(inv => ({
                        'Invoice #': inv.invoiceNumber,
                        'Date': inv.date,
                        'Customer': inv.billToName,
                        'Total': inv.total,
                        'Staff': inv.createdByName
                      }));
                      alert('Exporting ' + invoices.length + ' invoices...');
                    }}>
                      <Download className="w-4 h-4" /> Export All
                    </Button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/80 text-gray-400 font-black uppercase tracking-widest text-[10px] border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-5">System Creator</th>
                        <th className="px-6 py-5">Invoice Reference</th>
                        <th className="px-6 py-5">Customer Entity</th>
                        <th className="px-6 py-5">Generation Date</th>
                        <th className="px-6 py-5 text-right">Financial Value</th>
                        <th className="px-6 py-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-5 text-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-brand-primary/20">
                                {invoice.createdByName?.charAt(0) || 'U'}
                              </div>
                              <span className="text-xs text-gray-700 font-bold">{invoice.createdByName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-nowrap">
                            <span className="font-mono font-bold text-brand-primary bg-brand-secondary/50 px-2 py-1 rounded-lg">#{invoice.invoiceNumber}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div>
                              <p className="font-bold text-gray-900">{invoice.billToName}</p>
                              <p className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{invoice.billToEmail}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-nowrap text-gray-500 font-medium">
                            {new Date(invoice.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-5 text-right text-nowrap">
                            <span className="font-black text-gray-900">₹{invoice.total.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-brand-primary hover:bg-brand-secondary font-bold"
                                onClick={() => setSelectedInvoice(invoice)}
                              >
                                <FileText className="w-4 h-4 mr-2" /> View PDF
                              </Button>
                              {(user?.role === 'admin' || user?.role === 'marketing' || user?.role === 'staff') && (
                                <button
                                  onClick={() => handleEditInvoice(invoice)}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border-none bg-transparent cursor-pointer"
                                  title="Edit Invoice"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {user?.role === 'admin' && (
                                <button
                                  onClick={() => handleDeleteInvoice(invoice.id)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border-none bg-transparent cursor-pointer"
                                  title="Delete Permanently"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {invoices.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-32 text-center">
                            <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                              <div className="p-6 bg-brand-secondary rounded-full">
                                <FileText className="w-10 h-10 text-brand-primary opacity-50" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-gray-900 font-black text-lg">System Repository Empty</p>
                                <p className="text-gray-400 text-sm italic">No invoices have been recorded in the global context yet.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'users' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">Platform Registered Users</h3>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-brand-secondary text-brand-primary rounded-full text-[10px] font-bold uppercase">Total Users: {registeredUsers.length}</span>
                    </div>
                  </div>
                  {layoutMode === 'mobile' ? (
                    <div className="p-4 space-y-4">
                      {registeredUsers.length > 0 ? (
                        registeredUsers.map((u, i) => (
                          <div key={u.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-xs uppercase overflow-hidden shadow-md shadow-brand-primary/20">
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{u.name.charAt(0)}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800 text-sm leading-none mb-1">{u.name}</p>
                                <p className="text-[10px] text-gray-400">{u.email}</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center border-t border-gray-50 pt-2.5">
                              <span
                                className={cn(
                                  "text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-sm",
                                  u.role === 'admin' ? "text-purple-700 border-purple-100 bg-purple-50" :
                                    u.role === 'marketing' ? "text-blue-600 border-blue-100 bg-blue-50" :
                                      u.role === 'staff' ? "text-green-600 border-green-100 bg-green-50" :
                                        u.role === 'accounts' ? "text-amber-600 border-amber-100 bg-amber-50" :
                                          u.role === 'production' ? "text-orange-600 border-orange-100 bg-orange-50" :
                                            u.role === 'delivery' ? "text-indigo-600 border-indigo-100 bg-indigo-50" :
                                              u.role === 'order_management' ? "text-cyan-600 border-cyan-100 bg-cyan-50" :
                                                u.role === 'designer' ? "text-purple-600 border-purple-100 bg-purple-50" :
                                                  "text-gray-600 border-gray-100 bg-gray-50"
                                )}
                              >
                                {u.role?.replace('_', ' ')}
                              </span>
                              <div className="flex items-center gap-2">
                                {u.id !== user?.id && (
                                  <button
                                    onClick={() => handleRemoveUser(u.id)}
                                    className="p-1 hover:bg-red-50 text-red-500 rounded border border-transparent hover:border-red-100 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 italic text-xs p-8">
                          No team members registered yet.
                        </div>
                      )}
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                          <th className="px-6 py-4">User Details</th>
                          <th className="px-6 py-4">System Role</th>
                          <th className="px-6 py-4">Join Date</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Settings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {registeredUsers.map((u, i) => (
                          <tr key={u.id} className="hover:bg-gray-50/50 group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-xs uppercase overflow-hidden shadow-md shadow-brand-primary/20">
                                  {u.avatar ? (
                                    <img src={u.avatar} alt={u.name} />
                                  ) : (
                                    <span>{u.name.charAt(0)}</span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-800">{u.name}</p>
                                  <p className="text-[10px] text-gray-400">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={cn(
                                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shadow-sm",
                                  u.role === 'admin' ? "text-purple-700 border-purple-100 bg-purple-50" :
                                    u.role === 'marketing' ? "text-blue-600 border-blue-100 bg-blue-50" :
                                      u.role === 'staff' ? "text-green-600 border-green-100 bg-green-50" :
                                        u.role === 'accounts' ? "text-amber-600 border-amber-100 bg-amber-50" :
                                          u.role === 'production' ? "text-orange-600 border-orange-100 bg-orange-50" :
                                            u.role === 'delivery' ? "text-indigo-600 border-indigo-100 bg-indigo-50" :
                                              u.role === 'order_management' ? "text-cyan-600 border-cyan-100 bg-cyan-50" :
                                                u.role === 'designer' ? "text-purple-600 border-purple-100 bg-purple-50" :
                                                  "text-gray-600 border-gray-100 bg-gray-50"
                                )}
                              >
                                {u.role?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-500 text-xs text-nowrap">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                <span className="text-[11px] text-gray-600">Active</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {u.id !== user?.id && (
                                  <button onClick={() => handleRemoveUser(u.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {registeredUsers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                              No team members registered yet or sync in progress.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit text-left">
                  <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Pending Workspace Invites</h3>
                  {invitations.filter(inv => inv.status === 'pending').length > 0 ? (
                    <div className="space-y-4">
                      {invitations.filter(inv => inv.status === 'pending').map((inv) => (
                        <div key={inv.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200/60 flex flex-col gap-2 relative group transition-all hover:border-brand-primary/25">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-gray-900 truncate max-w-[170px]" title={inv.email}>{inv.email}</p>
                              <span className="inline-block text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 mt-1.5 tracking-wider">
                                {inv.role}
                              </span>
                            </div>
                            <button
                              onClick={async () => {
                                if (window.confirm("Cancel this invitation?")) {
                                  try {
                                    await mockDataService.deleteInvitation(inv.id);
                                    await fetchInvitations();
                                    alert("Invitation cancelled.");
                                  } catch (e) {
                                    alert("Failed to cancel invitation.");
                                  }
                                }
                              }}
                              className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                              title="Revoke Invitation"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2.5 border-t border-dashed border-gray-200 pt-2.5">
                            <span className="font-semibold text-[8px]">Token: <span className="font-mono font-bold text-gray-700">{inv.id}</span></span>
                            <button
                              onClick={() => {
                                const registerUrl = `${window.location.origin}/register?invite=${inv.id}`;
                                navigator.clipboard.writeText(registerUrl);
                                alert("Invitation link copied!");
                              }}
                              className="text-brand-primary font-black hover:underline cursor-pointer border-none bg-transparent text-[8px] uppercase tracking-widest"
                            >
                              Copy Link
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic text-center py-6">No pending invitations.</p>
                  )}
                </div>
              </div>
            ) : activeTab === 'orders' ? (
              <div className="space-y-8 animate-fadeIn">
                {/* Header section with Refresh */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-brand-primary rounded-full mt-0.5" />
                      Global Workflow Auditing
                    </h2>
                    <p className="text-gray-500 text-xs mt-0.5 font-semibold uppercase tracking-wider">
                      Full visibility and direct administrative overrides for all production pipelines
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Refresh App Data
                  </Button>
                </div>

                {/* Department Selector Tabs Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {(
                    [
                      { id: 'staff', label: '1. Staff Desk', icon: Users },
                      { id: 'accounts', label: '2. Accounts Team', icon: DollarSign },
                      { id: 'designers', label: '3. Designers Pool', icon: Shield },
                      { id: 'order_management', label: '4. Order Mgmt', icon: Settings },
                      { id: 'production', label: '5. Production Line', icon: BarChart3 },
                      { id: 'delivery', label: '6. Delivery Phase', icon: Globe },
                    ] as const
                  ).map((dept, index) => {
                    const isActive = selectedDept === dept.id;
                    const { totalCount, holdCount, completedCount } = getDeptStats(dept.id);
                    const Icon = dept.icon;

                    return (
                      <button
                        key={dept.id}
                        onClick={() => {
                          setSelectedDept(dept.id);
                          setSelectedSection('total'); // reset subsection
                        }}
                        className={cn(
                          "p-4 rounded-2xl border text-left flex flex-col gap-3 transition-all relative overflow-hidden group cursor-pointer shadow-sm",
                          isActive
                            ? "bg-black text-white border-black scale-[1.02] shadow-md animate-none"
                            : "bg-white border-gray-100 hover:bg-gray-50/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shadow-inner",
                            isActive ? "bg-white/10 text-white" : "bg-gray-50 text-gray-700"
                          )}>
                            <Icon size={16} />
                          </div>
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md",
                            isActive ? "bg-white/10 text-white" : "bg-gray-100 text-gray-500"
                          )}>
                            Dept #{index + 1}
                          </span>
                        </div>

                        <div>
                          <p className={cn("text-[10px] font-black uppercase tracking-tight truncate", isActive ? "text-white/80" : "text-gray-500")}>
                            {dept.label}
                          </p>
                          <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-lg font-black">{totalCount}</span>
                            <span className={cn("text-[9px] font-semibold", isActive ? "text-white/60" : "text-gray-400")}>Total</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-dashed border-gray-200/10 text-[9px] font-bold">
                          <span className="flex items-center gap-0.5 text-red-500">
                            ● {holdCount} hold
                          </span>
                          <span className="flex items-center gap-0.5 text-green-500">
                            ✔ {completedCount} ok
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Subsection Filters (Total, Hold, Completed) */}
                <div className="flex bg-gray-100 p-1.5 rounded-2xl w-fit gap-1">
                  {(
                    [
                      { id: 'total', label: '1. Total Orders/Designs', count: getDeptStats(selectedDept).totalCount, color: 'bg-black text-white' },
                      { id: 'hold', label: '2. Hold Orders/Designs', count: getDeptStats(selectedDept).holdCount, color: 'bg-red-600 text-white shadow-red-600/10' },
                      { id: 'completed', label: '3. Completed Orders/Designs', count: getDeptStats(selectedDept).completedCount, color: 'bg-green-600 text-white shadow-green-600/10' }
                    ] as const
                  ).map(sec => {
                    const isActive = selectedSection === sec.id;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => setSelectedSection(sec.id)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
                          isActive
                            ? `${sec.color} shadow-lg scale-100`
                            : "text-gray-500 hover:text-gray-900 bg-transparent hover:bg-white/40"
                        )}
                      >
                        <span>{sec.label}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-black",
                          isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                        )}>
                          {sec.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-[11px] border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">Order ID</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Quantity</th>
                        <th className="px-6 py-4">Status & Step</th>
                        <th className="px-6 py-4 text-right">Value</th>
                        <th className="px-6 py-4 text-right">Actions Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getFilteredDeptOrders().map((o) => (
                        <tr key={o.id} className="hover:bg-gray-50/50 group transition-colors">
                          <td className="px-6 py-4 font-mono font-black text-brand-primary text-xs">#{o.id.slice(-8)}</td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-800">{o.customerInfo.name}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{o.customerInfo.phone || 'No phone'}</p>
                            <p className="text-[9px] text-brand-primary font-black uppercase tracking-wider mt-0.5">Created by: {o.createdByName || 'System'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium text-gray-700 capitalize">
                              {o.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-600">{o.quantity}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest w-fit border",
                                o.status === OrderStatus.HOLD ? "bg-red-50 text-red-700 border-red-200" :
                                  o.status === OrderStatus.DELIVERED ? "bg-green-50 text-green-700 border-green-200" :
                                    "bg-brand-secondary text-brand-primary border-brand-primary/10"
                              )}>
                                {o.status.replace('_', ' ')}
                              </span>
                              {o.assignedDesigner && o.assignedDesigner !== 'Unassigned' && o.assignedDesigner !== 'Designer assigned' ? (
                                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                                  🎨 {o.assignedDesigner}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                                  🎨 Unassigned
                                </span>
                              )}
                              {o.status === OrderStatus.HOLD && o.holdReason && (
                                <span className="text-[10px] text-red-500 italic block font-semibold">
                                  Reason: {o.holdReason}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-black text-gray-900">₹{(o.financials?.totalAmount || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setSelectedOrderDetail(o)}
                                className="px-3 py-1.5 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer border-none"
                              >
                                Edit / Update
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(o.id)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-none"
                                title="Delete Order"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {getFilteredDeptOrders().length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-24 text-center">
                            <div className="max-w-md mx-auto text-center space-y-3">
                              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto border border-dashed border-slate-300">
                                ✔
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">Clear Slate</p>
                                <p className="text-xs text-gray-400 italic">No orders found matching the filter specs.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'security' ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 mb-6">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">System Cleanup</h3>
                    <p className="text-gray-500 text-sm mb-6">
                      Remove all leads from the system. This action is irreversible and should only be used for clearing mock data or starting fresh.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      disabled={cleaningUp}
                      onClick={handleClearAllLeads}
                    >
                      {cleaningUp ? 'Processing...' : 'Clear All Leads'}
                    </Button>
                  </div>

                  <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 mb-6">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Access Control</h3>
                    <p className="text-gray-500 text-sm mb-6">
                      Current system is in High-Integrity mode. Registration is restricted to internal team members.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-700">Admin-only Registration</span>
                        <button
                          onClick={handleToggleRegistration}
                          className={cn(
                            "w-10 h-5 rounded-full transition-colors relative",
                            adminOnlyRegistration ? "bg-brand-primary" : "bg-gray-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                            adminOnlyRegistration ? "left-5" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'logs' ? (
              <div className="space-y-6">
                {MOCK_LOGS.map(log => (
                  <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 flex gap-4">
                    <div className="w-10 h-10 bg-white border border-brand-secondary/30 rounded-full flex items-center justify-center text-brand-primary shadow-sm">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-sm text-gray-800">{log.action}</p>
                        <span className="text-[10px] text-gray-400 font-medium">{log.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
                      <p className="text-[10px] text-brand-primary font-bold mt-2 uppercase tracking-tight">System Operator: {log.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'user-logs' ? (
              <div className="space-y-8 animate-fadeIn">
                {/* Login frequency stats */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-black uppercase text-gray-400 tracking-wider mb-4">Login Frequencies</h3>
                  {userLogsLoading ? (
                    <p className="text-xs text-gray-500 italic">Loading login metrics...</p>
                  ) : userLoginCounts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {userLoginCounts.map((countItem, idx) => {
                        const regUser = registeredUsers.find(ru => ru.id === countItem.userId);
                        const displayName = regUser?.name || countItem.userName || countItem.userId;
                        const displayEmail = regUser?.email || countItem.userEmail || 'No email';
                        return (
                          <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between shadow-xs animate-fadeIn">
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-800 truncate">{displayName}</p>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{displayEmail}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                {countItem.count} Logins
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No login records found.</p>
                  )}
                </div>

                {/* Detailed session history table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800 text-sm">Detailed Session Logs</h3>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Chronological record of user logins and logouts</p>
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-[11px] border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Login Time</th>
                        <th className="px-6 py-4">Logout Time</th>
                        <th className="px-6 py-4 text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {userLogsLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-xs text-gray-400 italic">Loading audit logs...</td>
                        </tr>
                      ) : userLogs.length > 0 ? (
                        userLogs.map((log) => {
                          const regUser = registeredUsers.find(ru => ru.id === log.userId);
                          const displayName = regUser?.name || log.userName || log.userId;
                          const displayEmail = regUser?.email || log.userEmail || 'No email';

                          const loginDateStr = new Date(log.loginTime).toLocaleString();
                          const logoutDateStr = log.logoutTime ? new Date(log.logoutTime).toLocaleString() : null;

                          let durationStr = 'Active Now';
                          if (log.logoutTime) {
                            const diffMs = log.logoutTime - log.loginTime;
                            const diffMins = Math.round(diffMs / 60000);
                            if (diffMins < 1) {
                              durationStr = 'Under a minute';
                            } else if (diffMins < 60) {
                              durationStr = `${diffMins} min${diffMins > 1 ? 's' : ''}`;
                            } else {
                              const hours = Math.floor(diffMins / 60);
                              const mins = diffMins % 60;
                              durationStr = `${hours} hr${hours > 1 ? 's' : ''} ${mins} min${mins > 1 ? 's' : ''}`;
                            }
                          }

                          return (
                            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-gray-800 text-xs">{displayName}</td>
                              <td className="px-6 py-4 text-xs text-gray-500 font-medium">{displayEmail}</td>
                              <td className="px-6 py-4 text-xs text-gray-500 font-medium">{loginDateStr}</td>
                              <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                                {logoutDateStr ? (
                                  logoutDateStr
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 text-[9px] font-black uppercase rounded border border-green-100">
                                    ● Active
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right font-semibold text-xs text-gray-700">{durationStr}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-xs text-gray-400 italic">No session logs recorded yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'online-leads' ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Online Leads & Call Logs</h2>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Monitor client interactions, requirements, and call log histories</p>
                  </div>
                  <button
                    onClick={() => setShowAddLeadConvert(true)}
                    className="px-4 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border-none cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    <Plus size={14} /> Add Lead / Client
                  </button>
                </div>

                {/* Stats cards for leads */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 animate-fadeIn">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner animate-pulse-subtle">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Leads</p>
                      <p className="text-2xl font-black text-gray-900 mt-1">{leads.length}</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 animate-fadeIn">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner animate-pulse-subtle">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Called / Followed Up</p>
                      <p className="text-2xl font-black text-gray-900 mt-1">
                        {leads.filter(l => ['Called', 'Interested', 'Not Interested', 'Converted'].includes(l.status || '')).length}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 animate-fadeIn">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner animate-pulse-subtle">
                      <Flame size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Interested (Hot)</p>
                      <p className="text-2xl font-black text-gray-900 mt-1">
                        {leads.filter(l => l.status === 'Interested' || l.leadType === 'Hot').length}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 animate-fadeIn">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner animate-pulse-subtle">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Converted Deals</p>
                      <p className="text-2xl font-black text-gray-900 mt-1">
                        {leads.filter(l => l.status === 'Converted' || l.convertedValue > 0).length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Table of Leads */}
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-left space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-3">
                    <h3 className="text-lg font-bold text-gray-900">Leads Registry & Call Logs</h3>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search leads..."
                        value={adminLeadSearch}
                        onChange={(e) => setAdminLeadSearch(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3">Agent</th>
                          <th className="px-4 py-3">Client Name</th>
                          <th className="px-4 py-3">Phone</th>
                          <th className="px-4 py-3">Company</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3">Latest Call Log</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {leads
                          .filter(l => 
                            l.name.toLowerCase().includes(adminLeadSearch.toLowerCase()) ||
                            (l.companyName || '').toLowerCase().includes(adminLeadSearch.toLowerCase()) ||
                            l.number.includes(adminLeadSearch) ||
                            (l.createdByName || '').toLowerCase().includes(adminLeadSearch.toLowerCase())
                          )
                          .map((lead) => {
                            const logs = lead.description ? lead.description.split('\n\n') : [];
                            const latestLog = logs.length > 0 ? logs[logs.length - 1] : lead.description || '—';

                            return (
                              <tr key={lead.id} className="hover:bg-gray-50/30 transition-colors">
                                <td className="px-4 py-3 font-bold text-gray-700">
                                  {lead.createdByName || 'System'}
                                </td>
                                <td className="px-4 py-3 font-black text-gray-900">{lead.name}</td>
                                <td className="px-4 py-3 font-mono text-gray-600">{lead.number}</td>
                                <td className="px-4 py-3 text-gray-500 font-semibold">{lead.companyName || '—'}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                                    lead.status === 'Converted' ? "bg-emerald-50 text-emerald-700 border-emerald-150" :
                                    lead.status === 'Interested' ? "bg-red-50 text-red-700 border-red-150" :
                                    lead.status === 'Called' ? "bg-indigo-50 text-indigo-700 border-indigo-150" :
                                    "bg-amber-50 text-amber-700 border-amber-150"
                                  )}>
                                    {lead.status || 'New'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 max-w-xs truncate text-gray-500 font-medium italic animate-pulse-slow" title={lead.description}>
                                  {latestLog}
                                </td>
                                <td className="px-4 py-3 text-right flex justify-end gap-1.5">
                                  {lead.description && (
                                    <button
                                      onClick={() => {
                                        setSelectedAdminLeadForLogs(lead);
                                        setShowAdminLogsModal(true);
                                      }}
                                      title="View All Call Logs"
                                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 transition-all cursor-pointer"
                                    >
                                      <FileText size={13} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteLead(lead.id)}
                                    title="Delete Lead"
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 transition-all cursor-pointer animate-in fade-in"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        {leads.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-gray-400 italic">No leads found in the system.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="w-16 h-16 bg-brand-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-md">
                  <Shield className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Section Under Maintenance</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                  The "{activeTab}" management portal is currently being synchronized with our central servers. Check back shortly.
                </p>
                <Button variant="outline" className="mt-8" onClick={() => setActiveTab('overview')}>
                  Return to Overview
                </Button>
              </div>
            )}
          </div>
        </main>

        {layoutMode === 'mobile' && (
          <nav className="fixed bottom-0 inset-x-0 h-16 bg-white border-t border-gray-200 px-2 py-1 flex justify-around items-center z-40 shadow-lg shadow-gray-200/50">
            <button
              onClick={() => selectTab('overview')}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors",
                activeTab === 'overview' ? "text-indigo-600 scale-105 font-bold" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Layout className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase mt-1 tracking-wider">Overview</span>
            </button>
            <button
              onClick={() => selectTab('users')}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors",
                activeTab === 'users' ? "text-indigo-600 scale-105 font-bold" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Users className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase mt-1 tracking-wider">Users</span>
            </button>
            <button
              onClick={() => selectTab('invoices')}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors",
                activeTab === 'invoices' ? "text-indigo-600 scale-105 font-bold" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase mt-1 tracking-wider">Invoices</span>
            </button>
            <button
              onClick={() => selectTab('orders')}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors",
                activeTab === 'orders' ? "text-indigo-600 scale-105 font-bold" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Shield className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase mt-1 tracking-wider">Workflow</span>
            </button>
            <button
              onClick={() => selectTab('user-logs')}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors",
                activeTab === 'user-logs' ? "text-indigo-600 scale-105 font-bold" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Clock className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase mt-1 tracking-wider">Logins</span>
            </button>
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="text-[8px] font-black uppercase mt-1 tracking-wider">Profile</span>
            </button>
          </nav>
        )}

        {/* Invite Modal */}
        <AnimatePresence>
          {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInviteModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Invite Team Member</h3>
                  <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <p className="text-sm text-gray-500 mb-6">Send an invitation to join your workspace as a user or moderator.</p>
                {inviteGeneratedLink ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 text-green-700 rounded-xl text-xs font-semibold leading-relaxed border border-green-100">
                      Invitation generated successfully! You can share the link below with your colleague:
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteGeneratedLink}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none font-mono"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteGeneratedLink);
                          alert('Copied to clipboard!');
                        }}
                        className="px-3 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors cursor-pointer border-none"
                      >
                        Copy
                      </button>
                    </div>
                    <Button className="w-full mt-4" onClick={() => {
                      setInviteGeneratedLink('');
                      setShowInviteModal(false);
                    }}>
                      Close
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 text-left">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/10 transition-all focus:outline-none text-sm font-semibold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">System Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/10 transition-all focus:outline-none text-sm font-semibold bg-white"
                      >
                        <option value="marketing">Marketing</option>
                        <option value="designer">Designer (Art Studio)</option>
                        <option value="accounts">Accounts</option>
                        <option value="order_management">Order Management</option>
                        <option value="production">Production (Factory)</option>
                        <option value="digitizer">Digitizing & Embroidery</option>
                        <option value="delivery">Delivery</option>
                        <option value="onlineteam">Online Team</option>
                        <option value="vendor">Vendor</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                    <Button
                      className="w-full mt-4"
                      disabled={invitesLoading || !inviteEmail.trim()}
                      onClick={async () => {
                        if (!inviteEmail.trim()) return;
                        setInvitesLoading(true);
                        try {
                          const res = await mockDataService.createInvitation(inviteEmail.trim(), inviteRole);
                          if (res.success) {
                            const registerUrl = `${window.location.origin}/register?invite=${res.inviteId}`;
                            setInviteGeneratedLink(registerUrl);
                            await fetchInvitations();
                            alert('Invitation successfully created!');
                          } else {
                            alert('Failed to create invitation.');
                          }
                        } catch (err: any) {
                          alert(err.message || 'Error creating invitation.');
                        } finally {
                          setInvitesLoading(false);
                        }
                      }}
                    >
                      {invitesLoading ? 'Creating invite...' : 'Send Invitation'}
                    </Button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Logs Modal */}
        <AnimatePresence>
          {showLogsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogsModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Audit Logs</h3>
                    <p className="text-sm text-gray-500">History of all critical system actions</p>
                  </div>
                  <button onClick={() => setShowLogsModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                  {MOCK_LOGS.map(log => (
                    <div key={log.id} className="flex gap-4 p-4 border border-gray-50 rounded-xl hover:bg-gray-50/50">
                      <div className="w-10 h-10 bg-white border border-brand-secondary/30 rounded-full flex items-center justify-center text-brand-primary flex-shrink-0 shadow-sm">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-gray-800 text-sm">{log.action}</p>
                          <span className="text-[10px] text-gray-400">{log.time}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{log.details}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Executed by {log.user}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                  <Button variant="ghost" className="text-xs" onClick={() => setShowLogsModal(false)}>Close Activity Log</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <ProfileSettings isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
        <InvoiceModal
          invoice={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
        <InvoiceFormModal
          isOpen={isInvoiceFormModalOpen}
          onClose={() => {
            setIsInvoiceFormModalOpen(false);
            setEditingInvoice(null);
          }}
          invoice={editingInvoice}
          onSubmit={handleEditInvoiceSubmit}
        />
        <AnimatePresence>
          {isAdminOrderModalOpen && (
            <div className="fixed inset-0 z-50 flex justify-end">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdminOrderModalOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-xs cursor-pointer"
              />
              {/* Slide-over Drawer Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                className="relative bg-white h-screen w-full max-w-md shadow-2xl flex flex-col z-10 overflow-hidden"
              >
                <div className="bg-brand-primary px-4 py-3.5 flex items-center justify-between text-white shadow-sm shrink-0">
                  <div>
                    <p className="text-[8px] font-bold text-white/70 uppercase tracking-widest">Admin Control</p>
                    <h3 className="text-sm font-black mt-0.5">Create New Order</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAdminOrderModalOpen(false)}
                    className="w-6 h-6 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border-none cursor-pointer text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateAdminOrder} className="flex-1 flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 text-left pb-24">
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="col-span-2">
                        <label className="block text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1">Customer Name *</label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. John Doe"
                          value={adminOrderForm.customerName}
                          onChange={e => setAdminOrderForm({ ...adminOrderForm, customerName: e.target.value })}
                          className="w-full text-xs border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1">Phone *</label>
                        <input
                          required
                          type="text"
                          placeholder="Phone number"
                          value={adminOrderForm.phone}
                          onChange={e => setAdminOrderForm({ ...adminOrderForm, phone: e.target.value })}
                          className="w-full text-xs border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1">Category *</label>
                        <select
                          required
                          value={adminOrderForm.category}
                          onChange={e => setAdminOrderForm({ ...adminOrderForm, category: e.target.value })}
                          className="w-full text-xs border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all cursor-pointer"
                        >
                          <option value="Jersey">Jersey</option>
                          <option value="T-Shirt">T-Shirt</option>
                          <option value="Shirt">Shirt</option>
                          <option value="Pant">Pant</option>
                          <option value="Hoodie">Hoodie</option>
                          <option value="Sweatshirt">Sweatshirt</option>
                          <option value="Corporate Gift">Corporate Gift</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1">Address *</label>
                        <textarea
                          required
                          rows={2}
                          placeholder="Delivery address"
                          value={adminOrderForm.address}
                          onChange={e => setAdminOrderForm({ ...adminOrderForm, address: e.target.value })}
                          className="w-full text-xs border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1">Total Amount (₹) *</label>
                        <input
                          required
                          type="number"
                          min="0"
                          placeholder="0"
                          value={adminOrderForm.totalAmount}
                          onChange={e => setAdminOrderForm({ ...adminOrderForm, totalAmount: e.target.value })}
                          className="w-full text-xs border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1">Advance Pay (₹) *</label>
                        <input
                          required
                          type="number"
                          min="0"
                          placeholder="0"
                          value={adminOrderForm.advancePay}
                          onChange={e => setAdminOrderForm({ ...adminOrderForm, advancePay: e.target.value })}
                          className="w-full text-xs border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1">Send Order To *</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Pending', status: OrderStatus.PENDING, desc: 'Stay in staff list' },
                            { label: 'Designs', status: OrderStatus.DESIGN, desc: 'Send to designers' },
                            { label: 'Accounts', status: OrderStatus.ACCOUNTS, desc: 'Send to billing' }
                          ].map((item) => (
                            <label
                              key={item.status}
                              className={cn(
                                "border rounded-xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-gray-50/50 select-none",
                                adminOrderForm.status === item.status ? "border-brand-primary bg-brand-primary/5 text-brand-primary ring-2 ring-brand-primary/5" : "border-gray-200 text-gray-600"
                              )}
                            >
                              <input
                                type="radio"
                                name="adminOrderDestination"
                                value={item.status}
                                checked={adminOrderForm.status === item.status}
                                onChange={() => setAdminOrderForm({ ...adminOrderForm, status: item.status })}
                                className="hidden"
                              />
                              <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
                              <span className="text-[7px] text-gray-400 font-bold mt-0.5 uppercase tracking-tighter">{item.desc}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <FileUpload
                          label="Upload Order Pictures / Designs"
                          accept="image/*"
                          maxFiles={5}
                          initialFiles={adminOrderForm.staffImages}
                          onFilesSelected={files => setAdminOrderForm({ ...adminOrderForm, staffImages: files })}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                        <textarea
                          rows={2}
                          placeholder="Special instructions..."
                          value={adminOrderForm.notes}
                          onChange={e => setAdminOrderForm({ ...adminOrderForm, notes: e.target.value })}
                          className="w-full text-xs border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all resize-none"
                        />
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 py-0.5">
                        <input
                          type="checkbox"
                          id="adminIsUrgent"
                          checked={adminOrderForm.isUrgent}
                          onChange={e => setAdminOrderForm({ ...adminOrderForm, isUrgent: e.target.checked })}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary/10 cursor-pointer"
                        />
                        <label htmlFor="adminIsUrgent" className="text-[10px] font-bold text-red-500 uppercase cursor-pointer select-none">Mark order as Urgent ⚡</label>
                      </div>
                    </div>
                  </div>
                  {/* Fixed Footer */}
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gray-50 border-t border-gray-100 flex gap-3 z-20 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsAdminOrderModalOpen(false)}
                      className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-xs font-bold rounded-xl hover:bg-gray-100 transition-all cursor-pointer bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-brand-primary hover:opacity-90 text-white text-xs font-black rounded-xl border-none cursor-pointer transition-all shadow-md shadow-brand-primary/15 uppercase tracking-wider"
                    >
                      Submit Order
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        {selectedOrderDetail && (
          <OrderDetailModal
            order={selectedOrderDetail}
            onClose={() => setSelectedOrderDetail(null)}
            onUpdateOrder={async (id, updates) => {
              try {
                await updateOrder(id, updates);
                setSelectedOrderDetail(prev => prev ? { ...prev, ...updates } : null);
                alert("Order updated successfully.");
              } catch (e) {
                console.error(e);
                alert("Failed to save changes.");
              }
            }}
            isAdmin={true}
          />
        )}
        {/* Fixed Bottom Quick Navigation Bar for Mobile */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 px-2 py-1.5 flex justify-around items-center shadow-lg">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'orders', label: 'Orders', icon: Zap },
            { id: 'invoices', label: 'Invoices', icon: BarChart3 },
            { id: 'online-leads', label: 'Leads', icon: Users },
            { id: 'users', label: 'Users', icon: UserPlus },
            { id: 'logs', label: 'Logs', icon: FileText },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'logs') {
                  setShowLogsModal(true);
                } else {
                  setActiveTab(item.id as any);
                }
              }}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer",
                activeTab === item.id && item.id !== 'logs'
                  ? "text-brand-primary bg-brand-primary/10 font-black scale-105"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Admin Call Logs Detail Modal */}
        {showAdminLogsModal && selectedAdminLeadForLogs && (
          <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200 text-left">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest block mb-0.5">Call Log History</span>
                  <h3 className="text-lg font-black text-gray-900">{selectedAdminLeadForLogs.name}</h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedAdminLeadForLogs.number}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAdminLogsModal(false);
                    setSelectedAdminLeadForLogs(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors border-none cursor-pointer bg-transparent"
                >
                  <Plus className="w-5 h-5 rotate-45 text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                {selectedAdminLeadForLogs.description ? (
                  <div className="space-y-4">
                    {selectedAdminLeadForLogs.description.split('\n\n').map((entry, idx) => (
                      <div key={idx} className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-gray-700 whitespace-pre-wrap leading-relaxed shadow-xs">
                        {entry}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic text-center py-6">No call logs recorded yet.</p>
                )}
              </div>

              <div className="p-6 bg-gray-50 flex justify-end">
                <button
                  onClick={() => {
                    setShowAdminLogsModal(false);
                    setSelectedAdminLeadForLogs(null);
                  }}
                  className="px-6 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary/95 transition-all cursor-pointer border-none shadow-md"
                >
                  Close Logs
                </button>
              </div>
            </div>
          </div>
        )}

        <SidebarChat />
      </div>
    );
  }

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-600';
      case 'accounts': return 'bg-amber-100 text-amber-700';
      case 'design': return 'bg-purple-100 text-purple-700';
      case 'order_management': return 'bg-blue-100 text-blue-700';
      case 'production': return 'bg-purple-100 text-purple-700';
      case 'delivery': return 'bg-orange-100 text-orange-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

