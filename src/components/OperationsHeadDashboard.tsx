import React, { useState, useMemo } from 'react';
import {
  Package, Palette, RefreshCw, Scissors, Factory, Truck,
  CheckCircle2, AlertCircle, Clock, Search, Filter, Download,
  Layers, ArrowUpRight, ChevronRight, Eye, Calendar, Sparkles,
  BarChart2, FileText, CheckCheck, TrendingUp, ShieldCheck,
  Building2, Users, AlertTriangle, ArrowRight, Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import { Order, OrderStatus, Invoice } from '../types';
import { cn, getDisplayCategory } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import DesignTaskTimer from './DesignTaskTimer';
import AdminCreateOrderModal from './AdminCreateOrderModal';
import InvoiceFormModal from './InvoiceFormModal';
import * as XLSX from 'xlsx';

interface OperationsHeadDashboardProps {
  orders?: Order[];
  user?: any;
}

export default function OperationsHeadDashboard({ orders: propOrders, user: propUser }: OperationsHeadDashboardProps) {
  const { user: authUser } = useAuth();
  const { orders: contextOrders, updateOrder, addInvoice, updateInvoice } = useLeads();

  const user = propUser || authUser;
  const orders = propOrders || contextOrders || [];

  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkflowTab, setSelectedWorkflowTab] = useState<'all' | 'sla_tasks' | 'design_completed' | 'rework' | 'order_management' | 'digitizer_completed' | 'production_completed' | 'delivery' | 'inventory'>('all');
  const [selectedSubTab, setSelectedSubTab] = useState<string>('open_to_claim');
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
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

  // Base filtered orders
  const baseFilteredOrders = useMemo(() => {
    return orders.filter(o => filterByDate(o.createdAt));
  }, [orders, dateFilter]);

  // 1. How many order designs completed
  const isDesignCompleted = (o: Order) => {
    // If order is currently in active rework phase, design is pending rework
    if (isOrderRework(o)) return false;
    return Boolean(
      o.designCompleted === true ||
      o.details?.designCompleted === true ||
      o.details?.designCompleted === 'true' ||
      o.designSentToMarketing === true ||
      o.details?.designSentToMarketing === true ||
      o.designSentToDigitizer === true ||
      o.details?.designSentToDigitizer === true ||
      o.designSentToOM === true ||
      o.details?.designSentToOM === true ||
      o.original_design_file ||
      o.original_design_zip ||
      (o.designAttachments && o.designAttachments.length > 0) ||
      ['order_management', 'production', 'delivery', 'delivered'].includes(String(o.status || '').toLowerCase())
    );
  };

  // 2. How many order rework (ACTIVE Design Rework)
  const isOrderRework = (o: Order) => {
    const s = String(o.status || '').toLowerCase();
    const prev = String(o.previousStatus || '').toLowerCase();
    const isDesignPhase = s === 'design' || (s === 'hold' && prev === 'design');
    const isReworkFlag = Boolean(
      o.isRework === true ||
      o.details?.isRework === true ||
      o.designRework === true ||
      (o.reworkNotes && String(o.reworkNotes).trim().length > 0)
    );
    // Only orders actively in the Design pipeline awaiting rework
    return isDesignPhase && isReworkFlag && !o.designCompleted && !o.designSentToMarketing && !o.designSentToDigitizer && !o.designSentToOM;
  };

  // 3. Admin order detection
  const isItemAdminOrder = (o: Order) => {
    if (o.isAdminOrder || (o as any).sentByAdmin) return true;
    const creator = String(o.createdByName || o.createdBy || '').toLowerCase();
    if (creator.includes('admin') || creator.includes('administrator')) return true;
    const notesStr = String(o.notes || o.designNotes || '').toLowerCase();
    if (notesStr.includes('[admin') || notesStr.includes('admin created') || notesStr.includes('admin order')) return true;
    return false;
  };

  // 4. Design Unclaimed vs Claimed
  const isUnclaimedDesignItem = (o: Order) => {
    if (isDesignCompleted(o) || isOrderRework(o) || isItemAdminOrder(o)) return false;
    if (o.claimedBy) return false;
    if (!o.assignedDesigner) return true;
    const clean = String(o.assignedDesigner).trim().toLowerCase();
    return clean === 'unassigned' || clean === 'designer assigned' || clean === '' || clean.includes('staff');
  };

  const isClaimedDesignItem = (o: Order) => {
    if (isDesignCompleted(o) || isOrderRework(o)) return false;
    if (isUnclaimedDesignItem(o)) return false;
    return Boolean(
      o.claimedBy ||
      o.claimedByName ||
      o.claimedAt ||
      o.designClaimedAt ||
      (o.assignedDesigner && o.assignedDesigner !== 'Unassigned')
    );
  };

  const isDesignHold = (o: Order) => {
    const s = String(o.status || '').toLowerCase();
    const prev = String(o.previousStatus || '').toLowerCase();
    return (s === 'hold' && (prev === 'design' || !prev)) || Boolean(o.details?.designHold) || Boolean((o as any).designHold);
  };

  // 5. How many order in Order Management
  const isInOrderManagement = (o: Order) => {
    const s = String(o.status || '').toLowerCase();
    return s === 'order_management' || s === 'ordermanagement' || o.status === OrderStatus.ORDER_MANAGEMENT;
  };

  // 6. How many order digitizer work complete
  const isOrderForDigitizer = (o: Order) => {
    return Boolean(
      o.designSentToDigitizer === true ||
      o.details?.designSentToDigitizer === true ||
      o.details?.designSentToDigitizer === 'true' ||
      o.status === OrderStatus.DIGITIZER ||
      o.digitizerCompleted === true ||
      o.details?.digitizerCompleted === true ||
      o.details?.hasMachineFiles === true ||
      (o.machineFiles && o.machineFiles.length > 0) ||
      Boolean(o.embroidery_file)
    );
  };

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

  // 7. How many orders complete in product (production)
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

  // 8. How many delivery show them
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

  // ─── Sub-Tab Derived Collections ──────────────────────────────────────────
  // DESIGNS SUB-LISTS:
  const unclaimedDesignOrders = useMemo(() => baseFilteredOrders.filter(isUnclaimedDesignItem), [baseFilteredOrders]);
  const claimedDesignOrders = useMemo(() => baseFilteredOrders.filter(isClaimedDesignItem), [baseFilteredOrders]);
  const holdDesignOrders = useMemo(() => baseFilteredOrders.filter(isDesignHold), [baseFilteredOrders]);
  const doneDesignOrders = useMemo(() => baseFilteredOrders.filter(o => isDesignCompleted(o) && !isOrderRework(o)), [baseFilteredOrders]);
  const reworkDesignOrders = useMemo(() => baseFilteredOrders.filter(isOrderRework), [baseFilteredOrders]);
  const adminDesignOrders = useMemo(() => baseFilteredOrders.filter(isItemAdminOrder), [baseFilteredOrders]);
  const allDesignOrders = useMemo(() => baseFilteredOrders.filter(o =>
    isDesignCompleted(o) ||
    isOrderRework(o) ||
    o.status === OrderStatus.DESIGN ||
    (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DESIGN) ||
    Boolean(o.assignedDesigner && o.assignedDesigner !== 'Unassigned') ||
    Boolean(o.claimedAt || o.designClaimedAt)
  ), [baseFilteredOrders]);

  // ORDER MANAGEMENT SUB-LISTS:
  const omLiveQueueOrders = useMemo(() => baseFilteredOrders.filter(o => (String(o.status || '').toLowerCase() === 'order_management' || o.status === OrderStatus.ORDER_MANAGEMENT) && o.status !== OrderStatus.HOLD), [baseFilteredOrders]);
  const omInProductionOrders = useMemo(() => baseFilteredOrders.filter(o => o.status === OrderStatus.PRODUCTION || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION)), [baseFilteredOrders]);
  const omHoldOrders = useMemo(() => baseFilteredOrders.filter(o => o.status === OrderStatus.HOLD && (o.previousStatus === OrderStatus.ORDER_MANAGEMENT || !o.previousStatus)), [baseFilteredOrders]);
  const omCompletedOrders = useMemo(() => baseFilteredOrders.filter(o => [OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(o.status) || (o.status === OrderStatus.HOLD && [OrderStatus.PRODUCTION, OrderStatus.DELIVERY].includes(o.previousStatus as any))), [baseFilteredOrders]);
  const orderManagementOrders = useMemo(() => baseFilteredOrders.filter(isInOrderManagement), [baseFilteredOrders]);

  // DIGITIZER SUB-LISTS:
  const digitizerPendingOrders = useMemo(() => baseFilteredOrders.filter(o => isOrderForDigitizer(o) && !isDigitizerCompleted(o)), [baseFilteredOrders]);
  const digitizerDoneOrders = useMemo(() => baseFilteredOrders.filter(isDigitizerCompleted), [baseFilteredOrders]);
  const allDigitizerOrders = useMemo(() => baseFilteredOrders.filter(o => isOrderForDigitizer(o) || isDigitizerCompleted(o)), [baseFilteredOrders]);

  // PRODUCTION SUB-LISTS:
  const productionRecentOrders = useMemo(() => baseFilteredOrders.filter(o => o.status === OrderStatus.PRODUCTION && !o.details?.productionStarted), [baseFilteredOrders]);
  const productionProcessingOrders = useMemo(() => baseFilteredOrders.filter(o => o.status === OrderStatus.PRODUCTION && o.details?.productionStarted === true), [baseFilteredOrders]);
  const productionHoldOrders = useMemo(() => baseFilteredOrders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION), [baseFilteredOrders]);
  const productionDoneOrders = useMemo(() => baseFilteredOrders.filter(o => o.status === OrderStatus.DELIVERED || isProductionCompleted(o) || o.details?.productionCompleted === true), [baseFilteredOrders]);
  const productionCompletedOrders = useMemo(() => baseFilteredOrders.filter(isProductionCompleted), [baseFilteredOrders]);
  const allProductionOrders = useMemo(() => baseFilteredOrders.filter(o => o.status === OrderStatus.PRODUCTION || isProductionCompleted(o) || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION)), [baseFilteredOrders]);

  // DELIVERY SUB-LISTS:
  const inTransitOrders = useMemo(() => baseFilteredOrders.filter(o => (o.status === OrderStatus.DELIVERY || o.deliveryStatus === 'in_transit') && o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.HOLD), [baseFilteredOrders]);
  const deliveryHoldOrders = useMemo(() => baseFilteredOrders.filter(o => o.status === OrderStatus.HOLD && (o.previousStatus === OrderStatus.DELIVERY || !o.previousStatus)), [baseFilteredOrders]);
  const deliveredSuccessOrders = useMemo(() => baseFilteredOrders.filter(o => o.status === OrderStatus.DELIVERED || o.deliveryStatus === 'delivered'), [baseFilteredOrders]);
  const deliveryOrders = useMemo(() => baseFilteredOrders.filter(isInDelivery), [baseFilteredOrders]);

  // INVENTORY SUB-LISTS:
  const inventoryIntakeOrders = useMemo(() => baseFilteredOrders.filter(o =>
    o.status !== OrderStatus.DELIVERED &&
    (o.status === OrderStatus.PRODUCTION || o.status === OrderStatus.DELIVERY) &&
    !o.details?.sentToDeliveryDashboard &&
    o.details?.dispatchType !== 'in_house' &&
    o.details?.dispatchType !== 'courier' &&
    !o.details?.courierName
  ), [baseFilteredOrders]);

  const inventoryCourierOrders = useMemo(() => baseFilteredOrders.filter(o =>
    o.status !== OrderStatus.DELIVERED &&
    o.status === OrderStatus.DELIVERY &&
    (o.details?.dispatchType === 'courier' || Boolean(o.details?.courierName))
  ), [baseFilteredOrders]);

  const inventoryShippedOrders = useMemo(() => baseFilteredOrders.filter(o =>
    o.status === OrderStatus.DELIVERED || o.deliveryStatus === 'delivered'
  ), [baseFilteredOrders]);

  const inventoryAllOrders = useMemo(() => {
    const map = new Map<string, Order>();
    [...inventoryIntakeOrders, ...inventoryCourierOrders, ...inventoryShippedOrders].forEach(o => map.set(o.id, o));
    return Array.from(map.values());
  }, [inventoryIntakeOrders, inventoryCourierOrders, inventoryShippedOrders]);

  // General Metrics
  const designCompletedOrders = doneDesignOrders;
  const reworkOrders = useMemo(() => baseFilteredOrders.filter(isOrderRework), [baseFilteredOrders]);
  const digitizerCompletedOrders = digitizerDoneOrders;

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

  // Sub-tabs configuration for current workflow stage
  const currentSubTabs = useMemo(() => {
    if (selectedWorkflowTab === 'design_completed') {
      return [
        { id: 'open_to_claim', label: 'Open to Claim', count: unclaimedDesignOrders.length, icon: Clock },
        { id: 'my_claimed', label: 'My Claimed Tasks', count: claimedDesignOrders.length, icon: Users },
        { id: 'hold', label: 'On Hold', count: holdDesignOrders.length, icon: AlertCircle },
        { id: 'done', label: 'Done', count: doneDesignOrders.length, icon: CheckCheck },
        { id: 'rework', label: 'Designs Rework', count: reworkDesignOrders.length, icon: RefreshCw },
        { id: 'admin_order', label: 'Admin Order', count: adminDesignOrders.length, icon: ShieldCheck },
        { id: 'all', label: 'All Designs', count: allDesignOrders.length, icon: Palette }
      ];
    }
    if (selectedWorkflowTab === 'order_management') {
      return [
        { id: 'live_queue', label: 'Live Queue', count: omLiveQueueOrders.length, icon: Clock },
        { id: 'in_production', label: 'In Production', count: omInProductionOrders.length, icon: Factory },
        { id: 'hold', label: 'On Hold', count: omHoldOrders.length, icon: AlertCircle },
        { id: 'completed', label: 'Completed', count: omCompletedOrders.length, icon: CheckCircle2 },
        { id: 'all', label: 'All OM', count: orderManagementOrders.length, icon: Layers }
      ];
    }
    if (selectedWorkflowTab === 'digitizer_completed') {
      return [
        { id: 'pending', label: 'Pending', count: digitizerPendingOrders.length, icon: Clock },
        { id: 'done', label: 'Done', count: digitizerDoneOrders.length, icon: CheckCheck },
        { id: 'all', label: 'All Digitizing', count: allDigitizerOrders.length, icon: Scissors }
      ];
    }
    if (selectedWorkflowTab === 'production_completed') {
      return [
        { id: 'recent', label: 'Recent', count: productionRecentOrders.length, icon: Package },
        { id: 'processing', label: 'Processing', count: productionProcessingOrders.length, icon: Clock },
        { id: 'hold', label: 'Hold', count: productionHoldOrders.length, icon: AlertCircle },
        { id: 'done', label: 'Done', count: productionDoneOrders.length, icon: CheckCheck },
        { id: 'all', label: 'All Production', count: allProductionOrders.length, icon: Factory }
      ];
    }
    if (selectedWorkflowTab === 'delivery') {
      return [
        { id: 'in_transit', label: 'In Transit', count: inTransitOrders.length, icon: Truck },
        { id: 'hold', label: 'Hold', count: deliveryHoldOrders.length, icon: AlertCircle },
        { id: 'delivered', label: 'Delivered', count: deliveredSuccessOrders.length, icon: CheckCheck },
        { id: 'all', label: 'All Delivery', count: deliveryOrders.length, icon: Truck }
      ];
    }
    if (selectedWorkflowTab === 'inventory') {
      return [
        { id: 'intake', label: 'Intake Queue', count: inventoryIntakeOrders.length, icon: Layers },
        { id: 'courier', label: 'Courier Shipping', count: inventoryCourierOrders.length, icon: Truck },
        { id: 'shipped', label: 'Shipped Archive', count: inventoryShippedOrders.length, icon: CheckCheck },
        { id: 'all', label: 'All Inventory', count: inventoryAllOrders.length, icon: Package }
      ];
    }
    return [];
  }, [
    selectedWorkflowTab,
    unclaimedDesignOrders, claimedDesignOrders, holdDesignOrders, doneDesignOrders, reworkDesignOrders, adminDesignOrders, allDesignOrders,
    omLiveQueueOrders, omInProductionOrders, omHoldOrders, omCompletedOrders, orderManagementOrders,
    digitizerPendingOrders, digitizerDoneOrders, allDigitizerOrders,
    productionRecentOrders, productionProcessingOrders, productionHoldOrders, productionDoneOrders, allProductionOrders,
    inTransitOrders, deliveryHoldOrders, deliveredSuccessOrders, deliveryOrders,
    inventoryIntakeOrders, inventoryCourierOrders, inventoryShippedOrders, inventoryAllOrders
  ]);

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

  // Current active table orders depending on tab & sub-tab & search
  const tableOrders = useMemo(() => {
    let list: Order[] = baseFilteredOrders;

    if (selectedWorkflowTab === 'design_completed') {
      if (selectedSubTab === 'open_to_claim') list = unclaimedDesignOrders;
      else if (selectedSubTab === 'my_claimed') list = claimedDesignOrders;
      else if (selectedSubTab === 'hold') list = holdDesignOrders;
      else if (selectedSubTab === 'done') list = doneDesignOrders;
      else if (selectedSubTab === 'rework') list = reworkDesignOrders;
      else if (selectedSubTab === 'admin_order') list = adminDesignOrders;
      else list = allDesignOrders;
    } else if (selectedWorkflowTab === 'rework') {
      list = reworkOrders;
    } else if (selectedWorkflowTab === 'order_management') {
      if (selectedSubTab === 'live_queue') list = omLiveQueueOrders;
      else if (selectedSubTab === 'in_production') list = omInProductionOrders;
      else if (selectedSubTab === 'hold') list = omHoldOrders;
      else if (selectedSubTab === 'completed') list = omCompletedOrders;
      else list = orderManagementOrders;
    } else if (selectedWorkflowTab === 'digitizer_completed') {
      if (selectedSubTab === 'pending') list = digitizerPendingOrders;
      else if (selectedSubTab === 'done') list = digitizerDoneOrders;
      else list = allDigitizerOrders;
    } else if (selectedWorkflowTab === 'production_completed') {
      if (selectedSubTab === 'recent') list = productionRecentOrders;
      else if (selectedSubTab === 'processing') list = productionProcessingOrders;
      else if (selectedSubTab === 'hold') list = productionHoldOrders;
      else if (selectedSubTab === 'done') list = productionDoneOrders;
      else list = allProductionOrders;
    } else if (selectedWorkflowTab === 'delivery') {
      if (selectedSubTab === 'in_transit') list = inTransitOrders;
      else if (selectedSubTab === 'hold') list = deliveryHoldOrders;
      else if (selectedSubTab === 'delivered') list = deliveredSuccessOrders;
      else list = deliveryOrders;
    } else if (selectedWorkflowTab === 'inventory') {
      if (selectedSubTab === 'intake') list = inventoryIntakeOrders;
      else if (selectedSubTab === 'courier') list = inventoryCourierOrders;
      else if (selectedSubTab === 'shipped') list = inventoryShippedOrders;
      else list = inventoryAllOrders;
    }

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
    baseFilteredOrders, selectedWorkflowTab, selectedSubTab,
    unclaimedDesignOrders, claimedDesignOrders, holdDesignOrders, doneDesignOrders, reworkDesignOrders, adminDesignOrders, allDesignOrders,
    reworkOrders,
    omLiveQueueOrders, omInProductionOrders, omHoldOrders, omCompletedOrders, orderManagementOrders,
    digitizerPendingOrders, digitizerDoneOrders, allDigitizerOrders,
    productionRecentOrders, productionProcessingOrders, productionHoldOrders, productionDoneOrders, allProductionOrders,
    inTransitOrders, deliveryHoldOrders, deliveredSuccessOrders, deliveryOrders,
    inventoryIntakeOrders, inventoryCourierOrders, inventoryShippedOrders, inventoryAllOrders,
    searchTerm
  ]);

  // Export excel report
  const exportExcel = () => {
    const exportData = tableOrders.map((o, idx) => ({
      'S.No': idx + 1,
      'Order Number': o.orderNumber || o.id,
      'Client Name': o.clientName || o.customerInfo?.name || 'N/A',
      'Category': getDisplayCategory(o),
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
      {/* ─── Header Action & Quick Filters Bar ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-xl text-xs font-black uppercase tracking-wider border border-brand-primary/20">
            Operations & Production Workflow
          </span>
          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
            Live Marketing Sync
          </span>
        </div>

        {/* Quick Date Filters & Create/Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white p-1 rounded-2xl border border-gray-200 shadow-xs flex items-center gap-1">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setDateFilter(t.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer",
                  dateFilter === t.id
                    ? "bg-brand-primary text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                {t.label}
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
            onClick={exportExcel}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black rounded-2xl transition-all flex items-center gap-1.5 shadow-xs border-none cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
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

      {/* ─── Workflow Interactive Tabs & Data Table ────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-4 p-6">
        {/* Navigation & Search Controls */}
        <div className="flex flex-col gap-4 border-b border-gray-100 pb-5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            {/* Main Stage Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100/80 rounded-2xl border border-gray-200/50">
              {[
                { id: 'all', label: 'All Orders', count: baseFilteredOrders.length },
                { id: 'sla_tasks', label: '⏱️ Designs Task Monitor', count: activeDesignClaimedOrders.length },
                { id: 'design_completed', label: '🎨 Designs', count: allDesignOrders.length },
                { id: 'rework', label: '🔄 Reworks', count: reworkOrders.length },
                { id: 'order_management', label: '📋 Order Mgmt', count: orderManagementOrders.length },
                { id: 'digitizer_completed', label: '✂️ Digitizer', count: allDigitizerOrders.length },
                { id: 'production_completed', label: '🏭 Production', count: allProductionOrders.length },
                { id: 'delivery', label: '🚚 Delivery', count: deliveryOrders.length },
                { id: 'inventory', label: '📦 Inventory', count: inventoryAllOrders.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedWorkflowTab(tab.id as any);
                    if (tab.id === 'design_completed') setSelectedSubTab('open_to_claim');
                    else if (tab.id === 'order_management') setSelectedSubTab('live_queue');
                    else if (tab.id === 'digitizer_completed') setSelectedSubTab('pending');
                    else if (tab.id === 'production_completed') setSelectedSubTab('recent');
                    else if (tab.id === 'delivery') setSelectedSubTab('in_transit');
                    else if (tab.id === 'inventory') setSelectedSubTab('intake');
                    else setSelectedSubTab('all');
                  }}
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

            {/* Right Controls: Date Filter Pills + Table Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Quick Date Filters Bar */}
              <div className="flex items-center gap-1 bg-gray-100/90 p-1 rounded-2xl border border-gray-200/80">
                <div className="flex items-center gap-1 pl-2 pr-1 text-[11px] font-bold text-gray-500">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                </div>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'week', label: 'This Week' },
                  { id: 'month', label: 'This Month' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setDateFilter(t.id as any)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer whitespace-nowrap",
                      dateFilter === t.id
                        ? "bg-brand-primary text-white shadow-xs font-black scale-[1.02]"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Search Box for Table */}
              {selectedWorkflowTab !== 'sla_tasks' && (
                <div className="relative min-w-[240px]">
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
          </div>

          {/* Departmental Sub-Tabs Bar */}
          {currentSubTabs.length > 0 && selectedWorkflowTab !== 'sla_tasks' && (
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-50/90 rounded-2xl border border-slate-200/80 animate-fadeIn">
              {currentSubTabs.map(subTab => {
                const IconComponent = subTab.icon;
                const isActive = selectedSubTab === subTab.id;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => setSelectedSubTab(subTab.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-95",
                      isActive
                        ? "bg-slate-900 text-white shadow-xs font-black scale-[1.02]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white"
                    )}
                  >
                    {IconComponent && <IconComponent className={cn("w-3.5 h-3.5", isActive ? "text-amber-400" : "opacity-60")} />}
                    <span>{subTab.label}</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-black min-w-[18px] text-center",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-700"
                      )}
                    >
                      {subTab.count}
                    </span>
                  </button>
                );
              })}
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
                      Designs Task Monitor
                      <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-black rounded-full">
                        {activeDesignClaimedOrders.length} Active in Studio
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      Real-time countdown tracking for claimed and in-progress design tasks
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
                          #{order.orderNumber || (order.id ? String(order.id).slice(-8) : 'N/A')}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-700 border border-gray-200">
                          {getDisplayCategory(order)}
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
          /* REGULAR WORKFLOW ORDERS TABLE & MOBILE CARDS */
          <>
            {/* Desktop View (Table) */}
            <div className="overflow-x-auto hidden md:block">
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
                    <th className="px-4 py-3.5 text-right rounded-r-xl">Order Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {tableOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
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
                              {getDisplayCategory(o)}
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
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View (Touch-Friendly Compact Workflow Cards) */}
            <div className="block md:hidden space-y-3">
              {tableOrders.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-150 text-gray-400 font-medium text-xs">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-30 text-gray-400" />
                  <p className="font-bold text-gray-500">No orders found.</p>
                </div>
              ) : (
                tableOrders.map((o) => {
                  const designDone = isDesignCompleted(o);
                  const isRework = isOrderRework(o);
                  const digitizerDone = isDigitizerCompleted(o);
                  const productionDone = isProductionCompleted(o);
                  const deliveryDone = isInDelivery(o);
                  const amount = Number(o.financials?.totalAmount || o.netTotal || 0);

                  return (
                    <div
                      key={o.id}
                      onClick={() => setSelectedOrderForModal(o)}
                      className="bg-white rounded-2xl p-4 border border-gray-150 shadow-xs hover:shadow-md transition-all space-y-3 cursor-pointer text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-brand-primary">
                              #{o.orderNumber || (o.id ? String(o.id).slice(-8) : 'N/A')}
                            </span>
                            {isRework && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded uppercase border border-amber-200">
                                Rework
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-gray-900 text-sm mt-1">{o.clientName || o.customerInfo?.name || 'Walk-in Customer'}</h4>
                          <p className="text-[11px] text-gray-500 font-medium">
                            By: <span className="font-bold text-gray-700">{o.createdByName || o.createdBy || 'Staff'}</span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-black text-sm text-gray-900">₹{amount.toLocaleString('en-IN')}</div>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-bold rounded-lg text-[9px] inline-block mt-1">
                            {getDisplayCategory(o)}
                          </span>
                        </div>
                      </div>

                      {/* Stage Grid */}
                      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-gray-100 text-center text-[9px]">
                        <div className="p-1.5 bg-gray-50 rounded-lg">
                          <span className="text-gray-400 block uppercase font-bold text-[8px]">Design</span>
                          <span className={cn("font-black", designDone ? "text-purple-700" : isRework ? "text-amber-700" : "text-gray-600")}>
                            {isRework ? 'Rework' : designDone ? 'Done' : 'Studio'}
                          </span>
                        </div>
                        <div className="p-1.5 bg-gray-50 rounded-lg">
                          <span className="text-gray-400 block uppercase font-bold text-[8px]">Digitizing</span>
                          <span className={cn("font-black", digitizerDone ? "text-pink-700" : "text-gray-400")}>
                            {digitizerDone ? 'Ready' : 'Pending'}
                          </span>
                        </div>
                        <div className="p-1.5 bg-gray-50 rounded-lg">
                          <span className="text-gray-400 block uppercase font-bold text-[8px]">Factory</span>
                          <span className={cn("font-black", productionDone ? "text-orange-700" : "text-gray-400")}>
                            {productionDone ? 'Done' : o.status === OrderStatus.PRODUCTION ? 'In Line' : 'Queued'}
                          </span>
                        </div>
                        <div className="p-1.5 bg-gray-50 rounded-lg">
                          <span className="text-gray-400 block uppercase font-bold text-[8px]">Delivery</span>
                          <span className={cn("font-black", deliveryDone ? "text-emerald-700" : "text-gray-400")}>
                            {deliveryDone ? (o.status === OrderStatus.DELIVERED ? 'Delivered' : 'Transit') : 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* SLA Timer */}
                      {(o.claimedAt || o.designClaimedAt || (o.assignedDesigner && o.assignedDesigner !== 'Unassigned')) && (
                        <div className="pt-1">
                          <DesignTaskTimer
                            claimedAt={o.claimedAt || o.designClaimedAt}
                            completedAt={o.designCompletedAt}
                            isCompleted={designDone}
                            variant="bar"
                            designerName={o.assignedDesigner}
                          />
                        </div>
                      )}

                      {/* Quick Inspect Button */}
                      <div className="pt-2 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderForModal(o);
                          }}
                          className="px-4 py-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer shadow-xs flex items-center gap-1"
                        >
                          <Eye size={12} /> Inspect Order
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── Order Detail Modal Integration ─────────────────────────────────── */}
      {selectedOrderForModal && (
        <OrderDetailModal
          order={selectedOrderForModal}
          onClose={() => setSelectedOrderForModal(null)}
          onUpdateOrder={async (id, updates) => {
            await updateOrder(id, updates);
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
