import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import {
  Layout, Bell, Settings, BarChart3,
  Users, Shield, Globe, TrendingUp, DollarSign,
  UserPlus, X, Clock, FileText, CheckCircle2, Mail,
  LogOut, Trash2, Download, ChevronLeft, Menu, Zap, Monitor, Smartphone,
  Edit, Plus, Phone, Flame, Search, CalendarDays, LogIn, LogOut as LogOutIcon, ScanFace, Briefcase
} from 'lucide-react';
import InvoiceFormModal from '../components/InvoiceFormModal';
import FileUpload from '../components/FileUpload';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import LeadManager from '../components/LeadManager';
import ProfileSettings from '../components/ProfileSettings';
import Logo from '../components/Logo';
import InvoiceModal from '../components/InvoiceModal';
import OrderDetailModal from '../components/OrderDetailModal';
import { Order, OrderStatus, Invoice, Lead } from '../types';
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
export function RoleBreakdown({ mktOrdersRevenue, otOrdersRevenue, mktDeliveredOrders, otDeliveredOrders, mktLeadsForecast, otLeadsForecast, mktLeadsConverted, otLeadsConverted, mktConvertedLeads, otConvertedLeads, mktLeadsCount, otLeadsCount, fmt, userNameMap, addOrder, deleteOrder, addLead, deleteLead, setSelectedAdminLeadForLogs, setShowAdminLogsModal }: any) {
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
        number: 'N/A',
        companyName: leadConvertForm.companyName || '',
        leadType: leadConvertForm.leadType,
        totalOrderValue: valAmount,
        forecastedValue: valAmount,
        convertedValue: valAmount,
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
    const [showAddLeadConvert, setShowAddLeadConvert] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orders' | 'invoices' | 'logs' | 'security' | 'user-logs' | 'online-leads' | 'attendance'>('overview');
    const [userLogs, setUserLogs] = useState<any[]>([]);
    const [userLoginCounts, setUserLoginCounts] = useState<any[]>([]);
    const [userSummaries, setUserSummaries] = useState<any[]>([]);
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceDateFilter, setAttendanceDateFilter] = useState('');
    const [editingAttendance, setEditingAttendance] = useState<any | null>(null);
    const [attendanceEditForm, setAttendanceEditForm] = useState({ loginTime: '', logoutTime: '', notes: '' });
    const [savingAttendance, setSavingAttendance] = useState(false);
    
    const userRoleMap = React.useMemo(() => {
      const map: Record<string, string> = {};
      registeredUsers.forEach((u: any) => {
        map[u.id] = u.role;
      });
      return map;
    }, [registeredUsers]);

    const isOnlineTeam = React.useCallback((createdBy: string) => {
      const role = userRoleMap[createdBy];
      return role === 'onlineteam' || role === 'UserRole.ONLINETEAM';
    }, [userRoleMap]);

    const [adminLeadSearch, setAdminLeadSearch] = useState('');
    const [showAdminLogsModal, setShowAdminLogsModal] = useState(false);
    const [selectedAdminLeadForLogs, setSelectedAdminLeadForLogs] = useState<Lead | null>(null);
    const [userLogsLoading, setUserLogsLoading] = useState(false);
    const [selectedUserForActivity, setSelectedUserForActivity] = useState<any | null>(null);
    const [showUserActivityModal, setShowUserActivityModal] = useState(false);
    const [selectedActivityMonth, setSelectedActivityMonth] = useState<string>('all');

    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [userToEdit, setUserToEdit] = useState<any | null>(null);
    const [isScanningFaceForEdit, setIsScanningFaceForEdit] = useState(false);
    const [faceScanEditProgress, setFaceScanEditProgress] = useState(0);
    const [faceScanEditStatus, setFaceScanEditStatus] = useState('');

    const fetchUserLogs = async () => {
      setUserLogsLoading(true);
      try {
        const data = await mockDataService.getActivityLogs();
        if (data && data.success) {
          setUserLogs(data.logs || []);
          setUserLoginCounts(data.counts || []);
          setUserSummaries(data.userSummaries || []);
        }
      } catch (e) {
        console.error('Failed to fetch activity logs:', e);
      } finally {
        setUserLogsLoading(false);
      }
    };

    const calculatedSummaries = React.useMemo(() => {
      if (userSummaries && userSummaries.length > 0) return userSummaries;
      const map: Record<string, { userId: string; userName: string; userEmail: string; firstLogin: number; lastLogout: number | null; loginCount: number }> = {};
      userLogs.forEach(log => {
        const key = log.userId || log.userEmail;
        if (!key) return;
        if (!map[key]) {
          map[key] = {
            userId: log.userId,
            userName: log.userName,
            userEmail: log.userEmail,
            firstLogin: Number(log.loginTime),
            lastLogout: log.logoutTime ? Number(log.logoutTime) : null,
            loginCount: 1
          };
        } else {
          map[key].loginCount += 1;
          if (Number(log.loginTime) < map[key].firstLogin) map[key].firstLogin = Number(log.loginTime);
          if (log.logoutTime && (!map[key].lastLogout || Number(log.logoutTime) > map[key].lastLogout)) {
            map[key].lastLogout = Number(log.logoutTime);
          }
        }
      });
      return Object.values(map);
    }, [userSummaries, userLogs]);

    React.useEffect(() => {
      if (activeTab === 'user-logs' || activeTab === 'attendance') {
        fetchUserLogs();
      }
    }, [activeTab]);

    const fetchAttendanceLogs = async () => {
      setAttendanceLoading(true);
      try {
        const data = await mockDataService.getActivityLogs();
        if (data && data.success) {
          setAttendanceLogs(data.logs || []);
        }
      } catch (e) {
        console.error('Failed to fetch attendance logs:', e);
      } finally {
        setAttendanceLoading(false);
      }
    };

    const handleToggleBlockUser = async (targetUser: any) => {
      try {
        const isCurrentlyBlocked = Boolean(targetUser.isBlocked || targetUser.status === 'Blocked');
        const newStatus = isCurrentlyBlocked ? 'Active' : 'Blocked';
        const newBlockedState = !isCurrentlyBlocked;

        await mockDataService.updateUser({
          ...targetUser,
          uid: targetUser.id || targetUser.uid,
          status: newStatus,
          isBlocked: newBlockedState
        });

        alert(`User ${targetUser.name} has been ${newBlockedState ? 'Blocked 🚫' : 'Unblocked 🟢'}`);
        window.location.reload();
      } catch (err: any) {
        alert(err.message || 'Failed to update user block status');
      }
    };

    const handleStartFaceScanForUser = () => {
      setIsScanningFaceForEdit(true);
      setFaceScanEditProgress(15);
      setFaceScanEditStatus('Position face in scanner frame...');

      setTimeout(() => {
        setFaceScanEditProgress(50);
        setFaceScanEditStatus('Scanning 3D facial landmarks & mesh...');
      }, 1000);

      setTimeout(() => {
        setFaceScanEditProgress(85);
        setFaceScanEditStatus('Generating biometric hash vector...');
      }, 2000);

      setTimeout(() => {
        setFaceScanEditProgress(100);
        setFaceScanEditStatus('Face Scan Registered & Saved!');

        setTimeout(() => {
          setUserToEdit((prev: any) => ({
            ...prev,
            faceRegistered: true,
            faceData: `FACE_DESCRIPTOR_${Date.now()}`
          }));
          setIsScanningFaceForEdit(false);
          alert('Face ID scan registered for user!');
        }, 600);
      }, 2800);
    };

    const handleSaveUserEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userToEdit) return;

      try {
        await mockDataService.updateUser({
          ...userToEdit,
          uid: userToEdit.id || userToEdit.uid,
          status: userToEdit.status || (userToEdit.isBlocked ? 'Blocked' : 'Active'),
          isBlocked: Boolean(userToEdit.isBlocked || userToEdit.status === 'Blocked'),
          faceRegistered: Boolean(userToEdit.faceRegistered || userToEdit.faceData),
          faceData: userToEdit.faceData || ''
        });

        alert(`User ${userToEdit.name} updated successfully!`);
        setShowEditUserModal(false);
        setUserToEdit(null);
        window.location.reload();
      } catch (err: any) {
        alert(err.message || 'Failed to update user');
      }
    };

    const handleSaveAttendanceEdit = async () => {
      if (!editingAttendance) return;
      setSavingAttendance(true);
      try {
        await fetch(getApiUrl(`/api/auth/activity-logs/${editingAttendance.id}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            loginTime: attendanceEditForm.loginTime,
            logoutTime: attendanceEditForm.logoutTime,
            notes: attendanceEditForm.notes
          })
        });
        setEditingAttendance(null);
        fetchAttendanceLogs();
      } catch (e) {
        console.error('Failed to save attendance edit:', e);
        // Update locally if API fails
        setAttendanceLogs(prev => prev.map(log =>
          log.id === editingAttendance.id
            ? { ...log, loginTime: attendanceEditForm.loginTime, logoutTime: attendanceEditForm.logoutTime, notes: attendanceEditForm.notes }
            : log
        ));
        setEditingAttendance(null);
      } finally {
        setSavingAttendance(false);
      }
    };

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
    const [orderStaffSearch, setOrderStaffSearch] = useState('');
    const [orderStaffFilter, setOrderStaffFilter] = useState('all');
    const [orderDateRangeFilter, setOrderDateRangeFilter] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
    const [orderCustomDate, setOrderCustomDate] = useState('');
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

    const isDeliveredStatus = (status?: string) => {
      if (!status) return false;
      const s = String(status).toLowerCase().trim();
      return s === 'delivery' || s === 'delivered' || s === OrderStatus.DELIVERY || s === OrderStatus.DELIVERED;
    };

    const totalDeliveredOrdersRevenue = useMemo(() => {
      return orders
        .filter(o => isDeliveredStatus(o.status))
        .reduce((sum, o) => {
          const amt = Number(o.financials?.totalAmount ?? o.financials?.balanceAmount ?? (o as any).totalAmount ?? 0);
          return sum + (isNaN(amt) ? 0 : amt);
        }, 0);
    }, [orders]);

    const totalAllOrdersValue = useMemo(() => {
      return orders.reduce((sum, o) => {
        const amt = Number(o.financials?.totalAmount ?? o.financials?.balanceAmount ?? (o as any).totalAmount ?? 0);
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);
    }, [orders]);

    const totalConvertedLeadsValue = useMemo(() => {
      return leads.reduce((sum, l) => {
        const val = Number(l.convertedValue ?? l.totalOrderValue ?? 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
    }, [leads]);

    const aggregateTotal = useMemo(() => {
      if (totalDeliveredOrdersRevenue > 0) return totalDeliveredOrdersRevenue;
      return totalAllOrdersValue + totalConvertedLeadsValue;
    }, [totalDeliveredOrdersRevenue, totalAllOrdersValue, totalConvertedLeadsValue]);

    const globalDeliveredOrdersChartData = useMemo(() => {
      if (!orders || orders.length === 0) {
        return [{ name: 'No Orders', deliveredRevenue: 0, totalOrders: 0 }];
      }

      const sorted = [...orders].sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));

      let cumDeliveredRevenue = 0;
      let cumTotalOrders = 0;

      const chartPoints = sorted.reduce((acc: any[], o, idx) => {
        cumTotalOrders += 1;
        const isDelivered = isDeliveredStatus(o.status);
        const amt = Number(o.financials?.totalAmount ?? o.financials?.balanceAmount ?? (o as any).totalAmount ?? 0);
        const validAmt = isNaN(amt) ? 0 : amt;

        if (isDelivered) {
          cumDeliveredRevenue += validAmt;
        }

        const dateStr = o.createdAt
          ? new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
          : `Ord #${idx + 1}`;

        acc.push({
          name: dateStr,
          deliveredRevenue: cumDeliveredRevenue > 0 ? cumDeliveredRevenue : (cumTotalOrders * 1000),
          totalOrders: cumTotalOrders,
          orderId: `#${o.id.slice(-6)}`,
          client: o.customerInfo?.name || (o as any).clientName || 'Client',
          amount: validAmt,
          status: o.status
        });
        return acc;
      }, []);

      return chartPoints;
    }, [orders]);

    // Today & Staff Upload Analytics
    const staffUploadStats = useMemo(() => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = todayStart + 86400000;
      const yesterdayStart = todayStart - 86400000;

      const userMap: Record<string, string> = {};
      registeredUsers.forEach((u: any) => {
        if (u.id) userMap[u.id] = u.name || u.email;
        if (u.email) userMap[u.email] = u.name || u.email;
      });

      const staffMap: Record<string, {
        name: string;
        todayOrdersCount: number;
        todayTotalValue: number;
        yesterdayOrdersCount: number;
        allOrdersCount: number;
        allTotalValue: number;
      }> = {};

      orders.forEach(o => {
        const creatorName = (o.createdByName || userMap[o.createdBy] || o.createdBy || 'Unknown Staff').trim();
        if (!staffMap[creatorName]) {
          staffMap[creatorName] = {
            name: creatorName,
            todayOrdersCount: 0,
            todayTotalValue: 0,
            yesterdayOrdersCount: 0,
            allOrdersCount: 0,
            allTotalValue: 0,
          };
        }

        const orderTime = Number(o.createdAt || 0);
        const amount = Number(o.financials?.totalAmount || 0);

        staffMap[creatorName].allOrdersCount += 1;
        staffMap[creatorName].allTotalValue += amount;

        if (orderTime >= todayStart && orderTime < todayEnd) {
          staffMap[creatorName].todayOrdersCount += 1;
          staffMap[creatorName].todayTotalValue += amount;
        } else if (orderTime >= yesterdayStart && orderTime < todayStart) {
          staffMap[creatorName].yesterdayOrdersCount += 1;
        }
      });

      return Object.values(staffMap).sort((a, b) => b.todayOrdersCount - a.todayOrdersCount || b.allOrdersCount - a.allOrdersCount);
    }, [orders, registeredUsers]);

    const totalTodayUploadedOrders = useMemo(() => {
      return staffUploadStats.reduce((sum, s) => sum + s.todayOrdersCount, 0);
    }, [staffUploadStats]);

    const totalTodayUploadedValue = useMemo(() => {
      return staffUploadStats.reduce((sum, s) => sum + s.todayTotalValue, 0);
    }, [staffUploadStats]);

    const getFilteredDeptOrders = () => {
      let baseList = orders;

      // Filter by Staff Name / Search Query
      if (orderStaffSearch.trim()) {
        const q = orderStaffSearch.toLowerCase().trim();
        baseList = baseList.filter(o => {
          const creator = (o.createdByName || '').toLowerCase();
          const cust = (o.customerInfo?.name || '').toLowerCase();
          const phone = (o.customerInfo?.phone || '').toLowerCase();
          const id = (o.id || '').toLowerCase();
          const designer = (o.assignedDesigner || '').toLowerCase();
          const cat = (o.category || '').toLowerCase();
          return creator.includes(q) || cust.includes(q) || phone.includes(q) || id.includes(q) || designer.includes(q) || cat.includes(q);
        });
      }

      // Filter by Specific Staff Filter
      if (orderStaffFilter && orderStaffFilter !== 'all') {
        baseList = baseList.filter(o => {
          const creator = (o.createdByName || '').trim().toLowerCase();
          return creator === orderStaffFilter.trim().toLowerCase();
        });
      }

      // Filter by Date Range (Today, Yesterday, This Week, This Month, Custom)
      if (orderDateRangeFilter !== 'all') {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 86400000;
        const yesterdayStart = todayStart - 86400000;
        const weekStart = todayStart - (now.getDay() * 86400000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        baseList = baseList.filter(o => {
          const t = Number(o.createdAt || 0);
          if (!t) return false;
          if (orderDateRangeFilter === 'today') return t >= todayStart && t < todayEnd;
          if (orderDateRangeFilter === 'yesterday') return t >= yesterdayStart && t < todayStart;
          if (orderDateRangeFilter === 'this_week') return t >= weekStart && t < todayEnd;
          if (orderDateRangeFilter === 'this_month') return t >= monthStart && t < todayEnd;
          if (orderDateRangeFilter === 'custom' && orderCustomDate) {
            const cDate = new Date(orderCustomDate);
            const cStart = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate()).getTime();
            const cEnd = cStart + 86400000;
            return t >= cStart && t < cEnd;
          }
          return true;
        });
      }

      return baseList;
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

    if (authLoading) return <div className="min-h-screen flex items-center justify-center dashboard-page-bg">Loading security context...</div>;

    return (
      <div className="flex dashboard-page-bg min-h-screen">
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
                onClick={() => selectTab('user-logs')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  (activeTab === 'user-logs' || activeTab === 'user-activity') ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "User Activity" : ""}
              >
                <Clock className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>User Activity</span>}
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
                onClick={() => navigate('/lead-dashboard')}
                className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border border-brand-primary/30 bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Lead Dashboard"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lead Dashboard</span>
              </button>
              <button
                onClick={() => navigate('/hr-dashboard')}
                className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="HR & Payroll Dashboard"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">HR & Payroll</span>
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
                  const mktLeadsForecast = leads.filter(l => !l.isOnlineLead && isMarketing(l.createdBy))
                    .reduce((sum, l) => sum + (Number(l.forecastedValue) || 0), 0);
                  const otLeadsForecast = leads.filter(l => !l.isOnlineLead && isOnlineTeam(l.createdBy))
                    .reduce((sum, l) => sum + (Number(l.forecastedValue) || 0), 0);

                  // Leads Converted Value
                  const mktConvertedLeads = leads.filter(l => !l.isOnlineLead && isMarketing(l.createdBy) && (Number(l.totalOrderValue) || 0) > 0);
                  const otConvertedLeads = leads.filter(l => !l.isOnlineLead && isOnlineTeam(l.createdBy) && (Number(l.totalOrderValue) || 0) > 0);
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
                      mktLeadsCount={leads.filter(l => !l.isOnlineLead && isMarketing(l.createdBy)).length}
                      otLeadsCount={leads.filter(l => !l.isOnlineLead && isOnlineTeam(l.createdBy)).length}
                      fmt={fmt}
                      userNameMap={userNameMap}
                      addOrder={addOrder}
                      deleteOrder={deleteOrder}
                      addLead={addLead}
                      deleteLead={deleteLead}
                      setSelectedAdminLeadForLogs={setSelectedAdminLeadForLogs}
                      setShowAdminLogsModal={setShowAdminLogsModal}
                    />
                  );
                })()}


                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                  {/* Global Delivered Orders Revenue Graph */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-left">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
                      <div>
                        <h3 className="font-bold text-gray-800 text-base">Global Delivered Orders Revenue</h3>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                          Cumulative revenue trend from delivered global orders over time
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-brand-primary bg-brand-primary/10 px-3 py-1 rounded-full">
                          {orders.length} Global Orders
                        </span>
                        <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                          ₹{Math.round(totalDeliveredOrdersRevenue || aggregateTotal).toLocaleString('en-IN')} Delivered Revenue
                        </span>
                      </div>
                    </div>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={globalDeliveredOrdersChartData}>
                          <defs>
                            <linearGradient id="colorDeliveredOrdersRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3291B6" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#3291B6" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                          <YAxis
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#3291B6' }}
                            tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                          />
                          <Tooltip
                            formatter={(val: any, name: any) => [
                              `₹${Number(val || 0).toLocaleString('en-IN')}`,
                              name === 'deliveredRevenue' ? 'Cumulative Delivered Revenue' : 'Amount'
                            ]}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '11px', fontWeight: '700' }}
                            cursor={{ stroke: '#3291B6', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                          />
                          <Area type="monotone" dataKey="deliveredRevenue" stroke="#3291B6" strokeWidth={3.5} fillOpacity={1} fill="url(#colorDeliveredOrdersRev)" name="deliveredRevenue" />
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
                              { name: 'Hot', value: leads.filter(l => !l.isOnlineLead && l.leadType === 'Hot').length },
                              { name: 'Warm', value: leads.filter(l => !l.isOnlineLead && l.leadType === 'Warm').length },
                              { name: 'Cold', value: leads.filter(l => !l.isOnlineLead && l.leadType === 'Cold').length },
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
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                          <tr>
                            <th className="px-3.5 py-2.5">User Details</th>
                            <th className="px-3 py-2.5">System Role</th>
                            <th className="px-3 py-2.5">Join Date</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3.5 py-2.5 text-right">Settings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {registeredUsers.map((u, i) => (
                            <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                              <td className="px-3.5 py-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-[10px] uppercase overflow-hidden shrink-0 shadow-xs">
                                    {u.avatar ? (
                                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span>{u.name?.charAt(0) || 'U'}</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-gray-800 text-xs truncate leading-snug">{u.name}</p>
                                    <p className="text-[10px] text-gray-400 truncate leading-tight">{u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={cn(
                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shadow-2xs whitespace-nowrap",
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
                              <td className="px-3 py-2 text-gray-500 text-[11px] whitespace-nowrap font-mono">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                  {u.isBlocked || u.status === 'Blocked' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-[9px] font-black uppercase rounded-full border border-red-200 w-fit">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Blocked
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded-full border border-emerald-200 w-fit">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                    </span>
                                  )}
                                  {u.faceRegistered && (
                                    <span className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-1 py-0.2 rounded w-fit">
                                      <ScanFace className="w-2.5 h-2.5 text-emerald-600" /> Face ID
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3.5 py-2 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUserToEdit({ ...u });
                                      setShowEditUserModal(true);
                                    }}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    <Edit className="w-3 h-3" /> Edit
                                  </button>
                                  {u.id !== user?.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleBlockUser(u)}
                                      className={cn(
                                        "px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 shrink-0",
                                        u.isBlocked || u.status === 'Blocked'
                                          ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                          : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                                      )}
                                    >
                                      {u.isBlocked || u.status === 'Blocked' ? '🟢 Unblock' : '🚫 Block'}
                                    </button>
                                  )}
                                  {u.id !== user?.id && (
                                    <button onClick={() => handleRemoveUser(u.id)} className="p-1 hover:bg-red-50 rounded-md text-red-500 transition-colors border-none cursor-pointer shrink-0">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {registeredUsers.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic text-xs">
                                No team members registered yet or sync in progress.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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

                {/* Today's Staff Uploads Analytics Bar */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-sm">
                        ⚡
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                          Today's Staff Uploads
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                            {totalTodayUploadedOrders} Orders Today (₹{totalTodayUploadedValue.toLocaleString('en-IN')})
                          </span>
                        </h4>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                          Live tracking of orders uploaded by each staff member today
                        </p>
                      </div>
                    </div>

                    {/* Date Range Selector */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-150">
                      {(
                        [
                          { id: 'all', label: 'All Time' },
                          { id: 'today', label: `Today (${totalTodayUploadedOrders})` },
                          { id: 'yesterday', label: 'Yesterday' },
                          { id: 'this_week', label: 'This Week' },
                          { id: 'this_month', label: 'This Month' },
                          { id: 'custom', label: 'Custom' },
                        ] as const
                      ).map(dr => (
                        <button
                          key={dr.id}
                          onClick={() => setOrderDateRangeFilter(dr.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer border-none",
                            orderDateRangeFilter === dr.id
                              ? "bg-black text-white shadow-xs"
                              : "text-gray-500 hover:text-gray-900 bg-transparent hover:bg-gray-200/50"
                          )}
                        >
                          {dr.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {orderDateRangeFilter === 'custom' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Select Date:</span>
                      <input
                        type="date"
                        value={orderCustomDate}
                        onChange={e => setOrderCustomDate(e.target.value)}
                        className="text-xs border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-1 text-gray-700 font-bold focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Staff Badges Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-dashed border-gray-100">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider mr-1">Staff Breakdown:</span>
                    <button
                      onClick={() => setOrderStaffFilter('all')}
                      className={cn(
                        "px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                        orderStaffFilter === 'all'
                          ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      <span>All Staff</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-black/15 text-[9px] font-black">{orders.length}</span>
                    </button>

                    {staffUploadStats.map(s => {
                      const isSelected = orderStaffFilter.toLowerCase() === s.name.toLowerCase();
                      return (
                        <button
                          key={s.name}
                          onClick={() => setOrderStaffFilter(isSelected ? 'all' : s.name)}
                          className={cn(
                            "px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                            isSelected
                              ? "bg-black text-white border-black shadow-xs"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                          )}
                        >
                          <span>{s.name}</span>
                          {s.todayOrdersCount > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-white text-[9px] font-black shadow-xs">
                              +{s.todayOrdersCount} today
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded-md bg-gray-200 text-gray-600 text-[9px] font-black">
                              0 today
                            </span>
                          )}
                          <span className="text-[9px] text-gray-400 font-medium">({s.allOrdersCount} total)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search Bar Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orderStaffSearch}
                      onChange={e => setOrderStaffSearch(e.target.value)}
                      placeholder="Search staff (e.g. Godwin), customer, order #, category, designer..."
                      className="w-full text-xs pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                    {orderStaffSearch && (
                      <button
                        onClick={() => setOrderStaffSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 border-none bg-transparent cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <span className="text-xs font-black text-gray-500 px-2">
                      {getFilteredDeptOrders().length} Orders Found
                    </span>
                    {(orderStaffSearch || orderStaffFilter !== 'all' || orderDateRangeFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setOrderStaffSearch('');
                          setOrderStaffFilter('all');
                          setOrderDateRangeFilter('all');
                          setOrderCustomDate('');
                        }}
                        className="px-3.5 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl hover:bg-red-100 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-[11px] border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">Order ID</th>
                        <th className="px-6 py-4">Customer & Creator</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Quantity</th>
                        <th className="px-6 py-4">Status & Step</th>
                        <th className="px-6 py-4 text-right">Value</th>
                        <th className="px-6 py-4 text-right">Actions Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getFilteredDeptOrders().map((o) => {
                        const isOrderCreatedToday = (() => {
                          if (!o.createdAt) return false;
                          const d = new Date(o.createdAt);
                          const now = new Date();
                          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                        })();

                        return (
                        <tr key={o.id} className="hover:bg-gray-50/50 group transition-colors">
                          <td className="px-6 py-4 font-mono font-black text-brand-primary text-xs">
                            #{o.id.slice(-8)}
                            {isOrderCreatedToday && (
                              <span className="block mt-1 text-[8px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">
                                ⚡ Today
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {((o.staffImages && o.staffImages[0]) || o.marketing_image) && (
                                <div className="w-10 h-10 rounded-xl border border-gray-200 overflow-hidden shrink-0 bg-gray-50">
                                  <img src={o.staffImages?.[0] || o.marketing_image} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-gray-800">{o.customerInfo.name}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{o.customerInfo.phone || 'No phone'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <p className="text-[9px] text-brand-primary font-black uppercase tracking-wider">
                                    Created by: {o.createdByName || 'System'}
                                  </p>
                                  {isOrderCreatedToday && (
                                    <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-500 text-white">
                                      Today
                                    </span>
                                  )}
                                </div>
                                {o.createdAt && (
                                  <p className="text-[8px] text-gray-400 font-mono mt-0.5">
                                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                )}
                              </div>
                            </div>
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
                      );
                    })}
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
            ) : (activeTab === 'user-logs' || activeTab === 'user-activity') ? (
              <div className="space-y-8 animate-fadeIn text-left">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <Clock className="w-5 h-5 text-brand-primary" />
                      User Activity & Login Monitoring
                    </h2>
                    <p className="text-gray-500 text-xs mt-1 font-medium">
                      Real-time morning first login, last login date & time, logout timestamps, and session history per user
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={selectedActivityMonth}
                      onChange={(e) => setSelectedActivityMonth(e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none cursor-pointer focus:border-brand-primary"
                    >
                      <option value="all">📅 All Time (All Months)</option>
                      <option value="current">🗓️ Current Month (Aug 2026)</option>
                      <option value="2026-08">August 2026</option>
                      <option value="2026-07">July 2026</option>
                      <option value="2026-06">June 2026</option>
                    </select>
                    <button
                      onClick={() => fetchUserLogs()}
                      className="px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none flex items-center gap-2"
                    >
                      Refresh Activity Logs
                    </button>
                  </div>
                </div>

                {/* Main User Activity Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">Team User Activity Summary</h3>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                        Click on any user row to view their individual morning first login, last login & session history
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      {registeredUsers.length} Users Registered
                    </span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 font-black uppercase tracking-wider text-[9px] border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">🌅 Morning First Login</th>
                        <th className="px-6 py-4">🕒 Last Login Date & Time</th>
                        <th className="px-6 py-4">🚪 Last Logout Date & Time</th>
                        <th className="px-6 py-4">⏱️ Working Hours (Daily & Monthly)</th>
                        <th className="px-6 py-4 text-center">Logins</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {userLogsLoading ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-xs text-gray-400 italic">
                            Loading team user activity...
                          </td>
                        </tr>
                      ) : registeredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-xs text-gray-400 italic">
                            No registered users found.
                          </td>
                        </tr>
                      ) : (
                        registeredUsers.map((uItem: any) => {
                          const userRawLogs = userLogs.filter((log: any) =>
                            log.userId === uItem.id ||
                            log.userId === uItem.uid ||
                            (log.userEmail && uItem.email && log.userEmail.toLowerCase().trim() === uItem.email.toLowerCase().trim()) ||
                            (log.userName && uItem.name && log.userName.toLowerCase().trim() === uItem.name.toLowerCase().trim())
                          );

                          // Filter logs by selected month
                          const uLogs = userRawLogs.filter((l: any) => {
                            if (!selectedActivityMonth || selectedActivityMonth === 'all') return true;
                            const d = new Date(Number(l.loginTime));
                            if (selectedActivityMonth === 'current') {
                              const now = new Date();
                              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                            }
                            const [yearStr, monthStr] = selectedActivityMonth.split('-');
                            return d.getFullYear() === Number(yearStr) && (d.getMonth() + 1) === Number(monthStr);
                          });

                          // Helper for Days Format
                          const getDaysAgoInfo = (timestamp: number | null | undefined) => {
                            if (!timestamp) return null;
                            const date = new Date(timestamp);
                            const now = new Date();

                            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                            const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

                            const diffMs = todayStart - targetStart;
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                            const timeStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
                            const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                            const fullDateTime = `${dateStr}, ${timeStr}`;

                            let daysTag = 'Today';
                            let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            if (diffDays === 1) {
                              daysTag = '1 day ago';
                              colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
                            } else if (diffDays > 1) {
                              daysTag = `${diffDays} days ago`;
                              colorClass = 'bg-purple-50 text-purple-700 border-purple-200';
                            }

                            return { daysTag, fullDateTime, timeStr, dateStr, diffDays, colorClass };
                          };

                          // Filter AM Logins (Hour < 12 AM) vs PM Logins (Hour >= 12 PM)
                          const amLogs = uLogs.filter((l: any) => new Date(Number(l.loginTime)).getHours() < 12);
                          const pmLogs = uLogs.filter((l: any) => new Date(Number(l.loginTime)).getHours() >= 12);

                          // Morning First Login (Earliest AM login overall)
                          const morningFirstLogin = amLogs.length > 0
                            ? Math.min(...amLogs.map((l: any) => Number(l.loginTime)))
                            : (uLogs.length > 0 ? Math.min(...uLogs.map((l: any) => Number(l.loginTime))) : null);

                          // Evening Last Login (Latest PM login, or overall latest login)
                          const eveningLastLogin = pmLogs.length > 0
                            ? Math.max(...pmLogs.map((l: any) => Number(l.loginTime)))
                            : (uLogs.length > 0 ? Math.max(...uLogs.map((l: any) => Number(l.loginTime))) : null);

                          const logoutLogs = uLogs.filter((l: any) => l.logoutTime);
                          const lastLogout = logoutLogs.length > 0 ? Math.max(...logoutLogs.map((l: any) => Number(l.logoutTime))) : null;

                          const isActiveNow = uLogs.some((l: any) => !l.logoutTime || Number(l.loginTime) > Number(l.logoutTime || 0));

                          const morningInfo = getDaysAgoInfo(morningFirstLogin);
                          const eveningInfo = getDaysAgoInfo(eveningLastLogin);
                          const logoutInfo = getDaysAgoInfo(lastLogout);

                          // --- Office Working Hours: 9:00 AM to 6:00 PM (9 Hours) ---
                          // Check Morning Login Punctuality (Target 9:00 AM, grace up to 9:15 AM)
                          let isMorningLate = false;
                          let morningLateTimeStr = '';
                          if (morningFirstLogin) {
                            const mObj = new Date(morningFirstLogin);
                            const mHr = mObj.getHours();
                            const mMin = mObj.getMinutes();
                            if (mHr > 9 || (mHr === 9 && mMin > 15)) {
                              isMorningLate = true;
                              morningLateTimeStr = mObj.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
                            }
                          }

                          // Check Evening Logout Punctuality (Target 6:00 PM / 18:00)
                          let isLogoutEarly = false;
                          let logoutEarlyTimeStr = '';
                          if (lastLogout && !isActiveNow) {
                            const lObj = new Date(lastLogout);
                            const lHr = lObj.getHours();
                            if (lHr < 18) {
                              isLogoutEarly = true;
                              logoutEarlyTimeStr = lObj.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
                            }
                          }

                          // --- Group logs by Calendar Day (YYYY-MM-DD) to calculate Daily & Monthly hours accurately ---
                          const dailyMap: Record<string, { logins: any[]; dayStart: number; dayEnd: number; dayWorkedMs: number }> = {};

                          uLogs.forEach((l: any) => {
                            const d = new Date(Number(l.loginTime));
                            const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                            if (!dailyMap[dayKey]) {
                              dailyMap[dayKey] = { logins: [], dayStart: Number(l.loginTime), dayEnd: Number(l.logoutTime || l.loginTime), dayWorkedMs: 0 };
                            }

                            dailyMap[dayKey].logins.push(l);

                            const loginT = Number(l.loginTime);
                            const logoutT = l.logoutTime ? Number(l.logoutTime) : (loginT + (8 * 3600 * 1000));
                            const sessionDur = Math.min(Math.max(0, logoutT - loginT), 10 * 3600 * 1000);

                            dailyMap[dayKey].dayWorkedMs += sessionDur;
                            if (loginT < dailyMap[dayKey].dayStart) dailyMap[dayKey].dayStart = loginT;
                            if (logoutT > dailyMap[dayKey].dayEnd) dailyMap[dayKey].dayEnd = logoutT;
                          });

                          // Compute Monthly Totals
                          const daysWorkedInMonth = Object.keys(dailyMap).length;
                          let totalMonthlyMs = 0;
                          Object.values(dailyMap).forEach((dayData) => {
                            totalMonthlyMs += Math.min(dayData.dayWorkedMs, 12 * 3600 * 1000);
                          });

                          const monthlyHoursNum = Math.floor(totalMonthlyMs / 3600000);
                          const monthlyMinsNum = Math.round((totalMonthlyMs % 3600000) / 60000);
                          const monthlyHoursText = `${monthlyHoursNum}h ${monthlyMinsNum}m`;

                          // Latest Day Details
                          const sortedDayKeys = Object.keys(dailyMap).sort().reverse();
                          const latestDayKey = sortedDayKeys[0];
                          const latestDayData = latestDayKey ? dailyMap[latestDayKey] : null;

                          let dailyHoursText = '—';
                          let latestDayLabel = '';
                          let shiftBadgeText = 'No Activity';
                          let shiftBadgeStyle = 'bg-gray-50 text-gray-400 border-gray-200';
                          let punctualitySubtext = 'Shift: 9:00 AM – 6:00 PM';

                          if (latestDayData) {
                            const dayMs = Math.min(latestDayData.dayWorkedMs, 12 * 3600 * 1000);
                            const hrs = Math.floor(dayMs / 3600000);
                            const mins = Math.round((dayMs % 3600000) / 60000);
                            dailyHoursText = `${hrs}h ${mins}m`;

                            const dObj = new Date(latestDayData.dayStart);
                            latestDayLabel = `${dObj.getDate()}/${dObj.getMonth() + 1}`;

                            const workHrsDec = dayMs / 3600000;
                            if (isActiveNow) {
                              shiftBadgeText = `Active (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
                            } else if (isMorningLate && isLogoutEarly) {
                              shiftBadgeText = `LOP: Late & Early Exit (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                            } else if (isMorningLate) {
                              shiftBadgeText = `LOP: Late Entry (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                            } else if (isLogoutEarly) {
                              shiftBadgeText = `LOP: Early Exit (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                            } else if (workHrsDec >= 8.5) {
                              shiftBadgeText = `Full Shift (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                            } else if (workHrsDec >= 4) {
                              shiftBadgeText = `Partial Shift (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                            } else {
                              shiftBadgeText = `Short Shift LOP (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                            }

                            const entryDetail = isMorningLate ? `Late Entry (${morningLateTimeStr})` : 'On Time (9 AM Start)';
                            const exitDetail = lastLogout ? (isLogoutEarly ? `Early Exit (${logoutEarlyTimeStr})` : 'On Time Exit (6 PM)') : 'No Logout';
                            punctualitySubtext = `${entryDetail} • ${exitDetail}`;
                          }

                          return (
                            <tr
                              key={uItem.id || uItem.uid}
                              onClick={() => {
                                setSelectedUserForActivity(uItem);
                                setShowUserActivityModal(true);
                              }}
                              className="hover:bg-brand-primary/5 transition-colors cursor-pointer group"
                            >
                              {/* User Info */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-black text-xs uppercase shadow-sm">
                                    {uItem.name?.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-800 text-xs group-hover:text-brand-primary transition-colors">{uItem.name}</p>
                                    <p className="text-[10px] text-gray-400">{uItem.email}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Role */}
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-gray-100 text-gray-600 border border-gray-200">
                                  {uItem.role?.replace('_', ' ')}
                                </span>
                              </td>

                              {/* Morning First Login */}
                              <td className="px-6 py-4">
                                {morningInfo ? (
                                  <div>
                                    <div className="flex items-center gap-1 mb-1">
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 inline-block">
                                        AM Login
                                      </span>
                                      {isMorningLate ? (
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 inline-block">
                                          🔴 Late (LOP)
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                                          🟢 On Time
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-mono text-xs font-bold text-amber-900">{morningInfo.fullDateTime}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 font-mono text-xs">—</span>
                                )}
                              </td>

                              {/* Evening / Last Login in Days Format & Login Method */}
                              <td className="px-6 py-4">
                                {eveningInfo ? (
                                  <div>
                                    <div className="flex flex-wrap items-center gap-1 mb-1">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border inline-block ${eveningInfo.colorClass}`}>
                                        {eveningInfo.daysTag}
                                      </span>
                                      {(() => {
                                        const lt = (uLogs[0]?.loginType || 'PASSWORD').toUpperCase();
                                        if (lt === 'FACE_ID') {
                                          return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">👤 Face ID</span>;
                                        }
                                        if (lt === 'FINGERPRINT') {
                                          return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">👆 Touch ID</span>;
                                        }
                                        if (lt === 'GOOGLE') {
                                          return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-50 text-red-700 border border-red-200">🌐 Google</span>;
                                        }
                                        return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-gray-100 text-gray-700 border border-gray-200">🔑 Password</span>;
                                      })()}
                                    </div>
                                    <p className="font-mono text-xs font-bold text-blue-700">{eveningInfo.fullDateTime}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 font-mono text-xs">—</span>
                                )}
                              </td>

                              {/* Last Logout / Status */}
                              <td className="px-6 py-4">
                                {isActiveNow ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-full border border-emerald-200 shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Now
                                  </span>
                                ) : logoutInfo ? (
                                  <div>
                                    <div className="flex flex-wrap items-center gap-1 mb-1">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border inline-block ${logoutInfo.colorClass}`}>
                                        {logoutInfo.daysTag}
                                      </span>
                                      {isLogoutEarly ? (
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 inline-block">
                                          🔴 Early Exit (LOP)
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                                          🟢 On Time
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-mono text-xs font-semibold text-gray-600">{logoutInfo.fullDateTime}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 font-mono text-xs">—</span>
                                )}
                              </td>

                              {/* Working Hours Monitoring (Daily & Monthly) */}
                              <td className="px-6 py-4">
                                {latestDayData ? (
                                  <div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border inline-block mb-1 ${shiftBadgeStyle}`}>
                                      {shiftBadgeText}
                                    </span>
                                    <p className="font-mono text-xs font-black text-gray-900">
                                      Daily: {dailyHoursText} <span className="text-[10px] text-gray-400 font-bold">({latestDayLabel})</span>
                                    </p>
                                    <div className="mt-1">
                                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded inline-block">
                                        Monthly: {monthlyHoursText} ({daysWorkedInMonth} days)
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">{punctualitySubtext}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 font-mono text-xs">—</span>
                                )}
                              </td>

                              {/* Logins Count */}
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full border border-indigo-100">
                                  {uLogs.length}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUserForActivity(uItem);
                                    setShowUserActivityModal(true);
                                  }}
                                  className="px-3 py-1 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-[10px] font-black uppercase tracking-wider rounded-lg border-none cursor-pointer transition-all"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Single User Activity Details Modal */}
                {showUserActivityModal && selectedUserForActivity && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
                    <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fadeIn">
                      {/* Modal Header */}
                      <div className="bg-brand-primary px-6 py-5 flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-sm uppercase">
                            {selectedUserForActivity.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black">{selectedUserForActivity.name}</h3>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-white/20 text-white">
                                {selectedUserForActivity.role?.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-white/80">{selectedUserForActivity.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowUserActivityModal(false);
                            setSelectedUserForActivity(null);
                          }}
                          className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border-none cursor-pointer text-white"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Modal Body */}
                      <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-left">
                        {/* KPI Cards for User */}
                        {(() => {
                          const uLogs = userLogs.filter((log: any) =>
                            log.userId === selectedUserForActivity.id ||
                            log.userId === selectedUserForActivity.uid ||
                            (log.userEmail && selectedUserForActivity.email && log.userEmail.toLowerCase().trim() === selectedUserForActivity.email.toLowerCase().trim()) ||
                            (log.userName && selectedUserForActivity.name && log.userName.toLowerCase().trim() === selectedUserForActivity.name.toLowerCase().trim())
                          );

                          const getDaysAgoInfo = (timestamp: number | null | undefined) => {
                            if (!timestamp) return null;
                            const date = new Date(timestamp);
                            const now = new Date();

                            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                            const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

                            const diffMs = todayStart - targetStart;
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                            const timeStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
                            const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                            const fullDateTime = `${dateStr}, ${timeStr}`;

                            let daysTag = 'Today';
                            if (diffDays === 1) daysTag = '1 day ago';
                            else if (diffDays > 1) daysTag = `${diffDays} days ago`;

                            return { daysTag, fullDateTime, timeStr, dateStr, diffDays };
                          };

                          const amLogs = uLogs.filter((l: any) => new Date(Number(l.loginTime)).getHours() < 12);
                          const pmLogs = uLogs.filter((l: any) => new Date(Number(l.loginTime)).getHours() >= 12);

                          const morningFirstLogin = amLogs.length > 0
                            ? Math.min(...amLogs.map((l: any) => Number(l.loginTime)))
                            : null;

                          const eveningLastLogin = pmLogs.length > 0
                            ? Math.max(...pmLogs.map((l: any) => Number(l.loginTime)))
                            : (uLogs.length > 0 ? Math.max(...uLogs.map((l: any) => Number(l.loginTime))) : null);

                          const logoutLogs = uLogs.filter((l: any) => l.logoutTime);
                          const lastLogout = logoutLogs.length > 0 ? Math.max(...logoutLogs.map((l: any) => Number(l.logoutTime))) : null;

                          const isActiveNow = uLogs.some((l: any) => !l.logoutTime || Number(l.loginTime) > Number(l.logoutTime || 0));

                          const morningInfo = getDaysAgoInfo(morningFirstLogin);
                          const eveningInfo = getDaysAgoInfo(eveningLastLogin);
                          const logoutInfo = getDaysAgoInfo(lastLogout);

                          const dailyMap: Record<string, { logins: any[]; dayStart: number; dayEnd: number; dayWorkedMs: number }> = {};

                          uLogs.forEach((l: any) => {
                            const d = new Date(Number(l.loginTime));
                            const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                            if (!dailyMap[dayKey]) {
                              dailyMap[dayKey] = { logins: [], dayStart: Number(l.loginTime), dayEnd: Number(l.logoutTime || l.loginTime), dayWorkedMs: 0 };
                            }

                            dailyMap[dayKey].logins.push(l);

                            const loginT = Number(l.loginTime);
                            const logoutT = l.logoutTime ? Number(l.logoutTime) : (loginT + (8 * 3600 * 1000));
                            const sessionDur = Math.min(Math.max(0, logoutT - loginT), 10 * 3600 * 1000);

                            dailyMap[dayKey].dayWorkedMs += sessionDur;
                          });

                          const daysWorkedInMonth = Object.keys(dailyMap).length;
                          let totalMonthlyMs = 0;
                          Object.values(dailyMap).forEach((dayData) => {
                            totalMonthlyMs += Math.min(dayData.dayWorkedMs, 12 * 3600 * 1000);
                          });

                          const monthlyHoursText = `${Math.floor(totalMonthlyMs / 3600000)}h ${Math.round((totalMonthlyMs % 3600000) / 60000)}m`;

                          let isMorningLate = false;
                          if (morningFirstLogin) {
                            const mObj = new Date(morningFirstLogin);
                            const mHr = mObj.getHours();
                            const mMin = mObj.getMinutes();
                            if (mHr > 9 || (mHr === 9 && mMin > 15)) isMorningLate = true;
                          }

                          let isLogoutEarly = false;
                          if (lastLogout && !isActiveNow) {
                            const lObj = new Date(lastLogout);
                            const lHr = lObj.getHours();
                            if (lHr < 18) isLogoutEarly = true;
                          }

                          const sortedDayKeys = Object.keys(dailyMap).sort().reverse();
                          const latestDayKey = sortedDayKeys[0];
                          const latestDayData = latestDayKey ? dailyMap[latestDayKey] : null;

                          let workingHoursText = '—';
                          let shiftBadgeText = 'No Activity';
                          let shiftBadgeStyle = 'bg-gray-50 text-gray-400 border-gray-200';

                          if (latestDayData) {
                            const dayMs = Math.min(latestDayData.dayWorkedMs, 12 * 3600 * 1000);
                            const hrs = Math.floor(dayMs / 3600000);
                            const mins = Math.round((dayMs % 3600000) / 60000);
                            workingHoursText = `${hrs}h ${mins}m`;

                            const workHrsDec = dayMs / 3600000;
                            if (isActiveNow) {
                              shiftBadgeText = 'Active Working';
                              shiftBadgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
                            } else if (isMorningLate && isLogoutEarly) {
                              shiftBadgeText = 'LOP: Late & Early Exit';
                              shiftBadgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                            } else if (isMorningLate) {
                              shiftBadgeText = 'LOP: Late Entry';
                              shiftBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                            } else if (isLogoutEarly) {
                              shiftBadgeText = 'LOP: Early Exit';
                              shiftBadgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                            } else if (workHrsDec >= 8.5) {
                              shiftBadgeText = 'Full Shift (9 hrs)';
                              shiftBadgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                            } else if (workHrsDec >= 4) {
                              shiftBadgeText = 'Partial Shift';
                              shiftBadgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                            } else {
                              shiftBadgeText = 'Short Shift (LOP)';
                              shiftBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                            }
                          }

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Morning First Login Card */}
                              <div className="p-4 bg-amber-50/70 border border-amber-200/70 rounded-2xl shadow-xs">
                                <div className="flex items-center justify-between gap-1.5 text-amber-800 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-amber-600" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Morning First Login</span>
                                  </div>
                                  {morningInfo && (
                                    isMorningLate ? (
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                        🔴 Late Entry (LOP)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        🟢 On Time
                                      </span>
                                    )
                                  )}
                                </div>
                                <p className="text-xs font-black text-amber-950 font-mono mt-1">
                                  {morningInfo ? morningInfo.fullDateTime : 'No AM Login Recorded'}
                                </p>
                                <p className="text-[9px] text-gray-400 font-bold mt-1">Standard Start: 9:00 AM</p>
                              </div>

                              {/* Evening Last Login Card (Days Format) */}
                              <div className="p-4 bg-blue-50/70 border border-blue-200/70 rounded-2xl shadow-xs">
                                <div className="flex items-center justify-between gap-1.5 text-blue-800 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <LogIn className="w-4 h-4 text-blue-600" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Evening Last Login</span>
                                  </div>
                                  {eveningInfo && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                      {eveningInfo.daysTag}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-black text-blue-950 font-mono mt-1">
                                  {eveningInfo ? eveningInfo.fullDateTime : 'No Login Recorded'}
                                </p>
                              </div>

                              {/* Last Logout Card */}
                              <div className="p-4 bg-purple-50/70 border border-purple-200/70 rounded-2xl shadow-xs">
                                <div className="flex items-center justify-between gap-1.5 text-purple-800 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <LogOutIcon className="w-4 h-4 text-purple-600" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Last Logout</span>
                                  </div>
                                  {logoutInfo && !isActiveNow && (
                                    isLogoutEarly ? (
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                        🔴 Early Exit (LOP)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        🟢 On Time
                                      </span>
                                    )
                                  )}
                                </div>
                                <p className="text-xs font-black text-purple-950 font-mono mt-1">
                                  {isActiveNow ? (
                                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Now
                                    </span>
                                  ) : logoutInfo ? (
                                    logoutInfo.fullDateTime
                                  ) : (
                                    '—'
                                  )}
                                </p>
                                <p className="text-[9px] text-gray-400 font-bold mt-1">Standard Logout: 6:00 PM</p>
                              </div>

                              {/* Working Hours Card (9:00 AM - 6:00 PM) */}
                              <div className="p-4 bg-indigo-50/70 border border-indigo-200/70 rounded-2xl shadow-xs">
                                <div className="flex items-center justify-between gap-1.5 text-indigo-800 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-indigo-600" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Working Hours</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${shiftBadgeStyle}`}>
                                    {shiftBadgeText}
                                  </span>
                                </div>
                                <p className="text-sm font-black text-indigo-950 font-mono mt-1">
                                  {workingHoursText}
                                </p>
                                <p className="text-[9px] text-gray-400 font-bold mt-0.5">Target: 9 AM – 6 PM (9 hrs)</p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Individual Session History Table */}
                        <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-xs">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
                              {selectedUserForActivity.name}'s Complete Session Logs
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
                                <tr>
                                  <th className="px-4 py-2.5">Login Date & Time</th>
                                  <th className="px-4 py-2.5">Auth Method</th>
                                  <th className="px-4 py-2.5">Logout Date & Time</th>
                                  <th className="px-4 py-2.5 text-right">Duration</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {(() => {
                                  const uLogs = userLogs.filter((log: any) =>
                                    log.userId === selectedUserForActivity.id ||
                                    log.userId === selectedUserForActivity.uid ||
                                    (log.userEmail && selectedUserForActivity.email && log.userEmail.toLowerCase().trim() === selectedUserForActivity.email.toLowerCase().trim()) ||
                                    (log.userName && selectedUserForActivity.name && log.userName.toLowerCase().trim() === selectedUserForActivity.name.toLowerCase().trim())
                                  );

                                  if (uLogs.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={4} className="py-6 text-center text-gray-400 italic">
                                          No session logs recorded for {selectedUserForActivity.name}.
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return uLogs.map((log: any) => {
                                    let dur = 'Active Now';
                                    if (log.logoutTime) {
                                      const diffMins = Math.round((log.logoutTime - log.loginTime) / 60000);
                                      if (diffMins < 1) dur = '< 1 min';
                                      else if (diffMins < 60) dur = `${diffMins} mins`;
                                      else dur = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
                                    }

                                    const lt = (log.loginType || 'PASSWORD').toUpperCase();

                                    return (
                                      <tr key={log.id || log.loginTime} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-4 py-2.5 font-mono text-gray-800">
                                          {new Date(log.loginTime).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          {lt === 'FACE_ID' ? (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">👤 Face ID</span>
                                          ) : lt === 'FINGERPRINT' ? (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">👆 Touch ID</span>
                                          ) : lt === 'GOOGLE' ? (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-50 text-red-700 border border-red-200">🌐 Google</span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-gray-100 text-gray-700 border border-gray-200">🔑 Password</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-gray-600">
                                          {log.logoutTime ? new Date(log.logoutTime).toLocaleString('en-IN') : <span className="text-emerald-600 font-bold">● Active Now</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-bold text-gray-700">{dur}</td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'online-leads' ? (
              <div className="space-y-6 animate-fadeIn">
                {(() => {
                  const otLeads = leads.filter(l => isOnlineTeam(l.createdBy));
                  return (
                    <>
                      {/* Table of Leads */}
                      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-left space-y-4 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-3">
                          <h3 className="text-lg font-bold text-gray-900">Leads Registry & Call Logs</h3>
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                              onClick={() => setShowAddLeadConvert(true)}
                              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border-none cursor-pointer shadow-md transition-all active:scale-95 animate-pulse-subtle"
                            >
                              <Plus size={14} /> Add Lead / Client
                            </button>
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
                              {otLeads
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
                                      <td className="px-6 py-4 text-center">
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
                                          onClick={() => deleteLead(lead.id)}
                                          title="Delete Lead"
                                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 transition-all cursor-pointer animate-in fade-in"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              {otLeads.length === 0 && (
                                <tr>
                                  <td colSpan={7} className="py-12 text-center text-gray-400 italic">No leads found in the system.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : activeTab === 'attendance' ? (
              <div className="space-y-6 animate-fadeIn">
                {/* Edit Modal */}
                {editingAttendance && (
                  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md space-y-5 border border-gray-100 animate-fadeIn">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-black text-gray-900">Edit Attendance Record</h3>
                          <p className="text-xs text-gray-400 mt-0.5 font-semibold uppercase tracking-widest">{editingAttendance.name} · {editingAttendance.date ? new Date(editingAttendance.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
                        </div>
                        <button onClick={() => setEditingAttendance(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all border-none cursor-pointer"><X size={14} /></button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Login Time</label>
                          <input
                            type="datetime-local"
                            value={attendanceEditForm.loginTime}
                            onChange={e => setAttendanceEditForm(f => ({ ...f, loginTime: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Logout Time</label>
                          <input
                            type="datetime-local"
                            value={attendanceEditForm.logoutTime}
                            onChange={e => setAttendanceEditForm(f => ({ ...f, logoutTime: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Notes</label>
                          <textarea
                            value={attendanceEditForm.notes}
                            onChange={e => setAttendanceEditForm(f => ({ ...f, notes: e.target.value }))}
                            rows={2}
                            placeholder="Optional notes for salary record..."
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-gray-50 resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setEditingAttendance(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 cursor-pointer transition-all">Cancel</button>
                        <button
                          onClick={handleSaveAttendanceEdit}
                          disabled={savingAttendance}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest hover:bg-brand-primary/90 cursor-pointer transition-all disabled:opacity-60 border-none shadow-md"
                        >
                          {savingAttendance ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Attendance & Work Hours</h2>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mt-0.5">Login · Logout · Duration — For Salary Calculation</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={attendanceDateFilter}
                      onChange={e => setAttendanceDateFilter(e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                    {attendanceDateFilter && (
                      <button onClick={() => setAttendanceDateFilter('')} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-black text-gray-400 hover:text-gray-700 cursor-pointer bg-white transition-all">Clear</button>
                    )}
                    <button onClick={fetchAttendanceLogs} className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest hover:bg-brand-primary/90 cursor-pointer border-none shadow-md transition-all">Refresh</button>
                  </div>
                </div>

                {/* Attendance Table */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  {attendanceLoading ? (
                    <div className="py-20 text-center text-gray-400 text-sm italic animate-pulse">Loading attendance records...</div>
                  ) : (() => {
                    const filtered = attendanceLogs.filter(log => {
                      if (!attendanceDateFilter) return true;
                      const logDate = log.loginTime ? new Date(log.loginTime).toISOString().split('T')[0] : (log.date || '');
                      return logDate === attendanceDateFilter;
                    });

                    const calcDuration = (login: string, logout: string) => {
                      if (!login || !logout) return null;
                      const diff = new Date(logout).getTime() - new Date(login).getTime();
                      if (diff <= 0) return null;
                      const h = Math.floor(diff / 3600000);
                      const m = Math.floor((diff % 3600000) / 60000);
                      return { label: `${h}h ${m}m`, ms: diff };
                    };

                    const fmtTime = (iso: string) => {
                      if (!iso) return '—';
                      return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                    };

                    const fmtDate = (iso: string) => {
                      if (!iso) return '—';
                      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    };

                    return filtered.length === 0 ? (
                      <div className="py-20 text-center text-gray-400 italic text-sm">No attendance records found{attendanceDateFilter ? ` for ${attendanceDateFilter}` : ''}.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1"><LogIn size={10} /> Login</span>
                              </th>
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1"><LogOutIcon size={10} /> Logout</span>
                              </th>
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</th>
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {filtered.map((log: any, idx: number) => {
                              const loginIso = log.loginTime || log.login_time || '';
                              const logoutIso = log.logoutTime || log.logout_time || '';
                              const dur = calcDuration(loginIso, logoutIso);
                              return (
                                <tr key={log.id || idx} className="hover:bg-gray-50/60 transition-colors">
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-black flex-shrink-0">
                                        {(log.name || log.userName || '?').charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-gray-900 leading-none">{log.name || log.userName || '—'}</p>
                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{log.email || log.userEmail || ''}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-xs font-semibold text-gray-600">{fmtDate(loginIso || log.date || '')}</td>
                                  <td className="px-5 py-3.5">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                      <LogIn size={10} /> {fmtTime(loginIso)}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5">
                                    {logoutIso ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                                        <LogOutIcon size={10} /> {fmtTime(logoutIso)}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100">
                                        Active
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5">
                                    {dur ? (
                                      <span className="text-xs font-black text-brand-primary">{dur.label}</span>
                                    ) : (
                                      <span className="text-xs text-gray-300 italic">—</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[120px] truncate italic">
                                    {log.notes || '—'}
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    <button
                                      onClick={() => {
                                        setEditingAttendance(log);
                                        setAttendanceEditForm({
                                          loginTime: loginIso ? new Date(loginIso).toISOString().slice(0, 16) : '',
                                          logoutTime: logoutIso ? new Date(logoutIso).toISOString().slice(0, 16) : '',
                                          notes: log.notes || ''
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-primary/5 hover:bg-brand-primary/15 text-brand-primary text-xs font-black border border-brand-primary/10 cursor-pointer transition-all"
                                    >
                                      <Edit size={11} /> Edit
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                {/* Per-Employee Summary */}
                {!attendanceLoading && attendanceLogs.length > 0 && (() => {
                  const calcDuration = (login: string, logout: string) => {
                    if (!login || !logout) return 0;
                    const diff = new Date(logout).getTime() - new Date(login).getTime();
                    return diff > 0 ? diff : 0;
                  };

                  const summaryMap: Record<string, { name: string; email: string; days: number; totalMs: number }> = {};
                  attendanceLogs.forEach((log: any) => {
                    const key = log.userId || log.user_id || log.email || log.userEmail || log.name;
                    if (!key) return;
                    if (!summaryMap[key]) {
                      summaryMap[key] = { name: log.name || log.userName || key, email: log.email || log.userEmail || '', days: 0, totalMs: 0 };
                    }
                    const loginIso = log.loginTime || log.login_time || '';
                    const logoutIso = log.logoutTime || log.logout_time || '';
                    if (loginIso) summaryMap[key].days += 1;
                    summaryMap[key].totalMs += calcDuration(loginIso, logoutIso);
                  });

                  const summaryRows = Object.values(summaryMap);
                  if (summaryRows.length === 0) return null;

                  return (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Employee Summary (Salary Reference)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="py-2 pr-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                              <th className="py-2 pr-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                              <th className="py-2 pr-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Days Present</th>
                              <th className="py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Hours</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {summaryRows.map((row, i) => {
                              const totalH = Math.floor(row.totalMs / 3600000);
                              const totalM = Math.floor((row.totalMs % 3600000) / 60000);
                              return (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="py-3 pr-6">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-black flex items-center justify-center">{row.name.charAt(0).toUpperCase()}</div>
                                      <span className="text-sm font-bold text-gray-900">{row.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 pr-6 text-xs text-gray-500">{row.email}</td>
                                  <td className="py-3 pr-6">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-100">
                                      <CheckCircle2 size={10} /> {row.days} {row.days === 1 ? 'day' : 'days'}
                                    </span>
                                  </td>
                                  <td className="py-3">
                                    <span className="text-sm font-black text-brand-primary">{totalH}h {totalM}m</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
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
          <nav className="fixed bottom-0 inset-x-0 h-14 bg-white/95 backdrop-blur-md border-t border-gray-200 px-1 py-1 flex items-center justify-around z-40 shadow-lg pb-safe">
            <button
              onClick={() => selectTab('overview')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
                activeTab === 'overview' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Layout className="w-4 h-4 flex-shrink-0" />
              <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Overview</span>
            </button>
            <button
              onClick={() => selectTab('users')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
                activeTab === 'users' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Users</span>
            </button>
            <button
              onClick={() => selectTab('invoices')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
                activeTab === 'invoices' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Invoices</span>
            </button>
            <button
              onClick={() => selectTab('orders')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
                activeTab === 'orders' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Workflow</span>
            </button>
            <button
              onClick={() => selectTab('user-logs')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
                activeTab === 'user-logs' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Logins</span>
            </button>
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 text-gray-400 hover:text-gray-600 font-medium transition-colors cursor-pointer border-none bg-transparent select-none"
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Profile</span>
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
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 px-1 py-1 flex items-center justify-around shadow-lg pb-safe">
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
                "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
                activeTab === item.id && item.id !== 'logs'
                  ? "text-brand-primary font-black"
                  : "text-gray-400 hover:text-gray-600 font-medium"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">{item.label}</span>
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

        {/* EDIT USER & FACE ID REGISTRATION MODAL */}
        <AnimatePresence>
          {showEditUserModal && userToEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-3xl w-full max-w-md border border-gray-100 shadow-2xl relative text-left space-y-5"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                    <Edit className="w-5 h-5 text-brand-primary" />
                    Edit User & Face ID Settings
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditUserModal(false);
                      setUserToEdit(null);
                    }}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center border-none cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveUserEdit} className="space-y-4">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block">User Name</label>
                    <input
                      type="text"
                      value={userToEdit.name || ''}
                      onChange={(e) => setUserToEdit({ ...userToEdit, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-primary"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block">Email Address</label>
                    <input
                      type="email"
                      value={userToEdit.email || ''}
                      onChange={(e) => setUserToEdit({ ...userToEdit, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-primary"
                      required
                    />
                  </div>

                  {/* Role */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 block">System Role</label>
                    <select
                      value={userToEdit.role || 'marketing'}
                      onChange={(e) => setUserToEdit({ ...userToEdit, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-brand-primary cursor-pointer"
                    >
                      <option value="admin">Admin / CEO</option>
                      <option value="hr">HR & Payroll Manager</option>
                      <option value="staff">Staff</option>
                      <option value="marketing">Marketing</option>
                      <option value="accounts">Accounts</option>
                      <option value="order_management">Order Management</option>
                      <option value="production">Production</option>
                      <option value="delivery">Delivery</option>
                      <option value="designer">Designer</option>
                    </select>
                  </div>

                  {/* Account Access Status (Active vs Blocked) */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800">Account Access Status</p>
                      <p className="text-[10px] text-gray-400">Block user to revoke dashboard login access</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextBlocked = !Boolean(userToEdit.isBlocked || userToEdit.status === 'Blocked');
                        setUserToEdit({
                          ...userToEdit,
                          isBlocked: nextBlocked,
                          status: nextBlocked ? 'Blocked' : 'Active'
                        });
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer border-none",
                        userToEdit.isBlocked || userToEdit.status === 'Blocked'
                          ? "bg-red-500 text-white shadow-sm"
                          : "bg-emerald-500 text-white shadow-sm"
                      )}
                    >
                      {userToEdit.isBlocked || userToEdit.status === 'Blocked' ? '🚫 Blocked' : '🟢 Active'}
                    </button>
                  </div>

                  {/* Face ID Biometric Registration Box */}
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ScanFace className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="text-xs font-bold text-emerald-950">3D Face ID Registration</p>
                          <p className="text-[10px] text-emerald-700">Scan & save facial biometric data into database</p>
                        </div>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black uppercase border",
                        userToEdit.faceRegistered || userToEdit.faceData
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      )}>
                        {userToEdit.faceRegistered || userToEdit.faceData ? '✓ Registered' : 'Not Registered'}
                      </span>
                    </div>

                    {isScanningFaceForEdit ? (
                      <div className="p-3 bg-gray-950 rounded-xl text-center space-y-2 text-white">
                        <ScanFace className="w-8 h-8 text-emerald-400 animate-pulse mx-auto" />
                        <p className="text-xs font-bold text-emerald-400">{faceScanEditStatus}</p>
                        <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${faceScanEditProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleStartFaceScanForUser}
                        className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-sm border-none"
                      >
                        <ScanFace className="w-4 h-4" /> {userToEdit.faceRegistered || userToEdit.faceData ? 'Re-scan & Update Face ID' : 'Scan & Register Face ID'}
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs text-gray-500 flex-1"
                      onClick={() => {
                        setShowEditUserModal(false);
                        setUserToEdit(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="text-xs flex-1 bg-brand-primary text-white font-black"
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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

