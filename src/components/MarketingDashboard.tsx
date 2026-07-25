/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, ChevronRight, FileText, User, Phone, MapPin, X, ZoomIn, Copy, Share2, Globe, Trash2, Package, AlertCircle, Activity, TrendingUp, Mic, Send, MessageSquare, Paperclip, Clock, Compass, Sparkles, Wand2, ArrowRight } from 'lucide-react';
import { Order, OrderStatus, SizeBreakdown, UserRole } from '../types';
import { mockDataService } from '../service/mockDataService';
import OrderDetailModal from './OrderDetailModal';
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

  const [selectedSection, setSelectedSection] = useState<'recent' | 'process' | 'hold' | 'completed'>('recent');

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    const totalQuantity = formData.sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0) || 1;
    const existingOrder = editingOrderId ? orders.find(o => o.id === editingOrderId) : null;
    const finalOrderData = {
      status: existingOrder ? existingOrder.status : OrderStatus.PENDING,
      category: formData.category,
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
          createdAt: Date.now(),
        });
        alert("Success: Order created successfully.");
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
      imageAttachments: order.staffImages || [],
      pdfAttachments: order.staffPdfs || [],
      sizeBreakdown: order.sizeBreakdown || [],
      totalAmount: order.financials?.totalAmount || 0,
      advancePay: order.financials?.advancePay || 0,
      notes: order.notes || order.designNotes || '',
      isUrgent: order.isUrgent || false
    });
    setIsCreating(true);
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = (o.customerInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || o.id.includes(searchTerm);
    if (!matchesSearch) return false;

    if (selectedSection === 'hold') {
      return o.status === OrderStatus.HOLD;
    }
    if (selectedSection === 'completed') {
      return o.status === OrderStatus.DELIVERED;
    }
    if (selectedSection === 'process') {
      return o.status !== OrderStatus.DELIVERED && 
             o.status !== OrderStatus.HOLD && 
             o.status !== OrderStatus.PENDING && 
             o.status !== OrderStatus.DRAFT;
    }
    return o.status === OrderStatus.PENDING || o.status === OrderStatus.DRAFT;
  });

  const recentOrdersCount = orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.DRAFT).length;
  const processOrdersCount = orders.filter(o => 
    o.status !== OrderStatus.DELIVERED && 
    o.status !== OrderStatus.HOLD && 
    o.status !== OrderStatus.PENDING && 
    o.status !== OrderStatus.DRAFT
  ).length;
  const holdOrdersCount = orders.filter(o => o.status === OrderStatus.HOLD).length;
  const completedOrdersCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;

  return (
    <div className="bg-[#0B0F19] text-slate-100 p-6 rounded-[2.5rem] border border-slate-900 shadow-2xl space-y-8 animate-in fade-in duration-300">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.25em] block mb-1">Pallywear CRM Portal</span>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Marketing & Accounts Overview</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
            className="flex items-center justify-center gap-2 bg-indigo-650 text-white px-5 py-2.5 rounded-xl font-black hover:bg-indigo-600 transition-all shadow-lg active:scale-95 text-xs uppercase cursor-pointer border-none"
          >
            <Plus size={16} />
            <span>Create Order</span>
          </button>
          <button
            onClick={() => setIsLeadModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 text-slate-300 px-5 py-2.5 rounded-xl font-black hover:border-indigo-500/20 transition-all shadow-xs active:scale-95 text-xs uppercase cursor-pointer"
          >
            <User size={16} />
            <span>Create Lead</span>
          </button>
        </div>
      </div>

      <ConversationDashboard
        isOpen={isDesignSidebarOpen}
        onClose={() => setIsDesignSidebarOpen(false)}
        currentUser={user || { name: 'Marketing Desk', role: 'Marketing' }}
        orders={orders}
        onUpdateOrder={onUpdateOrder}
        onCreateOrder={onCreateOrder}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Marketing Spend */}
        <div className="bg-[#131B2E]/70 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Marketing Spend</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shadow-inner">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight text-white">$21.8K</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +12%
            </span>
          </div>
        </div>

        {/* CAC */}
        <div className="bg-[#131B2E]/70 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer Acquisition Cost (CAC)</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-inner">
              <Compass size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight text-white">$4.43</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              -8.2%
            </span>
          </div>
        </div>

        {/* ROAS */}
        <div className="bg-[#131B2E]/70 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Return on Ad Spend (ROAS)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-inner">
              <Activity size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight text-white">6.54</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +4.1%
            </span>
          </div>
        </div>

        {/* Operational Expenses */}
        <div className="bg-[#131B2E]/70 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operational Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shadow-inner">
              <Globe size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight text-white">$42.5K</span>
          </div>
        </div>
      </div>

      {/* Middle Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign ROI Line Chart */}
        <div className="lg:col-span-2 bg-[#131B2E]/50 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Campaign ROI vs. Budget</h4>
            <span className="text-[9px] font-bold text-slate-400 bg-[#0B0F19] px-2.5 py-1 rounded-xl">Last 30 Days</span>
          </div>
          <div className="relative pt-4">
            <svg className="w-full h-40" viewBox="0 0 500 150">
              <defs>
                <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="30" x2="500" y2="30" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#1e293b" strokeDasharray="3 3" />
              
              <path d="M 0 110 Q 90 140 160 50 T 320 80 T 440 25 T 500 35 L 500 150 L 0 150 Z" fill="url(#roiGrad)" />
              <path d="M 0 110 Q 90 140 160 50 T 320 80 T 440 25 T 500 35" fill="none" stroke="#6366F1" strokeWidth="3" />
              <circle cx="160" cy="50" r="4" fill="#6366F1" stroke="#fff" strokeWidth="2" />
              <circle cx="320" cy="80" r="4" fill="#6366F1" stroke="#fff" strokeWidth="2" />
              <circle cx="440" cy="25" r="4" fill="#6366F1" stroke="#fff" strokeWidth="2" />
            </svg>
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pt-2 px-1">
              <span>Jan 6</span>
              <span>Jan 12</span>
              <span>Jan 18</span>
              <span>Jan 24</span>
              <span>Jan 30</span>
            </div>
          </div>
        </div>

        {/* Customer Segments Donut Chart */}
        <div className="bg-[#131B2E]/50 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between">
          <div className="border-b border-slate-900 pb-3">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Customer Segments</h4>
          </div>
          
          <div className="relative w-32 h-32 mx-auto flex items-center justify-center my-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#1e293b" strokeWidth="8" fill="transparent" />
              <circle cx="50" cy="50" r="40" stroke="#3b82f6" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset="80" />
              
              <circle cx="50" cy="50" r="31" stroke="#1e293b" strokeWidth="6" fill="transparent" />
              <circle cx="50" cy="50" r="31" stroke="#10b981" strokeWidth="6" fill="transparent" strokeDasharray="194.7" strokeDashoffset="55" />
              
              <circle cx="50" cy="50" r="22" stroke="#1e293b" strokeWidth="4" fill="transparent" />
              <circle cx="50" cy="50" r="22" stroke="#f59e0b" strokeWidth="4" fill="transparent" strokeDasharray="138.2" strokeDashoffset="45" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-base font-black text-white">Groups</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Metrics</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 text-[9px] font-black uppercase text-slate-400 tracking-wider">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Direct
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Referral
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> VIP
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-2 p-1 bg-slate-950/60 border border-slate-900 rounded-2xl w-fit">
        <button
          onClick={() => setSelectedSection('recent')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer",
            selectedSection === 'recent' ? "bg-indigo-650 text-white shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          Recent ({recentOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('process')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer",
            selectedSection === 'process' ? "bg-indigo-650 text-white shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          Processing ({processOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('hold')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer",
            selectedSection === 'hold' ? "bg-indigo-650 text-white shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          On Hold ({holdOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('completed')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer",
            selectedSection === 'completed' ? "bg-indigo-650 text-white shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          Done ({completedOrdersCount})
        </button>
      </div>

      {/* Primary Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Order intake lists */}
        <div className="lg:col-span-2 bg-[#131B2E]/50 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-900 pb-3">
            <Search className="text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search customer or order ID..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-slate-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <table className="hidden md:table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 uppercase font-black text-[9px] tracking-wider border-b border-slate-800">
                  <th className="pb-3 px-3">Order ID</th>
                  <th className="pb-3 px-3">Customer</th>
                  <th className="pb-3 px-3">Category</th>
                  <th className="pb-3 px-3">Qty</th>
                  <th className="pb-3 px-3">Pipeline Status</th>
                  <th className="pb-3 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(order => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedHubOrder(order)}
                      className="hover:bg-[#1E294B]/20 transition-all cursor-pointer"
                    >
                      <td className="py-4 px-3 font-mono text-[10px] text-slate-400">
                        <div className="flex items-center gap-2">
                          #{order.id.slice(-6)}
                          {order.isUrgent && (
                            <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">URGENT</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="font-bold text-white uppercase italic">{order.customerInfo?.name || ''}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{order.customerInfo?.phone || ''}</div>
                      </td>
                      <td className="py-4 px-3">
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase rounded">
                          {getDisplayCategory(order)}
                        </span>
                      </td>
                      <td className="py-4 px-3 font-bold text-white text-xs">{order.quantity || 1}</td>
                      <td className="py-4 px-3">
                        <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase w-fit tracking-wider ${getStatusStyles(order.status)}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                          {order.status === OrderStatus.PENDING && (
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
                                className="text-[9px] font-black text-purple-400 hover:text-white bg-purple-950/20 hover:bg-purple-600 border border-purple-900/40 rounded px-2 py-0.5 transition-all cursor-pointer uppercase tracking-wider"
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
                                className="text-[9px] font-black text-amber-400 hover:text-white bg-amber-950/20 hover:bg-amber-600 border border-amber-900/40 rounded px-2 py-0.5 transition-all cursor-pointer uppercase tracking-wider"
                              >
                                Accounts
                              </button>
                            </div>
                          )}
                        </div>
                        {order.status === OrderStatus.HOLD && order.holdReason && (
                          <div className="text-[8px] text-red-400 mt-1 font-bold italic truncate max-w-[80px]" title={order.holdReason}>
                            {order.holdReason}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-3 text-right">
                        <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[9px] font-mono text-slate-400 mr-1">{new Date(order.createdAt).toLocaleDateString()}</span>
                          <button
                            onClick={() => startEdit(order)}
                            className="px-2.5 py-1.5 bg-slate-800 text-slate-350 hover:bg-slate-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border-none"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No orders found in this section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Mobile View */}
            <div className="block md:hidden divide-y divide-slate-850">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedHubOrder(order)}
                    className="py-4 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex flex-col">
                        <span className="font-mono font-black text-indigo-400">#{order.id.slice(-6)}</span>
                        <span className="text-[9px] text-slate-400 font-mono mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      {order.isUrgent && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded animate-pulse">URGENT</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="font-black text-white text-sm uppercase italic">{order.customerInfo?.name || ''}</div>
                      <a href={`tel:${order.customerInfo?.phone || ''}`} className="text-xs text-slate-400 font-semibold hover:text-indigo-400 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Phone size={10} className="text-indigo-400" /> {order.customerInfo?.phone || ''}
                      </a>
                    </div>

                    <div className="flex items-center justify-between bg-slate-900/40 p-2.5 rounded-xl border border-slate-850">
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[8px] font-black uppercase rounded">
                        {getDisplayCategory(order)}
                      </span>
                      <span className="text-xs font-bold text-white">Qty: {order.quantity || 1}</span>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase w-fit tracking-wider ${getStatusStyles(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>

                      {order.status === OrderStatus.HOLD && order.holdReason && (
                        <div className="text-[9px] text-red-400 font-bold bg-red-950/20 p-2 rounded border border-red-900/20 italic">
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
                              className="py-2 bg-purple-950/20 hover:bg-purple-900/40 text-purple-400 rounded-xl font-black text-[9px] border border-purple-900/40 transition-colors uppercase cursor-pointer"
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
                              className="py-2 bg-amber-950/20 hover:bg-amber-900/40 text-amber-400 rounded-xl font-black text-[9px] border border-amber-900/40 transition-colors uppercase cursor-pointer"
                            >
                              Accounts
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(order)}
                            className="col-span-2 py-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl font-black text-xs transition-colors uppercase cursor-pointer border-none"
                          >
                            Edit Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 italic">
                  No orders found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Stock Inventory view */}
        <div className="bg-[#131B2E]/50 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Package size={14} className="text-indigo-400" />
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
                <div key={idx} className="p-3.5 bg-slate-950/40 border border-slate-900 rounded-2xl flex items-center justify-between group hover:border-slate-750 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0">
                      <Package size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate text-xs">{prod.product}</p>
                      <p className="text-[9px] text-slate-400 font-black uppercase mt-0.5 flex flex-wrap gap-1 items-center">
                        <span>{prod.productType}</span>
                        {prod.sleeve && <span className="bg-slate-800 px-1 rounded text-[8px]">{prod.sleeve}</span>}
                        {prod.pocket && <span className="bg-slate-800 px-1 rounded text-[8px]">{prod.pocket}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-white">₹---</p>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-wider block mt-1",
                      prod.stock > 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {prod.stock > 0 ? `In Stock (${prod.stock})` : `Out of Stock`}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">No inventory records found.</p>
            )}
          </div>
        </div>
      </div>

      {/* Forms and Creation Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#131B2E] border border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-[#131B2E] px-8 py-6 border-b border-slate-900 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
                  {editingOrderId ? 'Modify Order Details' : 'Create Intake Order'}
                </h3>
                <label className="flex items-center gap-2 px-3 py-1 bg-red-950/20 border border-red-900/40 rounded-xl cursor-pointer hover:bg-red-900/30 transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-red-800 text-red-600 focus:ring-red-500"
                    checked={formData.isUrgent}
                    onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                  />
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Mark as Urgent</span>
                </label>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 border-none bg-transparent cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8 text-left">
              <section className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-black text-white uppercase tracking-wider border-b border-slate-900 pb-2">
                  <User size={16} className="text-indigo-400" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-450 uppercase mb-1.5">Customer Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none"
                      placeholder="Full name"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-450 uppercase mb-1.5">Phone Number</label>
                    <input
                      required
                      type="tel"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none"
                      placeholder="+91"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-450 uppercase mb-1.5">Shipping Address</label>
                  <textarea
                    required
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none resize-none"
                    placeholder="Full shipping details"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-black text-white uppercase tracking-wider border-b border-slate-900 pb-2">
                  <Package size={16} className="text-indigo-400" />
                  Item Breakdown
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sizing & Specification Bench</span>
                    <button
                      type="button"
                      onClick={addSizeQuantity}
                      className="text-[9px] font-black bg-indigo-650 text-white px-3.5 py-1.5 rounded-lg hover:bg-indigo-600 transition-all uppercase tracking-wider border-none cursor-pointer"
                    >
                      <Plus size={12} /> Add Row
                    </button>
                  </div>

                  {formData.sizeBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      {formData.sizeBreakdown.map((item, idx) => (
                        <div key={idx} className="p-4 bg-slate-950/40 rounded-2xl border border-slate-900 shadow-xl relative group flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={() => removeSizeQuantity(idx)}
                            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 transition-colors bg-slate-900 rounded border-none cursor-pointer"
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
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Qty</label>
                              <select
                                value={item.quantity}
                                onChange={(e) => updateSizeQuantity(idx, 'quantity', parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white focus:border-indigo-500 outline-none"
                              >
                                {Array.from({ length: 1500 }, (_, i) => i + 1).map(n => (
                                  <option key={n} value={n} className="bg-slate-950">{n}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Price (₹)</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={item.price || ''}
                                onChange={(e) => updateSizeQuantity(idx, 'price', parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white focus:border-indigo-500 outline-none"
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
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Colour</label>
                                  <input
                                    type="text"
                                    placeholder="White"
                                    value={item.colour || ''}
                                    onChange={(e) => updateSizeQuantity(idx, 'colour', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white focus:border-indigo-500 outline-none"
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
                            {getSleevesForCategory(item.category).length > 0 && (
                              <div>
                                <Select
                                  label="Sleeve"
                                  value={item.sleeve || ''}
                                  options={getSleevesForCategory(item.category)}
                                  onChange={(v) => updateSizeQuantity(idx, 'sleeve', v)}
                                />
                              </div>
                            )}
                            {getPocketsForCategory(item.category).length > 0 && (
                              <div>
                                <Select
                                  label="Pocket"
                                  value={item.pocket || ''}
                                  options={getPocketsForCategory(item.category)}
                                  onChange={(v) => updateSizeQuantity(idx, 'pocket', v)}
                                />
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right border-t border-slate-900 pt-2 text-[10px] text-indigo-400 font-black italic">
                            Line Total: ₹{(item.quantity * (item.price || 0)).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={addSizeQuantity}
                      className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center cursor-pointer hover:bg-slate-900/30 transition-all text-xs text-slate-400"
                    >
                      No active items. Click to add a size breakdown row.
                    </div>
                  )}

                  <div className="flex gap-3 justify-end items-center bg-slate-900/60 p-3 rounded-2xl border border-slate-850">
                    <span className="text-[10px] font-black text-slate-450 uppercase">Aggregate Sum:</span>
                    <span className="text-base font-black text-white">
                      {formData.sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)} units
                    </span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-900">
                  <div>
                    <label className="block text-[10px] font-black text-slate-450 uppercase mb-1.5">Total Amount (₹)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none"
                      placeholder="0.00"
                      value={formData.totalAmount || ''}
                      onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-450 uppercase mb-1.5">Advance Payment (₹)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none"
                      placeholder="0.00"
                      value={formData.advancePay || ''}
                      onChange={(e) => setFormData({ ...formData, advancePay: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 opacity-60">Balance Collected (₹)</label>
                    <div className="w-full px-4 py-3 bg-slate-950 border border-slate-900 rounded-xl text-xs text-indigo-400 font-black">
                      ₹{(formData.totalAmount - formData.advancePay).toLocaleString()}
                    </div>
                  </div>
                </div>
              </section>

              {/* Instructions and notes */}
              <section className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-black text-white uppercase tracking-wider border-b border-slate-900 pb-2">
                  📋 Client Specs & Notes
                </h4>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:border-indigo-500 outline-none resize-none"
                  placeholder="Provide client logo dimensions, embroidery directions, layout specs, or details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </section>

              {/* File Uploads */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-900 pt-6">
                <div className="space-y-3">
                  <FileUpload
                    label="Reference Blueprints (Images)"
                    accept="image/*"
                    onFilesSelected={(files) => setFormData({ ...formData, imageAttachments: files })}
                  />
                  {formData.imageAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.imageAttachments.map((file, idx) => (
                        <div
                          key={idx}
                          onClick={() => setViewingImage(file)}
                          className="w-12 h-12 rounded-xl border border-slate-800 overflow-hidden cursor-pointer hover:border-slate-500 transition-all flex items-center justify-center bg-slate-900 group relative"
                        >
                          <img src={file} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn size={10} className="text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <FileUpload
                    label="Reference PDFs"
                    accept=".pdf"
                    onFilesSelected={(files) => setFormData({ ...formData, pdfAttachments: files })}
                  />
                  {formData.pdfAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.pdfAttachments.map((file, idx) => (
                        <div
                          key={idx}
                          onClick={() => setViewingImage(file)}
                          className="w-12 h-12 rounded-xl border border-slate-800 overflow-hidden cursor-pointer hover:border-slate-500 transition-all flex items-center justify-center bg-slate-900 group relative"
                        >
                          <FileText size={16} className="text-slate-500" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn size={10} className="text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Action Buttons */}
              <div className="pt-6 flex gap-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-xs uppercase border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 px-6 py-4 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl font-black text-xs uppercase shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 border-none cursor-pointer flex items-center justify-center gap-2"
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
          <div className="bg-[#131B2E] border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-900 flex items-center justify-between text-left">
              <h3 className="text-base font-black text-white uppercase italic tracking-tight">
                {noteModal.target === 'design' ? 'Send to Designs Studio' : 'Send to Billing Desk'}
              </h3>
              <button
                onClick={() => setNoteModal(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Required Instructions
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white outline-none focus:border-indigo-500 resize-none"
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
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-xl font-black text-[10px] uppercase border-none cursor-pointer"
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
                      } else {
                        updates.accountsNotes = noteModal.noteText.trim();
                      }
                      await onUpdateOrder(noteModal.orderId, updates);
                      alert("Order successfully forwarded!");
                      setNoteModal(null);
                    } catch (err) {
                      alert("Action failed.");
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  className="flex-1 py-3 bg-indigo-650 hover:bg-indigo-600 text-white disabled:opacity-50 rounded-xl font-black text-[10px] uppercase border-none cursor-pointer text-center"
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
          <div className="bg-[#131B2E] border border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setIsLeadModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors z-10 border-none bg-transparent cursor-pointer"
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
    <div className="space-y-1.5 text-left">
      <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 outline-none"
      >
        <option value="" disabled className="bg-slate-950 text-slate-500">Select {label}</option>
        {options.map(opt => <option key={opt} value={opt} className="bg-slate-950 text-white">{opt}</option>)}
      </select>
    </div>
  );
}

const getStatusStyles = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.DRAFT: return 'bg-slate-800 text-slate-400 border border-slate-700';
    case OrderStatus.ACCOUNTS: return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case OrderStatus.DESIGN: return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case OrderStatus.ORDER_MANAGEMENT: return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    case OrderStatus.PRODUCTION: return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
    case OrderStatus.DELIVERY: return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
    case OrderStatus.DELIVERED: return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case OrderStatus.HOLD: return 'bg-red-500/10 text-red-400 border border-red-500/20';
    default: return 'bg-slate-800 text-slate-400';
  }
};
