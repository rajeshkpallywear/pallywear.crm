import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  TrendingUp, Users, Package, CreditCard, Palette, FileText,
  DollarSign, CheckCircle2, Clock, Search, Filter, Download,
  ArrowUpRight, ChevronRight, Eye, RefreshCw, BarChart2, Shield,
  Phone, User, Sparkles, Building2, Calendar, FileCheck, Layers, Plus,
  MessageSquare, Edit, FileSpreadsheet, Award, UserCheck, Heart,
  Tag, Box, Gift, Shuffle, Check, AlertTriangle, RotateCcw,
  ArrowRightLeft, Send, X, ShoppingBag, Percent, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import { Order, OrderStatus, Invoice } from '../types';
import { cn } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import DesignTaskTimer from './DesignTaskTimer';
import AdminCreateOrderModal from './AdminCreateOrderModal';
import InvoiceFormModal from './InvoiceFormModal';

// Official Marketing Staff Lists (Strictly Separated Teams)
export const OFFICIAL_BOYS_TEAM = [
  { name: 'Godwin', keys: ['godwin'] },
  { name: 'Mukesh', keys: ['mukesh'] },
  { name: 'Saravanan', keys: ['saravanan'] },
  { name: 'Sakthivel', keys: ['sakthivel', 'sakthi'] }
];

export const OFFICIAL_GIRLS_TEAM = [
  { name: 'Jimla', keys: ['jimla'] },
  { name: 'Priya', keys: ['priya', 'priyanga'] },
  { name: 'Sowmiya', keys: ['sowmiya', 'sowmya'] },
  { name: 'Periyanayagi', keys: ['periyanayagi', 'periyanayaki', 'periya nayagi', 'periya'] }
];

export const OFFICIAL_MARKETING_STAFF = [
  ...OFFICIAL_GIRLS_TEAM.map(s => ({ name: s.name, keys: s.keys, isFemale: true, teamName: 'Blossom Team' as const })),
  ...OFFICIAL_BOYS_TEAM.map(s => ({ name: s.name, keys: s.keys, isFemale: false, teamName: 'Hornet Team' as const }))
];

// Helper to match an order creator / invoice creator / user to an official marketing staff
export const findOfficialMarketingStaff = (name?: string, registeredUsersList?: any[]) => {
  if (!name || typeof name !== 'string') return null;
  const clean = name.trim().toLowerCase();
  if (!clean) return null;

  // Direct match by key
  for (const staff of OFFICIAL_MARKETING_STAFF) {
    if (staff.name.toLowerCase() === clean) return staff;
    if (staff.keys.some(k => clean.includes(k))) return staff;
  }

  // Check if name exists in registered users and maps to one of them
  if (registeredUsersList && Array.isArray(registeredUsersList) && registeredUsersList.length > 0) {
    const matchedUser = registeredUsersList.find((u: any) =>
      (u?.name && typeof u.name === 'string' && u.name.trim().toLowerCase() === clean) ||
      (u?.email && typeof u.email === 'string' && u.email.trim().toLowerCase().startsWith(clean))
    );
    if (matchedUser) {
      const uName = (matchedUser.name || '').trim().toLowerCase();
      for (const staff of OFFICIAL_MARKETING_STAFF) {
        if (staff.name.toLowerCase() === uName || staff.keys.some(k => uName.includes(k))) return staff;
      }
    }
  }

  return null;
};

// Helper to determine if a marketing staff member belongs to the Girls Team (Female) or Boys Team (Male)
const isFemaleStaff = (name?: string, registeredUsersList?: any[]): boolean => {
  const staff = findOfficialMarketingStaff(name, registeredUsersList);
  if (staff) return staff.isFemale;
  return false;
};

// Helper: Raised Design Task check
const isRaisedTaskOrder = (o?: Order | null) => {
  if (!o) return false;
  if (o.isConvertedFromTask || o.details?.isConvertedFromTask) return false;
  return Boolean(o.isRaisedTask || o.details?.isRaisedTask || o.category === 'Design Task' || o.raisedTaskCategory === 'Design Task');
};

// Helper: Order converted (from task, sent to accounts/production, advance paid, or finalized)
const isConvertedOrder = (o?: Order | null) => {
  if (!o) return false;
  if (o.isConvertedFromTask || o.details?.isConvertedFromTask || (o as any).isConverted || (o.details && (o.details as any).isConverted)) return true;
  if (isSentToAccounts(o)) return true;
  const s = String(o.status || '').toLowerCase();
  if (['accounts', 'production', 'delivered', 'completed', 'dispatched', 'design'].includes(s)) return true;
  if (getAdvanceAmount(o) > 0) return true;
  return false;
};

// Helper: Rework / Revision order check
const isReworkOrder = (o?: Order | null) => {
  if (!o) return false;
  return Boolean(
    o.isRework === true ||
    o.details?.isRework === true ||
    (o as any).designRework === true ||
    (o.reworkNotes && String(o.reworkNotes).trim().length > 0)
  );
};

// Helper: Extract rework reason notes
const getReworkReason = (o?: Order | null) => {
  if (!o) return '';
  return o.reworkNotes || o.details?.reworkNotes || o.designNotes || '';
};

// Helper: 10+ total quantity classified as Bulk Order
const isBulkOrder = (o?: Order | null) => {
  if (!o) return false;
  const qty = Number(o.quantity || (Array.isArray(o.sizeBreakdown) ? o.sizeBreakdown.reduce((sum, i) => sum + (Number(i?.quantity) || 0), 0) : 0) || 0);
  return qty >= 10;
};

// Helper: 3 or more distinct product categories classified as Mixed Order
const isMixedOrder = (o?: Order | null) => {
  if (!o) return false;
  if (o.category === 'Mixed Order' || (o.category && typeof o.category === 'string' && o.category.toLowerCase().includes('mixed'))) return true;
  if (Array.isArray(o.sizeBreakdown) && o.sizeBreakdown.length > 0) {
    const distinctCats = new Set(o.sizeBreakdown.map(i => (i?.category || '').trim().toLowerCase()).filter(Boolean));
    return distinctCats.size >= 3;
  }
  return false;
};

// Helper: Gift item or other specialized merchandise categories
const isGiftOrOtherOrder = (o?: Order | null) => {
  if (!o) return false;
  const giftKeywords = ['gift', 'memento', 'trophy', 'mug', 'cap', 'bag', 'bottle', 'keychain', 'merch', 'other'];
  const cat = typeof o.category === 'string' ? o.category.toLowerCase() : '';
  if (giftKeywords.some(k => cat.includes(k))) return true;
  if (Array.isArray(o.sizeBreakdown) && o.sizeBreakdown.length > 0) {
    return o.sizeBreakdown.some(i => {
      const icat = typeof i?.category === 'string' ? i.category.toLowerCase() : '';
      return giftKeywords.some(k => icat.includes(k));
    });
  }
  return false;
};

// Helper to check if order was sent to Accounts
const isSentToAccounts = (o?: Order | null) => {
  if (!o) return false;
  return Boolean(
    o.status === OrderStatus.ACCOUNTS ||
    String(o.status || '').toLowerCase() === 'accounts' ||
    o.movedToAccountsAt ||
    o.details?.movedToAccountsAt ||
    o.sentByAccounts
  );
};

// Helper to check if order was sent to Design Studio
const isSentToDesigns = (o?: Order | null) => {
  if (!o) return false;
  return Boolean(
    o.status === OrderStatus.DESIGN ||
    String(o.status || '').toLowerCase() === 'design' ||
    o.designSentToMarketing ||
    o.details?.designSentToMarketing ||
    o.designCompleted ||
    o.details?.designCompleted ||
    o.original_design_file ||
    o.original_design_zip ||
    (Array.isArray(o.designAttachments) && o.designAttachments.length > 0) ||
    (o.assignedDesigner && o.assignedDesigner !== 'Unassigned')
  );
};

// Helper to check if order has received completed design files from Design Studio (Returned / Ready)
const isReceivedDesignsFile = (o?: Order | null) => {
  if (!o) return false;
  const isCurrentlyInRework = Boolean(
    (o.isRework === true || o.details?.isRework === true || (o as any).designRework === true || (o.reworkNotes && String(o.reworkNotes).trim().length > 0)) &&
    (String(o.status || '').toLowerCase() === 'design' || o.status === OrderStatus.DESIGN) &&
    !o.designCompleted &&
    !o.designSentToMarketing
  );
  if (isCurrentlyInRework) return false;

  return Boolean(
    o.designCompleted === true ||
    o.details?.designCompleted === true ||
    o.details?.designCompleted === 'true' ||
    o.designSentToMarketing === true ||
    o.details?.designSentToMarketing === true ||
    Boolean(o.original_design_file) ||
    Boolean(o.original_design_zip) ||
    (Array.isArray(o.designAttachments) && o.designAttachments.length > 0)
  );
};

// Helper to extract Order Value
const getOrderAmount = (o?: Order | null) => {
  if (!o) return 0;
  const val = Number(o.financials?.totalAmount || o.netTotal || o.totalOrderValue || 0);
  return isNaN(val) ? 0 : val;
};

// Helper to extract Advance Paid
const getAdvanceAmount = (o?: Order | null) => {
  if (!o) return 0;
  const val = Number(o.financials?.advancePay || o.advanceAmount || 0);
  return isNaN(val) ? 0 : val;
};

// Helper to extract Order Quantity (Total pcs)
const getOrderQuantity = (o?: Order | null) => {
  if (!o) return 0;
  if (Array.isArray(o.sizeBreakdown) && o.sizeBreakdown.length > 0) {
    const sum = o.sizeBreakdown.reduce((acc, i) => acc + (Number(i?.quantity) || 0), 0);
    if (sum > 0) return sum;
  }
  const directQty = Number(o.quantity || 0);
  return directQty > 0 ? directQty : 1;
};

// Helper to safely extract timestamp from order
const getOrderTimestamp = (o?: Order | null): number => {
  if (!o) return 0;
  const raw = o.createdAt || (o as any).date || o.updatedAt || o.details?.createdAt;
  if (!raw) return 0;
  if (typeof raw === 'number') return raw;
  const parsed = new Date(raw).getTime();
  return isNaN(parsed) ? Number(raw) || 0 : parsed;
};

interface SalesHeadDashboardProps {
  orders?: Order[];
  invoices?: Invoice[];
  user?: any;
}

export default function SalesHeadDashboard({ orders: propOrders, invoices: propInvoices, user: propUser }: SalesHeadDashboardProps) {
  const { user: authUser, registeredUsers = [] } = useAuth();
  const { orders: contextOrders, invoices: contextInvoices, updateOrder, addInvoice, updateInvoice } = useLeads();

  const user = propUser || authUser;
  const orders = propOrders || contextOrders || [];
  const invoices = propInvoices || contextInvoices || [];

  // State Filters
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [staffTeamFilter, setStaffTeamFilter] = useState<'all' | 'girls' | 'boys'>('all');
  const [selectedExecutive, setSelectedExecutive] = useState<string | null>(null);
  
  // Orders Breakdown Section Filters
  const [orderTeamFilter, setOrderTeamFilter] = useState<'all' | 'girls' | 'boys'>('all');
  const [orderClassificationFilter, setOrderClassificationFilter] = useState<'all' | 'bulk' | 'mixed' | 'gift' | 'standard'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');

  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<'overview' | 'sla_monitor'>('overview');
  const [slaStatusFilter, setSlaStatusFilter] = useState<'all' | 'in_progress' | 'overdue' | 'completed'>('all');
  const [slaDesignerFilter, setSlaDesignerFilter] = useState<string>('all');
  const [slaSearchTerm, setSlaSearchTerm] = useState('');

  // Rework Reasons Modal State
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [selectedReworkExecutive, setSelectedReworkExecutive] = useState<{ execName: string; reworks: any[] } | null>(null);

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

  // Helper to format active date filter label
  const getDateFilterBadge = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return `⚡ Today (${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`;
      case 'yesterday': {
        const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        return `⏮️ Yesterday (${y.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })})`;
      }
      case 'week': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        return `🗓️ This Week (from ${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
      }
      case 'month':
        return `📆 This Month (${now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})`;
      case 'all':
      default:
        return '🌐 All Time History';
    }
  };

  // Helper to determine if an order matches date filter
  const filterByDate = (timestamp?: number | string) => {
    if (!timestamp || dateFilter === 'all') return true;
    let timeNum: number;
    if (typeof timestamp === 'number') {
      timeNum = timestamp;
    } else if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp).getTime();
      timeNum = isNaN(parsed) ? Number(timestamp) || 0 : parsed;
    } else {
      return true;
    }
    if (!timeNum || isNaN(timeNum) || timeNum <= 0) return true;

    const date = new Date(timeNum);
    const now = new Date();

    if (dateFilter === 'today') {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }
    if (dateFilter === 'yesterday') {
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      return (
        date.getFullYear() === yesterday.getFullYear() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getDate() === yesterday.getDate()
      );
    }
    if (dateFilter === 'week') {
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return date >= startOfWeek;
    }
    if (dateFilter === 'month') {
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }
    return true;
  };

  // Orders filtered by date
  const filteredOrders = useMemo(() => {
    return (orders || []).filter(o => o && filterByDate(getOrderTimestamp(o)));
  }, [orders, dateFilter]);

  // Invoices filtered by date
  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter(inv => {
      if (!inv) return false;
      const raw = inv.createdAt || inv.date || (inv as any).updatedAt;
      return filterByDate(raw);
    });
  }, [invoices, dateFilter]);

  // Group performance metrics by Marketing Executive (strictly the 8 official staff)
  const executiveMetrics = useMemo(() => {
    const map = new Map<string, {
      name: string;
      isFemale: boolean;
      teamName: 'Blossom Team' | 'Hornet Team';
      tasksShared: number;
      designsReturned: number;
      reworksCount: number;
      reworkReasons: { orderId: string; orderNumber: string; client: string; designer: string; reason: string; date: number }[];
      ordersConverted: number;
      convertedValue: number;
      totalOrders: number;
      totalQuantity: number;
      conversionRate: number;
      sentToAccounts: number;
      sentToDesigns: number;
      receivedDesigns: number;
      bulkOrders: number;
      mixedOrders: number;
      giftOrders: number;
      totalOrderValue: number;
      totalAdvance: number;
      invoicesCount: number;
      totalInvoicedAmount: number;
      orders: Order[];
    }>();

    // Pre-populate with all 8 official marketing staff (4 Girls, 4 Boys)
    OFFICIAL_MARKETING_STAFF.forEach(staff => {
      map.set(staff.name, {
        name: staff.name,
        isFemale: staff.isFemale,
        teamName: staff.teamName,
        tasksShared: 0,
        designsReturned: 0,
        reworksCount: 0,
        reworkReasons: [],
        ordersConverted: 0,
        convertedValue: 0,
        totalOrders: 0,
        totalQuantity: 0,
        conversionRate: 0,
        sentToAccounts: 0,
        sentToDesigns: 0,
        receivedDesigns: 0,
        bulkOrders: 0,
        mixedOrders: 0,
        giftOrders: 0,
        totalOrderValue: 0,
        totalAdvance: 0,
        invoicesCount: 0,
        totalInvoicedAmount: 0,
        orders: []
      });
    });

    // Group all filtered orders by matching to official staff
    filteredOrders.forEach(o => {
      if (!o) return;
      const creator = (o.createdByName || o.createdBy || '').trim();
      if (!creator || creator.toLowerCase().includes('daniel')) return;

      const matchedStaff = findOfficialMarketingStaff(creator, registeredUsers);
      if (!matchedStaff) return; // Only attribute to official marketing staff

      const item = map.get(matchedStaff.name)!;
      item.totalOrders += 1;
      item.totalQuantity += getOrderQuantity(o);
      item.orders.push(o);

      // Tasks Shared / Raised
      if (isRaisedTaskOrder(o) || isSentToDesigns(o)) {
        item.tasksShared += 1;
      }

      // Returned Designs (Artwork ready)
      if (isReceivedDesignsFile(o)) {
        item.designsReturned += 1;
        item.receivedDesigns += 1;
      }

      // Reworks & Reasons
      if (isReworkOrder(o)) {
        item.reworksCount += 1;
        const reason = getReworkReason(o);
        if (reason) {
          item.reworkReasons.push({
            orderId: o.id,
            orderNumber: o.orderNumber || (o.id ? String(o.id).slice(-8) : 'N/A'),
            client: o.customerInfo?.name || (o as any).clientName || 'Customer',
            designer: o.assignedDesigner || 'Designer',
            reason,
            date: Number(o.updatedAt || o.createdAt || Date.now())
          });
        }
      }

      // Orders Converted from Tasks / In Pipeline
      if (isConvertedOrder(o)) {
        item.ordersConverted += 1;
        item.convertedValue += getOrderAmount(o);
      }

      if (isBulkOrder(o)) item.bulkOrders += 1;
      if (isMixedOrder(o)) item.mixedOrders += 1;
      if (isGiftOrOtherOrder(o)) item.giftOrders += 1;

      if (isSentToAccounts(o)) item.sentToAccounts += 1;
      if (isSentToDesigns(o)) item.sentToDesigns += 1;

      item.totalOrderValue += getOrderAmount(o);
      item.totalAdvance += getAdvanceAmount(o);
    });

    // Match Invoices created by or associated with each executive (using date-filtered invoices)
    (filteredInvoices || []).forEach(inv => {
      if (!inv) return;
      const invCreator = (inv.createdByName || inv.createdBy || '').trim();
      if (!invCreator || invCreator.toLowerCase().includes('daniel')) return;

      let matchedStaff = findOfficialMarketingStaff(invCreator, registeredUsers);

      // If creator isn't direct, check if invoice leadId matches any order of an executive
      if (!matchedStaff && inv.leadId) {
        for (const [name, data] of map.entries()) {
          if (data.orders.some(o => o.id === inv.leadId)) {
            matchedStaff = OFFICIAL_MARKETING_STAFF.find(s => s.name === name) || null;
            break;
          }
        }
      }

      if (matchedStaff && map.has(matchedStaff.name)) {
        const item = map.get(matchedStaff.name)!;
        item.invoicesCount += 1;
        item.totalInvoicedAmount += Number(inv.total || inv.netTotal || 0);
      }
    });

    // Compute conversion rate for each executive
    map.forEach(item => {
      const denom = item.totalOrders > 0 ? item.totalOrders : (item.tasksShared > 0 ? item.tasksShared : 0);
      item.conversionRate = denom > 0
        ? Math.min(100, Math.round((item.ordersConverted / denom) * 100))
        : 0;
    });

    return Array.from(map.values()).sort((a, b) => b.totalOrders - a.totalOrders || b.totalOrderValue - a.totalOrderValue);
  }, [filteredOrders, filteredInvoices, registeredUsers]);

  // Girls Team vs Boys Team Metrics & Totals
  const girlsTeamExecutives = useMemo(() => {
    return executiveMetrics.filter(e => e.isFemale);
  }, [executiveMetrics]);

  const boysTeamExecutives = useMemo(() => {
    return executiveMetrics.filter(e => !e.isFemale);
  }, [executiveMetrics]);

  const girlsTeamTotals = useMemo(() => {
    const acc = girlsTeamExecutives.reduce(
      (acc, curr) => ({
        staffCount: acc.staffCount + 1,
        tasksShared: acc.tasksShared + curr.tasksShared,
        designsReturned: acc.designsReturned + curr.designsReturned,
        reworksCount: acc.reworksCount + curr.reworksCount,
        ordersConverted: acc.ordersConverted + curr.ordersConverted,
        convertedValue: acc.convertedValue + curr.convertedValue,
        totalOrders: acc.totalOrders + curr.totalOrders,
        totalQuantity: acc.totalQuantity + curr.totalQuantity,
        bulkOrders: acc.bulkOrders + curr.bulkOrders,
        mixedOrders: acc.mixedOrders + curr.mixedOrders,
        giftOrders: acc.giftOrders + curr.giftOrders,
        sentToAccounts: acc.sentToAccounts + curr.sentToAccounts,
        sentToDesigns: acc.sentToDesigns + curr.sentToDesigns,
        receivedDesigns: acc.receivedDesigns + curr.receivedDesigns,
        totalOrderValue: acc.totalOrderValue + curr.totalOrderValue,
        totalAdvance: acc.totalAdvance + curr.totalAdvance,
        invoicesCount: acc.invoicesCount + curr.invoicesCount,
        totalInvoicedAmount: acc.totalInvoicedAmount + curr.totalInvoicedAmount
      }),
      {
        staffCount: 0,
        tasksShared: 0,
        designsReturned: 0,
        reworksCount: 0,
        ordersConverted: 0,
        convertedValue: 0,
        totalOrders: 0,
        totalQuantity: 0,
        bulkOrders: 0,
        mixedOrders: 0,
        giftOrders: 0,
        sentToAccounts: 0,
        sentToDesigns: 0,
        receivedDesigns: 0,
        totalOrderValue: 0,
        totalAdvance: 0,
        invoicesCount: 0,
        totalInvoicedAmount: 0
      }
    );
    const denom = acc.totalOrders > 0 ? acc.totalOrders : (acc.tasksShared > 0 ? acc.tasksShared : 0);
    const conversionRate = denom > 0
      ? Math.min(100, Math.round((acc.ordersConverted / denom) * 100))
      : 0;
    return { ...acc, conversionRate };
  }, [girlsTeamExecutives]);

  const boysTeamTotals = useMemo(() => {
    const acc = boysTeamExecutives.reduce(
      (acc, curr) => ({
        staffCount: acc.staffCount + 1,
        tasksShared: acc.tasksShared + curr.tasksShared,
        designsReturned: acc.designsReturned + curr.designsReturned,
        reworksCount: acc.reworksCount + curr.reworksCount,
        ordersConverted: acc.ordersConverted + curr.ordersConverted,
        convertedValue: acc.convertedValue + curr.convertedValue,
        totalOrders: acc.totalOrders + curr.totalOrders,
        totalQuantity: acc.totalQuantity + curr.totalQuantity,
        bulkOrders: acc.bulkOrders + curr.bulkOrders,
        mixedOrders: acc.mixedOrders + curr.mixedOrders,
        giftOrders: acc.giftOrders + curr.giftOrders,
        sentToAccounts: acc.sentToAccounts + curr.sentToAccounts,
        sentToDesigns: acc.sentToDesigns + curr.sentToDesigns,
        receivedDesigns: acc.receivedDesigns + curr.receivedDesigns,
        totalOrderValue: acc.totalOrderValue + curr.totalOrderValue,
        totalAdvance: acc.totalAdvance + curr.totalAdvance,
        invoicesCount: acc.invoicesCount + curr.invoicesCount,
        totalInvoicedAmount: acc.totalInvoicedAmount + curr.totalInvoicedAmount
      }),
      {
        staffCount: 0,
        tasksShared: 0,
        designsReturned: 0,
        reworksCount: 0,
        ordersConverted: 0,
        convertedValue: 0,
        totalOrders: 0,
        totalQuantity: 0,
        bulkOrders: 0,
        mixedOrders: 0,
        giftOrders: 0,
        sentToAccounts: 0,
        sentToDesigns: 0,
        receivedDesigns: 0,
        totalOrderValue: 0,
        totalAdvance: 0,
        invoicesCount: 0,
        totalInvoicedAmount: 0
      }
    );
    const denom = acc.totalOrders > 0 ? acc.totalOrders : (acc.tasksShared > 0 ? acc.tasksShared : 0);
    const conversionRate = denom > 0
      ? Math.min(100, Math.round((acc.ordersConverted / denom) * 100))
      : 0;
    return { ...acc, conversionRate };
  }, [boysTeamExecutives]);

  // Overall Team Summary Totals
  const teamTotals = useMemo(() => {
    const acc = executiveMetrics.reduce(
      (acc, curr) => ({
        tasksShared: acc.tasksShared + curr.tasksShared,
        designsReturned: acc.designsReturned + curr.designsReturned,
        reworksCount: acc.reworksCount + curr.reworksCount,
        ordersConverted: acc.ordersConverted + curr.ordersConverted,
        convertedValue: acc.convertedValue + curr.convertedValue,
        totalOrders: acc.totalOrders + curr.totalOrders,
        totalQuantity: acc.totalQuantity + curr.totalQuantity,
        bulkOrders: acc.bulkOrders + curr.bulkOrders,
        mixedOrders: acc.mixedOrders + curr.mixedOrders,
        giftOrders: acc.giftOrders + curr.giftOrders,
        sentToAccounts: acc.sentToAccounts + curr.sentToAccounts,
        sentToDesigns: acc.sentToDesigns + curr.sentToDesigns,
        receivedDesigns: acc.receivedDesigns + curr.receivedDesigns,
        totalOrderValue: acc.totalOrderValue + curr.totalOrderValue,
        totalAdvance: acc.totalAdvance + curr.totalAdvance,
        invoicesCount: acc.invoicesCount + curr.invoicesCount,
        totalInvoicedAmount: acc.totalInvoicedAmount + curr.totalInvoicedAmount
      }),
      {
        tasksShared: 0,
        designsReturned: 0,
        reworksCount: 0,
        ordersConverted: 0,
        convertedValue: 0,
        totalOrders: 0,
        totalQuantity: 0,
        bulkOrders: 0,
        mixedOrders: 0,
        giftOrders: 0,
        sentToAccounts: 0,
        sentToDesigns: 0,
        receivedDesigns: 0,
        totalOrderValue: 0,
        totalAdvance: 0,
        invoicesCount: 0,
        totalInvoicedAmount: 0
      }
    );
    const denom = acc.totalOrders > 0 ? acc.totalOrders : (acc.tasksShared > 0 ? acc.tasksShared : 0);
    const conversionRate = denom > 0
      ? Math.min(100, Math.round((acc.ordersConverted / denom) * 100))
      : 0;
    return { ...acc, conversionRate };
  }, [executiveMetrics]);

  // Selected individual executive stats
  const activeExecutiveStats = useMemo(() => {
    if (!selectedExecutive) return null;
    return executiveMetrics.find(e => e.name === selectedExecutive) || null;
  }, [executiveMetrics, selectedExecutive]);

  // Filtered executive list based on search and Team Filter (Girls / Boys / All)
  const displayedExecutives = useMemo(() => {
    let list = executiveMetrics;
    if (staffTeamFilter === 'girls') {
      list = list.filter(e => e.isFemale);
    } else if (staffTeamFilter === 'boys') {
      list = list.filter(e => !e.isFemale);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(term));
    }
    return list;
  }, [executiveMetrics, staffTeamFilter, searchTerm]);

  // Unique list of official marketing staff for the dropdown selector
  const uniqueMarketingStaffList = useMemo(() => {
    return OFFICIAL_MARKETING_STAFF.map(s => ({
      name: s.name,
      isFemale: s.isFemale,
      teamName: s.teamName
    }));
  }, []);

  // Classification & Category counts for currently selected Staff/Team (strictly official marketing orders)
  const orderClassificationCounts = useMemo(() => {
    let list = filteredOrders.filter(o => {
      const creator = (o.createdByName || o.createdBy || '').trim();
      return Boolean(findOfficialMarketingStaff(creator, registeredUsers));
    });

    if (selectedExecutive) {
      list = list.filter(o => {
        const creator = (o.createdByName || o.createdBy || '').trim();
        const staff = findOfficialMarketingStaff(creator, registeredUsers);
        return staff && staff.name === selectedExecutive;
      });
    } else if (orderTeamFilter === 'girls') {
      list = list.filter(o => {
        const creator = (o.createdByName || o.createdBy || '').trim();
        const staff = findOfficialMarketingStaff(creator, registeredUsers);
        return staff && staff.isFemale;
      });
    } else if (orderTeamFilter === 'boys') {
      list = list.filter(o => {
        const creator = (o.createdByName || o.createdBy || '').trim();
        const staff = findOfficialMarketingStaff(creator, registeredUsers);
        return staff && !staff.isFemale;
      });
    }

    return {
      all: list.length,
      bulk: list.filter(isBulkOrder).length,
      mixed: list.filter(isMixedOrder).length,
      gift: list.filter(isGiftOrOtherOrder).length,
      standard: list.filter(o => !isBulkOrder(o) && !isMixedOrder(o) && !isGiftOrOtherOrder(o)).length
    };
  }, [filteredOrders, selectedExecutive, orderTeamFilter, registeredUsers]);

  // Orders for drill-down table with full multi-layer filtering (Staff, Team, Classification, Status, Search)
  const drillDownOrders = useMemo(() => {
    // Only include orders created by official marketing staff
    let list = filteredOrders.filter(o => {
      const creator = (o.createdByName || o.createdBy || '').trim();
      return Boolean(findOfficialMarketingStaff(creator, registeredUsers));
    });

    // 1. Marketing Staff Filter
    if (selectedExecutive) {
      list = list.filter(o => {
        const creator = (o.createdByName || o.createdBy || '').trim();
        const staff = findOfficialMarketingStaff(creator, registeredUsers);
        return staff && staff.name === selectedExecutive;
      });
    } else if (orderTeamFilter === 'girls') {
      list = list.filter(o => {
        const creator = (o.createdByName || o.createdBy || '').trim();
        const staff = findOfficialMarketingStaff(creator, registeredUsers);
        return staff && staff.isFemale;
      });
    } else if (orderTeamFilter === 'boys') {
      list = list.filter(o => {
        const creator = (o.createdByName || o.createdBy || '').trim();
        const staff = findOfficialMarketingStaff(creator, registeredUsers);
        return staff && !staff.isFemale;
      });
    }

    // 2. Order Classification Filter (Bulk 10+, Mixed 3+, Gift/Other, Standard)
    if (orderClassificationFilter === 'bulk') {
      list = list.filter(isBulkOrder);
    } else if (orderClassificationFilter === 'mixed') {
      list = list.filter(isMixedOrder);
    } else if (orderClassificationFilter === 'gift') {
      list = list.filter(isGiftOrOtherOrder);
    } else if (orderClassificationFilter === 'standard') {
      list = list.filter(o => !isBulkOrder(o) && !isMixedOrder(o) && !isGiftOrOtherOrder(o));
    }

    // 3. Pipeline / Status Filter
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

    // 4. Order Search Filter
    if (orderSearchTerm.trim()) {
      const term = orderSearchTerm.toLowerCase();
      list = list.filter(o =>
        (o.customerInfo?.name || (o as any).clientName || '').toLowerCase().includes(term) ||
        (o.customerInfo?.phone || o.phone || '').toLowerCase().includes(term) ||
        (o.id || '').toLowerCase().includes(term) ||
        (o.orderNumber || '').toLowerCase().includes(term) ||
        (o.category || '').toLowerCase().includes(term) ||
        (o.createdByName || o.createdBy || '').toLowerCase().includes(term)
      );
    }

    return list;
  }, [filteredOrders, selectedExecutive, orderTeamFilter, orderClassificationFilter, statusFilter, orderSearchTerm, registeredUsers]);

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

  // All Reworks across filtered period
  const allFilteredReworks = useMemo(() => {
    const list: { orderId: string; orderNumber: string; client: string; creator: string; designer: string; reason: string; date: number }[] = [];
    filteredOrders.forEach(o => {
      if (isReworkOrder(o)) {
        list.push({
          orderId: o.id,
          orderNumber: o.orderNumber || (o.id ? String(o.id).slice(-8) : 'N/A'),
          client: o.customerInfo?.name || (o as any).clientName || 'Customer',
          creator: o.createdByName || o.createdBy || 'Marketing',
          designer: o.assignedDesigner || 'Designer',
          reason: getReworkReason(o) || 'Revision Requested',
          date: Number(o.updatedAt || o.createdAt || Date.now())
        });
      }
    });
    return list;
  }, [filteredOrders]);

  // Dynamic displayed pulse stats for Top KPI Ribbon & Orders Flow Section
  const displayedPulseStats = useMemo(() => {
    if (activeExecutiveStats) {
      return {
        label: `Executive: ${activeExecutiveStats.name} (${activeExecutiveStats.teamName})`,
        teamName: activeExecutiveStats.teamName,
        isIndividual: true,
        staffCount: 1,
        tasksShared: activeExecutiveStats.tasksShared || 0,
        designsReturned: activeExecutiveStats.designsReturned || 0,
        reworksCount: activeExecutiveStats.reworksCount || 0,
        reworkReasons: activeExecutiveStats.reworkReasons || [],
        ordersConverted: activeExecutiveStats.ordersConverted || 0,
        convertedValue: activeExecutiveStats.convertedValue || 0,
        totalOrders: activeExecutiveStats.totalOrders || 0,
        totalQuantity: activeExecutiveStats.totalQuantity || 0,
        conversionRate: activeExecutiveStats.conversionRate || 0,
        bulkOrders: activeExecutiveStats.bulkOrders || 0,
        mixedOrders: activeExecutiveStats.mixedOrders || 0,
        giftOrders: activeExecutiveStats.giftOrders || 0,
        invoicesCount: activeExecutiveStats.invoicesCount || 0,
        totalInvoicedAmount: activeExecutiveStats.totalInvoicedAmount || 0,
        totalOrderValue: activeExecutiveStats.totalOrderValue || 0,
        totalAdvance: activeExecutiveStats.totalAdvance || 0,
        balanceDue: Math.max(0, (activeExecutiveStats.totalOrderValue || 0) - (activeExecutiveStats.totalAdvance || 0))
      };
    }
    if (orderTeamFilter === 'girls' || staffTeamFilter === 'girls') {
      return {
        label: `Blossom Team Totals (${girlsTeamExecutives.length} Female Staff)`,
        teamName: 'Blossom Team',
        isIndividual: false,
        staffCount: girlsTeamExecutives.length,
        tasksShared: girlsTeamTotals.tasksShared || 0,
        designsReturned: girlsTeamTotals.designsReturned || 0,
        reworksCount: girlsTeamTotals.reworksCount || 0,
        reworkReasons: girlsTeamExecutives.flatMap(e => e.reworkReasons || []),
        ordersConverted: girlsTeamTotals.ordersConverted || 0,
        convertedValue: girlsTeamTotals.convertedValue || 0,
        totalOrders: girlsTeamTotals.totalOrders || 0,
        totalQuantity: girlsTeamTotals.totalQuantity || 0,
        conversionRate: girlsTeamTotals.conversionRate || 0,
        bulkOrders: girlsTeamTotals.bulkOrders || 0,
        mixedOrders: girlsTeamTotals.mixedOrders || 0,
        giftOrders: girlsTeamTotals.giftOrders || 0,
        invoicesCount: girlsTeamTotals.invoicesCount || 0,
        totalInvoicedAmount: girlsTeamTotals.totalInvoicedAmount || 0,
        totalOrderValue: girlsTeamTotals.totalOrderValue || 0,
        totalAdvance: girlsTeamTotals.totalAdvance || 0,
        balanceDue: Math.max(0, (girlsTeamTotals.totalOrderValue || 0) - (girlsTeamTotals.totalAdvance || 0))
      };
    }
    if (orderTeamFilter === 'boys' || staffTeamFilter === 'boys') {
      return {
        label: `Hornet Team Totals (${boysTeamExecutives.length} Male Staff)`,
        teamName: 'Hornet Team',
        isIndividual: false,
        staffCount: boysTeamExecutives.length,
        tasksShared: boysTeamTotals.tasksShared || 0,
        designsReturned: boysTeamTotals.designsReturned || 0,
        reworksCount: boysTeamTotals.reworksCount || 0,
        reworkReasons: boysTeamExecutives.flatMap(e => e.reworkReasons || []),
        ordersConverted: boysTeamTotals.ordersConverted || 0,
        convertedValue: boysTeamTotals.convertedValue || 0,
        totalOrders: boysTeamTotals.totalOrders || 0,
        totalQuantity: boysTeamTotals.totalQuantity || 0,
        conversionRate: boysTeamTotals.conversionRate || 0,
        bulkOrders: boysTeamTotals.bulkOrders || 0,
        mixedOrders: boysTeamTotals.mixedOrders || 0,
        giftOrders: boysTeamTotals.giftOrders || 0,
        invoicesCount: boysTeamTotals.invoicesCount || 0,
        totalInvoicedAmount: boysTeamTotals.totalInvoicedAmount || 0,
        totalOrderValue: boysTeamTotals.totalOrderValue || 0,
        totalAdvance: boysTeamTotals.totalAdvance || 0,
        balanceDue: Math.max(0, (boysTeamTotals.totalOrderValue || 0) - (boysTeamTotals.totalAdvance || 0))
      };
    }
    return {
      label: `All Marketing Teams Combined (${executiveMetrics.length} Staff)`,
      teamName: 'All Teams',
      isIndividual: false,
      staffCount: executiveMetrics.length,
      tasksShared: teamTotals.tasksShared || 0,
      designsReturned: teamTotals.designsReturned || 0,
      reworksCount: teamTotals.reworksCount || 0,
      reworkReasons: allFilteredReworks || [],
      ordersConverted: teamTotals.ordersConverted || 0,
      convertedValue: teamTotals.convertedValue || 0,
      totalOrders: teamTotals.totalOrders || 0,
      totalQuantity: teamTotals.totalQuantity || 0,
      conversionRate: teamTotals.conversionRate || 0,
      bulkOrders: teamTotals.bulkOrders || 0,
      mixedOrders: teamTotals.mixedOrders || 0,
      giftOrders: teamTotals.giftOrders || 0,
      invoicesCount: teamTotals.invoicesCount || 0,
      totalInvoicedAmount: teamTotals.totalInvoicedAmount || 0,
      totalOrderValue: teamTotals.totalOrderValue || 0,
      totalAdvance: teamTotals.totalAdvance || 0,
      balanceDue: Math.max(0, (teamTotals.totalOrderValue || 0) - (teamTotals.totalAdvance || 0))
    };
  }, [activeExecutiveStats, orderTeamFilter, staffTeamFilter, girlsTeamTotals, boysTeamTotals, teamTotals, girlsTeamExecutives, boysTeamExecutives, executiveMetrics, allFilteredReworks]);

  // 1. Export currently filtered orders to Excel (.xlsx)
  const handleExportOrdersToExcel = () => {
    if (drillDownOrders.length === 0) {
      alert("No orders available to export with the currently selected filters.");
      return;
    }

    const exportRows = drillDownOrders.map(o => {
      const isBulk = isBulkOrder(o);
      const isMixed = isMixedOrder(o);
      const isGift = isGiftOrOtherOrder(o);
      const isRework = isReworkOrder(o);
      const isConverted = isConvertedOrder(o);

      let classification = 'Standard Order';
      if (isBulk && isMixed) classification = 'Bulk & Mixed (10+ Qty & 3+ Cats)';
      else if (isBulk) classification = 'Bulk Order (10+ Qty)';
      else if (isMixed) classification = 'Mixed Order (3+ Cats)';
      else if (isGift) classification = 'Gift Item / Merchandise';

      const creator = (o.createdByName || o.createdBy || 'Unknown Staff').trim();
      const isFemale = isFemaleStaff(creator, registeredUsers);
      const teamName = isFemale ? 'Blossom Team' : 'Hornet Team';

      const itemsSummary = (Array.isArray(o.sizeBreakdown) ? o.sizeBreakdown : [])
        .map(b => `${b?.category || 'Item'} (${b?.size || '-'}): ${b?.quantity || 1}pcs @ ₹${b?.price || 0}`)
        .join('; ');

      const totalQty = Number(o.quantity || (Array.isArray(o.sizeBreakdown) ? o.sizeBreakdown.reduce((s, i) => s + (Number(i?.quantity) || 0), 0) : 0) || 1);
      const amount = getOrderAmount(o);
      const advance = getAdvanceAmount(o);
      const balance = Math.max(0, amount - advance);

      return {
        'Order ID': `#${o.orderNumber || (o.id ? String(o.id).slice(-8) : 'N/A')}`,
        'Full Order ID': o.id,
        'Created Date': o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '-',
        'Created Time': o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
        'Marketing Staff': creator,
        'Staff Team': teamName,
        'Customer Name': o.customerInfo?.name || (o as any).clientName || '-',
        'Customer Phone': o.customerInfo?.phone || o.phone || '-',
        'Shipping Address': o.customerInfo?.address || '-',
        'Category': o.category || '-',
        'Classification': classification,
        'Converted from Task': isConverted ? 'YES' : 'NO',
        'Total Quantity (pcs)': totalQty,
        'Order Status': String(o.status || '').replace('_', ' ').toUpperCase(),
        'Order Value (₹)': amount,
        'Advance Paid (₹)': advance,
        'Balance to Collect (₹)': balance,
        'Accounts Dispatched': isSentToAccounts(o) ? 'YES' : 'NO',
        'Design Studio Status': isSentToDesigns(o) ? (isReceivedDesignsFile(o) ? 'Artwork Ready' : 'In Design') : 'Pending',
        'Assigned Designer': o.assignedDesigner && o.assignedDesigner !== 'Unassigned' ? o.assignedDesigner : (o.claimedByName || 'Unassigned'),
        'Artwork Returned Ready': isReceivedDesignsFile(o) ? 'YES' : 'NO',
        'Is Rework': isRework ? 'YES' : 'NO',
        'Rework Reason': isRework ? getReworkReason(o) : '',
        'Is Urgent': o.isUrgent ? 'YES' : 'NO',
        'Urgent Reason': o.urgentReason || o.details?.urgentReason || '',
        'Items Breakdown': itemsSummary || '-',
        'Notes & Specifications': o.notes || o.productionNotes || o.designNotes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales_Orders');

    const maxCols = Object.keys(exportRows[0] || {}).length;
    worksheet['!cols'] = Array(maxCols).fill({ wch: 22 });

    const staffPrefix = selectedExecutive ? `${selectedExecutive.replace(/[^a-zA-Z0-9]/g, '_')}_` : '';
    const teamPrefix = orderTeamFilter !== 'all' ? `${orderTeamFilter.toUpperCase()}_TEAM_` : '';
    const classPrefix = orderClassificationFilter !== 'all' ? `${orderClassificationFilter.toUpperCase()}_` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Sales_Head_Orders_${staffPrefix}${teamPrefix}${classPrefix}${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  // 2. Export Team-wise (Team Voice) Summary Report to Excel (.xlsx)
  const handleExportTeamVoiceToExcel = () => {
    const teamsData = [
      {
        'Staff Team': '🌸 Blossom Team (Female Staff)',
        'Staff Count': girlsTeamExecutives.length,
        'Staff Members': girlsTeamExecutives.map(e => e.name).join(', '),
        'Total Sales Deals': girlsTeamTotals.totalOrders,
        'Total Quantity (pcs)': girlsTeamTotals.totalQuantity,
        'Converted Deals': girlsTeamTotals.ordersConverted,
        'Conversion Rate (%)': `${girlsTeamTotals.conversionRate}%`,
        'Converted Value (₹)': girlsTeamTotals.convertedValue,
        'Total Order Value (₹)': girlsTeamTotals.totalOrderValue,
        'Advance Collected (₹)': girlsTeamTotals.totalAdvance,
        'Balance to Collect (₹)': Math.max(0, girlsTeamTotals.totalOrderValue - girlsTeamTotals.totalAdvance),
        'Tasks Shared (Raised)': girlsTeamTotals.tasksShared,
        'Designs Returned (Ready)': girlsTeamTotals.designsReturned,
        'Reworks Count': girlsTeamTotals.reworksCount,
        'Bulk Orders (10+ Qty)': girlsTeamTotals.bulkOrders,
        'Mixed Orders (3+ Cats)': girlsTeamTotals.mixedOrders,
        'Gift / Other Orders': girlsTeamTotals.giftOrders,
        'Invoices Shared': girlsTeamTotals.invoicesCount,
        'Invoiced Amount (₹)': girlsTeamTotals.totalInvoicedAmount
      },
      {
        'Staff Team': '🐝 Hornet Team (Male Staff)',
        'Staff Count': boysTeamExecutives.length,
        'Staff Members': boysTeamExecutives.map(e => e.name).join(', '),
        'Total Sales Deals': boysTeamTotals.totalOrders,
        'Total Quantity (pcs)': boysTeamTotals.totalQuantity,
        'Converted Deals': boysTeamTotals.ordersConverted,
        'Conversion Rate (%)': `${boysTeamTotals.conversionRate}%`,
        'Converted Value (₹)': boysTeamTotals.convertedValue,
        'Total Order Value (₹)': boysTeamTotals.totalOrderValue,
        'Advance Collected (₹)': boysTeamTotals.totalAdvance,
        'Balance to Collect (₹)': Math.max(0, boysTeamTotals.totalOrderValue - boysTeamTotals.totalAdvance),
        'Tasks Shared (Raised)': boysTeamTotals.tasksShared,
        'Designs Returned (Ready)': boysTeamTotals.designsReturned,
        'Reworks Count': boysTeamTotals.reworksCount,
        'Bulk Orders (10+ Qty)': boysTeamTotals.bulkOrders,
        'Mixed Orders (3+ Cats)': boysTeamTotals.mixedOrders,
        'Gift / Other Orders': boysTeamTotals.giftOrders,
        'Invoices Shared': boysTeamTotals.invoicesCount,
        'Invoiced Amount (₹)': boysTeamTotals.totalInvoicedAmount
      },
      {
        'Staff Team': '👥 All Marketing Teams Combined',
        'Staff Count': executiveMetrics.length,
        'Staff Members': executiveMetrics.map(e => e.name).join(', '),
        'Total Sales Deals': teamTotals.totalOrders,
        'Total Quantity (pcs)': teamTotals.totalQuantity,
        'Converted Deals': teamTotals.ordersConverted,
        'Conversion Rate (%)': `${teamTotals.conversionRate}%`,
        'Converted Value (₹)': teamTotals.convertedValue,
        'Total Order Value (₹)': teamTotals.totalOrderValue,
        'Advance Collected (₹)': teamTotals.totalAdvance,
        'Balance to Collect (₹)': Math.max(0, teamTotals.totalOrderValue - teamTotals.totalAdvance),
        'Tasks Shared (Raised)': teamTotals.tasksShared,
        'Designs Returned (Ready)': teamTotals.designsReturned,
        'Reworks Count': teamTotals.reworksCount,
        'Bulk Orders (10+ Qty)': teamTotals.bulkOrders,
        'Mixed Orders (3+ Cats)': teamTotals.mixedOrders,
        'Gift / Other Orders': teamTotals.giftOrders,
        'Invoices Shared': teamTotals.invoicesCount,
        'Invoiced Amount (₹)': teamTotals.totalInvoicedAmount
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(teamsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Team_Voice_Report');
    worksheet['!cols'] = Array(Object.keys(teamsData[0]).length).fill({ wch: 24 });
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Marketing_Team_Voice_Report_${dateStr}.xlsx`);
  };

  // 3. Export Individual Staff (Indijul) Performance Report to Excel (.xlsx)
  const handleExportExecutiveToExcel = () => {
    if (displayedExecutives.length === 0) {
      alert("No executive performance data to export.");
      return;
    }

    const exportRows = displayedExecutives.map((e, idx) => {
      const balanceDue = Math.max(0, e.totalOrderValue - e.totalAdvance);
      const reworkSummary = e.reworkReasons.map(r => `[#${r.orderNumber}]: ${r.reason}`).join('; ');

      return {
        'Rank': idx + 1,
        'Executive Name': e.name,
        'Team': e.teamName,
        'Total Sales Deals': e.totalOrders,
        'Total Quantity (pcs)': e.totalQuantity,
        'Converted Deals': e.ordersConverted,
        'Conversion Rate (%)': `${e.conversionRate}%`,
        'Converted Value (₹)': e.convertedValue,
        'Total Order Value (₹)': e.totalOrderValue,
        'Advance Collected (₹)': e.totalAdvance,
        'Balance to Collect (₹)': balanceDue,
        'Tasks Shared (Raised)': e.tasksShared,
        'Designs Returned (Ready)': e.designsReturned,
        'Reworks Count': e.reworksCount,
        'Rework Reasons': reworkSummary || '-',
        'Bulk Orders (10+ Qty)': e.bulkOrders,
        'Mixed Orders (3+ Cats)': e.mixedOrders,
        'Gift / Other Orders': e.giftOrders,
        'Sent to Accounts': e.sentToAccounts,
        'Sent to Designs': e.sentToDesigns,
        'Invoices Shared': e.invoicesCount,
        'Total Invoiced Amount (₹)': e.totalInvoicedAmount
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Individual_Staff_Report');

    const maxCols = Object.keys(exportRows[0] || {}).length;
    worksheet['!cols'] = Array(maxCols).fill({ wch: 22 });

    const teamPrefix = staffTeamFilter !== 'all' ? `${staffTeamFilter.toUpperCase()}_TEAM_` : '';
    const staffPrefix = selectedExecutive ? `${selectedExecutive}_` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Marketing_Individual_Staff_Report_${staffPrefix}${teamPrefix}${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

  // 4. Export Master Multi-Sheet Complete Report to Excel (.xlsx)
  const handleExportMasterReportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Team Voice
    const teamVoiceRows = [
      {
        'Team Name': '🌸 Blossom Team (Female Staff)',
        'Staff Count': girlsTeamExecutives.length,
        'Total Sales Deals': girlsTeamTotals.totalOrders,
        'Total Qty (pcs)': girlsTeamTotals.totalQuantity,
        'Converted Deals': girlsTeamTotals.ordersConverted,
        'Conversion Rate (%)': `${girlsTeamTotals.conversionRate}%`,
        'Converted Value (₹)': girlsTeamTotals.convertedValue,
        'Total Order Value (₹)': girlsTeamTotals.totalOrderValue,
        'Advance Collected (₹)': girlsTeamTotals.totalAdvance,
        'Balance to Collect (₹)': Math.max(0, girlsTeamTotals.totalOrderValue - girlsTeamTotals.totalAdvance),
        'Invoiced (₹)': girlsTeamTotals.totalInvoicedAmount
      },
      {
        'Team Name': '🐝 Hornet Team (Male Staff)',
        'Staff Count': boysTeamExecutives.length,
        'Total Sales Deals': boysTeamTotals.totalOrders,
        'Total Qty (pcs)': boysTeamTotals.totalQuantity,
        'Converted Deals': boysTeamTotals.ordersConverted,
        'Conversion Rate (%)': `${boysTeamTotals.conversionRate}%`,
        'Converted Value (₹)': boysTeamTotals.convertedValue,
        'Total Order Value (₹)': boysTeamTotals.totalOrderValue,
        'Advance Collected (₹)': boysTeamTotals.totalAdvance,
        'Balance to Collect (₹)': Math.max(0, boysTeamTotals.totalOrderValue - boysTeamTotals.totalAdvance),
        'Invoiced (₹)': boysTeamTotals.totalInvoicedAmount
      },
      {
        'Team Name': '👥 All Teams Combined',
        'Staff Count': executiveMetrics.length,
        'Total Sales Deals': teamTotals.totalOrders,
        'Total Qty (pcs)': teamTotals.totalQuantity,
        'Converted Deals': teamTotals.ordersConverted,
        'Conversion Rate (%)': `${teamTotals.conversionRate}%`,
        'Converted Value (₹)': teamTotals.convertedValue,
        'Total Order Value (₹)': teamTotals.totalOrderValue,
        'Advance Collected (₹)': teamTotals.totalAdvance,
        'Balance to Collect (₹)': Math.max(0, teamTotals.totalOrderValue - teamTotals.totalAdvance),
        'Invoiced (₹)': teamTotals.totalInvoicedAmount
      }
    ];
    const ws1 = XLSX.utils.json_to_sheet(teamVoiceRows);
    ws1['!cols'] = Array(Object.keys(teamVoiceRows[0]).length).fill({ wch: 22 });
    XLSX.utils.book_append_sheet(workbook, ws1, 'Team_Voice_Summary');

    // Sheet 2: Individual Staff
    const staffRows = executiveMetrics.map((e, idx) => ({
      'Rank': idx + 1,
      'Executive Name': e.name,
      'Team': e.teamName,
      'Total Sales Deals': e.totalOrders,
      'Total Qty (pcs)': e.totalQuantity,
      'Converted Deals': e.ordersConverted,
      'Conversion Rate (%)': `${e.conversionRate}%`,
      'Converted Value (₹)': e.convertedValue,
      'Total Order Value (₹)': e.totalOrderValue,
      'Advance Collected (₹)': e.totalAdvance,
      'Balance to Collect (₹)': Math.max(0, e.totalOrderValue - e.totalAdvance),
      'Invoiced (₹)': e.totalInvoicedAmount
    }));
    const ws2 = XLSX.utils.json_to_sheet(staffRows);
    ws2['!cols'] = Array(Object.keys(staffRows[0] || {}).length).fill({ wch: 20 });
    XLSX.utils.book_append_sheet(workbook, ws2, 'Individual_Staff_Performance');

    // Sheet 3: Filtered Orders
    if (drillDownOrders.length > 0) {
      const orderRows = drillDownOrders.map(o => ({
        'Order ID': `#${o.orderNumber || (o.id ? String(o.id).slice(-8) : 'N/A')}`,
        'Date': o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '-',
        'Staff': (o.createdByName || o.createdBy || 'Staff').trim(),
        'Customer': o.customerInfo?.name || (o as any).clientName || '-',
        'Phone': o.customerInfo?.phone || o.phone || '-',
        'Category': o.category || '-',
        'Quantity': Number(o.quantity || (Array.isArray(o.sizeBreakdown) ? o.sizeBreakdown.reduce((s, i) => s + (Number(i?.quantity) || 0), 0) : 0) || 1),
        'Status': String(o.status || '').toUpperCase(),
        'Order Value (₹)': getOrderAmount(o),
        'Advance Paid (₹)': getAdvanceAmount(o),
        'Balance to Collect (₹)': Math.max(0, getOrderAmount(o) - getAdvanceAmount(o)),
        'Converted': isConvertedOrder(o) ? 'YES' : 'NO'
      }));
      const ws3 = XLSX.utils.json_to_sheet(orderRows);
      ws3['!cols'] = Array(Object.keys(orderRows[0] || {}).length).fill({ wch: 18 });
      XLSX.utils.book_append_sheet(workbook, ws3, 'Filtered_Orders');
    }

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Sales_Head_Master_Report_${dateStr}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Top Header: Navigation Tabs and Date/Action Controls */}
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

        {/* Date Range Selector & Action Buttons */}
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
            onClick={handleExportTeamVoiceToExcel}
            className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Download Team-wise (Blossom vs Hornet vs Combined) Excel report"
          >
            <FileSpreadsheet size={14} /> 🌸🐝 Team Voice (.xlsx)
          </button>

          <button
            onClick={handleExportExecutiveToExcel}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Download Individual Staff (8 marketing executives) Excel report"
          >
            <Download size={14} /> 👤 Individual Staff (.xlsx)
          </button>

          <button
            onClick={handleExportOrdersToExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 border-none cursor-pointer"
            title="Export currently filtered orders to Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} /> 📋 Orders (.xlsx)
          </button>

          <button
            onClick={handleExportMasterReportToExcel}
            className="px-3.5 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-brand-primary/20 flex items-center gap-1.5 border-none cursor-pointer"
            title="Download Complete Master Multi-Sheet Excel Report (.xlsx)"
          >
            <Download size={14} /> 📊 Master Report (.xlsx)
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


          {/* Key Metric Pulse Ribbon (Tasks Shared, Returned Designs, Reworks, Converted Orders, Invoices) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 text-left">
            {/* 1. Tasks Shared */}
            <div className="p-4 rounded-3xl bg-white border border-indigo-150 shadow-xs flex flex-col justify-between space-y-2 hover:border-indigo-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">📤 Tasks Shared</span>
                <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-700">
                  <Send size={15} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900 tracking-tight">{displayedPulseStats.tasksShared}</div>
                <div className="text-[10px] font-bold text-gray-400 mt-0.5">Raised for Design Studio</div>
              </div>
            </div>

            {/* 2. Designs Returned (Art Ready) */}
            <div className="p-4 rounded-3xl bg-white border border-emerald-150 shadow-xs flex flex-col justify-between space-y-2 hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">📥 Returned Ready</span>
                <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700">
                  <FileCheck size={15} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900 tracking-tight">{displayedPulseStats.designsReturned}</div>
                <div className="text-[10px] font-bold text-emerald-600 mt-0.5">Artwork Ready / Delivered</div>
              </div>
            </div>

            {/* 3. Reworks Requested & Reason */}
            <div
              onClick={() => {
                setSelectedReworkExecutive({
                  execName: selectedExecutive ? selectedExecutive : (staffTeamFilter === 'girls' ? 'Blossom Team' : staffTeamFilter === 'boys' ? 'Hornet Team' : 'All Marketing Staff'),
                  reworks: (displayedPulseStats as any).reworkReasons || []
                });
                setShowReworkModal(true);
              }}
              className="p-4 rounded-3xl bg-white border border-amber-150 shadow-xs flex flex-col justify-between space-y-2 hover:border-amber-400 cursor-pointer hover:bg-amber-50/20 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">🔁 Reworks</span>
                <div className="p-1.5 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-100 transition-colors">
                  <RotateCcw size={15} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-amber-900 tracking-tight flex items-center justify-between">
                  <span>{displayedPulseStats.reworksCount}</span>
                  <span className="text-[10px] font-black text-amber-700 underline group-hover:text-amber-900">View Reasons →</span>
                </div>
                <div className="text-[10px] font-bold text-amber-600 mt-0.5">Click to view rework reasons</div>
              </div>
            </div>

            {/* 4. Orders Converted from Tasks */}
            <div className="p-4 rounded-3xl bg-white border border-purple-150 shadow-xs flex flex-col justify-between space-y-2 hover:border-purple-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">🛒 Converted Orders</span>
                <div className="p-1.5 rounded-xl bg-purple-50 text-purple-700">
                  <ArrowRightLeft size={15} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900 tracking-tight">{displayedPulseStats.ordersConverted}</div>
                <div className="text-[10px] font-bold text-purple-600 mt-0.5">Tasks Converted to Deals</div>
              </div>
            </div>

            {/* 5. Invoices Shared */}
            <div className="p-4 rounded-3xl bg-white border border-teal-150 shadow-xs flex flex-col justify-between space-y-2 hover:border-teal-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider">📄 Invoices Shared</span>
                <div className="p-1.5 rounded-xl bg-teal-50 text-teal-700">
                  <FileText size={15} />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900 tracking-tight">{displayedPulseStats.invoicesCount}</div>
                <div className="text-[10px] font-bold text-teal-600 mt-0.5">₹{displayedPulseStats.totalInvoicedAmount.toLocaleString()} Invoiced</div>
              </div>
            </div>

            {/* 6. Total Order Value & Advance */}
            <div className="p-4 rounded-3xl bg-white border border-blue-150 shadow-xs flex flex-col justify-between space-y-2 hover:border-blue-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">💰 Total Value</span>
                <div className="p-1.5 rounded-xl bg-blue-50 text-blue-700">
                  <DollarSign size={15} />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-gray-900 tracking-tight">₹{displayedPulseStats.totalOrderValue.toLocaleString()}</div>
                <div className="text-[10px] font-bold text-emerald-600 mt-0.5">Adv: ₹{displayedPulseStats.totalAdvance.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Blossom Team vs Hornet Team Dedicated Performance Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {/* Blossom Team Card */}
            <div
              onClick={() => {
                setStaffTeamFilter(staffTeamFilter === 'girls' ? 'all' : 'girls');
                setOrderTeamFilter(orderTeamFilter === 'girls' ? 'all' : 'girls');
              }}
              className={cn(
                "p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group",
                staffTeamFilter === 'girls' || orderTeamFilter === 'girls'
                  ? "bg-gradient-to-br from-pink-500/10 via-rose-50 to-pink-100/60 border-pink-300 shadow-md ring-2 ring-pink-400/30"
                  : "bg-white hover:bg-pink-50/30 border-gray-150 hover:border-pink-200 shadow-xs"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center font-black shadow-md shadow-pink-500/20 text-xl">
                    🌸
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-gray-900 tracking-tight">Blossom</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-100 text-pink-700 border border-pink-200">
                        {girlsTeamExecutives.length} Staff
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Female Marketing Executives Performance Breakdown
                    </p>
                  </div>
                </div>

                <span className={cn(
                  "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                  staffTeamFilter === 'girls' ? "bg-pink-600 text-white font-black" : "bg-gray-100 text-gray-600 group-hover:bg-pink-100 group-hover:text-pink-700"
                )}>
                  {staffTeamFilter === 'girls' ? '✓ Filtering Blossom' : 'Click to Filter'}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 pt-4 mt-4 border-t border-pink-100/80 text-center">
                <div className="bg-white/80 p-2 rounded-xl border border-pink-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Tasks Shared</span>
                  <span className="text-sm font-black text-indigo-700">{girlsTeamTotals.tasksShared}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-pink-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Returned</span>
                  <span className="text-sm font-black text-emerald-700">{girlsTeamTotals.designsReturned}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-pink-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Reworks</span>
                  <span className="text-sm font-black text-amber-700">{girlsTeamTotals.reworksCount}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-pink-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Converted</span>
                  <span className="text-sm font-black text-purple-700">{girlsTeamTotals.ordersConverted}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-pink-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Invoiced</span>
                  <span className="text-sm font-black text-blue-700">₹{girlsTeamTotals.totalInvoicedAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Hornet Team Card */}
            <div
              onClick={() => {
                setStaffTeamFilter(staffTeamFilter === 'boys' ? 'all' : 'boys');
                setOrderTeamFilter(orderTeamFilter === 'boys' ? 'all' : 'boys');
              }}
              className={cn(
                "p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group",
                staffTeamFilter === 'boys' || orderTeamFilter === 'boys'
                  ? "bg-gradient-to-br from-indigo-500/10 via-blue-50 to-indigo-100/60 border-indigo-300 shadow-md ring-2 ring-indigo-400/30"
                  : "bg-white hover:bg-blue-50/30 border-gray-150 hover:border-indigo-200 shadow-xs"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/20 text-xl">
                    🐝
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-gray-900 tracking-tight">Hornet</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {boysTeamExecutives.length} Staff
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Male Marketing Executives Performance Breakdown
                    </p>
                  </div>
                </div>

                <span className={cn(
                  "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                  staffTeamFilter === 'boys' ? "bg-indigo-600 text-white font-black" : "bg-gray-100 text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-700"
                )}>
                  {staffTeamFilter === 'boys' ? '✓ Filtering Hornet' : 'Click to Filter'}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 pt-4 mt-4 border-t border-indigo-100/80 text-center">
                <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Tasks Shared</span>
                  <span className="text-sm font-black text-indigo-700">{boysTeamTotals.tasksShared}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Returned</span>
                  <span className="text-sm font-black text-emerald-700">{boysTeamTotals.designsReturned}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Reworks</span>
                  <span className="text-sm font-black text-amber-700">{boysTeamTotals.reworksCount}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Converted</span>
                  <span className="text-sm font-black text-purple-700">{boysTeamTotals.ordersConverted}</span>
                </div>
                <div className="bg-white/80 p-2 rounded-xl border border-indigo-100">
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Invoiced</span>
                  <span className="text-sm font-black text-blue-700">₹{boysTeamTotals.totalInvoicedAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
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

          {/* Main Section: Marketing Individual Executive Performance Table */}
          <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden space-y-4 p-6 text-left">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Users className="text-brand-primary" size={18} />
                  Marketing Individual Executive Performance
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Track individual tasks shared, designs returned, reworks & reasons, converted orders, invoices, and revenue.
                </p>
              </div>

              {/* Individual Voice Dropdown, Team Filters & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Individual Staff Selector Dropdown */}
                <div className="relative">
                  <select
                    value={selectedExecutive || 'all'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedExecutive(val === 'all' ? null : val);
                    }}
                    className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary/20 text-gray-800 cursor-pointer"
                  >
                    <option value="all">👤 Individual Voice Filter (All Staff)</option>
                    <optgroup label="🌸 Blossom Team">
                      {uniqueMarketingStaffList.filter(s => s.isFemale).map(s => (
                        <option key={s.name} value={s.name}>🌸 {s.name} (Blossom Team)</option>
                      ))}
                    </optgroup>
                    <optgroup label="🐝 Hornet Team">
                      {uniqueMarketingStaffList.filter(s => !s.isFemale).map(s => (
                        <option key={s.name} value={s.name}>🐝 {s.name} (Hornet Team)</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Team Filter Pills */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200">
                  <button
                    onClick={() => setStaffTeamFilter('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-black transition-all border-none cursor-pointer",
                      staffTeamFilter === 'all'
                        ? "bg-white text-gray-900 shadow-xs font-black"
                        : "text-gray-500 hover:text-gray-800 bg-transparent"
                    )}
                  >
                    👥 All ({executiveMetrics.length})
                  </button>
                  <button
                    onClick={() => setStaffTeamFilter('girls')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-black transition-all border-none cursor-pointer flex items-center gap-1",
                      staffTeamFilter === 'girls'
                        ? "bg-pink-600 text-white shadow-xs font-black"
                        : "text-pink-700 hover:bg-pink-50 bg-transparent"
                    )}
                  >
                    🌸 Blossom ({girlsTeamExecutives.length})
                  </button>
                  <button
                    onClick={() => setStaffTeamFilter('boys')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-black transition-all border-none cursor-pointer flex items-center gap-1",
                      staffTeamFilter === 'boys'
                        ? "bg-indigo-600 text-white shadow-xs font-black"
                        : "text-indigo-700 hover:bg-indigo-50 bg-transparent"
                    )}
                  >
                    🐝 Hornet ({boysTeamExecutives.length})
                  </button>
                </div>

                {/* Search Input */}
                <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-2xl border border-gray-200 sm:w-52">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search executive..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none text-xs text-gray-800 placeholder:text-gray-400 outline-none w-full font-medium"
                  />
                </div>

                {selectedExecutive && (
                  <button
                    onClick={() => setSelectedExecutive(null)}
                    className="px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl text-xs font-bold transition-all border border-pink-200 cursor-pointer"
                  >
                    Clear Filter ✕
                  </button>
                )}
              </div>
            </div>

            {/* Executive Table with Tasks Shared, Returned, Reworks & Reasons, Converted, Invoices */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <th className="px-5 py-3.5 rounded-l-xl">Executive & Team</th>
                    <th className="px-4 py-3.5 text-center">📤 Tasks Shared</th>
                    <th className="px-4 py-3.5 text-center">📥 Returned Ready</th>
                    <th className="px-4 py-3.5 text-center">🔁 Reworks & Reasons</th>
                    <th className="px-4 py-3.5 text-center">🛒 Converted</th>
                    <th className="px-4 py-3.5 text-center">📦 Total Orders</th>
                    <th className="px-4 py-3.5 text-center">📦 Bulk (10+)</th>
                    <th className="px-4 py-3.5 text-center">📄 Invoices</th>
                    <th className="px-4 py-3.5 text-right">Total Order Value</th>
                    <th className="px-4 py-3.5 text-right">Advance Collected</th>
                    <th className="px-4 py-3.5 text-right">Balance to Collect</th>
                    <th className="px-5 py-3.5 text-center rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-gray-700">
                  {displayedExecutives.length > 0 ? (
                    displayedExecutives.map((exec, idx) => {
                      const isSelected = selectedExecutive === exec.name;
                      const balanceDue = Math.max(0, exec.totalOrderValue - exec.totalAdvance);
                      return (
                        <tr
                          key={exec.name}
                          onClick={() => setSelectedExecutive(isSelected ? null : exec.name)}
                          className={cn(
                            "transition-all cursor-pointer hover:bg-gray-50/80",
                            isSelected ? "bg-purple-50/70 border-l-4 border-l-brand-primary" : ""
                          )}
                        >
                          {/* Executive Name, Avatar, Team Badge */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-2xl text-white font-black text-xs flex items-center justify-center shadow-xs",
                                exec.isFemale
                                  ? "bg-gradient-to-tr from-pink-500 to-rose-400"
                                  : "bg-gradient-to-tr from-indigo-600 to-blue-500"
                              )}>
                                {(exec.name || 'EX').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-gray-900 text-sm">{exec.name}</span>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                    exec.isFemale
                                      ? "bg-pink-100 text-pink-700 border border-pink-200"
                                      : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                                  )}>
                                    {exec.isFemale ? '🌸 Blossom' : '🐝 Hornet'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold mt-0.5">
                                  <span>Rank #{idx + 1}</span>
                                  <span>•</span>
                                  <span>{exec.totalOrders} total deals</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Tasks Shared / Raised */}
                          <td className="px-4 py-4 text-center">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black">
                              {exec.tasksShared}
                            </span>
                          </td>

                          {/* Designs Returned (Ready) */}
                          <td className="px-4 py-4 text-center">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black flex items-center justify-center gap-1 w-fit mx-auto">
                              <CheckCircle2 size={12} /> {exec.designsReturned}
                            </span>
                          </td>

                          {/* Reworks & Reasons */}
                          <td className="px-4 py-4 text-center" onClick={(e) => {
                            if (exec.reworksCount > 0) {
                              e.stopPropagation();
                              setSelectedReworkExecutive({ execName: exec.name, reworks: exec.reworkReasons });
                              setShowReworkModal(true);
                            }
                          }}>
                            {exec.reworksCount > 0 ? (
                              <button
                                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-black cursor-pointer flex items-center gap-1 mx-auto transition-all shadow-xs"
                                title="Click to view rework reasons"
                              >
                                <RotateCcw size={11} /> {exec.reworksCount} Reworks
                              </button>
                            ) : (
                              <span className="text-gray-300 font-bold">-</span>
                            )}
                          </td>

                          {/* Converted Orders */}
                          <td className="px-4 py-4 text-center">
                            {exec.ordersConverted > 0 ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-black">
                                  🛒 {exec.ordersConverted} ({exec.conversionRate}%)
                                </span>
                                <span className="text-[10px] font-bold text-purple-600">
                                  ₹{exec.convertedValue.toLocaleString('en-IN')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300 font-bold">-</span>
                            )}
                          </td>

                          {/* Total Orders Created */}
                          <td className="px-4 py-4 text-center">
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 border border-gray-200 rounded-xl text-xs font-black">
                              {exec.totalOrders}
                            </span>
                          </td>

                          {/* Bulk Orders (10+ Qty) */}
                          <td className="px-4 py-4 text-center">
                            {exec.bulkOrders > 0 ? (
                              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl text-[11px] font-black">
                                📦 {exec.bulkOrders}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>

                          {/* Invoices Created / Shared */}
                          <td className="px-4 py-4 text-center">
                            <span className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-black">
                              {exec.invoicesCount} Invoices
                            </span>
                          </td>

                          {/* Total Order Value */}
                          <td className="px-4 py-4 text-right">
                            <div className="font-black text-gray-900 text-sm">
                              ₹{exec.totalOrderValue.toLocaleString('en-IN')}
                            </div>
                          </td>

                          {/* Advance Collected */}
                          <td className="px-4 py-4 text-right">
                            <span className="font-black text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                              ₹{exec.totalAdvance.toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* Balance to Collect */}
                          <td className="px-4 py-4 text-right">
                            {balanceDue > 0 ? (
                              <span className="font-black text-rose-700 text-xs bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                                ₹{balanceDue.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                ✓ Settled
                              </span>
                            )}
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
                              {isSelected ? 'Hide Orders' : 'Filter Orders'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} className="text-center py-12 text-gray-400 font-medium">
                        No marketing executives found matching this period or search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Orders Flow & Breakdown with Full Multi-Layer Filtering (Staff, Team, Bulk, Mixed, Gift, Status) */}
          <div className="bg-white rounded-3xl border border-gray-150 shadow-xs p-6 space-y-5 text-left">
            {/* Header: Title, Active Timeframe Badge, and Excel Export */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <Layers className="text-brand-primary" size={18} />
                    {selectedExecutive
                      ? `${selectedExecutive}'s Orders Breakdown`
                      : orderTeamFilter === 'girls'
                      ? "🌸 Blossom Team Marketing Orders Flow"
                      : orderTeamFilter === 'boys'
                      ? "🐝 Hornet Team Marketing Orders Flow"
                      : 'All Marketing Orders Flow'}
                    <span className="text-xs font-bold text-gray-400 lowercase">({drillDownOrders.length} orders)</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                    {getDateFilterBadge()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Team-wise live performance, total sales volume, conversions, revenue collection, and detailed order pipelines.
                </p>
              </div>

              {/* Export to Excel Buttons Group */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportTeamVoiceToExcel}
                  className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Download Team-wise (Blossom vs Hornet vs Combined) Excel report"
                >
                  <FileSpreadsheet size={14} /> 🌸🐝 Team Voice (.xlsx)
                </button>
                <button
                  onClick={handleExportExecutiveToExcel}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  title="Download Individual Staff (8 marketing executives) Excel report"
                >
                  <Download size={14} /> 👤 Individual Staff (.xlsx)
                </button>
                <button
                  onClick={handleExportOrdersToExcel}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 border-none cursor-pointer"
                  title="Download Filtered Orders Excel report"
                >
                  <FileSpreadsheet size={14} /> 📋 Orders (.xlsx) ({drillDownOrders.length})
                </button>
                <button
                  onClick={handleExportMasterReportToExcel}
                  className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-brand-primary/20 flex items-center gap-1.5 border-none cursor-pointer"
                  title="Download Complete Master Multi-Sheet Excel Report (.xlsx)"
                >
                  <Download size={14} /> 📊 Master Report (.xlsx)
                </button>
              </div>
            </div>

            {/* TEAM-WISE ("team voice") TOTAL SALES, TOTAL CONVERSION & TOTAL REVENUE SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Card 1: Blossom Team (Girls) */}
              <div
                onClick={() => {
                  setOrderTeamFilter(orderTeamFilter === 'girls' && !selectedExecutive ? 'all' : 'girls');
                  setSelectedExecutive(null);
                }}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden space-y-3 group",
                  orderTeamFilter === 'girls' && !selectedExecutive
                    ? "bg-gradient-to-br from-pink-500/10 via-rose-50 to-pink-100/70 border-pink-400 shadow-md ring-2 ring-pink-400/40"
                    : "bg-pink-50/30 hover:bg-pink-50/60 border-pink-200/80 shadow-xs"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌸</span>
                    <div>
                      <h5 className="text-xs font-black text-gray-900 uppercase tracking-tight">Blossom Team</h5>
                      <span className="text-[10px] font-bold text-pink-700">4 Staff (Jimla, Priya, Sowmiya, Periyanayagi)</span>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                    orderTeamFilter === 'girls' && !selectedExecutive
                      ? "bg-pink-600 text-white shadow-xs"
                      : "bg-pink-100 text-pink-700 group-hover:bg-pink-200"
                  )}>
                    {orderTeamFilter === 'girls' && !selectedExecutive ? '✓ Active Filter' : 'Filter Team'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-pink-200/60">
                  {/* Total Sales */}
                  <div className="bg-white/90 p-2.5 rounded-xl border border-pink-100 shadow-xs flex flex-col justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Total Sales</span>
                    <span className="text-sm font-black text-gray-900 block my-0.5">{girlsTeamTotals.totalOrders} Deals</span>
                    <span className="text-[10px] font-bold text-pink-600">({girlsTeamTotals.totalQuantity} pcs)</span>
                  </div>

                  {/* Total Conversion */}
                  <div className="bg-white/90 p-2.5 rounded-xl border border-pink-100 shadow-xs flex flex-col justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Conversion</span>
                    <span className="text-sm font-black text-purple-700 block my-0.5">{girlsTeamTotals.ordersConverted} ({girlsTeamTotals.conversionRate}%)</span>
                    <span className="text-[10px] font-bold text-purple-600 truncate">₹{girlsTeamTotals.convertedValue.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Total Revenue & Collections */}
                  <div className="bg-white/90 p-2.5 rounded-xl border border-pink-100 shadow-xs flex flex-col justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Total Value</span>
                    <span className="text-xs font-black text-emerald-700 block truncate my-0.5">₹{girlsTeamTotals.totalOrderValue.toLocaleString('en-IN')}</span>
                    <div className="flex items-center justify-between text-[8px] font-bold mt-0.5 pt-0.5 border-t border-gray-100">
                      <span className="text-emerald-600">Adv: ₹{girlsTeamTotals.totalAdvance.toLocaleString('en-IN')}</span>
                      <span className="text-rose-600 font-black">Bal: ₹{Math.max(0, girlsTeamTotals.totalOrderValue - girlsTeamTotals.totalAdvance).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Hornet Team (Boys) */}
              <div
                onClick={() => {
                  setOrderTeamFilter(orderTeamFilter === 'boys' && !selectedExecutive ? 'all' : 'boys');
                  setSelectedExecutive(null);
                }}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden space-y-3 group",
                  orderTeamFilter === 'boys' && !selectedExecutive
                    ? "bg-gradient-to-br from-indigo-500/10 via-blue-50 to-indigo-100/70 border-indigo-400 shadow-md ring-2 ring-indigo-400/40"
                    : "bg-indigo-50/30 hover:bg-indigo-50/60 border-indigo-200/80 shadow-xs"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🐝</span>
                    <div>
                      <h5 className="text-xs font-black text-gray-900 uppercase tracking-tight">Hornet Team</h5>
                      <span className="text-[10px] font-bold text-indigo-700">4 Staff (Godwin, Mukesh, Saravanan, Sakthivel)</span>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                    orderTeamFilter === 'boys' && !selectedExecutive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200"
                  )}>
                    {orderTeamFilter === 'boys' && !selectedExecutive ? '✓ Active Filter' : 'Filter Team'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-indigo-200/60">
                  {/* Total Sales */}
                  <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100 shadow-xs flex flex-col justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Total Sales</span>
                    <span className="text-sm font-black text-gray-900 block my-0.5">{boysTeamTotals.totalOrders} Deals</span>
                    <span className="text-[10px] font-bold text-indigo-600">({boysTeamTotals.totalQuantity} pcs)</span>
                  </div>

                  {/* Total Conversion */}
                  <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100 shadow-xs flex flex-col justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Conversion</span>
                    <span className="text-sm font-black text-purple-700 block my-0.5">{boysTeamTotals.ordersConverted} ({boysTeamTotals.conversionRate}%)</span>
                    <span className="text-[10px] font-bold text-purple-600 truncate">₹{boysTeamTotals.convertedValue.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Total Revenue & Collections */}
                  <div className="bg-white/90 p-2.5 rounded-xl border border-indigo-100 shadow-xs flex flex-col justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Total Value</span>
                    <span className="text-xs font-black text-emerald-700 block truncate my-0.5">₹{boysTeamTotals.totalOrderValue.toLocaleString('en-IN')}</span>
                    <div className="flex items-center justify-between text-[8px] font-bold mt-0.5 pt-0.5 border-t border-gray-100">
                      <span className="text-emerald-600">Adv: ₹{boysTeamTotals.totalAdvance.toLocaleString('en-IN')}</span>
                      <span className="text-rose-600 font-black">Bal: ₹{Math.max(0, boysTeamTotals.totalOrderValue - boysTeamTotals.totalAdvance).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: All Marketing Teams Combined */}
              <div
                onClick={() => {
                  setOrderTeamFilter('all');
                  setSelectedExecutive(null);
                }}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden space-y-3 group",
                  orderTeamFilter === 'all' && !selectedExecutive
                    ? "bg-gradient-to-br from-brand-primary/10 via-purple-50 to-indigo-100/70 border-brand-primary shadow-md ring-2 ring-brand-primary/40"
                    : "bg-gray-50/60 hover:bg-gray-100/70 border-gray-200 shadow-xs"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <div>
                      <h5 className="text-xs font-black text-gray-900 uppercase tracking-tight">All Teams Combined</h5>
                      <span className="text-[10px] font-bold text-gray-500">8 Marketing Staff (Blossom & Hornet)</span>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                    orderTeamFilter === 'all' && !selectedExecutive
                      ? "bg-brand-primary text-white shadow-xs"
                      : "bg-gray-200 text-gray-700 group-hover:bg-gray-300"
                  )}>
                    {orderTeamFilter === 'all' && !selectedExecutive ? '✓ Active Filter' : 'Show All'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-gray-200/60">
                  {/* Total Sales */}
                  <div className="bg-white/90 p-2.5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Total Sales</span>
                    <span className="text-sm font-black text-gray-900 block my-0.5">{teamTotals.totalOrders} Deals</span>
                    <span className="text-[10px] font-bold text-brand-primary">({teamTotals.totalQuantity} pcs)</span>
                  </div>

                  {/* Total Conversion */}
                  <div className="bg-white/90 p-2.5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Conversion</span>
                    <span className="text-sm font-black text-purple-700 block my-0.5">{teamTotals.ordersConverted} ({teamTotals.conversionRate}%)</span>
                    <span className="text-[10px] font-bold text-purple-600 truncate">₹{teamTotals.convertedValue.toLocaleString('en-IN')}</span>
                  </div>

                  {/* Total Revenue & Collections */}
                  <div className="bg-white/90 p-2.5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Total Value</span>
                    <span className="text-xs font-black text-emerald-700 block truncate my-0.5">₹{teamTotals.totalOrderValue.toLocaleString('en-IN')}</span>
                    <div className="flex items-center justify-between text-[8px] font-bold mt-0.5 pt-0.5 border-t border-gray-100">
                      <span className="text-emerald-600">Adv: ₹{teamTotals.totalAdvance.toLocaleString('en-IN')}</span>
                      <span className="text-rose-600 font-black">Bal: ₹{Math.max(0, teamTotals.totalOrderValue - teamTotals.totalAdvance).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DATE FILTER BUTTON BAR (Today, Yesterday, This Week, This Month, All Time) */}
            <div className="p-3 bg-gradient-to-r from-gray-50 via-slate-50 to-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={13} className="text-brand-primary" /> Filter Date Period:
                </span>
                <span className="text-xs font-bold text-gray-700 bg-white px-2.5 py-0.5 rounded-lg border border-gray-200 shadow-xs">
                  {getDateFilterBadge()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
                {[
                  { id: 'all', label: 'All Time', icon: '🌐' },
                  { id: 'today', label: 'Today', icon: '⚡' },
                  { id: 'yesterday', label: 'Yesterday', icon: '⏮️' },
                  { id: 'week', label: 'This Week', icon: '🗓️' },
                  { id: 'month', label: 'This Month', icon: '📆' }
                ].map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDateFilter(d.id as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black transition-all border-none cursor-pointer flex items-center gap-1",
                      dateFilter === d.id
                        ? "bg-brand-primary text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 bg-transparent"
                    )}
                  >
                    <span>{d.icon}</span>
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Control Bar: Marketing Staff Selector, Team Filter, and Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-200">
              {/* Marketing Staff Selector Dropdown */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                  Select Marketing Staff (Individual Voice Filter):
                </label>
                <div className="relative">
                  <select
                    value={selectedExecutive || 'all'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedExecutive(val === 'all' ? null : val);
                    }}
                    className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary/20 text-gray-800 cursor-pointer"
                  >
                    <option value="all">👥 All Marketing Staff ({uniqueMarketingStaffList.length})</option>
                    <optgroup label="🌸 Blossom Team (Female Staff)">
                      {uniqueMarketingStaffList.filter(s => s.isFemale).map(s => (
                        <option key={s.name} value={s.name}>🌸 {s.name} (Blossom Team)</option>
                      ))}
                    </optgroup>
                    <optgroup label="🐝 Hornet Team (Male Staff)">
                      {uniqueMarketingStaffList.filter(s => !s.isFemale).map(s => (
                        <option key={s.name} value={s.name}>🐝 {s.name} (Hornet Team)</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Marketing Team Filter Buttons */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                  Filter by Staff Team:
                </label>
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-gray-200">
                  {[
                    { id: 'all', label: '👥 All Teams' },
                    { id: 'girls', label: '🌸 Blossom Team' },
                    { id: 'boys', label: '🐝 Hornet Team' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setOrderTeamFilter(tab.id as any);
                        if (selectedExecutive) setSelectedExecutive(null);
                      }}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer whitespace-nowrap",
                        orderTeamFilter === tab.id
                          ? tab.id === 'girls' ? "bg-pink-600 text-white font-black shadow-xs" : tab.id === 'boys' ? "bg-indigo-600 text-white font-black shadow-xs" : "bg-brand-primary text-white font-black shadow-xs"
                          : "text-gray-600 hover:text-gray-900 bg-transparent"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Search Term */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                  Search Orders:
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search Order #, Customer, Phone, Category..."
                    value={orderSearchTerm}
                    onChange={(e) => setOrderSearchTerm(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary/20 text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* LIVE KPI PULSE STRIP FOR ACTIVE SELECTION */}
            <div className="p-3.5 bg-gradient-to-r from-white via-gray-50/60 to-white rounded-2xl border border-gray-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Activity size={12} className="text-brand-primary" /> Active Focus:
                </span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs",
                  selectedExecutive
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : orderTeamFilter === 'girls'
                    ? "bg-pink-100 text-pink-700 border border-pink-200"
                    : orderTeamFilter === 'boys'
                    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                    : "bg-gray-100 text-gray-800 border border-gray-200"
                )}>
                  {displayedPulseStats.label}
                </span>
                {selectedExecutive && (
                  <button
                    onClick={() => setSelectedExecutive(null)}
                    className="text-[10px] font-bold text-pink-600 hover:text-pink-800 bg-transparent border-none cursor-pointer underline"
                  >
                    Clear Staff Filter ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap font-bold text-gray-700">
                {/* Sales Deals & Qty */}
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-xs">
                  <span className="text-gray-400 text-[10px] uppercase font-black">Sales:</span>
                  <span className="text-gray-900 font-black">{displayedPulseStats.totalOrders} Deals</span>
                  <span className="text-gray-500 font-medium text-[11px]">({displayedPulseStats.totalQuantity} pcs)</span>
                </div>

                {/* Conversion & Converted Value */}
                <div className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200 shadow-xs">
                  <span className="text-purple-600 text-[10px] uppercase font-black">Conversion:</span>
                  <span className="text-purple-800 font-black">{displayedPulseStats.ordersConverted} Converted</span>
                  <span className="text-purple-700 font-bold">({displayedPulseStats.conversionRate}%)</span>
                  <span className="text-purple-300">•</span>
                  <span className="text-purple-900 font-black">₹{displayedPulseStats.convertedValue.toLocaleString('en-IN')}</span>
                </div>

                {/* Total Value & Advance */}
                <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 shadow-xs">
                  <span className="text-emerald-600 text-[10px] uppercase font-black">Total Value:</span>
                  <span className="text-emerald-800 font-black">₹{displayedPulseStats.totalOrderValue.toLocaleString('en-IN')}</span>
                  <span className="text-emerald-600 font-medium text-[11px]">(Adv: ₹{displayedPulseStats.totalAdvance.toLocaleString('en-IN')})</span>
                </div>

                {/* Balance to Collect */}
                <div className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 shadow-xs">
                  <span className="text-rose-600 text-[10px] uppercase font-black">Balance to Collect:</span>
                  <span className="text-rose-700 font-black">₹{displayedPulseStats.balanceDue.toLocaleString('en-IN')}</span>
                </div>

                {displayedPulseStats.invoicesCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200 shadow-xs">
                    <span className="text-teal-600 text-[10px] uppercase font-black">Invoiced:</span>
                    <span className="text-teal-800 font-black">₹{displayedPulseStats.totalInvoicedAmount.toLocaleString('en-IN')}</span>
                    <span className="text-teal-600 text-[11px] font-medium">({displayedPulseStats.invoicesCount})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Classification Filter Tabs (Bulk Orders 10+, Mixed Orders 3+ Cats, Gift / Other, Standard) */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                {
                  key: 'all',
                  label: '🗂️ All Classifications',
                  count: orderClassificationCounts.all,
                  activeClass: 'bg-brand-primary text-white border-brand-primary shadow-xs'
                },
                {
                  key: 'bulk',
                  label: '📦 Bulk Orders (10+ Qty)',
                  count: orderClassificationCounts.bulk,
                  activeClass: 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                },
                {
                  key: 'mixed',
                  label: '🔀 Mixed Orders (3+ Cats)',
                  count: orderClassificationCounts.mixed,
                  activeClass: 'bg-purple-600 text-white border-purple-600 shadow-xs'
                },
                {
                  key: 'gift',
                  label: '🎁 Gift Items & Merchandise',
                  count: orderClassificationCounts.gift,
                  activeClass: 'bg-rose-600 text-white border-rose-600 shadow-xs'
                },
                {
                  key: 'standard',
                  label: '👔 Standard Orders',
                  count: orderClassificationCounts.standard,
                  activeClass: 'bg-gray-800 text-white border-gray-800 shadow-xs'
                }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setOrderClassificationFilter(tab.key as any)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-black transition-all border cursor-pointer flex items-center gap-1.5",
                    orderClassificationFilter === tab.key
                      ? tab.activeClass
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <span>{tab.label}</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                    orderClassificationFilter === tab.key ? "bg-white/25 text-white" : "bg-gray-100 text-gray-600"
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Pipeline Stage / Status Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-100">
              <span className="text-[10px] font-black uppercase text-gray-400 mr-1">Stage:</span>
              {[
                { key: 'all', label: 'All Stages' },
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
                    "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer",
                    statusFilter === f.key
                      ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Desktop View (Table) */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Marketing Creator</th>
                    <th className="px-4 py-3">Category & Classification</th>
                    <th className="px-4 py-3 text-right">Order Value</th>
                    <th className="px-4 py-3 text-center">Accounts Status</th>
                    <th className="px-4 py-3 text-center">Design Status</th>
                    <th className="px-4 py-3 text-center">Artwork Returned</th>
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
                      const isRework = isReworkOrder(o);
                      const isConverted = isConvertedOrder(o);
                      const amount = getOrderAmount(o);
                      const adv = getAdvanceAmount(o);
                      const creatorName = (o.createdByName || o.createdBy || 'Marketing').trim();
                      const isFemale = isFemaleStaff(creatorName, registeredUsers);
                      const isBulk = isBulkOrder(o);
                      const isMixed = isMixedOrder(o);
                      const isGift = isGiftOrOtherOrder(o);
                      const totalQty = Number(o.quantity || (Array.isArray(o.sizeBreakdown) ? o.sizeBreakdown.reduce((s, i) => s + (Number(i?.quantity) || 0), 0) : 0) || 1);

                      return (
                        <tr key={o.id} className="hover:bg-gray-50/60 transition-all">
                          {/* Order ID */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono font-black text-brand-primary">#{o.orderNumber || (o.id ? String(o.id).slice(-8) : 'N/A')}</span>
                            {isConverted && (
                              <span className="block text-[9px] font-black text-purple-700 mt-0.5">🛒 Converted</span>
                            )}
                          </td>

                          {/* Customer */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-gray-900">{o.customerInfo?.name || (o as any).clientName || 'Walk-in Customer'}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{o.customerInfo?.phone || o.phone || '-'}</div>
                          </td>

                          {/* Creator Executive & Team */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md text-[10px] font-bold">
                                {creatorName}
                              </span>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider",
                                isFemale ? "bg-pink-100 text-pink-700" : "bg-indigo-100 text-indigo-700"
                              )}>
                                {isFemale ? '🌸 Blossom' : '🐝 Hornet'}
                              </span>
                            </div>
                          </td>

                          {/* Category & Classification Badges */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900">{o.category || 'Apparel'}</span>
                              <span className="text-[10px] font-bold text-gray-500">({totalQty} pcs)</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {isBulk && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  📦 Bulk (10+)
                                </span>
                              )}
                              {isMixed && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                                  🔀 Mixed (3+ Cats)
                                </span>
                              )}
                              {isGift && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                  🎁 Gift / Merch
                                </span>
                              )}
                              {isRework && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                  🔁 Rework
                                </span>
                              )}
                            </div>
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

                          {/* Design Sent & 2-Hour SLA Timer */}
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
                              className="px-3 py-1 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1 ml-auto shadow-xs"
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

            {/* Mobile View (Touch-Friendly Compact Order Cards) */}
            <div className="block md:hidden space-y-3">
              {drillDownOrders.length > 0 ? (
                drillDownOrders.map((o) => {
                  const sentAcc = isSentToAccounts(o);
                  const sentDes = isSentToDesigns(o);
                  const readyDes = isReceivedDesignsFile(o);
                  const isRework = isReworkOrder(o);
                  const isConverted = isConvertedOrder(o);
                  const amount = getOrderAmount(o);
                  const adv = getAdvanceAmount(o);
                  const creatorName = (o.createdByName || o.createdBy || 'Marketing').trim();
                  const isFemale = isFemaleStaff(creatorName, registeredUsers);
                  const isBulk = isBulkOrder(o);
                  const isMixed = isMixedOrder(o);
                  const isGift = isGiftOrOtherOrder(o);
                  const totalQty = Number(o.quantity || (Array.isArray(o.sizeBreakdown) ? o.sizeBreakdown.reduce((s, i) => s + (Number(i?.quantity) || 0), 0) : 0) || 1);
                  const phone = o.customerInfo?.phone || o.phone;
                  const cleanPhone = phone ? String(phone).replace(/[^0-9+]/g, '') : '';

                  return (
                    <div
                      key={o.id}
                      className="bg-white rounded-2xl p-4 border border-gray-150 shadow-xs hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-brand-primary">
                              #{o.orderNumber || (o.id ? String(o.id).slice(-8) : 'N/A')}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                              {o.status}
                            </span>
                          </div>
                          <h4 className="font-black text-gray-900 text-sm mt-1">{o.customerInfo?.name || (o as any).clientName || 'Walk-in Customer'}</h4>
                          <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                            By: <span className="font-bold text-gray-700">{creatorName}</span>
                            <span className={cn(
                              "px-1.5 py-0.2 rounded text-[8.5px] font-black",
                              isFemale ? "bg-pink-100 text-pink-700" : "bg-indigo-100 text-indigo-700"
                            )}>
                              {isFemale ? '🌸 Blossom' : '🐝 Hornet'}
                            </span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-black text-sm text-gray-900">₹{amount.toLocaleString()}</div>
                          {adv > 0 && (
                            <div className="text-[10px] font-bold text-emerald-600">Adv: ₹{adv.toLocaleString()}</div>
                          )}
                          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                            {o.category} • {totalQty} pcs
                          </span>
                        </div>
                      </div>

                      {/* Classification Badges */}
                      <div className="flex flex-wrap items-center gap-1">
                        {isConverted && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                            🛒 Converted Order
                          </span>
                        )}
                        {isBulk && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                            📦 Bulk (10+ pcs)
                          </span>
                        )}
                        {isMixed && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                            🔀 Mixed (3+ Cats)
                          </span>
                        )}
                        {isGift && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                            🎁 Gift / Merch
                          </span>
                        )}
                        {isRework && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                            🔁 Rework
                          </span>
                        )}
                      </div>

                      {/* Stage Badges & Timer */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
                        {sentAcc && (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            ✓ Accounts
                          </span>
                        )}
                        {sentDes && (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                            ✓ Design Studio
                          </span>
                        )}
                        {readyDes && (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Artwork Ready
                          </span>
                        )}
                      </div>

                      {(sentDes || o.assignedDesigner) && (
                        <div className="pt-1">
                          <DesignTaskTimer
                            claimedAt={o.claimedAt || o.designClaimedAt}
                            completedAt={o.designCompletedAt}
                            isCompleted={readyDes || Boolean(o.designCompleted)}
                            variant="bar"
                            designerName={o.assignedDesigner}
                          />
                        </div>
                      )}

                      {/* Quick Action Buttons */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                        {phone ? (
                          <a
                            href={`tel:${cleanPhone}`}
                            className="flex items-center justify-center gap-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition-all no-underline"
                          >
                            <Phone size={13} className="text-brand-primary" /> Call
                          </a>
                        ) : (
                          <div />
                        )}

                        {phone ? (
                          <a
                            href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center gap-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition-all no-underline"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </a>
                        ) : (
                          <div />
                        )}

                        <button
                          onClick={() => setSelectedOrderForModal(o)}
                          className="flex items-center justify-center gap-1 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer shadow-xs"
                        >
                          <Eye size={13} /> Inspect
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-150 text-gray-400 font-medium text-xs">
                  No orders matching this filter.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Rework Reasons Details Modal */}
      {showReworkModal && selectedReworkExecutive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl border border-amber-200 text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    Rework & Revision Reasons ({selectedReworkExecutive.reworks.length})
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    {selectedReworkExecutive.execName} — Detailed client & marketing revision requirements
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReworkModal(false);
                  setSelectedReworkExecutive(null);
                }}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {selectedReworkExecutive.reworks.length === 0 ? (
              <div className="py-12 text-center text-gray-400 italic text-xs">
                No rework reasons recorded for this selection.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedReworkExecutive.reworks.map((r, i) => (
                  <div key={i} className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-brand-primary">#{r.orderNumber}</span>
                        <span className="font-bold text-gray-900 text-xs">{r.client}</span>
                        {r.creator && (
                          <span className="text-[10px] text-gray-500 font-medium">by {r.creator}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                        🎨 {r.designer}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-amber-200/80 text-xs font-medium text-gray-800 leading-relaxed">
                      <span className="font-black text-amber-800 block text-[10px] uppercase tracking-wider mb-1">
                        Revision Requirement / Reason:
                      </span>
                      {r.reason}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      Recorded: {new Date(r.date).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setShowReworkModal(false);
                  setSelectedReworkExecutive(null);
                }}
                className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
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
