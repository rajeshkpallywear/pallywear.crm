import React, { useState, useMemo } from 'react';
import {
  Package, Palette, RefreshCw, Scissors, Factory, Truck,
  CheckCircle2, AlertCircle, Clock, Search, Filter, Download,
  Layers, ArrowUpRight, ChevronRight, Eye, Calendar, Sparkles,
  BarChart2, FileText, CheckCheck, TrendingUp, ShieldCheck,
  Building2, Users, AlertTriangle, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import { Order, OrderStatus } from '../types';
import { cn, getDisplayCategory } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import DesignTaskTimer from './DesignTaskTimer';
import * as XLSX from 'xlsx';

interface OperationsHeadDashboardProps {
  orders?: Order[];
  user?: any;
}

export default function OperationsHeadDashboard({ orders: propOrders, user: propUser }: OperationsHeadDashboardProps) {
  const { user: authUser } = useAuth();
  const { orders: contextOrders } = useLeads();

  const user = propUser || authUser;
  const orders = propOrders || contextOrders || [];

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkflowTab, setSelectedWorkflowTab] = useState<'all' | 'sla_tasks' | 'design_completed' | 'rework' | 'order_management' | 'digitizer_completed' | 'production_completed' | 'delivery'>('all');
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [slaStatusFilter, setSlaStatusFilter] = useState<'all' | 'in_progress' | 'overdue' | 'completed'>('all');
  const [slaDesignerFilter, setSlaDesignerFilter] = useState<string>('all');
  const [slaSearchTerm, setSlaSearchTerm] = useState('');

  // Helper to determine if an order matches date filter
  const filterByDate = (timestamp?: number) => {
    if (!timestamp || dateFilter === 'all') return true;
    const date = new Date(timestamp);
    const now = new Date();
    if (dateFilter === 'today') {
      return date.toDateString() === now.toDateString();
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

  // Base filtered orders
  const baseFilteredOrders = useMemo(() => {
    return orders.filter(o => filterByDate(o.createdAt));
  }, [orders, dateFilter]);

  // 1. How many order designs completed
  const isDesignCompleted = (o: Order) => {
    if (o.isRework === true || o.details?.isRework === true) return false;
    return Boolean(
      o.designCompleted === true ||
      o.details?.designCompleted === true ||
      o.details?.designCompleted === 'true' ||
      o.designSentToMarketing === true ||
      o.details?.designSentToMarketing === true ||
      o.original_design_file ||
      o.original_design_zip ||
      (o.designAttachments && o.designAttachments.length > 0) ||
      ['order_management', 'production', 'delivery', 'delivered'].includes(String(o.status || '').toLowerCase())
    );
  };

  // 2. How many order rework
  const isOrderRework = (o: Order) => {
    return Boolean(
      o.isRework === true ||
      o.details?.isRework === true ||
      o.designRework === true ||
      (o.reworkNotes && String(o.reworkNotes).trim().length > 0) ||
      String(o.notes || '').toLowerCase().includes('rework') ||
      String(o.notes || '').toLowerCase().includes('correction')
    );
  };

  // 3. How many order in Order Management
  const isInOrderManagement = (o: Order) => {
    const s = String(o.status || '').toLowerCase();
    return s === 'order_management' || s === 'ordermanagement' || o.status === OrderStatus.ORDER_MANAGEMENT;
  };

  // 4. How many order digitizer work complete
  const isDigitizerCompleted = (o: Order) => {
    return Boolean(
      o.digitizerCompleted === true ||
      o.details?.digitizerCompleted === true ||
      o.details?.digitizerCompleted === 'true' ||
      o.digitizerSentToOM === true ||
      o.details?.digitizerSentToOM === true ||
      o.details?.hasMachineFiles === true ||
      (o.machineFiles && o.machineFiles.length > 0) ||
      Boolean(o.embroidery_file) ||
      ['order_management', 'production', 'delivery', 'delivered'].includes(String(o.status || '').toLowerCase())
    );
  };

  // 5. How many orders complete in product (production)
  const isProductionCompleted = (o: Order) => {
    const s = String(o.status || '').toLowerCase();
    return Boolean(
      o.productionCompleted === true ||
      o.details?.productionCompleted === true ||
      o.details?.productionCompleted === 'true' ||
      s === 'delivery' ||
      s === 'delivered' ||
      o.status === OrderStatus.DELIVERY ||
      o.status === OrderStatus.DELIVERED
    );
  };

  // 6. How many delivery show them
  const isInDelivery = (o: Order) => {
    const s = String(o.status || '').toLowerCase();
    return Boolean(
      s === 'delivery' ||
      s === 'delivered' ||
      o.status === OrderStatus.DELIVERY ||
      o.status === OrderStatus.DELIVERED ||
      o.deliveryStatus === 'in_transit' ||
      o.deliveryStatus === 'delivered'
    );
  };

  // Metrics lists
  const designCompletedOrders = useMemo(() => baseFilteredOrders.filter(isDesignCompleted), [baseFilteredOrders]);
  const reworkOrders = useMemo(() => baseFilteredOrders.filter(isOrderRework), [baseFilteredOrders]);
  const orderManagementOrders = useMemo(() => baseFilteredOrders.filter(isInOrderManagement), [baseFilteredOrders]);
  const digitizerCompletedOrders = useMemo(() => baseFilteredOrders.filter(isDigitizerCompleted), [baseFilteredOrders]);
  const productionCompletedOrders = useMemo(() => baseFilteredOrders.filter(isProductionCompleted), [baseFilteredOrders]);
  const deliveryOrders = useMemo(() => baseFilteredOrders.filter(isInDelivery), [baseFilteredOrders]);
  const deliveredSuccessOrders = useMemo(() => baseFilteredOrders.filter(o => String(o.status || '').toLowerCase() === 'delivered' || o.status === OrderStatus.DELIVERED), [baseFilteredOrders]);
  const inTransitOrders = useMemo(() => baseFilteredOrders.filter(o => String(o.status || '').toLowerCase() === 'delivery' || o.status === OrderStatus.DELIVERY), [baseFilteredOrders]);

  // All design studio related orders
  const allDesignStudioOrders = useMemo(() => {
    return baseFilteredOrders.filter(o =>
      Boolean(o.assignedDesigner && o.assignedDesigner !== 'Unassigned') ||
      Boolean(o.claimedAt || o.designClaimedAt) ||
      isDesignCompleted(o) ||
      o.status === OrderStatus.DESIGN
    );
  }, [baseFilteredOrders]);

  // Active claimed in-progress design orders for 2-hour SLA monitor
  const activeDesignClaimedOrders = useMemo(() => {
    return baseFilteredOrders.filter(o => {
      const isClaimed = Boolean(
        (o.assignedDesigner && o.assignedDesigner !== 'Unassigned') ||
        o.claimedAt ||
        o.designClaimedAt
      );
      const isCompleted = isDesignCompleted(o);
      return isClaimed && !isCompleted;
    });
  }, [baseFilteredOrders]);

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
      const isCompleted = isDesignCompleted(o);
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

  // Marketing Created Orders Breakdown
  const marketingStaffSummary = useMemo(() => {
    const staffMap: Record<string, {
      name: string;
      totalOrders: number;
      totalValue: number;
      designsCompleted: number;
      reworks: number;
      inOrderManagement: number;
      digitizerCompleted: number;
      productionCompleted: number;
      delivered: number;
    }> = {};

    baseFilteredOrders.forEach(o => {
      const creatorName = o.createdByName || o.createdBy || 'Marketing Team';
      if (!staffMap[creatorName]) {
        staffMap[creatorName] = {
          name: creatorName,
          totalOrders: 0,
          totalValue: 0,
          designsCompleted: 0,
          reworks: 0,
          inOrderManagement: 0,
          digitizerCompleted: 0,
          productionCompleted: 0,
          delivered: 0
        };
      }
      staffMap[creatorName].totalOrders += 1;
      staffMap[creatorName].totalValue += Number(o.financials?.totalAmount || o.netTotal || 0);
      if (isDesignCompleted(o)) staffMap[creatorName].designsCompleted += 1;
      if (isOrderRework(o)) staffMap[creatorName].reworks += 1;
      if (isInOrderManagement(o)) staffMap[creatorName].inOrderManagement += 1;
      if (isDigitizerCompleted(o)) staffMap[creatorName].digitizerCompleted += 1;
      if (isProductionCompleted(o)) staffMap[creatorName].productionCompleted += 1;
      if (isInDelivery(o)) staffMap[creatorName].delivered += 1;
    });

    return Object.values(staffMap).sort((a, b) => b.totalOrders - a.totalOrders);
  }, [baseFilteredOrders]);

  // Current active table orders depending on tab & search
  const tableOrders = useMemo(() => {
    let list: Order[] = baseFilteredOrders;
    if (selectedWorkflowTab === 'design_completed') list = designCompletedOrders;
    else if (selectedWorkflowTab === 'rework') list = reworkOrders;
    else if (selectedWorkflowTab === 'order_management') list = orderManagementOrders;
    else if (selectedWorkflowTab === 'digitizer_completed') list = digitizerCompletedOrders;
    else if (selectedWorkflowTab === 'production_completed') list = productionCompletedOrders;
    else if (selectedWorkflowTab === 'delivery') list = deliveryOrders;

    if (!searchTerm.trim()) return list;

    const term = searchTerm.toLowerCase().trim();
    return list.filter(o =>
      String(o.orderNumber || o.id || '').toLowerCase().includes(term) ||
      String(o.clientName || '').toLowerCase().includes(term) ||
      String(o.customerInfo?.name || '').toLowerCase().includes(term) ||
      String(o.category || '').toLowerCase().includes(term) ||
      String(o.createdByName || o.createdBy || '').toLowerCase().includes(term) ||
      String(o.assignedDesigner || '').toLowerCase().includes(term)
    );
  }, [
    baseFilteredOrders, selectedWorkflowTab, designCompletedOrders,
    reworkOrders, orderManagementOrders, digitizerCompletedOrders,
    productionCompletedOrders, deliveryOrders, searchTerm
  ]);

  // Export excel report
  const exportExcel = () => {
    const exportData = tableOrders.map((o, idx) => ({
      'S.No': idx + 1,
      'Order Number': o.orderNumber || o.id,
      'Client Name': o.clientName || o.customerInfo?.name || 'N/A',
      'Category': getDisplayCategory(o.category),
      'Marketing Creator': o.createdByName || o.createdBy || 'N/A',
      'Current Status': o.status,
      'Design Completed': isDesignCompleted(o) ? 'YES' : 'NO',
      'Rework Flag': isOrderRework(o) ? 'YES (Correction)' : 'NO',
      'Order Management Active': isInOrderManagement(o) ? 'YES' : 'NO',
      'Digitizer Complete': isDigitizerCompleted(o) ? 'YES' : 'NO',
      'Production Complete': isProductionCompleted(o) ? 'YES' : 'NO',
      'Delivery Status': isInDelivery(o) ? (o.status === OrderStatus.DELIVERED ? 'Delivered' : 'In Dispatch') : 'In Factory',
      'Total Value (₹)': Number(o.financials?.totalAmount || 0),
      'Date': o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : 'N/A',
      'Rework Notes': o.reworkNotes || 'None'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Workflow_Report');
    XLSX.writeFile(wb, `Operations_Workflow_Report_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-fadeIn text-left max-w-7xl mx-auto pb-12">
      {/* ─── Hero Header & Operations Control Banner ──────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-gradient-to-bl from-indigo-500/20 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Operations Head Control
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-[10px] font-bold">
                Live Marketing Orders Sync
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Operations & Production Workflow
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 font-medium mt-1 max-w-2xl leading-relaxed">
              Monitoring all orders created by Marketing team across Graphic Design Studio, Reworks, Order Management, Digitizing Embroidery, Factory Production, and Delivery.
            </p>
          </div>

          {/* Quick Date Filters & Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/10 flex items-center gap-1">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setDateFilter(t.id as any)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer",
                    dateFilter === t.id
                      ? "bg-white text-gray-900 shadow-md scale-105"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={exportExcel}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-2xl transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 border-none cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" /> Export Report
            </button>
          </div>
        </div>

        {/* Live Status Strip */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl border border-white/15 cursor-pointer hover:bg-white/20 transition-all" onClick={() => setSelectedWorkflowTab('all')}>
            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-wider">📦 Marketing Created</p>
            <p className="text-xl font-black text-white mt-0.5">{baseFilteredOrders.length}</p>
          </div>
          <div className="bg-purple-500/20 backdrop-blur-xs p-3 rounded-2xl border border-purple-500/30 cursor-pointer hover:bg-purple-500/30 transition-all ring-1 ring-purple-400/40" onClick={() => setSelectedWorkflowTab('sla_tasks')}>
            <p className="text-[10px] text-purple-200 font-bold uppercase tracking-wider flex items-center gap-1">⏱️ 2h SLA Tasks</p>
            <p className="text-xl font-black text-purple-100 mt-0.5">{activeDesignClaimedOrders.length}</p>
          </div>
          <div className="bg-purple-500/10 backdrop-blur-xs p-3 rounded-2xl border border-purple-500/20 cursor-pointer hover:bg-purple-500/20 transition-all" onClick={() => setSelectedWorkflowTab('design_completed')}>
            <p className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">🎨 Designs Done</p>
            <p className="text-xl font-black text-purple-200 mt-0.5">{designCompletedOrders.length}</p>
          </div>
          <div className="bg-amber-500/10 backdrop-blur-xs p-3 rounded-2xl border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-all" onClick={() => setSelectedWorkflowTab('rework')}>
            <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">🔄 Reworks</p>
            <p className="text-xl font-black text-amber-200 mt-0.5">{reworkOrders.length}</p>
          </div>
          <div className="bg-cyan-500/10 backdrop-blur-xs p-3 rounded-2xl border border-cyan-500/20 cursor-pointer hover:bg-cyan-500/20 transition-all" onClick={() => setSelectedWorkflowTab('order_management')}>
            <p className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">📋 In Order Mgmt</p>
            <p className="text-xl font-black text-cyan-200 mt-0.5">{orderManagementOrders.length}</p>
          </div>
          <div className="bg-pink-500/10 backdrop-blur-xs p-3 rounded-2xl border border-pink-500/20 cursor-pointer hover:bg-pink-500/20 transition-all" onClick={() => setSelectedWorkflowTab('digitizer_completed')}>
            <p className="text-[10px] text-pink-300 font-bold uppercase tracking-wider">✂️ Digitizer Done</p>
            <p className="text-xl font-black text-pink-200 mt-0.5">{digitizerCompletedOrders.length}</p>
          </div>
          <div className="bg-orange-500/10 backdrop-blur-xs p-3 rounded-2xl border border-orange-500/20 cursor-pointer hover:bg-orange-500/20 transition-all" onClick={() => setSelectedWorkflowTab('production_completed')}>
            <p className="text-[10px] text-orange-300 font-bold uppercase tracking-wider">🏭 Production Done</p>
            <p className="text-xl font-black text-orange-200 mt-0.5">{productionCompletedOrders.length}</p>
          </div>
          <div className="bg-emerald-500/10 backdrop-blur-xs p-3 rounded-2xl border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-all" onClick={() => setSelectedWorkflowTab('delivery')}>
            <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">🚚 Delivery Total</p>
            <p className="text-xl font-black text-emerald-200 mt-0.5">{deliveryOrders.length}</p>
          </div>
        </div>
      </div>

      {/* ─── 6 Core KPI Cards (Requested Workflow Metrics) ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CARD 1: How many order designs completed */}
        <div
          onClick={() => setSelectedWorkflowTab('design_completed')}
          className={cn(
            "group bg-white p-6 rounded-3xl border transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden",
            selectedWorkflowTab === 'design_completed'
              ? "border-purple-500 ring-2 ring-purple-500/20 shadow-lg shadow-purple-500/10"
              : "border-gray-100 hover:border-purple-200 hover:shadow-md"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform shadow-xs">
              <Palette className="w-6 h-6" />
            </div>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-[10px] font-black uppercase rounded-full border border-purple-200 flex items-center gap-1">
              <CheckCheck className="w-3 h-3" /> Design Studio
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">DESIGNS COMPLETED</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-black text-gray-900 tracking-tight">{designCompletedOrders.length}</p>
              <span className="text-xs font-bold text-purple-600">
                {baseFilteredOrders.length > 0 ? `${Math.round((designCompletedOrders.length / baseFilteredOrders.length) * 100)}%` : '0%'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              Orders with approved graphic proofs & ready assets
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-purple-600 group-hover:text-purple-700">
            <span>View Completed Designs</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 2: How many order rework */}
        <div
          onClick={() => setSelectedWorkflowTab('rework')}
          className={cn(
            "group bg-white p-6 rounded-3xl border transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden",
            selectedWorkflowTab === 'rework'
              ? "border-amber-500 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/10"
              : "border-gray-100 hover:border-amber-200 hover:shadow-md"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform shadow-xs">
              <RefreshCw className="w-6 h-6 animate-spin-slow" />
            </div>
            <span className={cn(
              "px-3 py-1 text-[10px] font-black uppercase rounded-full border flex items-center gap-1",
              reworkOrders.length > 0 ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse" : "bg-gray-100 text-gray-600 border-gray-200"
            )}>
              <AlertTriangle className="w-3 h-3" /> Attention Required
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">ORDER REWORKS</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-black text-gray-900 tracking-tight">{reworkOrders.length}</p>
              <span className="text-xs font-bold text-amber-600">
                Corrections / Update needed
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              Orders flagged by Marketing or Client for redesign revision
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:text-amber-700">
            <span>Inspect Rework Queue</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 3: How many order show in order management */}
        <div
          onClick={() => setSelectedWorkflowTab('order_management')}
          className={cn(
            "group bg-white p-6 rounded-3xl border transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden",
            selectedWorkflowTab === 'order_management'
              ? "border-cyan-500 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/10"
              : "border-gray-100 hover:border-cyan-200 hover:shadow-md"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform shadow-xs">
              <Layers className="w-6 h-6" />
            </div>
            <span className="px-3 py-1 bg-cyan-50 text-cyan-700 text-[10px] font-black uppercase rounded-full border border-cyan-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> OM Central
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">IN ORDER MANAGEMENT</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-black text-gray-900 tracking-tight">{orderManagementOrders.length}</p>
              <span className="text-xs font-bold text-cyan-600">
                Ready for production routing
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              Orders currently verified and being processed in Order Management
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-cyan-600 group-hover:text-cyan-700">
            <span>View OM Queue</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 4: How many order digitizer work complete */}
        <div
          onClick={() => setSelectedWorkflowTab('digitizer_completed')}
          className={cn(
            "group bg-white p-6 rounded-3xl border transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden",
            selectedWorkflowTab === 'digitizer_completed'
              ? "border-pink-500 ring-2 ring-pink-500/20 shadow-lg shadow-pink-500/10"
              : "border-gray-100 hover:border-pink-200 hover:shadow-md"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 text-pink-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform shadow-xs">
              <Scissors className="w-6 h-6" />
            </div>
            <span className="px-3 py-1 bg-pink-50 text-pink-700 text-[10px] font-black uppercase rounded-full border border-pink-200 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Embroidery Tech
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">DIGITIZER WORK COMPLETED</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-black text-gray-900 tracking-tight">{digitizerCompletedOrders.length}</p>
              <span className="text-xs font-bold text-pink-600">
                EMB / Machine files ready
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              Machine punch files, stitch counts & production files uploaded
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-pink-600 group-hover:text-pink-700">
            <span>View Digitized Orders</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 5: How many orders complete in product (production) */}
        <div
          onClick={() => setSelectedWorkflowTab('production_completed')}
          className={cn(
            "group bg-white p-6 rounded-3xl border transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden",
            selectedWorkflowTab === 'production_completed'
              ? "border-orange-500 ring-2 ring-orange-500/20 shadow-lg shadow-orange-500/10"
              : "border-gray-100 hover:border-orange-200 hover:shadow-md"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform shadow-xs">
              <Factory className="w-6 h-6" />
            </div>
            <span className="px-3 py-1 bg-orange-50 text-orange-700 text-[10px] font-black uppercase rounded-full border border-orange-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Factory Output
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">PRODUCTION COMPLETED</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-black text-gray-900 tracking-tight">{productionCompletedOrders.length}</p>
              <span className="text-xs font-bold text-orange-600">
                Stitching & printing done
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              Finished manufacturing stage & passed factory quality checking
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-orange-600 group-hover:text-orange-700">
            <span>View Finished Garments</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 6: How many delivery show them */}
        <div
          onClick={() => setSelectedWorkflowTab('delivery')}
          className={cn(
            "group bg-white p-6 rounded-3xl border transition-all duration-300 cursor-pointer shadow-sm relative overflow-hidden",
            selectedWorkflowTab === 'delivery'
              ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10"
              : "border-gray-100 hover:border-emerald-200 hover:shadow-md"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform shadow-xs">
              <Truck className="w-6 h-6" />
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCheck className="w-3 h-3" /> Logistics
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">DELIVERY ORDERS</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-black text-gray-900 tracking-tight">{deliveryOrders.length}</p>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {deliveredSuccessOrders.length} Delivered • {inTransitOrders.length} In Transit
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              Orders packed, dispatched, in transit or delivered to clients
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:text-emerald-700">
            <span>View Logistics Tracking</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* ─── Marketing Staff Orders & Workflow Performance Breakdown ───────── */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Marketing Staff Order Creation & Pipeline Summary</h3>
              <p className="text-xs text-gray-400 font-medium">Breakdown of orders created by each marketing team member & their production stage</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-brand-primary/5 text-brand-primary text-xs font-bold rounded-xl border border-brand-primary/10">
            {marketingStaffSummary.length} Active Marketing Staff
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Marketing Staff / Creator</th>
                <th className="px-3 py-3 text-center">Total Created</th>
                <th className="px-3 py-3 text-center">🎨 Designs Done</th>
                <th className="px-3 py-3 text-center">🔄 Reworks</th>
                <th className="px-3 py-3 text-center">📋 In OM</th>
                <th className="px-3 py-3 text-center">✂️ Digitizer</th>
                <th className="px-3 py-3 text-center">🏭 Production</th>
                <th className="px-3 py-3 text-center">🚚 Delivered</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Total Pipeline Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {marketingStaffSummary.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400 italic">
                    No marketing created orders recorded for this time filter.
                  </td>
                </tr>
              ) : (
                marketingStaffSummary.map((staff, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-[10px] font-black">
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{staff.name}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-black text-[11px] border border-blue-200">
                        {staff.totalOrders}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-purple-700">{staff.designsCompleted}</td>
                    <td className="px-3 py-3 text-center font-bold text-amber-700">{staff.reworks}</td>
                    <td className="px-3 py-3 text-center font-bold text-cyan-700">{staff.inOrderManagement}</td>
                    <td className="px-3 py-3 text-center font-bold text-pink-700">{staff.digitizerCompleted}</td>
                    <td className="px-3 py-3 text-center font-bold text-orange-700">{staff.productionCompleted}</td>
                    <td className="px-3 py-3 text-center font-bold text-emerald-700">{staff.delivered}</td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">₹{staff.totalValue.toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Workflow Stage Pipeline Visualizer ────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">End-to-End Workflow Pipeline Progress</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Overall order distribution across all production phases</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-xl">
              {baseFilteredOrders.length} Total Orders
            </span>
          </div>
        </div>

        {/* Progress Step Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {[
            { title: '1. Designs Done', count: designCompletedOrders.length, color: 'border-purple-200 bg-purple-50 text-purple-700', icon: Palette },
            { title: '2. Rework Queue', count: reworkOrders.length, color: 'border-amber-200 bg-amber-50 text-amber-700', icon: RefreshCw },
            { title: '3. In Order Mgmt', count: orderManagementOrders.length, color: 'border-cyan-200 bg-cyan-50 text-cyan-700', icon: Layers },
            { title: '4. Digitizing Done', count: digitizerCompletedOrders.length, color: 'border-pink-200 bg-pink-50 text-pink-700', icon: Scissors },
            { title: '5. Production Done', count: productionCompletedOrders.length, color: 'border-orange-200 bg-orange-50 text-orange-700', icon: Factory },
            { title: '6. Delivery Total', count: deliveryOrders.length, color: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: Truck },
          ].map((step, idx) => (
            <div key={idx} className={cn("p-3.5 rounded-2xl border flex flex-col justify-between transition-all", step.color)}>
              <div className="flex items-center justify-between">
                <step.icon className="w-4 h-4 opacity-70" />
                <span className="text-xs font-black">{step.count}</span>
              </div>
              <p className="text-[11px] font-bold mt-2 leading-tight">{step.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Workflow Interactive Tabs & Data Table ────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-6 p-6">
        {/* Navigation & Search Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100/80 rounded-2xl border border-gray-200/50">
            {[
              { id: 'all', label: 'All Orders', count: baseFilteredOrders.length },
              { id: 'sla_tasks', label: '⏱️ 2-Hour SLA Monitor', count: activeDesignClaimedOrders.length },
              { id: 'design_completed', label: '🎨 Design Done', count: designCompletedOrders.length },
              { id: 'rework', label: '🔄 Reworks', count: reworkOrders.length },
              { id: 'order_management', label: '📋 Order Mgmt', count: orderManagementOrders.length },
              { id: 'digitizer_completed', label: '✂️ Digitizing Done', count: digitizerCompletedOrders.length },
              { id: 'production_completed', label: '🏭 Production Done', count: productionCompletedOrders.length },
              { id: 'delivery', label: '🚚 Delivery', count: deliveryOrders.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedWorkflowTab(tab.id as any)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5",
                  selectedWorkflowTab === tab.id
                    ? tab.id === 'sla_tasks'
                      ? "bg-purple-600 text-white shadow-xs font-black"
                      : "bg-white text-brand-primary shadow-xs font-black"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                  selectedWorkflowTab === tab.id
                    ? tab.id === 'sla_tasks'
                      ? "bg-white text-purple-700"
                      : "bg-brand-primary/10 text-brand-primary"
                    : "bg-gray-200/70 text-gray-600"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box for Table */}
          {selectedWorkflowTab !== 'sla_tasks' && (
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by order #, client, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:bg-white transition-all"
              />
            </div>
          )}
        </div>

        {selectedWorkflowTab === 'sla_tasks' ? (
          /* DEDICATED 2-HOUR SLA MONITOR VIEW */
          <div className="space-y-6 text-left">
            {/* Header & Controls */}
            <div className="bg-gray-50/70 rounded-3xl border border-gray-200/70 p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                    <Palette size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                      Operations Live 2-Hour SLA Tasks Monitor
                      <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-black rounded-full">
                        {activeDesignClaimedOrders.length} Active in Studio
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      Real-time countdown tracking (120-minute SLA target) for claimed and in-progress design tasks
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
                    Standard SLA: 120 mins / task
                  </span>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-200/60">
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search order #, client, designer..."
                    value={slaSearchTerm}
                    onChange={(e) => setSlaSearchTerm(e.target.value)}
                    className="w-full text-xs bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
                  />
                </div>

                {/* Designer Filter */}
                <div className="relative">
                  <select
                    value={slaDesignerFilter}
                    onChange={(e) => setSlaDesignerFilter(e.target.value)}
                    className="w-full text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20 font-medium text-gray-700"
                  >
                    <option value="all">All Designers ({uniqueDesignersList.length})</option>
                    {uniqueDesignersList.map(d => (
                      <option key={d} value={d}>🎨 {d}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter Buttons */}
                <div className="sm:col-span-2 flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200 overflow-x-auto">
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
                          ? "bg-purple-600 text-white shadow-xs font-black"
                          : "text-gray-500 hover:text-gray-900 bg-transparent"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SLA Cards Grid */}
            {filteredSlaTasks.length === 0 ? (
              <div className="bg-gray-50 p-12 rounded-3xl border border-gray-150 text-center text-gray-400 font-medium text-xs">
                No SLA tasks found matching your filter criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSlaTasks.map(order => {
                  const isCompleted = isDesignCompleted(order);
                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderForModal(order)}
                      className="bg-white p-5 rounded-3xl border border-gray-150 hover:border-purple-300 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-sm text-brand-primary group-hover:text-purple-700 transition-colors">
                          #{order.orderNumber || order.id.slice(-8)}
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
                          Marketing: <span className="font-bold text-gray-700">{order.createdByName || order.createdBy || 'Staff'}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                        <span className="text-[10px] font-black px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg flex items-center gap-1">
                          🎨 {order.assignedDesigner || 'Designer'}
                        </span>
                        <span className="font-mono font-black text-gray-900">
                          ₹{(Number(order.financials?.totalAmount) || 0).toLocaleString('en-IN')}
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
          /* REGULAR WORKFLOW ORDERS TABLE */
          <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-4 py-3.5 rounded-l-xl">Order Details</th>
                <th className="px-4 py-3.5">Client & Creator</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5 text-center">Design Stage</th>
                <th className="px-4 py-3.5 text-center">Digitizing</th>
                <th className="px-4 py-3.5 text-center">Production</th>
                <th className="px-4 py-3.5 text-center">Delivery</th>
                <th className="px-4 py-3.5 text-right">Order Value</th>
                <th className="px-4 py-3.5 text-center rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {tableOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30 text-gray-400" />
                    <p className="font-bold text-gray-500">No orders found matching this filter.</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Try selecting another workflow tab or clearing the search query.</p>
                  </td>
                </tr>
              ) : (
                tableOrders.map((o) => {
                  const designDone = isDesignCompleted(o);
                  const isRework = isOrderRework(o);
                  const digitizerDone = isDigitizerCompleted(o);
                  const productionDone = isProductionCompleted(o);
                  const deliveryDone = isInDelivery(o);
                  const amount = Number(o.financials?.totalAmount || o.netTotal || 0);

                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrderForModal(o)}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Order Details */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-gray-900 group-hover:text-brand-primary transition-colors">
                            #{o.orderNumber || o.id}
                          </span>
                          {isRework && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded uppercase border border-amber-200 animate-pulse">
                              Rework
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                        </p>
                      </td>

                      {/* Client & Creator */}
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-gray-800">{o.clientName || o.customerInfo?.name || 'N/A'}</p>
                        <p className="text-[10px] text-gray-400">By: {o.createdByName || o.createdBy || 'Staff'}</p>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-700 font-bold rounded-lg text-[10px]">
                          {getDisplayCategory(o.category)}
                        </span>
                      </td>

                      {/* Design Stage */}
                      <td className="px-4 py-3.5 text-center">
                        {isRework ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-black inline-flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" /> Rework
                            </span>
                            {(o.claimedAt || o.designClaimedAt || o.assignedDesigner) && (
                              <DesignTaskTimer
                                claimedAt={o.claimedAt || o.designClaimedAt}
                                completedAt={o.designCompletedAt}
                                isCompleted={false}
                                designerName={o.assignedDesigner}
                              />
                            )}
                          </div>
                        ) : designDone ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-black inline-flex items-center gap-1">
                              <CheckCheck className="w-2.5 h-2.5" /> Done
                            </span>
                            {o.designCompletedAt && (o.claimedAt || o.designClaimedAt) && (
                              <DesignTaskTimer
                                claimedAt={o.claimedAt || o.designClaimedAt}
                                completedAt={o.designCompletedAt}
                                isCompleted={true}
                                designerName={o.assignedDesigner}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-md text-[10px] font-bold">
                              In Studio
                            </span>
                            {(o.claimedAt || o.designClaimedAt || (o.assignedDesigner && o.assignedDesigner !== 'Unassigned')) && (
                              <DesignTaskTimer
                                claimedAt={o.claimedAt || o.designClaimedAt}
                                completedAt={o.designCompletedAt}
                                isCompleted={false}
                                designerName={o.assignedDesigner}
                              />
                            )}
                          </div>
                        )}
                      </td>

                      {/* Digitizing Stage */}
                      <td className="px-4 py-3.5 text-center">
                        {digitizerDone ? (
                          <span className="px-2 py-0.5 bg-pink-50 text-pink-700 border border-pink-200 rounded-md text-[10px] font-black inline-flex items-center gap-1">
                            <Scissors className="w-2.5 h-2.5" /> Ready
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-md text-[10px]">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Production Stage */}
                      <td className="px-4 py-3.5 text-center">
                        {productionDone ? (
                          <span className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-md text-[10px] font-black inline-flex items-center gap-1">
                            <Factory className="w-2.5 h-2.5" /> Done
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded-md text-[10px]">
                            {o.status === OrderStatus.PRODUCTION ? 'In Factory' : 'Queued'}
                          </span>
                        )}
                      </td>

                      {/* Delivery Stage */}
                      <td className="px-4 py-3.5 text-center">
                        {deliveryDone ? (
                          <span className={cn(
                            "px-2 py-0.5 border rounded-md text-[10px] font-black inline-flex items-center gap-1",
                            o.status === OrderStatus.DELIVERED ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
                          )}>
                            <Truck className="w-2.5 h-2.5" />
                            {o.status === OrderStatus.DELIVERED ? 'Delivered' : 'In Transit'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-50 text-gray-400 rounded-md text-[10px]">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Order Value */}
                      <td className="px-4 py-3.5 text-right font-black text-gray-900">
                        ₹{amount.toLocaleString('en-IN')}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderForModal(o);
                          }}
                          className="px-2.5 py-1 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white rounded-lg text-[10px] font-black transition-all border border-brand-primary/20 cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* ─── Order Detail Modal Integration ─────────────────────────────────── */}
      {selectedOrderForModal && (
        <OrderDetailModal
          order={selectedOrderForModal}
          isOpen={Boolean(selectedOrderForModal)}
          onClose={() => setSelectedOrderForModal(null)}
        />
      )}
    </div>
  );
}
