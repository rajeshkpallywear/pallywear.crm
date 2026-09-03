/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { motion } from 'motion/react';
import { Plus, Search, ChevronRight, FileText, User, Phone, MapPin, X, ZoomIn, Copy, Share2, Trash2, Package, AlertCircle, Mic, Send, MessageSquare, Paperclip, Clock, Sparkles, Wand2, ArrowRight } from 'lucide-react';
import { Order, OrderStatus, SizeBreakdown, UserRole } from '../types';
import { mockDataService } from '../service/mockDataService';
import OrderDetailModal from './OrderDetailModal';
import { useLeads } from '../context/LeadContext';
import {
  CATEGORIES, JERSEY_MATERIALS, JERSEY_MODELS, SLEEVE_OPTIONS,
  SHIRT_MATERIALS, SHIRT_MODELS, SHIRT_COLOURS, PRINT_TYPES,
  HOODIE_MODELS, HOODIE_COLOURS, SWEATSHIRT_COLOURS,
  PANT_MATERIALS, PANT_COLOURS, TSHIRT_MATERIALS, TSHIRT_COLOURS_MAP,
  OVERSIZED_MATERIALS, OVERSIZED_COLOURS, CORPORATE_GIFT_OPTIONS,
  SIZE_OPTIONS
} from '../constants';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import { cn, getDisplayCategory, isOrderSizeValid } from '../lib/utils';
import { useRef } from 'react';
import ConversationDashboard from './ConversationDashboard';
import OrdersChart from './OrdersChart';

interface MarketingDashboardProps {
  orders: Order[];
  inventory?: any[];
  onCreateOrder: (order: Partial<Order>) => Promise<void>;
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
  user?: any;
  leadManagerComponent?: React.ReactNode;
}

export default function MarketingDashboard({ orders, inventory = [], onCreateOrder, onUpdateOrder, onDeleteOrder, isAdmin, user, leadManagerComponent }: MarketingDashboardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [activeShareMenu, setActiveShareMenu] = useState<string | null>(null);
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const { loadOrderAttachments } = useLeads();

  useEffect(() => {
    if (selectedHubOrder) {
      loadOrderAttachments(selectedHubOrder.id).then(attachments => {
        setSelectedHubOrder(prev => prev && prev.id === selectedHubOrder.id ? { ...prev, ...attachments } : prev);
      });
    }
  }, [selectedHubOrder?.id]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    category: CATEGORIES[0],
    details: {} as any,
    imageAttachments: [] as string[],
    pdfAttachments: [] as string[],
    sizeBreakdown: [] as { category: string, size: string, quantity: number, price: number }[],
    totalAmount: 0,
    advancePay: 0,
    notes: '',
    isUrgent: false
  });

  const [selectedSection, setSelectedSection] = useState<'recent' | 'process' | 'design_received' | 'hold' | 'completed'>('recent');

  const [isDesignSidebarOpen, setIsDesignSidebarOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  const [noteModal, setNoteModal] = useState<{
    isOpen: boolean;
    orderId: string;
    target: 'design' | 'accounts';
    noteText: string;
  } | null>(null);

  useEffect(() => {
    const handleOpenFeed = () => {
      setIsDesignSidebarOpen(true);
    };
    window.addEventListener('open-conversations-feed', handleOpenFeed);
    return () => {
      window.removeEventListener('open-conversations-feed', handleOpenFeed);
    };
  }, []);

  const resetForm = () => {
    setFormData({
      customerName: '',
      phone: '',
      address: '',
      category: CATEGORIES[0],
      details: {},
      imageAttachments: [],
      pdfAttachments: [],
      sizeBreakdown: [],
      totalAmount: 0,
      advancePay: 0,
      notes: '',
      isUrgent: false
    });
    setEditingOrderId(null);
  };

  useEffect(() => {
    const handleCreateOrderEvent = () => {
      resetForm();
      setIsCreating(true);
    };
    window.addEventListener('onlineteam-create-order', handleCreateOrderEvent);
    return () => {
      window.removeEventListener('onlineteam-create-order', handleCreateOrderEvent);
    };
  }, [orders]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    const totalQuantity = formData.sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0) || 1;
    const existingOrder = editingOrderId ? orders.find(o => o.id === editingOrderId) : null;
    let computedCategory = formData.category;
    if (formData.sizeBreakdown && formData.sizeBreakdown.length > 0) {
      const categories = Array.from(new Set(formData.sizeBreakdown.map(i => i.category)));
      if (categories.length === 1) {
        computedCategory = categories[0];
      } else if (categories.length > 1) {
        computedCategory = 'Mixed Order';
      }
    }

    const finalOrderData = {
      status: existingOrder ? existingOrder.status : OrderStatus.PENDING,
      category: computedCategory,
      createdBy: existingOrder ? existingOrder.createdBy : (user?.id || user?.uid || 'unknown'),
      createdByName: existingOrder ? existingOrder.createdByName : (user?.name || 'Unknown'),
      claimedBy: existingOrder ? existingOrder.claimedBy : (user?.id || user?.uid || undefined),
      claimedByName: existingOrder ? existingOrder.claimedByName : (user?.name || undefined),
      claimedAt: existingOrder ? existingOrder.claimedAt : Date.now(),
      customerInfo: {
        name: formData.customerName,
        phone: formData.phone,
        address: formData.address
      },
      details: formData.details,
      sizeBreakdown: formData.sizeBreakdown,
      quantity: totalQuantity,
      isUrgent: formData.isUrgent,
      notes: formData.notes.trim(),
      designNotes: formData.notes.trim(),
      financials: {
        totalAmount: formData.totalAmount,
        advancePay: formData.advancePay,
        balanceAmount: formData.totalAmount - formData.advancePay
      },
      staffImages: formData.imageAttachments,
      staffPdfs: formData.pdfAttachments,
      staffAttachments: [...formData.imageAttachments, ...formData.pdfAttachments], // Legacy
      marketing_image: formData.imageAttachments[0] || '',
      marketing_notes: formData.notes.trim(),
      updatedAt: Date.now(),
    };

    if (!isOrderSizeValid(finalOrderData)) {
      alert("Error: Total order data limit exceeded (Max 100MB). Please use fewer images or smaller files. Your current attempt is too large for the cloud.");
      return;
    }

    setIsProcessing(true);

    try {
      if (editingOrderId) {
        await onUpdateOrder(editingOrderId, finalOrderData);
        alert("Success: Order updated in portal.");
      } else {
        await onCreateOrder({
          ...finalOrderData,
          status: OrderStatus.PENDING,
          designSentToMarketing: false,
          designCompleted: false,
          original_design_file: '',
          original_design_filename: '',
          original_design_zip: '',
          original_design_zip_filename: '',
          createdAt: Date.now(),
        });
        alert("Success: Order created successfully and added to your queue.");
      }
      setIsCreating(false);
      setEditingOrderId(null);
      resetForm();
    } catch (error: any) {
      console.error("Order submission failed:", error);
      const errorMessage = error?.message || "";
      if (errorMessage.includes("ORDER_TOO_LARGE") || errorMessage.includes("exceeds the maximum allowed size") || errorMessage.includes("size")) {
        alert("Failed to submit: Attachments are too large for the database (Max 100MB per order total). Please use fewer or smaller files.");
      } else {
        alert("Failed to submit order. Please check all fields. Error: " + (errorMessage.slice(0, 100)));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const addSizeQuantity = () => {
    setFormData(prev => ({
      ...prev,
      sizeBreakdown: [...prev.sizeBreakdown, {
        category: prev.category,
        size: SIZE_OPTIONS[0],
        quantity: 1,
        price: 0,
        colour: '',
        printType: '',
        sleeve: '',
        pocket: '',
        material: '',
        model: ''
      }]
    }));
  };

  const calculateAutoTotal = (breakdown: any[]) => {
    return breakdown.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);
  };

  const updateSizeQuantity = (index: number, field: keyof SizeBreakdown, value: any) => {
    setFormData(prev => {
      const updated = [...prev.sizeBreakdown];
      updated[index] = { ...updated[index], [field]: value };
      const newTotal = calculateAutoTotal(updated);
      return { ...prev, sizeBreakdown: updated, totalAmount: newTotal };
    });
  };

  const getMaterialsForCategory = (category: string) => {
    switch (category) {
      case 'Jersey': return JERSEY_MATERIALS;
      case 'Shirt': return SHIRT_MATERIALS;
      case 'Pant': return PANT_MATERIALS;
      case 'T-Shirt': return TSHIRT_MATERIALS;
      case 'Oversized': return OVERSIZED_MATERIALS;
      default: return [];
    }
  };

  const getModelsForCategory = (category: string) => {
    switch (category) {
      case 'Jersey': return JERSEY_MODELS;
      case 'Shirt': return SHIRT_MODELS;
      case 'Hoodie': return HOODIE_MODELS;
      case 'T-Shirt': return ['Polo', 'Crewneck', 'V-Neck'];
      case 'Corporate Gift': return CORPORATE_GIFT_OPTIONS;
      default: return [];
    }
  };

  const getColoursForCategory = (category: string, material?: string) => {
    switch (category) {
      case 'Shirt': return SHIRT_COLOURS;
      case 'Hoodie': return HOODIE_COLOURS;
      case 'Sweatshirt': return SWEATSHIRT_COLOURS;
      case 'Pant': return PANT_COLOURS;
      case 'T-Shirt':
        if (material) {
          const key = Object.keys(TSHIRT_COLOURS_MAP).find(k => k.toLowerCase() === material.toLowerCase());
          return key ? TSHIRT_COLOURS_MAP[key] : (TSHIRT_COLOURS_MAP['Comfort'] || []);
        }
        return [];
      case 'Oversized': return OVERSIZED_COLOURS;
      default: return [];
    }
  };

  const getSleevesForCategory = (category: string) => {
    if (category === 'Jersey') return ['pull', 'half'];
    if (['Shirt', 'T-Shirt'].includes(category)) return ['full', 'half'];
    return [];
  };

  const getPocketsForCategory = (category: string) => {
    if (['Shirt', 'T-Shirt'].includes(category)) return ['yes', 'no'];
    return [];
  };

  const removeSizeQuantity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sizeBreakdown: prev.sizeBreakdown.filter((_, i) => i !== index)
    }));
  };

  const startEdit = (order: Order) => {
    setEditingOrderId(order.id);
    setFormData({
      customerName: order.customerInfo.name,
      phone: order.customerInfo.phone,
      address: order.customerInfo.address,
      category: order.category,
      details: order.details || {},
      imageAttachments: order.staffImages?.length ? order.staffImages : (order.marketing_image ? [order.marketing_image] : []),
      pdfAttachments: order.staffPdfs || [],
      sizeBreakdown: order.sizeBreakdown || [],
      totalAmount: order.financials?.totalAmount || 0,
      advancePay: order.financials?.advancePay || 0,
      notes: order.notes || order.designNotes || order.marketing_notes || '',
      isUrgent: order.isUrgent || false
    });
    setIsCreating(true);
  };

  const debouncedSearchTerm = useDebounce(searchTerm, 150);

  const isReturnedFromDesign = (o: Order) => {
    return !!(
      (o.designCompleted || o.designSentToMarketing || (o.original_design_file && o.original_design_file.length > 0)) &&
      (o.status === OrderStatus.PENDING || o.status === OrderStatus.DRAFT)
    );
  };

  const filteredOrders = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase().trim();
    return orders.filter(o => {
      const matchesSearch = !term || (o.customerInfo?.name || '').toLowerCase().includes(term) || o.id.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (selectedSection === 'design_received') {
        return isReturnedFromDesign(o);
      }
      if (selectedSection === 'hold') {
        return o.status === OrderStatus.HOLD && (!o.previousStatus || o.previousStatus === OrderStatus.PENDING || o.previousStatus === OrderStatus.DRAFT);
      }
      if (selectedSection === 'completed') {
        return o.status === OrderStatus.DELIVERY || o.status === OrderStatus.DELIVERED || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY);
      }
      if (selectedSection === 'process') {
        const effStatus = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
        return effStatus !== OrderStatus.DELIVERY &&
               effStatus !== OrderStatus.DELIVERED &&
               effStatus !== OrderStatus.PENDING &&
               effStatus !== OrderStatus.DRAFT &&
               !(o.status === OrderStatus.HOLD && (!o.previousStatus || o.previousStatus === OrderStatus.PENDING || o.previousStatus === OrderStatus.DRAFT));
      }
      // 'recent': newly created orders that have NOT yet returned from designs
      return (o.status === OrderStatus.PENDING || o.status === OrderStatus.DRAFT) && !isReturnedFromDesign(o);
    });
  }, [orders, debouncedSearchTerm, selectedSection]);

  const recentOrdersCount = useMemo(() => orders.filter(o => (o.status === OrderStatus.PENDING || o.status === OrderStatus.DRAFT) && !isReturnedFromDesign(o)).length, [orders]);
  const designReceivedOrdersCount = useMemo(() => orders.filter(o => isReturnedFromDesign(o)).length, [orders]);
  const processOrdersCount = useMemo(() => orders.filter(o => {
    const effStatus = o.status === OrderStatus.HOLD ? o.previousStatus : o.status;
    return effStatus !== OrderStatus.DELIVERY &&
           effStatus !== OrderStatus.DELIVERED &&
           effStatus !== OrderStatus.PENDING &&
           effStatus !== OrderStatus.DRAFT &&
           !(o.status === OrderStatus.HOLD && (!o.previousStatus || o.previousStatus === OrderStatus.PENDING || o.previousStatus === OrderStatus.DRAFT));
  }).length, [orders]);
  const holdOrdersCount = useMemo(() => orders.filter(o => o.status === OrderStatus.HOLD && (!o.previousStatus || o.previousStatus === OrderStatus.PENDING || o.previousStatus === OrderStatus.DRAFT)).length, [orders]);
  const completedOrdersCount = useMemo(() => orders.filter(o => o.status === OrderStatus.DELIVERY || o.status === OrderStatus.DELIVERED || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY)).length, [orders]);

  return (
    <div className="bg-white/85 backdrop-blur-md text-gray-900 p-3.5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white/60 shadow-lg space-y-4 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* Action Buttons Header */}
      <div className="flex items-center justify-end gap-2.5 border-b border-gray-100 pb-3 sm:pb-4">
        <button
          onClick={() => {
            resetForm();
            setIsCreating(true);
          }}
          className="flex items-center justify-center gap-1.5 sm:gap-2 bg-brand-primary text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black hover:opacity-90 transition-all shadow-md active:scale-95 text-[10px] sm:text-xs uppercase cursor-pointer border-none"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span>Create Order</span>
        </button>
        <button
          onClick={() => setIsLeadModalOpen(true)}
          className="flex items-center justify-center gap-1.5 sm:gap-2 bg-gray-150 border border-gray-200 text-gray-700 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black hover:bg-gray-200 transition-all shadow-xs active:scale-95 text-[10px] sm:text-xs uppercase cursor-pointer"
        >
          <User size={14} className="sm:w-4 sm:h-4" />
          <span>Create Lead</span>
        </button>
      </div>

      <ConversationDashboard
        isOpen={isDesignSidebarOpen}
        onClose={() => setIsDesignSidebarOpen(false)}
        currentUser={user || { name: 'Marketing Desk', role: 'Marketing' }}
        orders={orders}
        onUpdateOrder={onUpdateOrder}
        onCreateOrder={onCreateOrder}
      />

      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-gray-100 border border-gray-250 rounded-xl sm:rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setSelectedSection('recent')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center truncate min-w-0",
            selectedSection === 'recent' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800"
          )}
        >
          Recent ({recentOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('process')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center truncate min-w-0",
            selectedSection === 'process' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800"
          )}
        >
          Processing ({processOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('design_received')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center truncate min-w-0 flex items-center justify-center gap-1.5",
            selectedSection === 'design_received'
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-purple-700 bg-purple-50/80 hover:bg-purple-100 hover:text-purple-900"
          )}
        >
          <span>🎨 Designs Received</span>
          <span className={cn(
            "px-1.5 py-0.2 rounded-full text-[9px] font-black",
            selectedSection === 'design_received' ? "bg-white/20 text-white" : "bg-purple-200/80 text-purple-900"
          )}>
            {designReceivedOrdersCount}
          </span>
        </button>
        <button
          onClick={() => setSelectedSection('hold')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center truncate min-w-0",
            selectedSection === 'hold' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800"
          )}
        >
          On Hold ({holdOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('completed')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center truncate min-w-0",
            selectedSection === 'completed' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800"
          )}
        >
          Done ({completedOrdersCount})
        </button>
      </div>

      {/* Primary Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Order intake lists */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <Search className="text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search customer or order ID..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <table className="hidden md:table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-gray-400 uppercase font-black text-[9px] tracking-wider border-b border-gray-100">
                  <th className="pb-3 px-3">Order ID</th>
                  <th className="pb-3 px-3">Customer</th>
                  <th className="pb-3 px-3">Category</th>
                  <th className="pb-3 px-3">Qty</th>
                  <th className="pb-3 px-3">Pipeline Status</th>
                  <th className="pb-3 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(order => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedHubOrder(order)}
                      className="hover:bg-gray-50/50 transition-all cursor-pointer"
                    >
                      <td className="py-4 px-3 font-mono text-[10px] text-gray-400">
                        <div className="flex items-center gap-2">
                          #{order.id.slice(-6)}
                          {order.isUrgent && (
                            <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">URGENT</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          {((order.staffImages && order.staffImages[0]) || order.marketing_image || order.original_design_file) && (
                            <div 
                              onClick={(e) => {
                                const imgToView = order.original_design_file || order.staffImages?.[0] || order.marketing_image;
                                if (imgToView) {
                                  e.stopPropagation();
                                  setViewingImage(imgToView);
                                }
                              }}
                              className="w-9 h-9 rounded-lg border border-gray-150 overflow-hidden shrink-0 bg-gray-50 relative group cursor-pointer"
                              title="Click to zoom image"
                            >
                              <img src={order.original_design_file || order.staffImages?.[0] || order.marketing_image} className="w-full h-full object-cover" />
                              {order.original_design_file && (
                                <span className="absolute bottom-0 inset-x-0 bg-purple-600 text-[6px] font-black text-white text-center uppercase">Art</span>
                              )}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-950 uppercase italic">{order.customerInfo?.name || ''}</div>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{order.customerInfo?.phone || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-black uppercase rounded">
                          {getDisplayCategory(order)}
                        </span>
                      </td>
                      <td className="py-4 px-3 font-bold text-gray-900 text-xs">{order.quantity || 1}</td>
                      <td className="py-4 px-3">
                        <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {isReturnedFromDesign(order) ? (
                            <div className="flex flex-col gap-1">
                              <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase w-fit tracking-wider bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                                ✓ Design Received
                              </span>
                              {order.assignedDesigner && (
                                <span className="text-[9.5px] text-purple-700 font-bold">
                                  🎨 Lead: {order.assignedDesigner}
                                </span>
                              )}
                              {order.designNotes && (
                                <span className="text-[8.5px] text-gray-500 italic max-w-[200px] truncate" title={order.designNotes}>
                                  Studio: "{order.designNotes}"
                                </span>
                              )}
                              <div className="flex gap-1.5 mt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNoteModal({
                                      isOpen: true,
                                      orderId: order.id,
                                      target: 'accounts',
                                      noteText: ''
                                    });
                                  }}
                                  className="text-[9px] font-black text-white bg-brand-primary hover:opacity-90 rounded px-2.5 py-1 transition-all cursor-pointer uppercase tracking-wider shadow-xs"
                                >
                                  💳 Forward to Accounts
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNoteModal({
                                      isOpen: true,
                                      orderId: order.id,
                                      target: 'design',
                                      noteText: ''
                                    });
                                  }}
                                  className="text-[9px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded px-2 py-1 transition-all cursor-pointer uppercase tracking-wider"
                                >
                                  ✏️ Revise
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase w-fit tracking-wider ${getStatusStyles(order.status)}`}>
                                {order.status.replace('_', ' ')}
                              </span>
                              {order.assignedDesigner && order.assignedDesigner !== 'Unassigned' && order.assignedDesigner !== 'Designer assigned' ? (
                                <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1 mt-0.5">
                                  🎨 {order.assignedDesigner}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                                  🎨 Unassigned
                                </span>
                              )}
                              {(order.status === OrderStatus.PENDING || order.status === OrderStatus.DRAFT) && (
                                <div className="flex gap-1.5 mt-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNoteModal({
                                        isOpen: true,
                                        orderId: order.id,
                                        target: 'design',
                                        noteText: ''
                                      });
                                    }}
                                    className="text-[9px] font-black text-purple-700 bg-purple-50 hover:bg-purple-650 hover:text-white border border-purple-200 rounded px-2 py-0.5 transition-all cursor-pointer uppercase tracking-wider"
                                  >
                                    Designs
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNoteModal({
                                        isOpen: true,
                                        orderId: order.id,
                                        target: 'accounts',
                                        noteText: ''
                                      });
                                    }}
                                    className="text-[9px] font-black text-amber-700 bg-amber-50 hover:bg-amber-650 hover:text-white border border-amber-200 rounded px-2 py-0.5 transition-all cursor-pointer uppercase tracking-wider"
                                  >
                                    Accounts
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {order.status === OrderStatus.HOLD && order.holdReason && (
                          <div className="text-[8px] text-red-500 mt-1 font-bold italic truncate max-w-[80px]" title={order.holdReason}>
                            {order.holdReason}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-3 text-right">
                        <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[9px] font-mono text-gray-400 mr-1">{new Date(order.createdAt).toLocaleDateString()}</span>
                          <button
                            onClick={() => setSelectedHubOrder(order)}
                            className="px-2.5 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border-none"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                      No orders found in this section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Mobile View */}
            <div className="block md:hidden divide-y divide-gray-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedHubOrder(order)}
                    className="py-4 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex flex-col">
                        <span className="font-mono font-black text-brand-primary">#{order.id.slice(-6)}</span>
                        <span className="text-[9px] text-gray-400 font-mono mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      {order.isUrgent && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded animate-pulse">URGENT</span>
                      )}
                    </div>

                    <div className="flex items-start gap-3">
                      {((order.staffImages && order.staffImages[0]) || order.marketing_image || order.original_design_file) && (
                        <div 
                          onClick={(e) => {
                            const imgToView = order.original_design_file || order.staffImages?.[0] || order.marketing_image;
                            if (imgToView) {
                              e.stopPropagation();
                              setViewingImage(imgToView);
                            }
                          }}
                          className="w-12 h-12 rounded-xl border border-gray-150 overflow-hidden shrink-0 bg-gray-50 relative cursor-pointer"
                        >
                          <img src={order.original_design_file || order.staffImages?.[0] || order.marketing_image} className="w-full h-full object-cover" />
                          {order.original_design_file && (
                            <span className="absolute bottom-0 inset-x-0 bg-purple-600 text-[7px] font-black text-white text-center uppercase">Art</span>
                          )}
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="font-black text-gray-900 text-sm uppercase italic">{order.customerInfo?.name || ''}</div>
                        <a href={`tel:${order.customerInfo?.phone || ''}`} className="text-xs text-gray-500 font-semibold hover:text-brand-primary flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Phone size={10} className="text-brand-primary" /> {order.customerInfo?.phone || ''}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-black uppercase rounded">
                        {getDisplayCategory(order)}
                      </span>
                      <span className="text-xs font-bold text-gray-900">Qty: {order.quantity || 1}</span>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      {isReturnedFromDesign(order) ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status:</span>
                            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase w-fit tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                              ✓ Design Received
                            </span>
                          </div>
                          {order.assignedDesigner && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Designer:</span>
                              <span className="text-[10px] text-purple-700 font-bold">🎨 {order.assignedDesigner}</span>
                            </div>
                          )}
                          {order.designNotes && (
                            <div className="text-[9px] text-gray-600 bg-purple-50/70 p-2 rounded-xl border border-purple-150 italic">
                              Studio Note: "{order.designNotes}"
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setNoteModal({
                                  isOpen: true,
                                  orderId: order.id,
                                  target: 'accounts',
                                  noteText: ''
                                });
                              }}
                              className="py-2 bg-brand-primary text-white hover:opacity-90 rounded-xl font-black text-[9px] transition-all uppercase cursor-pointer border-none shadow-xs text-center"
                            >
                              💳 To Accounts
                            </button>
                            <button
                              onClick={() => {
                                setNoteModal({
                                  isOpen: true,
                                  orderId: order.id,
                                  target: 'design',
                                  noteText: ''
                                });
                              }}
                              className="py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-black text-[9px] border border-purple-200 transition-colors uppercase cursor-pointer text-center"
                            >
                              ✏️ Revise Art
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status:</span>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase w-fit tracking-wider ${getStatusStyles(order.status)}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Designer:</span>
                            {order.assignedDesigner && order.assignedDesigner !== 'Unassigned' && order.assignedDesigner !== 'Designer assigned' ? (
                              <span className="text-[10px] text-gray-700 font-bold flex items-center gap-1">
                                🎨 {order.assignedDesigner}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                🎨 Unassigned
                              </span>
                            )}
                          </div>

                          {order.status === OrderStatus.HOLD && order.holdReason && (
                            <div className="text-[9px] text-red-600 font-bold bg-red-50 p-2 rounded border border-red-200 italic">
                              Blocked Reason: {order.holdReason}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                            {order.status === OrderStatus.PENDING ? (
                              <>
                                <button
                                  onClick={() => {
                                    setNoteModal({
                                      isOpen: true,
                                      orderId: order.id,
                                      target: 'design',
                                      noteText: ''
                                    });
                                  }}
                                  className="py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-black text-[9px] border border-purple-200 transition-colors uppercase cursor-pointer"
                                >
                                  Designs
                                </button>
                                <button
                                  onClick={() => {
                                    setNoteModal({
                                      isOpen: true,
                                      orderId: order.id,
                                      target: 'accounts',
                                      noteText: ''
                                    });
                                  }}
                                  className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-black text-[9px] border border-amber-200 transition-colors uppercase cursor-pointer"
                                >
                                  Accounts
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setSelectedHubOrder(order)}
                                className="col-span-2 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-black text-xs transition-colors uppercase cursor-pointer border-none"
                              >
                                View & Edit
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400 italic">
                  No orders found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Stock Inventory view */}
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xs space-y-4">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Package size={14} className="text-brand-primary" />
              Stock Inventory
            </h4>
          </div>

          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {inventory && inventory.length > 0 ? (
              Object.values(inventory.reduce((acc: any, item) => {
                const key = `${item.product}-${item.productType}-${item.sleeve || 'none'}-${item.pocket || 'none'}`;
                if (!acc[key]) {
                  acc[key] = {
                    product: item.product,
                    productType: item.productType,
                    sleeve: item.sleeve,
                    pocket: item.pocket,
                    stock: 0,
                    lastDate: item.date
                  };
                }
                if (item.type === 'inward') acc[key].stock += item.quantity;
                else acc[key].stock -= item.quantity;
                return acc;
              }, {})).map((prod: any, idx) => (
                <div key={idx} className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between group hover:border-indigo-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-brand-primary transition-colors shrink-0">
                      <Package size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate text-xs">{prod.product}</p>
                      <p className="text-[9px] text-gray-500 font-black uppercase mt-0.5 flex flex-wrap gap-1 items-center">
                        <span>{prod.productType}</span>

                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-900">₹---</p>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-wider block mt-1",
                      prod.stock > 0 ? "text-green-700" : "text-red-600"
                    )}>
                      {prod.stock > 0 ? `In Stock (${prod.stock})` : `Out of Stock`}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-450 italic text-center py-6">No inventory records found.</p>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Graph Model */}
      <div className="pt-4">
        <OrdersChart orders={orders} />
      </div>

      {/* Forms and Creation Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">
                  {editingOrderId ? 'Modify Order Details' : 'Create Intake Order'}
                </h3>
                <label className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-xl cursor-pointer hover:bg-red-100/50 transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-red-300 text-red-650 focus:ring-red-500"
                    checked={formData.isUrgent}
                    onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                  />
                  <span className="text-[9px] font-black text-red-750 uppercase tracking-widest">Mark as Urgent</span>
                </label>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 border-none bg-transparent cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-8 text-left">
              <section className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                  <User size={16} className="text-brand-primary" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Customer Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none"
                      placeholder="Full name"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Phone Number</label>
                    <input
                      required
                      type="tel"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none"
                      placeholder="+91"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Shipping Address</label>
                  <textarea
                    required
                    rows={2}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none resize-none"
                    placeholder="Full shipping details"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                  <Package size={16} className="text-brand-primary" />
                  Item Breakdown
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sizing & Specification Bench</span>
                    <button
                      type="button"
                      onClick={addSizeQuantity}
                      className="text-[9px] font-black bg-brand-primary text-white px-3.5 py-1.5 rounded-lg hover:opacity-90 transition-all uppercase tracking-wider border-none cursor-pointerflex items-center gap-1"
                    >
                      <Plus size={12} /> Add Row
                    </button>
                  </div>

                  {formData.sizeBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      {formData.sizeBreakdown.map((item, idx) => (
                        <div key={idx} className="p-3 sm:p-4 bg-gray-50/60 rounded-xl sm:rounded-2xl border border-gray-100 shadow-xs relative group flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={() => removeSizeQuantity(idx)}
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors bg-white rounded border border-gray-100 cursor-pointer"
                          >
                            <X size={12} />
                          </button>

                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 items-end">
                            <div className="col-span-2 sm:col-span-1">
                              <Select
                                label="Category"
                                value={item.category}
                                options={CATEGORIES}
                                onChange={(v) => {
                                  updateSizeQuantity(idx, 'category', v);
                                  updateSizeQuantity(idx, 'material', '');
                                  updateSizeQuantity(idx, 'model', '');
                                  updateSizeQuantity(idx, 'colour', '');
                                }}
                              />
                            </div>
                            <div>
                              <Select
                                label="Size"
                                value={item.size}
                                options={SIZE_OPTIONS}
                                onChange={(v) => updateSizeQuantity(idx, 'size', v)}
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] sm:text-[10px] font-black text-gray-400 sm:text-gray-500 uppercase mb-0.5 sm:mb-1">Qty</label>
                              <select
                                value={item.quantity}
                                onChange={(e) => updateSizeQuantity(idx, 'quantity', parseInt(e.target.value))}
                                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-xl sm:rounded-2xl text-xs text-gray-800 focus:border-brand-primary outline-none"
                              >
                                {Array.from({ length: 1500 }, (_, i) => i + 1).map(n => (
                                  <option key={n} value={n} className="bg-white">{n}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[8px] sm:text-[10px] font-black text-gray-400 sm:text-gray-500 uppercase mb-0.5 sm:mb-1">Price (₹)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={item.price || ''}
                                onChange={(e) => updateSizeQuantity(idx, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-xl sm:rounded-2xl text-xs text-gray-800 focus:border-brand-primary outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                            {getMaterialsForCategory(item.category).length > 0 && (
                              <div>
                                <Select
                                  label="Material"
                                  value={item.material || ''}
                                  options={getMaterialsForCategory(item.category)}
                                  onChange={(v) => {
                                    updateSizeQuantity(idx, 'material', v);
                                    if (item.category === 'T-Shirt') updateSizeQuantity(idx, 'colour', '');
                                  }}
                                />
                              </div>
                            )}
                            {getModelsForCategory(item.category).length > 0 && (
                              <div>
                                <Select
                                  label="Model"
                                  value={item.model || ''}
                                  options={getModelsForCategory(item.category)}
                                  onChange={(v) => updateSizeQuantity(idx, 'model', v)}
                                />
                              </div>
                            )}
                            <div>
                              {getColoursForCategory(item.category, item.material).length > 0 ? (
                                <Select
                                  label="Colour"
                                  value={item.colour || ''}
                                  options={getColoursForCategory(item.category, item.material)}
                                  onChange={(v) => updateSizeQuantity(idx, 'colour', v)}
                                />
                              ) : (
                                <div>
                                  <label className="block text-[8px] sm:text-[10px] font-black text-gray-400 sm:text-gray-500 uppercase mb-0.5 sm:mb-1">Colour</label>
                                  <input
                                    type="text"
                                    placeholder="White"
                                    value={item.colour || ''}
                                    onChange={(e) => updateSizeQuantity(idx, 'colour', e.target.value)}
                                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-xl sm:rounded-2xl text-xs text-gray-800 focus:border-brand-primary outline-none"
                                  />
                                </div>
                              )}
                            </div>
                            <div>
                              <Select
                                label="Print"
                                value={item.printType || ''}
                                options={PRINT_TYPES}
                                onChange={(v) => updateSizeQuantity(idx, 'printType', v)}
                              />
                            </div>

                          </div>
                          
                          <div className="text-right border-t border-gray-100 pt-2 text-[10px] text-brand-primary font-black italic">
                            Line Total: ₹{(item.quantity * (item.price || 0)).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={addSizeQuantity}
                      className="p-8 border-2 border-dashed border-gray-250 rounded-2xl text-center cursor-pointer hover:bg-gray-50/50 transition-all text-xs text-gray-400"
                    >
                      No active items. Click to add a size breakdown row.
                    </div>
                  )}

                  <div className="flex gap-3 justify-end items-center bg-gray-50/60 p-3 rounded-2xl border border-gray-150">
                    <span className="text-[10px] font-black text-gray-400 uppercase">Aggregate Sum:</span>
                    <span className="text-base font-black text-gray-900">
                      {formData.sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)} units
                    </span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-150">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Total Amount (₹)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none"
                      placeholder="0.00"
                      value={formData.totalAmount || ''}
                      onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Advance Payment (₹)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none"
                      placeholder="0.00"
                      value={formData.advancePay || ''}
                      onChange={(e) => setFormData({ ...formData, advancePay: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 opacity-60">Balance Collected (₹)</label>
                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl text-xs text-brand-primary font-black">
                      ₹{(formData.totalAmount - formData.advancePay).toLocaleString()}
                    </div>
                  </div>
                </div>
              </section>

              {/* Instructions and notes */}
              <section className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-wider border-b border-gray-150 pb-2">
                  📋 Client Specs & Notes
                </h4>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none resize-none"
                  placeholder="Provide client logo dimensions, embroidery directions, layout specs, or details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </section>

              {/* File Uploads */}
              <section className="border-t border-gray-150 pt-6">
                <div className="space-y-3">
                  <FileUpload
                    label="Reference Blueprints (Images)"
                    accept="image/*"
                    maxFiles={10}
                    initialFiles={formData.imageAttachments}
                    onFilesSelected={(files) => setFormData({ ...formData, imageAttachments: files })}
                  />
                </div>
              </section>

              {/* Action Buttons */}
              <div className="pt-6 flex gap-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 px-6 py-4 bg-brand-primary text-white rounded-xl font-black text-xs uppercase shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  {isProcessing ? "Submitting..." : "Submit Order Details"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Global detailed view modal */}
      {selectedHubOrder && (
        <OrderDetailModal
          order={selectedHubOrder}
          onClose={() => setSelectedHubOrder(null)}
          isAdmin={isAdmin}
          onUpdateOrder={onUpdateOrder}
          onEdit={(ord) => {
            setSelectedHubOrder(null);
            startEdit(ord);
          }}
        />
      )}

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between text-left">
              <h3 className="text-base font-black text-gray-900 uppercase italic tracking-tight">
                {noteModal.target === 'design' ? 'Send to Designs Studio' : 'Send to Billing Desk'}
              </h3>
              <button
                onClick={() => setNoteModal(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Required Instructions
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs text-gray-800 outline-none focus:border-brand-primary resize-none"
                  rows={4}
                  placeholder={
                    noteModal.target === 'design' 
                      ? "Describe vector specs, materials and details..." 
                      : "Describe payment status, invoices or discount codes..."
                  }
                  value={noteModal.noteText}
                  onChange={(e) => setNoteModal({ ...noteModal, noteText: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setNoteModal(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-[10px] uppercase border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!noteModal.noteText.trim() || isProcessing}
                  onClick={async () => {
                    if (!noteModal.noteText.trim()) return;
                    setIsProcessing(true);
                    try {
                      const updates: Partial<Order> = {
                        status: noteModal.target === 'design' ? OrderStatus.DESIGN : OrderStatus.ACCOUNTS,
                        updatedAt: Date.now()
                      };
                      if (noteModal.target === 'design') {
                        updates.notes = noteModal.noteText.trim();
                        updates.designNotes = noteModal.noteText.trim();
                        updates.assignedDesigner = 'Unassigned';
                        updates.claimedBy = undefined;
                        updates.claimedByName = undefined;
                        updates.designSentToMarketing = false;
                        updates.designCompleted = false;
                      } else {
                        updates.accountsNotes = noteModal.noteText.trim();
                      }
                      await onUpdateOrder(noteModal.orderId, updates);
                      alert(`Order #${noteModal.orderId.slice(-6)} forwarded to ${noteModal.target === 'design' ? 'Designs Queue' : 'Accounts Queue'}!`);
                      setNoteModal(null);
                    } catch (err) {
                      alert("Action failed.");
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  className="flex-1 py-3 bg-brand-primary hover:opacity-90 text-white disabled:opacity-50 rounded-xl font-black text-[10px] uppercase border-none cursor-pointer text-center"
                >
                  Confirm Forward
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLeadModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setIsLeadModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-655 rounded-full hover:bg-gray-100 transition-colors z-10 border-none bg-transparent cursor-pointer"
            >
              <X size={20} />
            </button>
            {leadManagerComponent}
          </div>
        </div>
      )}
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div className="space-y-1 sm:space-y-1.5 text-left">
      <label className="block text-[8px] sm:text-[10px] font-black text-gray-400 sm:text-gray-500 uppercase tracking-widest">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl sm:rounded-2xl px-2.5 sm:px-4 py-1.5 sm:py-2.5 text-xs text-gray-800 focus:border-brand-primary outline-none"
      >
        <option value="" disabled className="bg-white text-gray-400">Select {label}</option>
        {options.map(opt => <option key={opt} value={opt} className="bg-white text-gray-800">{opt}</option>)}
      </select>
    </div>
  );
}

const getStatusStyles = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.DRAFT: return 'bg-gray-100 text-gray-500 border border-gray-200';
    case OrderStatus.ACCOUNTS: return 'bg-amber-50 text-amber-700 border border-amber-200';
    case OrderStatus.DESIGN: return 'bg-purple-50 text-purple-700 border border-purple-200';
    case OrderStatus.ORDER_MANAGEMENT: return 'bg-blue-50 text-blue-700 border border-blue-200';
    case OrderStatus.PRODUCTION: return 'bg-purple-50 text-purple-700 border border-purple-200';
    case OrderStatus.DELIVERY: return 'bg-orange-50 text-orange-700 border border-orange-200';
    case OrderStatus.DELIVERED: return 'bg-green-50 text-green-700 border border-green-200';
    case OrderStatus.HOLD: return 'bg-red-50 text-red-750 border border-red-200';
    default: return 'bg-gray-100 text-gray-500';
  }
};
