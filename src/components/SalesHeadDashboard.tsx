import React, { useState, useMemo } from 'react';
import {
  TrendingUp, Users, Package, CreditCard, Palette, FileText,
  DollarSign, CheckCircle2, Clock, Search, Filter, Download,
  ArrowUpRight, ChevronRight, Eye, RefreshCw, BarChart2, Shield,
  Phone, User, Sparkles, Building2, Calendar, FileCheck, Layers, Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import { Order, OrderStatus, Invoice } from '../types';
import { cn } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import DesignTaskTimer from './DesignTaskTimer';
import AdminCreateOrderModal from './AdminCreateOrderModal';
import InvoiceFormModal from './InvoiceFormModal';

// Helper to check if order was sent to Accounts
const isSentToAccounts = (o: Order) => {
  return Boolean(
    o.status === OrderStatus.ACCOUNTS ||
    String(o.status || '').toLowerCase() === 'accounts' ||
    o.movedToAccountsAt ||
    o.details?.movedToAccountsAt ||
    o.sentByAccounts
  );
};

// Helper to check if order was sent to Design Studio
const isSentToDesigns = (o: Order) => {
  return Boolean(
    o.status === OrderStatus.DESIGN ||
    String(o.status || '').toLowerCase() === 'design' ||
    o.designSentToMarketing ||
    o.details?.designSentToMarketing ||
    o.designCompleted ||
    o.details?.designCompleted ||
    o.original_design_file ||
    o.original_design_zip ||
    (o.designAttachments && o.designAttachments.length > 0) ||
    (o.assignedDesigner && o.assignedDesigner !== 'Unassigned')
  );
};

// Helper to check if order has received completed design files from Design Studio
const isReceivedDesignsFile = (o: Order) => {
  return Boolean(
    o.designCompleted === true ||
    o.details?.designCompleted === true ||
    o.details?.designCompleted === 'true' ||
    o.designSentToMarketing === true ||
    o.details?.designSentToMarketing === true ||
    Boolean(o.original_design_file) ||
    Boolean(o.original_design_zip) ||
    (o.designAttachments && o.designAttachments.length > 0)
  );
};

// Helper to extract Order Value
const getOrderAmount = (o: Order) => {
  const val = Number(o.financials?.totalAmount || o.netTotal || o.totalOrderValue || 0);
  return isNaN(val) ? 0 : val;
};

// Helper to extract Advance Paid
const getAdvanceAmount = (o: Order) => {
  const val = Number(o.financials?.advancePay || o.advanceAmount || 0);
  return isNaN(val) ? 0 : val;
};

interface SalesHeadDashboardProps {
  orders?: Order[];
  invoices?: Invoice[];
  user?: any;
}

export default function SalesHeadDashboard({ orders: propOrders, invoices: propInvoices, user: propUser }: SalesHeadDashboardProps) {
  const { user: authUser } = useAuth();
  const { orders: contextOrders, invoices: contextInvoices, updateOrder, addInvoice, updateInvoice } = useLeads();

  const user = propUser || authUser;
  const orders = propOrders || contextOrders || [];
  const invoices = propInvoices || contextInvoices || [];

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState<string | null>(null);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeViewTab, setActiveViewTab] = useState<'overview' | 'sla_monitor'>('overview');
  const [slaStatusFilter, setSlaStatusFilter] = useState<'all' | 'in_progress' | 'overdue' | 'completed'>('all');
  const [slaDesignerFilter, setSlaDesignerFilter] = useState<string>('all');
  const [slaSearchTerm, setSlaSearchTerm] = useState('');

  // Modal states for Create Order & Create Invoice
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const handleEditInvoiceSubmit = async (invoiceData: any) => {
    try {
      if (editingInvoice?.id) {
        await updateInvoice(editingInvoice.id, invoiceData);
        alert("✓ Invoice updated successfully!");
      } else {
        await addInvoice(invoiceData);
        alert("✓ Invoice created successfully!");
      }
      setIsInvoiceFormOpen(false);
      setEditingInvoice(null);
    } catch (err: any) {
      alert("Failed to save invoice: " + (err?.message || ""));
    }
  };

  // Helper to determine if an order matches date filter
  const filterByDate = (timestamp?: number | string) => {
    if (!timestamp || dateFilter === 'all') return true;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return true;
    const now = new Date();
    if (dateFilter === 'today') {
      return date.toDateString() === now.toDateString();
    }
    if (dateFilter === 'yesterday') {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return date.toDateString() === yesterday.toDateString();
    }
    if (dateFilter === 'week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= oneWeekAgo;
    }
    if (dateFilter === 'month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Orders filtered by date
  const filteredOrders = useMemo(() => {
    return orders.filter(o => filterByDate(o.createdAt));
  }, [orders, dateFilter]);

  // Group performance metrics by Marketing Executive
  const executiveMetrics = useMemo(() => {
    const map = new Map<string, {
      name: string;
      totalOrders: number;
      sentToAccounts: number;
      sentToDesigns: number;
      receivedDesigns: number;
      totalOrderValue: number;
      totalAdvance: number;
      invoicesCount: number;
      totalInvoicedAmount: number;
      orders: Order[];
    }>();

    // Group all orders by creator name (excluding Daniel/online team/admin)
    filteredOrders.forEach(o => {
      const execName = (o.createdByName || o.createdBy || 'Unknown Executive').trim();
      const lowerName = execName.toLowerCase();
      if (lowerName.includes('daniel') || (o.createdBy && String(o.createdBy).toLowerCase().includes('daniel'))) {
        return;
      }
      if (!map.has(execName)) {
        map.set(execName, {
          name: execName,
          totalOrders: 0,
          sentToAccounts: 0,
          sentToDesigns: 0,
          receivedDesigns: 0,
          totalOrderValue: 0,
          totalAdvance: 0,
          invoicesCount: 0,
          totalInvoicedAmount: 0,
          orders: []
        });
      }

      const item = map.get(execName)!;
      item.totalOrders += 1;
      item.orders.push(o);

      if (isSentToAccounts(o)) item.sentToAccounts += 1;
      if (isSentToDesigns(o)) item.sentToDesigns += 1;
      if (isReceivedDesignsFile(o)) item.receivedDesigns += 1;

      item.totalOrderValue += getOrderAmount(o);
      item.totalAdvance += getAdvanceAmount(o);
    });

    // Match Invoices created by or associated with each executive
    invoices.forEach(inv => {
      const invCreator = (inv.createdByName || inv.createdBy || '').trim();
      if (invCreator.toLowerCase().includes('daniel')) return;
      let matchedExec = invCreator;

      // If creator isn't direct, check if invoice leadId matches any order of an executive
      if (!map.has(matchedExec) && inv.leadId) {
        for (const [name, data] of map.entries()) {
          if (data.orders.some(o => o.id === inv.leadId)) {
            matchedExec = name;
            break;
          }
        }
      }

      if (map.has(matchedExec)) {
        const item = map.get(matchedExec)!;
        item.invoicesCount += 1;
        item.totalInvoicedAmount += Number(inv.total || inv.netTotal || 0);
      } else if (invCreator && !invCreator.toLowerCase().includes('daniel')) {
        // Individual with invoices but no orders in selected period
        map.set(invCreator, {
          name: invCreator,
          totalOrders: 0,
          sentToAccounts: 0,
          sentToDesigns: 0,
          receivedDesigns: 0,
          totalOrderValue: 0,
          totalAdvance: 0,
          invoicesCount: 1,
          totalInvoicedAmount: Number(inv.total || inv.netTotal || 0),
          orders: []
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalOrders - a.totalOrders || b.totalOrderValue - a.totalOrderValue);
  }, [filteredOrders, invoices]);

  // Overall Team Summary Totals
  const teamTotals = useMemo(() => {
    return executiveMetrics.reduce(
      (acc, curr) => ({
        totalOrders: acc.totalOrders + curr.totalOrders,
        sentToAccounts: acc.sentToAccounts + curr.sentToAccounts,
        sentToDesigns: acc.sentToDesigns + curr.sentToDesigns,
        receivedDesigns: acc.receivedDesigns + curr.receivedDesigns,
        totalOrderValue: acc.totalOrderValue + curr.totalOrderValue,
        totalAdvance: acc.totalAdvance + curr.totalAdvance,
        invoicesCount: acc.invoicesCount + curr.invoicesCount,
        totalInvoicedAmount: acc.totalInvoicedAmount + curr.totalInvoicedAmount
      }),
      {
        totalOrders: 0,
        sentToAccounts: 0,
        sentToDesigns: 0,
        receivedDesigns: 0,
        totalOrderValue: 0,
        totalAdvance: 0,
        invoicesCount: 0,
        totalInvoicedAmount: 0
      }
    );
  }, [executiveMetrics]);

  // Filtered executive list based on search
  const displayedExecutives = useMemo(() => {
    if (!searchTerm.trim()) return executiveMetrics;
    const term = searchTerm.toLowerCase();
    return executiveMetrics.filter(e => e.name.toLowerCase().includes(term));
  }, [executiveMetrics, searchTerm]);

  // Active executive's orders for detail drill-down
  const activeExecutiveData = useMemo(() => {
    if (!selectedExecutive) return null;
    return executiveMetrics.find(e => e.name === selectedExecutive) || null;
  }, [selectedExecutive, executiveMetrics]);

  // Orders for drill-down table
  const drillDownOrders = useMemo(() => {
    let list = activeExecutiveData ? activeExecutiveData.orders : filteredOrders;

    if (statusFilter !== 'all') {
      if (statusFilter === 'accounts') {
        list = list.filter(isSentToAccounts);
      } else if (statusFilter === 'design') {
        list = list.filter(isSentToDesigns);
      } else if (statusFilter === 'received_design') {
        list = list.filter(isReceivedDesignsFile);
      } else {
        list = list.filter(o => String(o.status || '').toLowerCase() === statusFilter);
      }
    }

    if (searchTerm.trim() && selectedExecutive) {
      const term = searchTerm.toLowerCase();
      list = list.filter(o =>
        (o.customerInfo?.name || '').toLowerCase().includes(term) ||
        (o.id || '').toLowerCase().includes(term) ||
        (o.category || '').toLowerCase().includes(term)
      );
    }

    return list;
  }, [activeExecutiveData, filteredOrders, statusFilter, searchTerm, selectedExecutive]);

  // All orders with design studio activity
  const allDesignStudioOrders = useMemo(() => {
    return filteredOrders.filter(o =>
      Boolean(o.assignedDesigner && o.assignedDesigner !== 'Unassigned') ||
      Boolean(o.claimedAt || o.designClaimedAt) ||
      Boolean(o.designCompleted || o.designSentToMarketing || o.original_design_file) ||
      o.status === OrderStatus.DESIGN
    );
  }, [filteredOrders]);

  // Active in-progress claimed design orders with 2-hour SLA
  const activeDesignClaimedOrders = useMemo(() => {
    return filteredOrders.filter(o => {
      const isClaimed = Boolean(
        (o.assignedDesigner && o.assignedDesigner !== 'Unassigned') ||
        o.claimedAt ||
        o.designClaimedAt
      );
      const isCompleted = isReceivedDesignsFile(o);
      return isClaimed && !isCompleted;
    });
  }, [filteredOrders]);

  // Unique designers
  const uniqueDesignersList = useMemo(() => {
    const set = new Set<string>();
    allDesignStudioOrders.forEach(o => {
      if (o.assignedDesigner && o.assignedDesigner !== 'Unassigned') {
        set.add(o.assignedDesigner);
      }
    });
    return Array.from(set);
  }, [allDesignStudioOrders]);

  // Filtered SLA tasks for dedicated monitor
  const filteredSlaTasks = useMemo(() => {
    const now = Date.now();
    return allDesignStudioOrders.filter(o => {
      const isCompleted = isReceivedDesignsFile(o);
      const claimTime = o.claimedAt ? new Date(o.claimedAt).getTime() : (o.designClaimedAt ? new Date(o.designClaimedAt).getTime() : 0);
      const isOverdue = claimTime > 0 && !isCompleted && (now - claimTime > 120 * 60 * 1000);

      if (slaStatusFilter === 'in_progress' && isCompleted) return false;
      if (slaStatusFilter === 'completed' && !isCompleted) return false;
      if (slaStatusFilter === 'overdue' && !isOverdue) return false;

      if (slaDesignerFilter !== 'all' && o.assignedDesigner !== slaDesignerFilter) {
        return false;
      }

      if (slaSearchTerm.trim()) {
        const term = slaSearchTerm.toLowerCase();
        const num = (o.orderNumber || o.id || '').toLowerCase();
        const cust = (o.customerInfo?.name || (o as any).clientName || '').toLowerCase();
        const des = (o.assignedDesigner || '').toLowerCase();
        const cat = (o.category || '').toLowerCase();
        return num.includes(term) || cust.includes(term) || des.includes(term) || cat.includes(term);
      }

      return true;
    });
  }, [allDesignStudioOrders, slaStatusFilter, slaDesignerFilter, slaSearchTerm]);

  // Export executive summary report as CSV
  const handleExportCSV = () => {
    const headers = [
      'Executive Name',
      'Total Orders Created',
      'Sent to Accounts',
      'Sent to Designs',
      'Received Designs File',
      'Total Order Value (INR)',
      'Advance Collected (INR)',
      'Balance Due (INR)',
      'Invoices Created',
      'Total Invoiced Amount (INR)'
    ];

    const rows = executiveMetrics.map(e => [
      `"${e.name}"`,
      e.totalOrders,
      e.sentToAccounts,
      e.sentToDesigns,
      e.receivedDesigns,
      e.totalOrderValue,
      e.totalAdvance,
      e.totalOrderValue - e.totalAdvance,
      e.invoicesCount,
      e.totalInvoicedAmount
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Head_Executive_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Navigation Tabs and Date/Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Navigation Tabs: Performance Overview vs Dedicated SLA Monitor */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveViewTab('overview')}
            className={cn(
              "px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border-none cursor-pointer",
              activeViewTab === 'overview'
                ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25 scale-[1.02]"
                : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50"
            )}
          >
            <BarChart2 size={16} /> Sales Performance Overview
          </button>

          <button
            onClick={() => setActiveViewTab('sla_monitor')}
            className={cn(
              "px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border-none cursor-pointer",
              activeViewTab === 'sla_monitor'
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50"
            )}
          >
            <Clock size={16} />
            Designs Task Monitor
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-black",
              activeViewTab === 'sla_monitor' ? "bg-white text-purple-700" : "bg-purple-100 text-purple-700"
            )}>
              {activeDesignClaimedOrders.length}
            </span>
          </button>
        </div>

        {/* Date Range Selector & Export / Create Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-xs flex items-center">
            {(['all', 'today', 'yesterday', 'week', 'month'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer",
                  dateFilter === d
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
                )}
              >
                {d === 'all' ? 'All Time' : d === 'today' ? 'Today' : d === 'yesterday' ? 'Yesterday' : d === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreateOrderOpen(true)}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-brand-primary/20 flex items-center gap-1.5 border-none cursor-pointer"
          >
            <Plus size={14} /> Create Order
          </button>

          <button
            onClick={() => {
              setEditingInvoice(null);
              setIsInvoiceFormOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 border-none cursor-pointer"
          >
            <Plus size={14} /> Create Invoice
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 border-none cursor-pointer"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {activeViewTab === 'sla_monitor' ? (
        /* DEDICATED 2-HOUR SLA MONITOR VIEW */
        <div className="space-y-6 text-left">
          {/* Header & Controls */}
          <div className="bg-white rounded-3xl border border-gray-150 p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <Palette size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    Designs Task Monitor
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-black rounded-full">
                      {activeDesignClaimedOrders.length} In Progress
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    Real-time countdown tracking (120-minute target SLA) for active claimed design tasks across all designers
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                  Standard SLA: 120 mins / task
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search order #, client, designer..."
                  value={slaSearchTerm}
                  onChange={(e) => setSlaSearchTerm(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
                />
              </div>

              {/* Designer Filter */}
              <div className="relative">
                <select
                  value={slaDesignerFilter}
                  onChange={(e) => setSlaDesignerFilter(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20 font-medium text-gray-700"
                >
                  <option value="all">All Designers ({uniqueDesignersList.length})</option>
                  {uniqueDesignersList.map(d => (
                    <option key={d} value={d}>🎨 {d}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter Buttons */}
              <div className="sm:col-span-2 flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200 overflow-x-auto">
                {[
                  { id: 'all', label: 'All Tasks' },
                  { id: 'in_progress', label: `In Progress (${activeDesignClaimedOrders.length})` },
                  { id: 'completed', label: 'Completed' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSlaStatusFilter(tab.id as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer whitespace-nowrap",
                      slaStatusFilter === tab.id
                        ? "bg-white text-purple-800 shadow-xs font-black"
                        : "text-gray-500 hover:text-gray-900 bg-transparent"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {filteredSlaTasks.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-150 text-center text-gray-400 font-medium text-xs">
              No SLA tasks found matching your filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSlaTasks.map(order => {
                const isCompleted = isReceivedDesignsFile(order);
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderForModal(order)}
                    className="bg-white p-5 rounded-3xl border border-gray-150 hover:border-purple-300 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-sm text-brand-primary group-hover:text-purple-700 transition-colors">
                        #{order.orderNumber || (order.id ? String(order.id).slice(-8) : 'N/A')}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700 border border-gray-200">
                        {order.category}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-black text-gray-900 truncate">
                        {order.customerInfo?.name || (order as any).clientName || 'Customer'}
                      </p>
                      <p className="text-[11px] text-gray-500 font-medium truncate">
                        Executive: <span className="font-bold text-gray-700">{order.createdByName || order.createdBy || 'Staff'}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                      <span className="text-[10px] font-black px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg flex items-center gap-1">
                        🎨 {order.assignedDesigner || 'Designer'}
                      </span>
                      <span className="font-mono font-black text-gray-900">
                        ₹{getOrderAmount(order).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                      <DesignTaskTimer
                        claimedAt={order.claimedAt || order.designClaimedAt}
                        completedAt={order.designCompletedAt}
                        isCompleted={isCompleted}
                        variant="bar"
                        designerName={order.assignedDesigner}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD SALES PERFORMANCE OVERVIEW */
        <>
          {/* High-Level Team KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-left">
            {[
              {
                title: 'Orders Created',
                val: teamTotals.totalOrders,
                sub: `${executiveMetrics.length} Executives`,
                icon: Package,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                border: 'border-indigo-100'
              },
              {
                title: 'Sent to Accounts',
                val: teamTotals.sentToAccounts,
                sub: `${teamTotals.totalOrders > 0 ? Math.round((teamTotals.sentToAccounts / teamTotals.totalOrders) * 100) : 0}% Routed`,
                icon: CreditCard,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                border: 'border-amber-100'
              },
              {
                title: 'Sent to Designs',
                val: teamTotals.sentToDesigns,
                sub: `${teamTotals.totalOrders > 0 ? Math.round((teamTotals.sentToDesigns / teamTotals.totalOrders) * 100) : 0}% In Studio`,
                icon: Palette,
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                border: 'border-purple-100'
              },
              {
                title: 'Designs Received',
                val: teamTotals.receivedDesigns,
                sub: `${teamTotals.sentToDesigns > 0 ? Math.round((teamTotals.receivedDesigns / teamTotals.sentToDesigns) * 100) : 0}% Art Ready`,
                icon: FileCheck,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                border: 'border-emerald-100'
              },
              {
                title: 'Total Order Value',
                val: `₹${teamTotals.totalOrderValue.toLocaleString()}`,
                sub: `Adv: ₹${teamTotals.totalAdvance.toLocaleString()}`,
                icon: DollarSign,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                border: 'border-blue-100'
              },
              {
                title: 'Invoices Created',
                val: teamTotals.invoicesCount,
                sub: `₹${teamTotals.totalInvoicedAmount.toLocaleString()}`,
                icon: FileText,
                color: 'text-teal-600',
                bg: 'bg-teal-50',
                border: 'border-teal-100'
              }
            ].map((kpi, idx) => (
              <div key={idx} className={cn("p-5 rounded-3xl bg-white border shadow-xs flex flex-col justify-between space-y-3", kpi.border)}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">{kpi.title}</span>
                  <div className={cn("p-2 rounded-xl", kpi.bg, kpi.color)}>
                    <kpi.icon size={16} />
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">{kpi.val}</div>
                  <div className="text-[10px] font-bold text-gray-400 mt-0.5 truncate">{kpi.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Active Design Studio Tasks (2-Hour SLA Monitor Preview) */}
          <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden space-y-4 p-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  <Palette size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    Designs Task Monitor
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black rounded-full">
                      {activeDesignClaimedOrders.length} In Studio
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Live countdown tracking for all claimed and in-progress design tasks
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-gray-400">
                  Standard SLA: 120 mins / task
                </span>
                <button
                  onClick={() => setActiveViewTab('sla_monitor')}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-black transition-all border border-purple-200 cursor-pointer"
                >
                  Open Designs Task Monitor →
                </button>
              </div>
            </div>

            {activeDesignClaimedOrders.length === 0 ? (
              <div className="py-8 text-center text-gray-400 italic text-xs font-medium bg-gray-50/50 rounded-2xl border border-gray-100">
                No active design tasks claimed in the design studio at this moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeDesignClaimedOrders.slice(0, 6).map(order => {
                  const isCompleted = isReceivedDesignsFile(order);
                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderForModal(order)}
                      className="p-4 bg-gray-50/80 rounded-2xl border border-gray-150 space-y-2 hover:bg-gray-50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs text-brand-primary">#{order.orderNumber || (order.id ? String(order.id).slice(-8) : 'N/A')}</span>
                        <span className="text-[10px] font-bold text-gray-500 capitalize">{order.category}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900 truncate max-w-[140px]">{order.customerInfo?.name || 'Customer'}</span>
                        <span className="text-[10px] font-black px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                          🎨 {order.assignedDesigner || 'Designer'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-medium">2-Hour SLA:</span>
                        <DesignTaskTimer
                          claimedAt={order.claimedAt || order.designClaimedAt}
                          completedAt={order.designCompletedAt}
                          isCompleted={isCompleted}
                          designerName={order.assignedDesigner}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeDesignClaimedOrders.length > 6 && (
              <div className="pt-2 text-center">
                <button
                  onClick={() => setActiveViewTab('sla_monitor')}
                  className="text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline bg-transparent border-none cursor-pointer"
                >
                  View all {activeDesignClaimedOrders.length} active design tasks →
                </button>
              </div>
            )}
          </div>

      {/* Main Section: Marketing Individual Breakdown Table */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden space-y-4 p-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <Users className="text-brand-primary" size={18} />
              Marketing Individual Executive Performance
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Detailed tracking for each executive: orders created, Accounts routing, Design dispatch & reception, revenue details, and invoicing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-2xl border border-gray-200 sm:w-64">
              <Search size={14} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search executive name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-xs text-gray-800 placeholder:text-gray-400 outline-none w-full font-medium"
              />
            </div>

            {selectedExecutive && (
              <button
                onClick={() => setSelectedExecutive(null)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* Executive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3.5 rounded-l-xl">Executive</th>
                <th className="px-4 py-3.5 text-center">Orders Created</th>
                <th className="px-4 py-3.5 text-center">Sent to Accounts</th>
                <th className="px-4 py-3.5 text-center">Sent to Designs</th>
                <th className="px-4 py-3.5 text-center">Designs File Ready</th>
                <th className="px-4 py-3.5 text-right">Total Order Value</th>
                <th className="px-4 py-3.5 text-right">Advance Collected</th>
                <th className="px-4 py-3.5 text-center">Invoices Created</th>
                <th className="px-4 py-3.5 text-right">Invoiced Amount</th>
                <th className="px-5 py-3.5 text-center rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
              {displayedExecutives.length > 0 ? (
                displayedExecutives.map((exec, idx) => {
                  const isSelected = selectedExecutive === exec.name;
                  const balanceDue = exec.totalOrderValue - exec.totalAdvance;
                  return (
                    <tr
                      key={exec.name}
                      onClick={() => setSelectedExecutive(isSelected ? null : exec.name)}
                      className={cn(
                        "transition-all cursor-pointer hover:bg-gray-50/80",
                        isSelected ? "bg-purple-50/70 border-l-4 border-l-brand-primary" : ""
                      )}
                    >
                      {/* Executive Name & Rank */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-brand-primary to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                            {exec.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-black text-gray-900 text-sm">{exec.name}</span>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                              <span>Rank #{idx + 1}</span>
                              <span>•</span>
                              <span>{exec.totalOrders} total deals</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Orders Created */}
                      <td className="px-4 py-4 text-center">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black">
                          {exec.totalOrders}
                        </span>
                      </td>

                      {/* Sent to Accounts */}
                      <td className="px-4 py-4 text-center">
                        <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-black">
                          {exec.sentToAccounts}
                        </span>
                      </td>

                      {/* Sent to Designs */}
                      <td className="px-4 py-4 text-center">
                        <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-black">
                          {exec.sentToDesigns}
                        </span>
                      </td>

                      {/* Designs File Ready */}
                      <td className="px-4 py-4 text-center">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black flex items-center justify-center gap-1 w-fit mx-auto">
                          <CheckCircle2 size={12} /> {exec.receivedDesigns}
                        </span>
                      </td>

                      {/* Total Order Value */}
                      <td className="px-4 py-4 text-right">
                        <div className="font-black text-gray-900 text-sm">
                          ₹{exec.totalOrderValue.toLocaleString()}
                        </div>
                        {balanceDue > 0 && (
                          <span className="text-[10px] text-red-500 font-bold">
                            Due: ₹{balanceDue.toLocaleString()}
                          </span>
                        )}
                      </td>

                      {/* Advance Collected */}
                      <td className="px-4 py-4 text-right">
                        <span className="font-black text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                          ₹{exec.totalAdvance.toLocaleString()}
                        </span>
                      </td>

                      {/* Invoices Created */}
                      <td className="px-4 py-4 text-center">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-black">
                          {exec.invoicesCount} Invoices
                        </span>
                      </td>

                      {/* Total Invoiced Amount */}
                      <td className="px-4 py-4 text-right font-black text-gray-900">
                        ₹{exec.totalInvoicedAmount.toLocaleString()}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedExecutive(isSelected ? null : exec.name)}
                          className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                            isSelected
                              ? "bg-brand-primary text-white border-brand-primary"
                              : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                          )}
                        >
                          {isSelected ? 'Hide Orders' : 'View Orders'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400 font-medium">
                    No marketing executives found matching this period or search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-Down Order View for Selected Executive (or All Team Orders) */}
      <div className="bg-white rounded-3xl border border-gray-150 shadow-xs p-6 space-y-4 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
              <Layers className="text-brand-primary" size={16} />
              {selectedExecutive ? `${selectedExecutive}'s Orders Breakdown` : 'All Marketing Orders Flow'}
              <span className="text-xs font-bold text-gray-400 lowercase">({drillDownOrders.length} orders)</span>
            </h4>
            <p className="text-xs text-gray-500 font-medium">
              Real-time pipeline progression, design attachments, Accounts dispatch timestamp, and invoice connections.
            </p>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { key: 'all', label: 'All Orders' },
              { key: 'accounts', label: 'In Accounts' },
              { key: 'design', label: 'In Design' },
              { key: 'received_design', label: 'Design Ready' },
              { key: 'order_management', label: 'Order Mgmt' },
              { key: 'production', label: 'Production' },
              { key: 'delivered', label: 'Delivered' }
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer",
                  statusFilter === f.key
                    ? "bg-brand-primary text-white border-transparent shadow-xs"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Drill-down Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Category / Qty</th>
                <th className="px-4 py-3 text-right">Order Value</th>
                <th className="px-4 py-3 text-center">Accounts Status</th>
                <th className="px-4 py-3 text-center">Design Status</th>
                <th className="px-4 py-3 text-center">Design Files</th>
                <th className="px-4 py-3 text-center">Current Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
              {drillDownOrders.length > 0 ? (
                drillDownOrders.map((o) => {
                  const sentAcc = isSentToAccounts(o);
                  const sentDes = isSentToDesigns(o);
                  const readyDes = isReceivedDesignsFile(o);
                  const amount = getOrderAmount(o);
                  const adv = getAdvanceAmount(o);

                  return (
                    <tr key={o.id} className="hover:bg-gray-50/60 transition-all">
                      {/* Order ID */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-black text-brand-primary">#{o.orderNumber || (o.id ? String(o.id).slice(-8) : 'N/A')}</span>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900">{o.customerInfo?.name || 'Walk-in Customer'}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{o.customerInfo?.phone || o.phone || '-'}</div>
                      </td>

                      {/* Creator Executive */}
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md text-[10px] font-bold">
                          {o.createdByName || o.createdBy || 'Marketing'}
                        </span>
                      </td>

                      {/* Category & Quantity */}
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-gray-900">{o.category || 'Apparel'}</span>
                        <span className="text-[10px] text-gray-500 block">{o.quantity || 1} pcs</span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-black text-gray-900">₹{amount.toLocaleString()}</div>
                        {adv > 0 && (
                          <div className="text-[9.5px] font-bold text-emerald-600">Adv: ₹{adv.toLocaleString()}</div>
                        )}
                      </td>

                      {/* Accounts Sent */}
                      <td className="px-4 py-3.5 text-center">
                        {sentAcc ? (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            ✓ Dispatched
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">-</span>
                        )}
                      </td>

                      {/* Design Sent & 1-Hour SLA */}
                      <td className="px-4 py-3.5 text-center">
                        {sentDes ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                              ✓ In Studio
                            </span>
                            {(o.claimedAt || o.designClaimedAt || o.assignedDesigner) && (
                              <DesignTaskTimer
                                claimedAt={o.claimedAt || o.designClaimedAt}
                                completedAt={o.designCompletedAt}
                                isCompleted={readyDes || Boolean(o.designCompleted)}
                                designerName={o.assignedDesigner}
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400">-</span>
                        )}
                      </td>

                      {/* Design Ready Files */}
                      <td className="px-4 py-3.5 text-center">
                        {readyDes ? (
                          <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-1 w-fit mx-auto">
                            <CheckCircle2 size={10} /> Artwork Ready
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Pending</span>
                        )}
                      </td>

                      {/* Pipeline Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-xl text-[9.5px] font-black uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                          {o.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setSelectedOrderForModal(o)}
                          className="px-3 py-1 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1 ml-auto"
                        >
                          <Eye size={12} /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="text-center py-10 text-gray-400 font-medium">
                    No orders matching this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Order Inspect Modal */}
      {selectedOrderForModal && (
        <OrderDetailModal
          order={selectedOrderForModal}
          onClose={() => setSelectedOrderForModal(null)}
          onUpdateOrder={async (orderId, updates) => {
            await updateOrder(orderId, updates);
            setSelectedOrderForModal(prev => prev ? { ...prev, ...updates } : null);
          }}
          isAdmin={true}
        />
      )}

      {/* Create Order Modal */}
      <AdminCreateOrderModal
        isOpen={isCreateOrderOpen}
        onClose={() => setIsCreateOrderOpen(false)}
      />

      {/* Create Invoice Modal */}
      <InvoiceFormModal
        isOpen={isInvoiceFormOpen}
        onClose={() => {
          setIsInvoiceFormOpen(false);
          setEditingInvoice(null);
        }}
        invoice={editingInvoice}
        onSubmit={handleEditInvoiceSubmit}
      />
    </div>
  );
}
