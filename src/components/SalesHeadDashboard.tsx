import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  TrendingUp, Users, Package, CreditCard, Palette, FileText,
  DollarSign, CheckCircle2, Clock, Search, Filter, Download,
  ArrowUpRight, ChevronRight, Eye, RefreshCw, BarChart2, Shield,
  Phone, User, Sparkles, Building2, Calendar, FileCheck, Layers, Plus,
  MessageSquare, Edit, FileSpreadsheet, Award, UserCheck, Heart,
  Tag, Box, Gift, Shuffle, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import { Order, OrderStatus, Invoice } from '../types';
import { cn } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import DesignTaskTimer from './DesignTaskTimer';
import AdminCreateOrderModal from './AdminCreateOrderModal';
import InvoiceFormModal from './InvoiceFormModal';

// Set of known female names / keywords for marketing staff team separation (Girls Team)
const FEMALE_NAMES_SET = new Set([
  'jimla', 'priyanga', 'kavitha', 'priya', 'divya', 'anitha', 'saranya', 'meena',
  'deepa', 'swetha', 'aarthi', 'pavithra', 'sandhya', 'pooja', 'keerthi', 'lavanya',
  'monika', 'sneha', 'nisha', 'ramya', 'revathi', 'soundarya', 'suganya', 'geetha',
  'shanthi', 'kalyani', 'uma', 'lakshmi', 'radha', 'valli', 'sarah', 'mary', 'emily',
  'jane', 'anna', 'viji', 'devi', 'kavya', 'nandhini', 'gayathri', 'archana', 'bhavani',
  'dhivya', 'preethi', 'malathi', 'chitra', 'sudha', 'kokila', 'vidhya', 'sangeetha',
  'abirami', 'kala', 'janani', 'harini', 'akshaya', 'sridevi', 'sowmya', 'subha',
  'madhavi', 'anu', 'vasuki', 'sita', 'kanmani', 'selvi', 'ponni', 'soundari',
  'karthika', 'sumathi', 'punitha', 'bhuvaneshwari', 'gayatri', 'hema', 'kamala',
  'renuka', 'padma', 'padmavathi', 'sharmila', 'yamuna', 'vanitha', 'vijaya', 'rohini'
]);

// Helper to determine if a marketing staff member belongs to the Girls Team (Female) or Boys Team (Male)
const isFemaleStaff = (name?: string, registeredUsersList?: any[]): boolean => {
  if (!name || typeof name !== 'string') return false;
  const cleanName = name.trim().toLowerCase();
  if (!cleanName) return false;

  // Check in registered users list if gender or team metadata exists
  if (registeredUsersList && Array.isArray(registeredUsersList) && registeredUsersList.length > 0) {
    const matchedUser = registeredUsersList.find((u: any) =>
      (u?.name && typeof u.name === 'string' && u.name.trim().toLowerCase() === cleanName) ||
      (u?.email && typeof u.email === 'string' && u.email.trim().toLowerCase().startsWith(cleanName))
    );
    if (matchedUser) {
      if (matchedUser.gender === 'female' || matchedUser.gender === 'Female' || matchedUser.team === 'girls' || matchedUser.team === 'Girls') {
        return true;
      }
      if (matchedUser.gender === 'male' || matchedUser.gender === 'Male' || matchedUser.team === 'boys' || matchedUser.team === 'Boys') {
        return false;
      }
    }
  }

  const parts = cleanName.split(/[\s._-]+/);
  return parts.some(p => FEMALE_NAMES_SET.has(p)) || Array.from(FEMALE_NAMES_SET).some(fn => cleanName.includes(fn));
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

// Helper to check if order has received completed design files from Design Studio
const isReceivedDesignsFile = (o?: Order | null) => {
  if (!o) return false;
  const isCurrentlyInRework = Boolean(
    (o.isRework === true || o.details?.isRework === true || o.designRework === true || (o.reworkNotes && String(o.reworkNotes).trim().length > 0)) &&
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
    return (orders || []).filter(o => o && filterByDate(o.createdAt));
  }, [orders, dateFilter]);

  // Group performance metrics by Marketing Executive
  const executiveMetrics = useMemo(() => {
    const map = new Map<string, {
      name: string;
      isFemale: boolean;
      teamName: 'Girls Team' | 'Boys Team';
      totalOrders: number;
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

    // Group all orders by creator name (excluding Daniel/online team/admin)
    filteredOrders.forEach(o => {
      if (!o) return;
      const execName = (o.createdByName || o.createdBy || 'Unknown Executive').trim() || 'Unknown Executive';
      const lowerName = execName.toLowerCase();
      if (lowerName.includes('daniel') || (o.createdBy && String(o.createdBy).toLowerCase().includes('daniel'))) {
        return;
      }
      if (!map.has(execName)) {
        const isFemale = isFemaleStaff(execName, registeredUsers);
        map.set(execName, {
          name: execName,
          isFemale,
          teamName: isFemale ? 'Girls Team' : 'Boys Team',
          totalOrders: 0,
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
      }

      const item = map.get(execName)!;
      item.totalOrders += 1;
      item.orders.push(o);

      if (isBulkOrder(o)) item.bulkOrders += 1;
      if (isMixedOrder(o)) item.mixedOrders += 1;
      if (isGiftOrOtherOrder(o)) item.giftOrders += 1;

      if (isSentToAccounts(o)) item.sentToAccounts += 1;
      if (isSentToDesigns(o)) item.sentToDesigns += 1;
      if (isReceivedDesignsFile(o)) item.receivedDesigns += 1;

      item.totalOrderValue += getOrderAmount(o);
      item.totalAdvance += getAdvanceAmount(o);
    });

    // Match Invoices created by or associated with each executive
    (invoices || []).forEach(inv => {
      if (!inv) return;
      const invCreator = (inv.createdByName || inv.createdBy || '').trim();
      if (!invCreator || invCreator.toLowerCase().includes('daniel')) return;
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
        const isFemale = isFemaleStaff(invCreator, registeredUsers);
        map.set(invCreator, {
          name: invCreator,
          isFemale,
          teamName: isFemale ? 'Girls Team' : 'Boys Team',
          totalOrders: 0,
          sentToAccounts: 0,
          sentToDesigns: 0,
          receivedDesigns: 0,
          bulkOrders: 0,
          mixedOrders: 0,
          giftOrders: 0,
          totalOrderValue: 0,
          totalAdvance: 0,
          invoicesCount: 1,
          totalInvoicedAmount: Number(inv.total || inv.netTotal || 0),
          orders: []
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalOrders - a.totalOrders || b.totalOrderValue - a.totalOrderValue);
  }, [filteredOrders, invoices, registeredUsers]);

  // Girls Team vs Boys Team Metrics & Totals
  const girlsTeamExecutives = useMemo(() => {
    return executiveMetrics.filter(e => e.isFemale);
  }, [executiveMetrics]);

  const boysTeamExecutives = useMemo(() => {
    return executiveMetrics.filter(e => !e.isFemale);
  }, [executiveMetrics]);

  const girlsTeamTotals = useMemo(() => {
    return girlsTeamExecutives.reduce(
      (acc, curr) => ({
        staffCount: acc.staffCount + 1,
        totalOrders: acc.totalOrders + curr.totalOrders,
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
      { staffCount: 0, totalOrders: 0, bulkOrders: 0, mixedOrders: 0, giftOrders: 0, sentToAccounts: 0, sentToDesigns: 0, receivedDesigns: 0, totalOrderValue: 0, totalAdvance: 0, invoicesCount: 0, totalInvoicedAmount: 0 }
    );
  }, [girlsTeamExecutives]);

  const boysTeamTotals = useMemo(() => {
    return boysTeamExecutives.reduce(
      (acc, curr) => ({
        staffCount: acc.staffCount + 1,
        totalOrders: acc.totalOrders + curr.totalOrders,
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
      { staffCount: 0, totalOrders: 0, bulkOrders: 0, mixedOrders: 0, giftOrders: 0, sentToAccounts: 0, sentToDesigns: 0, receivedDesigns: 0, totalOrderValue: 0, totalAdvance: 0, invoicesCount: 0, totalInvoicedAmount: 0 }
    );
  }, [boysTeamExecutives]);

  // Overall Team Summary Totals
  const teamTotals = useMemo(() => {
    return executiveMetrics.reduce(
      (acc, curr) => ({
        totalOrders: acc.totalOrders + curr.totalOrders,
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
        totalOrders: 0,
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
  }, [executiveMetrics]);

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

  // Unique list of marketing staff for the dropdown selector
  const uniqueMarketingStaffList = useMemo(() => {
    const list = Array.from(new Set(executiveMetrics.map(e => e.name))).sort();
    return list.map(name => {
      const isFemale = isFemaleStaff(name, registeredUsers);
      return {
        name,
        isFemale,
        teamName: isFemale ? 'Girls Team' : 'Boys Team'
      };
    });
  }, [executiveMetrics, registeredUsers]);

  // Classification & Category counts for currently selected Staff/Team
  const orderClassificationCounts = useMemo(() => {
    let list = filteredOrders;
    if (selectedExecutive) {
      list = list.filter(o => (o.createdByName || o.createdBy || '').trim() === selectedExecutive);
    } else if (orderTeamFilter === 'girls') {
      list = list.filter(o => isFemaleStaff(o.createdByName || o.createdBy, registeredUsers));
    } else if (orderTeamFilter === 'boys') {
      list = list.filter(o => !isFemaleStaff(o.createdByName || o.createdBy, registeredUsers));
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
    let list = filteredOrders;

    // 1. Marketing Staff Filter
    if (selectedExecutive) {
      list = list.filter(o => (o.createdByName || o.createdBy || '').trim() === selectedExecutive);
    } else if (orderTeamFilter === 'girls') {
      list = list.filter(o => isFemaleStaff(o.createdByName || o.createdBy, registeredUsers));
    } else if (orderTeamFilter === 'boys') {
      list = list.filter(o => !isFemaleStaff(o.createdByName || o.createdBy, registeredUsers));
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

  // Export currently filtered orders to Excel (.xlsx)
  const handleExportOrdersToExcel = () => {
    if (drillDownOrders.length === 0) {
      alert("No orders available to export with the currently selected filters.");
      return;
    }

    const exportRows = drillDownOrders.map(o => {
      const isBulk = isBulkOrder(o);
      const isMixed = isMixedOrder(o);
      const isGift = isGiftOrOtherOrder(o);

      let classification = 'Standard Order';
      if (isBulk && isMixed) classification = 'Bulk & Mixed (10+ Qty & 3+ Cats)';
      else if (isBulk) classification = 'Bulk Order (10+ Qty)';
      else if (isMixed) classification = 'Mixed Order (3+ Cats)';
      else if (isGift) classification = 'Gift Item / Merchandise';

      const creator = (o.createdByName || o.createdBy || 'Unknown Staff').trim();
      const isFemale = isFemaleStaff(creator, registeredUsers);
      const teamName = isFemale ? 'Girls Team' : 'Boys Team';

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
        'Total Quantity (pcs)': totalQty,
        'Order Status': String(o.status || '').replace('_', ' ').toUpperCase(),
        'Order Value (₹)': amount,
        'Advance Paid (₹)': advance,
        'Balance Due (₹)': balance,
        'Accounts Dispatched': isSentToAccounts(o) ? 'YES' : 'NO',
        'Design Studio Status': isSentToDesigns(o) ? (isReceivedDesignsFile(o) ? 'Artwork Ready' : 'In Design') : 'Pending',
        'Assigned Designer': o.assignedDesigner && o.assignedDesigner !== 'Unassigned' ? o.assignedDesigner : (o.claimedByName || 'Unassigned'),
        'Artwork Ready': isReceivedDesignsFile(o) ? 'YES' : 'NO',
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

  // Export Executive Performance summary to Excel (.xlsx)
  const handleExportExecutiveToExcel = () => {
    if (displayedExecutives.length === 0) {
      alert("No executive performance data to export.");
      return;
    }

    const exportRows = displayedExecutives.map((e, idx) => {
      const balanceDue = Math.max(0, e.totalOrderValue - e.totalAdvance);

      return {
        'Rank': idx + 1,
        'Executive Name': e.name,
        'Team': e.teamName,
        'Total Orders Created': e.totalOrders,
        'Bulk Orders (10+ Qty)': e.bulkOrders,
        'Mixed Orders (3+ Cats)': e.mixedOrders,
        'Gift / Other Orders': e.giftOrders,
        'Sent to Accounts': e.sentToAccounts,
        'Sent to Designs': e.sentToDesigns,
        'Artwork Ready (Designs File)': e.receivedDesigns,
        'Total Order Value (₹)': e.totalOrderValue,
        'Advance Collected (₹)': e.totalAdvance,
        'Balance Due (₹)': balanceDue,
        'Invoices Created': e.invoicesCount,
        'Total Invoiced Amount (₹)': e.totalInvoicedAmount
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff_Performance');

    const maxCols = Object.keys(exportRows[0] || {}).length;
    worksheet['!cols'] = Array(maxCols).fill({ wch: 22 });

    const teamPrefix = staffTeamFilter !== 'all' ? `${staffTeamFilter.toUpperCase()}_TEAM_` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Marketing_Staff_Performance_${teamPrefix}${dateStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
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
            onClick={handleExportOrdersToExcel}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 border-none cursor-pointer"
            title="Export currently filtered orders to Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} /> Export Orders (.xlsx)
          </button>

          <button
            onClick={handleExportExecutiveToExcel}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 border-none cursor-pointer"
            title="Export executive performance report to Excel (.xlsx)"
          >
            <Download size={14} /> Export Staff (.xlsx)
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

          {/* Girls Team vs Boys Team Dedicated Performance Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {/* Girls Team Card */}
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
                    👩
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-gray-900 tracking-tight">Girls Team</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-pink-100 text-pink-700 border border-pink-200">
                        {girlsTeamExecutives.length} Staff
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Female Marketing Executives & Staff Members
                    </p>
                  </div>
                </div>

                <span className={cn(
                  "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                  staffTeamFilter === 'girls' ? "bg-pink-600 text-white font-black" : "bg-gray-100 text-gray-600 group-hover:bg-pink-100 group-hover:text-pink-700"
                )}>
                  {staffTeamFilter === 'girls' ? '✓ Filtering Girls Team' : 'Click to Filter'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-4 mt-4 border-t border-pink-100/80">
                <div className="bg-white/80 p-2.5 rounded-xl border border-pink-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Orders</span>
                  <span className="text-base font-black text-gray-900">{girlsTeamTotals.totalOrders}</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-pink-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Bulk (10+)</span>
                  <span className="text-base font-black text-indigo-700">{girlsTeamTotals.bulkOrders}</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-pink-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Value</span>
                  <span className="text-base font-black text-emerald-700">₹{girlsTeamTotals.totalOrderValue.toLocaleString()}</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-pink-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Invoiced</span>
                  <span className="text-base font-black text-blue-700">₹{girlsTeamTotals.totalInvoicedAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Boys Team Card */}
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
                    👨
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-gray-900 tracking-tight">Boys Team</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {boysTeamExecutives.length} Staff
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Male Marketing Executives & Staff Members
                    </p>
                  </div>
                </div>

                <span className={cn(
                  "px-3 py-1 rounded-xl text-xs font-bold transition-all",
                  staffTeamFilter === 'boys' ? "bg-indigo-600 text-white font-black" : "bg-gray-100 text-gray-600 group-hover:bg-indigo-100 group-hover:text-indigo-700"
                )}>
                  {staffTeamFilter === 'boys' ? '✓ Filtering Boys Team' : 'Click to Filter'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 pt-4 mt-4 border-t border-indigo-100/80">
                <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Orders</span>
                  <span className="text-base font-black text-gray-900">{boysTeamTotals.totalOrders}</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Bulk (10+)</span>
                  <span className="text-base font-black text-indigo-700">{boysTeamTotals.bulkOrders}</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Value</span>
                  <span className="text-base font-black text-emerald-700">₹{boysTeamTotals.totalOrderValue.toLocaleString()}</span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Invoiced</span>
                  <span className="text-base font-black text-blue-700">₹{boysTeamTotals.totalInvoicedAmount.toLocaleString()}</span>
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

          {/* Main Section: Marketing Individual Executive Performance */}
          <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden space-y-4 p-6 text-left">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Users className="text-brand-primary" size={18} />
                  Marketing Individual Executive Performance
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Separated Girls Team vs Boys Team breakdown: total orders, bulk deals, design studio tracking, revenue & invoicing.
                </p>
              </div>

              {/* Team Filters & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
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
                    👩 Girls Team ({girlsTeamExecutives.length})
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
                    👨 Boys Team ({boysTeamExecutives.length})
                  </button>
                </div>

                {/* Search Input */}
                <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-2xl border border-gray-200 sm:w-56">
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
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            {/* Executive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <th className="px-5 py-3.5 rounded-l-xl">Executive & Team</th>
                    <th className="px-4 py-3.5 text-center">Orders Created</th>
                    <th className="px-4 py-3.5 text-center">Bulk (10+ Qty)</th>
                    <th className="px-4 py-3.5 text-center">Sent to Accounts</th>
                    <th className="px-4 py-3.5 text-center">Sent to Designs</th>
                    <th className="px-4 py-3.5 text-center">Artwork Ready</th>
                    <th className="px-4 py-3.5 text-right">Total Order Value</th>
                    <th className="px-4 py-3.5 text-right">Advance Collected</th>
                    <th className="px-4 py-3.5 text-center">Invoices</th>
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
                                    {exec.isFemale ? '👩 Girls Team' : '👨 Boys Team'}
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

                          {/* Orders Created */}
                          <td className="px-4 py-4 text-center">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black">
                              {exec.totalOrders}
                            </span>
                          </td>

                          {/* Bulk Orders (10+ Qty) */}
                          <td className="px-4 py-4 text-center">
                            {exec.bulkOrders > 0 ? (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-black">
                                📦 {exec.bulkOrders}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
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

                          {/* Artwork Ready */}
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
                              {isSelected ? 'Hide Orders' : 'Filter Orders'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-gray-400 font-medium">
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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h4 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Layers className="text-brand-primary" size={18} />
                  {selectedExecutive
                    ? `${selectedExecutive}'s Orders Breakdown`
                    : orderTeamFilter === 'girls'
                    ? "Girls Team Marketing Orders Flow"
                    : orderTeamFilter === 'boys'
                    ? "Boys Team Marketing Orders Flow"
                    : 'All Marketing Orders Flow'}
                  <span className="text-xs font-bold text-gray-400 lowercase">({drillDownOrders.length} orders)</span>
                </h4>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Filter by marketing staff, Girls/Boys team, Bulk orders (10+ pcs), Mixed orders (3+ categories), Gift items, and export to Excel.
                </p>
              </div>

              {/* Export to Excel Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportOrdersToExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 border-none cursor-pointer"
                >
                  <FileSpreadsheet size={15} /> 📥 Export to Excel (.xlsx) ({drillDownOrders.length})
                </button>
              </div>
            </div>

            {/* Filter Control Bar: Marketing Staff Selector, Team Filter, and Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-200">
              {/* Marketing Staff Selector Dropdown */}
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1">
                  Select Marketing Staff:
                </label>
                <div className="relative">
                  <select
                    value={selectedExecutive || 'all'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedExecutive(val === 'all' ? null : val);
                    }}
                    className="w-full text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary/20 text-gray-800"
                  >
                    <option value="all">👥 All Marketing Staff ({uniqueMarketingStaffList.length})</option>
                    <optgroup label="👩 Girls Team (Female Staff)">
                      {uniqueMarketingStaffList.filter(s => s.isFemale).map(s => (
                        <option key={s.name} value={s.name}>👩 {s.name} (Girls Team)</option>
                      ))}
                    </optgroup>
                    <optgroup label="👨 Boys Team (Male Staff)">
                      {uniqueMarketingStaffList.filter(s => !s.isFemale).map(s => (
                        <option key={s.name} value={s.name}>👨 {s.name} (Boys Team)</option>
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
                    { id: 'girls', label: '👩 Girls Team' },
                    { id: 'boys', label: '👨 Boys Team' }
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
                    <th className="px-4 py-3 text-center">Artwork Ready</th>
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
                                {isFemale ? '👩 Girls' : '👨 Boys'}
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
                              {isFemale ? '👩 Girls' : '👨 Boys'}
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
