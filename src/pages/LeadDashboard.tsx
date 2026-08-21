import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import { useNavigate } from 'react-router-dom';
import {
  Users, TrendingUp, DollarSign, Target, Search, LogOut,
  ChevronDown, ChevronUp, BarChart3, ArrowLeft, Flame,
  Thermometer, Snowflake, Award, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';
import { UserRole, OrderStatus } from '../types';

const ROLE_COLORS: Record<string, string> = {
  admin: '#1A0B91',
  staff: '#3291B6',
  marketing: '#f59e0b',
  onlineteam: '#10b981',
  accounts: '#8b5cf6',
  designer: '#ec4899',
  production: '#f97316',
  delivery: '#06b6d4',
  digitizer: '#84cc16',
  vendor: '#64748b',
  inventory_management: '#a78bfa',
  order_management: '#fb7185',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  marketing: 'Marketing',
  onlineteam: 'Online Team',
  accounts: 'Accounts',
  designer: 'Designer',
  production: 'Production',
  delivery: 'Delivery',
  digitizer: 'Digitizer',
  vendor: 'Vendor',
  inventory_management: 'Inventory',
  order_management: 'Order Mgmt',
};

const PIE_COLORS = ['#3291B6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#f97316'];

function LeadTypeBadge({ type }: { type: string }) {
  if (type === 'Hot') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-50 text-red-600 border border-red-100">
      <Flame className="w-2.5 h-2.5" /> Hot
    </span>
  );
  if (type === 'Warm') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-100">
      <Thermometer className="w-2.5 h-2.5" /> Warm
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-50 text-blue-600 border border-blue-100">
      <Snowflake className="w-2.5 h-2.5" /> Cold
    </span>
  );
}

export default function LeadDashboard() {
  const { user, registeredUsers, logout } = useAuth();
  const { leads, orders, addLead, addOrder } = useLeads();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modals for adding manual entries for a specific staff member
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAddRevenueModal, setShowAddRevenueModal] = useState(false);
  const [targetStaffName, setTargetStaffName] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);

  // Add Lead Form State
  const [leadForm, setLeadForm] = useState({
    leadName: '',
    companyName: '',
    leadType: 'Hot',
    convertedValue: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Add Revenue Form State
  const [revenueForm, setRevenueForm] = useState({
    client: '',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.convertedValue) {
      alert('Please enter a converted value.');
      return;
    }
    setSavingEntry(true);
    try {
      const valAmount = Number(leadForm.convertedValue) || 0;
      const dateTimestamp = leadForm.date ? new Date(leadForm.date).getTime() : Date.now();
      const newLeadData = {
        createdByName: targetStaffName,
        name: leadForm.leadName || 'Manual Lead',
        number: 'N/A',
        companyName: leadForm.companyName || '',
        leadType: leadForm.leadType as any,
        totalOrderValue: valAmount,
        forecastedValue: valAmount,
        convertedValue: valAmount,
        status: 'Converted',
        entryDate: leadForm.date,
        createdAt: dateTimestamp,
        updatedAt: dateTimestamp,
        phone: '',
        email: '',
        address: '',
        notes: 'Admin manual lead convert entry',
        createdBy: ''
      };
      await addLead(newLeadData);
      alert('Lead Convert Revenue saved to Database!');
      setShowAddLeadModal(false);
      setLeadForm({ leadName: '', companyName: '', leadType: 'Hot', convertedValue: '', date: new Date().toISOString().split('T')[0] });
    } catch (err: any) {
      alert('Error saving: ' + (err.message || 'Failed to save lead'));
    } finally {
      setSavingEntry(false);
    }
  };

  const handleAddRevenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenueForm.amount) {
      alert('Please enter an amount.');
      return;
    }
    setSavingEntry(true);
    try {
      const amountVal = Number(revenueForm.amount) || 0;
      const dateTimestamp = revenueForm.date ? new Date(revenueForm.date).getTime() : Date.now();
      const newOrderData = {
        createdByName: targetStaffName,
        clientName: revenueForm.client,
        customerInfo: { name: revenueForm.client || 'Client', phone: '', address: '' },
        category: revenueForm.category || 'General',
        status: OrderStatus.DELIVERY,
        financials: {
          totalAmount: amountVal,
          advancePay: 0,
          balanceAmount: amountVal
        },
        createdAt: dateTimestamp,
        updatedAt: Date.now()
      };
      await addOrder(newOrderData);
      alert('Revenue successfully saved to Database!');
      setShowAddRevenueModal(false);
      setRevenueForm({ client: '', category: '', amount: '', date: new Date().toISOString().split('T')[0] });
    } catch (err: any) {
      alert('Error saving: ' + (err.message || 'Failed'));
    } finally {
      setSavingEntry(false);
    }
  };

  const inputCls = "w-full text-xs border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all";
  const labelCls = "block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5";

  const isDeliveredStatus = (status?: string) => {
    if (!status) return false;
    const s = String(status).toLowerCase().trim();
    return s === 'delivery' || s === 'delivered' || s === OrderStatus.DELIVERY || s === OrderStatus.DELIVERED;
  };

  // Build per-user lead & revenue stats (For all registered staff)
  const userLeadStats = useMemo(() => {
    const filteredStaff = registeredUsers.length > 0 ? registeredUsers : (user ? [user] : []);

    return filteredStaff.map((u: any) => {
      const uName = (u.name || '').toLowerCase().trim();
      const uEmail = (u.email || '').toLowerCase().trim();
      const uId = String(u.id || u.uid || '');

      const userLeads = leads.filter(l => {
        const createdBy = String(l.createdBy || '');
        const createdByName = (l.createdByName || '').toLowerCase().trim();
        const assignedTo = String(l.assignedTo || '');
        const assignedToName = ((l as any).assignedToName || '').toLowerCase().trim();

        return (
          (uId && (createdBy === uId || assignedTo === uId)) ||
          (u.id && (createdBy === String(u.id) || assignedTo === String(u.id))) ||
          (u.uid && (createdBy === String(u.uid) || assignedTo === String(u.uid))) ||
          (uEmail && (assignedTo.toLowerCase() === uEmail || createdBy.toLowerCase() === uEmail)) ||
          (uName && (createdByName === uName || assignedToName === uName)) ||
          (uEmail === 'daniel.smpallywear@gmail.com' && (assignedTo === 'admin-daniel' || assignedToName.includes('daniel')))
        );
      });

      // Converted revenue strictly from Delivery / Delivered status orders
      const userOrders = orders.filter(o => {
        const createdBy = String(o.createdBy || '');
        const createdByName = (o.createdByName || '').toLowerCase().trim();
        const assignedTo = String((o as any).assignedTo || '');
        const isDelivered = isDeliveredStatus(o.status);

        const matchesUser = (
          (uId && (createdBy === uId || assignedTo === uId)) ||
          (u.id && (createdBy === String(u.id) || assignedTo === String(u.id))) ||
          (u.uid && (createdBy === String(u.uid) || assignedTo === String(u.uid))) ||
          (uEmail && (assignedTo.toLowerCase() === uEmail || createdBy.toLowerCase() === uEmail)) ||
          (uName && createdByName === uName)
        );

        return matchesUser && isDelivered;
      });

      const totalLeads = userLeads.length;
      const hotLeads = userLeads.filter(l => l.leadType === 'Hot').length;
      const warmLeads = userLeads.filter(l => l.leadType === 'Warm').length;
      const coldLeads = userLeads.filter(l => l.leadType === 'Cold').length;
      const forecastedValue = userLeads.reduce((sum, l) => sum + (Number(l.forecastedValue) || 0), 0);

      // Delivered orders revenue
      const deliveredOrdersRevenue = userOrders.reduce((sum, o) => {
        const amt = Number(o.financials?.totalAmount ?? o.financials?.balanceAmount ?? (o as any).totalAmount ?? 0);
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);

      // Lead converted revenue
      const leadConvertedValue = userLeads.reduce((sum, l) => {
        const val = Number(l.convertedValue ?? l.totalOrderValue ?? 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      const convertedValue = deliveredOrdersRevenue + leadConvertedValue;
      const deliveryOrdersCount = userOrders.length;
      const conversionRate = totalLeads > 0
        ? Math.round((userLeads.filter(l => (Number(l.totalOrderValue || l.convertedValue) || 0) > 0 || l.status === 'Converted').length / totalLeads) * 100)
        : (deliveryOrdersCount > 0 ? 100 : 0);

      return {
        ...u,
        totalLeads,
        hotLeads,
        warmLeads,
        coldLeads,
        forecastedValue,
        convertedValue,
        deliveredOrdersRevenue,
        leadConvertedValue,
        conversionRate,
        deliveryOrdersCount,
        leads: userLeads,
        orders: userOrders
      };
    });
  }, [registeredUsers, leads, orders, user]);

  // Total delivered orders revenue across system
  const systemDeliveredOrdersRevenue = useMemo(() => {
    return orders
      .filter(o => isDeliveredStatus(o.status))
      .reduce((sum, o) => {
        const amt = Number(o.financials?.totalAmount ?? o.financials?.balanceAmount ?? (o as any).totalAmount ?? 0);
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);
  }, [orders]);

  // Totals calculated from all staff
  const totalLeads = useMemo(() => userLeadStats.reduce((sum, u) => sum + u.totalLeads, 0), [userLeadStats]);
  const totalForecasted = useMemo(() => userLeadStats.reduce((sum, u) => sum + u.forecastedValue, 0), [userLeadStats]);
  const totalConverted = useMemo(() => {
    const userSum = userLeadStats.reduce((sum, u) => sum + u.convertedValue, 0);
    return Math.max(systemDeliveredOrdersRevenue, userSum);
  }, [userLeadStats, systemDeliveredOrdersRevenue]);
  const totalHot = useMemo(() => userLeadStats.reduce((sum, u) => sum + u.hotLeads, 0), [userLeadStats]);

  // Revenue trend timeline chart data (Converted & Forecasted Revenue)
  const revenueTimelineData = useMemo(() => {
    const combined = [
      ...orders.filter(o => isDeliveredStatus(o.status)).map(o => ({
        date: Number(o.createdAt || Date.now()),
        converted: Number(o.financials?.totalAmount ?? o.financials?.balanceAmount ?? (o as any).totalAmount ?? 0),
        forecasted: 0,
        label: o.customerInfo?.name || o.clientName || 'Order'
      })),
      ...leads.map(l => ({
        date: Number(l.createdAt || (l.entryDate ? new Date(l.entryDate).getTime() : Date.now())),
        converted: Number(l.convertedValue ?? l.totalOrderValue ?? 0),
        forecasted: Number(l.forecastedValue || 0),
        label: l.name || 'Lead'
      }))
    ].filter(item => !isNaN(item.date) && (item.converted > 0 || item.forecasted > 0))
     .sort((a, b) => a.date - b.date);

    if (combined.length === 0) {
      return userLeadStats.map(u => ({
        name: u.name || 'Staff',
        converted: u.convertedValue || 0,
        forecasted: u.forecastedValue || 0,
      })).filter(d => d.converted > 0 || d.forecasted > 0);
    }

    let cumConverted = 0;
    let cumForecasted = 0;
    return combined.map((item, idx) => {
      cumConverted += item.converted;
      cumForecasted += item.forecasted;
      const dateStr = new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      return {
        name: dateStr,
        converted: cumConverted,
        forecasted: cumForecasted,
        itemAmount: item.converted,
        label: item.label
      };
    });
  }, [orders, leads, userLeadStats]);

  // Chart: leads by role
  const byRoleChartData = useMemo(() => {
    const roleMap: Record<string, number> = {};
    userLeadStats.forEach((u: any) => {
      const role = ROLE_LABELS[u.role] || u.role || 'Unknown';
      roleMap[role] = (roleMap[role] || 0) + u.totalLeads;
    });
    return Object.entries(roleMap).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [userLeadStats]);

  // Top performers
  const topPerformers = useMemo(() => {
    return [...userLeadStats].sort((a: any, b: any) => b.convertedValue - a.convertedValue).slice(0, 3);
  }, [userLeadStats]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return userLeadStats.filter((u: any) => {
      const matchesSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [userLeadStats, search, roleFilter]);

  const uniqueRoles = useMemo(() => {
    return Array.from(new Set(registeredUsers.map((u: any) => u.role))).filter(Boolean);
  }, [registeredUsers]);

  const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 transition-all cursor-pointer border-none"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Logo className="h-7 w-auto" />
            <div className="h-5 w-px bg-gray-200 hidden sm:block" />
            <div className="hidden sm:block">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lead Management</p>
              <p className="text-sm font-black text-gray-900 -mt-0.5">Lead Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
              <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center text-white text-[9px] font-black">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-gray-700 hidden sm:block">{user?.name}</span>
            </div>
            <button
              onClick={logout}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 transition-all cursor-pointer border-none"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">

        {/* Page Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-primary flex items-center justify-center shadow-md shadow-brand-primary/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Lead Dashboard</h1>
            <p className="text-xs text-gray-400 font-medium">Full team lead performance & pipeline overview</p>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total Leads', value: totalLeads, icon: Target, bg: 'bg-brand-primary', iconColor: 'text-white' },
            { label: 'Hot Leads', value: totalHot, icon: Flame, bg: 'bg-red-500', iconColor: 'text-white' },
            { label: 'Forecasted', value: fmt(totalForecasted), icon: TrendingUp, bg: 'bg-amber-500', iconColor: 'text-white' },
            { label: 'Converted Revenue', value: fmt(totalConverted), icon: DollarSign, bg: 'bg-emerald-500', iconColor: 'text-white' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5 flex items-center gap-3 hover:shadow-md transition-all"
            >
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm', stat.bg)}>
                <stat.icon className={cn('w-5 h-5', stat.iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider truncate">{stat.label}</p>
                <p className="text-base sm:text-lg font-black text-gray-900 truncate">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Revenue Growth & Trend AreaChart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-gray-800">Revenue Growth & Trend</h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Converted Revenue
                </span>
                <span className="flex items-center gap-1.5 text-amber-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Forecasted Pipeline
                </span>
              </div>
            </div>
            {revenueTimelineData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-gray-300 text-sm font-medium">No revenue trend data recorded yet</div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTimelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorConverted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorForecasted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#9ca3af' }} />
                    <YAxis
                      tick={{ fontSize: 9, fontWeight: 700, fill: '#9ca3af' }}
                      tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        `₹${Number(val || 0).toLocaleString('en-IN')}`,
                        name === 'converted' ? 'Converted Revenue' : 'Forecasted Revenue'
                      ]}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 11, fontWeight: 700 }}
                      cursor={{ stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                    />
                    <Area type="monotone" dataKey="forecasted" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorForecasted)" name="forecasted" />
                    <Area type="monotone" dataKey="converted" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorConverted)" name="converted" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-5">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-black text-gray-800">Top Performers</h3>
            </div>
            <div className="space-y-3">
              {topPerformers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No data yet</p>
              ) : topPerformers.map((u: any, i) => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0',
                    i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : 'bg-orange-300 text-white'
                  )}>
                    {i + 1}
                  </div>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                    style={{ backgroundColor: ROLE_COLORS[u.role] || '#3291B6' }}
                  >
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{u.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{fmt(u.convertedValue)} converted</p>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    {u.totalLeads} leads
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Registered Users Lead Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          {/* Table Header */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-brand-primary rounded-full" />
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest">Registered Staff — Lead Overview</h2>
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{filteredUsers.length} members</span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="text-xs border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  {uniqueRoles.map((r: any) => (
                    <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                  ))}
                </select>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search staff..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="text-xs border border-gray-200 bg-gray-50 rounded-xl pl-8 pr-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 w-44"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3">Staff Member</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3 text-center">Total Leads</th>
                  <th className="px-5 py-3 text-center">🔥 Hot</th>
                  <th className="px-5 py-3 text-center">🌡 Warm</th>
                  <th className="px-5 py-3 text-center">❄ Cold</th>
                  <th className="px-5 py-3 text-right">Forecasted</th>
                  <th className="px-5 py-3 text-right">Converted</th>
                  <th className="px-5 py-3 text-center">Total Delivery Orders</th>
                  <th className="px-5 py-3 text-center">Conv. Rate</th>
                  <th className="px-5 py-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-gray-400 italic text-xs">No staff members match your search.</td>
                  </tr>
                ) : filteredUsers.map((u: any, idx: number) => (
                  <React.Fragment key={u.id || u.uid}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className={cn('hover:bg-gray-50/80 transition-colors', expandedUser === (u.id || u.uid) ? 'bg-brand-primary/3' : '')}
                    >
                      {/* Staff Info */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: ROLE_COLORS[u.role] || '#3291B6' }}
                          >
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 truncate max-w-[130px]">{u.name}</p>
                            <p className="text-[10px] text-gray-400 truncate max-w-[130px]">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-5 py-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase border"
                          style={{ backgroundColor: `${ROLE_COLORS[u.role]}15`, color: ROLE_COLORS[u.role] || '#3291B6', borderColor: `${ROLE_COLORS[u.role]}30` }}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>

                      {/* Lead counts */}
                      <td className="px-5 py-3 text-center">
                        <span className="font-black text-gray-900 text-sm">{u.totalLeads}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={cn('font-bold', u.hotLeads > 0 ? 'text-red-600' : 'text-gray-300')}>{u.hotLeads}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={cn('font-bold', u.warmLeads > 0 ? 'text-amber-500' : 'text-gray-300')}>{u.warmLeads}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={cn('font-bold', u.coldLeads > 0 ? 'text-blue-500' : 'text-gray-300')}>{u.coldLeads}</span>
                      </td>

                      {/* Values */}
                      <td className="px-5 py-3 text-right font-bold text-gray-700">{u.forecastedValue > 0 ? fmt(u.forecastedValue) : <span className="text-gray-300">—</span>}</td>
                      <td className="px-5 py-3 text-right font-black text-emerald-700">{u.convertedValue > 0 ? fmt(u.convertedValue) : <span className="text-gray-300">—</span>}</td>

                      {/* Delivery Orders */}
                      <td className="px-5 py-3 text-center">
                        <span className={cn('font-bold', u.deliveryOrdersCount > 0 ? 'text-gray-700' : 'text-gray-300')}>{u.deliveryOrdersCount}</span>
                      </td>

                      {/* Conversion Rate */}
                      <td className="px-5 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={cn('font-black text-xs', u.conversionRate >= 50 ? 'text-emerald-600' : u.conversionRate >= 25 ? 'text-amber-500' : 'text-gray-400')}>
                            {u.conversionRate}%
                          </span>
                          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', u.conversionRate >= 50 ? 'bg-emerald-500' : u.conversionRate >= 25 ? 'bg-amber-400' : 'bg-gray-300')}
                              style={{ width: `${u.conversionRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      {/* Expand */}
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => setExpandedUser(expandedUser === (u.id || u.uid) ? null : (u.id || u.uid))}
                          className="w-7 h-7 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary flex items-center justify-center border-none cursor-pointer transition-all mx-auto"
                        >
                          {expandedUser === (u.id || u.uid) ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </motion.tr>

                    {/* Expanded Lead & Delivered Order Details */}
                    {expandedUser === (u.id || u.uid) && (
                      <tr>
                        <td colSpan={11} className="bg-gray-50/80 px-5 py-4 border-t border-gray-100">
                          <div className="space-y-4">
                            {/* Header & Add Action buttons */}
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
                              <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-brand-primary" />
                                <span className="text-xs font-black text-gray-800 uppercase tracking-wider">{u.name}'s Lead & Revenue Details</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setTargetStaffName(u.name);
                                    setLeadForm({
                                      leadName: '',
                                      companyName: '',
                                      leadType: 'Hot',
                                      convertedValue: '',
                                      date: new Date().toISOString().split('T')[0]
                                    });
                                    setShowAddLeadModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl border-none cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                                >
                                  + Add Lead Convert
                                </button>
                                <button
                                  onClick={() => {
                                    setTargetStaffName(u.name);
                                    setRevenueForm({
                                      client: '',
                                      category: 'Jersey',
                                      amount: '',
                                      date: new Date().toISOString().split('T')[0]
                                    });
                                    setShowAddRevenueModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl border-none cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                                >
                                  + Add Revenue
                                </button>
                              </div>
                            </div>

                            {/* Delivered Orders Table */}
                            <div className="rounded-xl border border-emerald-100 overflow-hidden bg-white shadow-xs">
                              <div className="bg-emerald-50/60 px-4 py-2 border-b border-emerald-100 flex items-center justify-between">
                                <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                  Delivered Orders & Revenue ({u.orders?.length || 0})
                                </span>
                                <span className="text-[10px] font-black text-emerald-700">
                                  Total: {fmt(u.deliveredOrdersRevenue || 0)}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-emerald-50/30 text-emerald-800 font-black uppercase tracking-widest text-[9px] border-b border-emerald-100">
                                    <tr>
                                      <th className="px-4 py-2">Order ID</th>
                                      <th className="px-4 py-2">Client / Customer</th>
                                      <th className="px-4 py-2">Category</th>
                                      <th className="px-4 py-2">Status</th>
                                      <th className="px-4 py-2">Date</th>
                                      <th className="px-4 py-2 text-right">Delivered Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-emerald-50">
                                    {!u.orders || u.orders.length === 0 ? (
                                      <tr>
                                        <td colSpan={6} className="py-4 text-center text-gray-400 italic">
                                          No delivered orders found for {u.name}. Click "+ Add Revenue" to record revenue.
                                        </td>
                                      </tr>
                                    ) : (
                                      u.orders.map((o: any) => {
                                        const amt = Number(o.financials?.totalAmount ?? o.financials?.balanceAmount ?? o.totalAmount ?? 0);
                                        return (
                                          <tr key={o.id} className="hover:bg-emerald-50/20 transition-colors">
                                            <td className="px-4 py-2 font-mono font-bold text-gray-800">#{o.id}</td>
                                            <td className="px-4 py-2 font-semibold text-gray-700">{o.customerInfo?.name || o.clientName || '—'}</td>
                                            <td className="px-4 py-2 text-gray-500">{o.category || 'General'}</td>
                                            <td className="px-4 py-2">
                                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                {o.status}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2 text-gray-500 font-mono">
                                              {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'}
                                            </td>
                                            <td className="px-4 py-2 text-right font-black text-emerald-700">
                                              {fmt(amt)}
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Leads Table */}
                            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-xs">
                              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-brand-primary" />
                                  Leads ({u.leads?.length || 0})
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
                                    <tr>
                                      <th className="px-4 py-2.5">Lead Name</th>
                                      <th className="px-4 py-2.5">Company</th>
                                      <th className="px-4 py-2.5">Type</th>
                                      <th className="px-4 py-2.5">Entry Date</th>
                                      <th className="px-4 py-2.5 text-right">Forecasted</th>
                                      <th className="px-4 py-2.5 text-right">Converted</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {u.leads.length === 0 ? (
                                      <tr>
                                        <td colSpan={6} className="py-6 text-center text-gray-400 italic">
                                          No leads found for this staff member. Click "+ Add Lead Convert" above to add one.
                                        </td>
                                      </tr>
                                    ) : (
                                      u.leads.map((l: any) => (
                                        <tr key={l.id} className="hover:bg-gray-50/60 transition-colors">
                                          <td className="px-4 py-2.5 font-semibold text-gray-800">{l.name || '—'}</td>
                                          <td className="px-4 py-2.5 text-gray-500">{l.companyName || '—'}</td>
                                          <td className="px-4 py-2.5"><LeadTypeBadge type={l.leadType} /></td>
                                          <td className="px-4 py-2.5 text-gray-500 font-mono">
                                            {l.entryDate ? new Date(l.entryDate).toLocaleDateString('en-IN') : '—'}
                                          </td>
                                          <td className="px-4 py-2.5 text-right font-bold text-gray-700">
                                            {(Number(l.forecastedValue) || 0) > 0 ? fmt(Number(l.forecastedValue)) : <span className="text-gray-300">—</span>}
                                          </td>
                                          <td className="px-4 py-2.5 text-right font-black text-emerald-700">
                                            {(Number(l.totalOrderValue || l.convertedValue) || 0) > 0 ? fmt(Number(l.totalOrderValue || l.convertedValue)) : <span className="text-gray-300">—</span>}
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* ── Add Revenue Modal ───────────────────────────────────────────────── */}
      {showAddRevenueModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="bg-brand-primary px-6 py-5 flex items-center justify-between text-white">
              <div>
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Manual Entry</p>
                <h3 className="text-base font-black mt-0.5">Add Revenue for {targetStaffName}</h3>
              </div>
              <button
                onClick={() => setShowAddRevenueModal(false)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border-none cursor-pointer text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddRevenueSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className={labelCls}>Staff Member</label>
                <input disabled type="text" value={targetStaffName} className="w-full text-xs border border-gray-200 bg-gray-100 rounded-xl px-3 py-2.5 outline-none font-bold text-gray-500" />
              </div>
              <div>
                <label className={labelCls}>Client Name *</label>
                <input required type="text" placeholder="Client / Customer name" value={revenueForm.client}
                  onChange={e => setRevenueForm({ ...revenueForm, client: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Category / Item *</label>
                <select required value={revenueForm.category}
                  onChange={e => setRevenueForm({ ...revenueForm, category: e.target.value })} className={inputCls}>
                  <option value="Jersey">Jersey</option>
                  <option value="T-Shirt">T-Shirt</option>
                  <option value="Shirt">Shirt</option>
                  <option value="Pant">Pant</option>
                  <option value="Hoodie">Hoodie</option>
                  <option value="Sweatshirt">Sweatshirt</option>
                  <option value="Corporate Gift">Corporate Gift</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Status</label>
                  <input disabled type="text" value="Delivery" className="w-full text-xs border border-gray-200 bg-gray-100 rounded-xl px-3 py-2.5 outline-none font-bold text-gray-500" />
                </div>
                <div>
                  <label className={labelCls}>Amount (₹) *</label>
                  <input required type="number" min="0" placeholder="0" value={revenueForm.amount}
                    onChange={e => setRevenueForm({ ...revenueForm, amount: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" value={revenueForm.date}
                  onChange={e => setRevenueForm({ ...revenueForm, date: e.target.value })} className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-50">
                <button type="button" onClick={() => setShowAddRevenueModal(false)} disabled={savingEntry}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 text-xs font-bold rounded-2xl hover:bg-gray-50 transition-all cursor-pointer bg-transparent disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={savingEntry}
                  className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-black rounded-2xl border-none cursor-pointer transition-all shadow-md shadow-brand-primary/20 uppercase tracking-wider disabled:opacity-50">
                  {savingEntry ? 'Saving...' : 'Add Revenue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Lead Convert Modal ─────────────────────────────────────────── */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="bg-violet-650 px-6 py-5 flex items-center justify-between text-white">
              <div>
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">Manual Entry</p>
                <h3 className="text-base font-black mt-0.5">Add Lead Convert for {targetStaffName}</h3>
              </div>
              <button
                onClick={() => setShowAddLeadModal(false)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border-none cursor-pointer text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddLeadSubmit} className="p-6 space-y-4 text-left">
              <div>
                <label className={labelCls}>Staff Member</label>
                <input disabled type="text" value={targetStaffName} className="w-full text-xs border border-gray-200 bg-gray-100 rounded-xl px-3 py-2.5 outline-none font-bold text-gray-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Lead Name *</label>
                  <input required type="text" placeholder="Client / Lead name" value={leadForm.leadName}
                    onChange={e => setLeadForm({ ...leadForm, leadName: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Company Name</label>
                  <input type="text" placeholder="Company" value={leadForm.companyName}
                    onChange={e => setLeadForm({ ...leadForm, companyName: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Lead Type</label>
                  <select value={leadForm.leadType}
                    onChange={e => setLeadForm({ ...leadForm, leadType: e.target.value })} className={inputCls}>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Converted Value (₹) *</label>
                  <input required type="number" min="0" placeholder="0" value={leadForm.convertedValue}
                    onChange={e => setLeadForm({ ...leadForm, convertedValue: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" value={leadForm.date}
                  onChange={e => setLeadForm({ ...leadForm, date: e.target.value })} className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-50">
                <button type="button" onClick={() => setShowAddLeadModal(false)} disabled={savingEntry}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 text-xs font-bold rounded-2xl hover:bg-gray-50 transition-all cursor-pointer bg-transparent disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={savingEntry}
                  className="flex-1 py-3 bg-violet-650 hover:bg-violet-755 text-white text-xs font-black rounded-2xl border-none cursor-pointer transition-all shadow-md shadow-violet-400/20 uppercase tracking-wider disabled:opacity-50">
                  {savingEntry ? 'Saving...' : 'Add Lead Convert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
