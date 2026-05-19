/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Plus, Search, ChevronRight, FileText, User, Phone, MapPin, X, ZoomIn, Copy, Share2, Globe, Trash2, Package } from 'lucide-react';
import { Order, OrderStatus, SizeBreakdown } from '../types';
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
import { cn, getDisplayCategory } from '../lib/utils';

interface StaffDashboardProps {
  orders: Order[];
  inventory?: any[];
  onCreateOrder: (order: Partial<Order>) => Promise<void>;
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
}

export default function StaffDashboard({ orders, inventory = [], onCreateOrder, onUpdateOrder, onDeleteOrder, isAdmin }: StaffDashboardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [activeShareMenu, setActiveShareMenu] = useState<string | null>(null);
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
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
    isUrgent: false
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    // Check size
    const totalSize = (formData.imageAttachments.reduce((s, f) => s + f.length, 0)) + (formData.pdfAttachments.reduce((s, f) => s + f.length, 0));
    if (totalSize > 800000) {
      alert("Warning: Attachments too large (Max ~800KB total). Please remove some files or use lower resolution images.");
      return;
    }

    setIsProcessing(true);

    try {
      const totalQuantity = formData.sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0) || 1;

      await onCreateOrder({
        status: OrderStatus.ACCOUNTS,
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
        financials: {
          totalAmount: formData.totalAmount,
          advancePay: formData.advancePay,
          balanceAmount: formData.totalAmount - formData.advancePay
        },
        staffImages: formData.imageAttachments,
        staffPdfs: formData.pdfAttachments,
        staffAttachments: [...formData.imageAttachments, ...formData.pdfAttachments], // Legacy
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setIsCreating(false);
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
        isUrgent: false
      });
      alert("Success: Order created and moved to Accounts Team.");
    } catch (error: any) {
      console.error("Order submission failed:", error);
      if (error?.message?.includes("ORDER_TOO_LARGE")) {
        alert("Failed to create: Attachments are too large for Cloud Sync (Max 1MB total). Please use fewer or smaller files.");
      } else {
        alert("Failed to submit order. Please check your data.");
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
          // Normalizing material name for map lookup
          const key = Object.keys(TSHIRT_COLOURS_MAP).find(k => k.toLowerCase() === material.toLowerCase());
          return key ? TSHIRT_COLOURS_MAP[key] : (TSHIRT_COLOURS_MAP['Comfort'] || []);
        }
        return [];
      case 'Oversized': return OVERSIZED_COLOURS;
      default: return [];
    }
  };

  const removeSizeQuantity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sizeBreakdown: prev.sizeBreakdown.filter((_, i) => i !== index)
    }));
  };

  const handleDuplicate = (order: Order) => {
    const { id, createdAt, updatedAt, ...rest } = order;
    onCreateOrder({
      ...rest,
      status: OrderStatus.ACCOUNTS, // New copies start at accounts
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  const filteredOrders = orders.filter(o =>
    o.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Staff Dashboard</h2>
          <p className="text-gray-500 mt-1">Create and manage order intake</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-95"
        >
          <Plus size={20} />
          <span>New Order</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Search className="text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search customer or order ID..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 placeholder:text-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Qty</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        #{order.id.slice(-6)}
                        {order.isUrgent && (
                          <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded animate-pulse">URGENT</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{order.customerInfo.name}</div>
                      <div className="text-xs text-gray-500">{order.customerInfo.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[8px] font-black uppercase tracking-tighter">
                        {getDisplayCategory(order)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-900">{order.quantity || 1}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getStatusStyles(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      {order.status === OrderStatus.HOLD && order.holdReason && (
                        <div className="text-[8px] text-red-500 mt-1 font-bold italic truncate max-w-[80px]" title={order.holdReason}>
                          {order.holdReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] tabular-nums">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Order Status Section */}
      <div className="pt-8 border-t border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <Globe className="text-brand-primary" size={24} />
          Global Order Status Hub
        </h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[300px] mb-12">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 italic">
              <tr className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                <th className="px-6 py-4 text-nowrap">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Last Update</th>
                {isAdmin && <th className="px-6 py-4 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.length > 0 ? (
                orders.map(order => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedHubOrder(order)}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        #{order.id.slice(-8)}
                        {order.isUrgent && (
                          <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded">URGENT</span>
                        )}
                        <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-primary" />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{order.customerInfo.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-[8px] font-black text-gray-500 uppercase tracking-tighter">
                        {getDisplayCategory(order)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyles(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      {order.status === OrderStatus.HOLD && order.holdReason && (
                        <div className="text-[9px] text-red-500 mt-1 font-bold italic truncate max-w-[120px] mx-auto" title={order.holdReason}>
                          {order.holdReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-400">
                      {new Date(order.updatedAt).toLocaleString()}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this order? This cannot be undone.')) {
                              onDeleteOrder?.(order.id);
                            }
                          }}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors relative z-10"
                          title="Delete Order (Admin Only)"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-gray-400 italic">No global orders available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Inventory Summary Section - View Only for Staff */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="text-brand-primary" size={24} />
              Stock Inventory (View Only)
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Product Name..."
                    className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-black outline-none w-64"
                  />
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 transition-colors uppercase">Search</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-12">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#f9f9f9] border-b border-gray-100">
                  <tr className="text-gray-500 font-bold text-[11px] uppercase tracking-wider">
                    <th className="px-6 py-4">Image</th>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Available Product Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {inventory && inventory.length > 0 ? (
                    // Aggregate inventory for product-wise view
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
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 group-hover:border-blue-200 transition-colors">
                            <Package size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-blue-600 hover:underline cursor-pointer">{prod.product}</div>
                          <div className="text-[10px] text-gray-400 font-medium uppercase flex items-center gap-1">
                            {prod.productType}
                            {prod.sleeve && <span className="bg-gray-100 px-1 rounded">{prod.sleeve}</span>}
                            {prod.pocket && <span className="bg-gray-100 px-1 rounded">{prod.pocket}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          ₹---
                        </td>
                        <td className="px-6 py-4 font-bold">
                          <span className={cn(
                            "text-xs",
                            prod.stock > 0 ? "text-green-600" : "text-red-500"
                          )}>
                            {prod.stock > 0 ? `instock (${prod.stock})` : `outofstock (${prod.stock})`}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                        No inventory products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white px-8 py-6 border-b border-gray-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-bold text-gray-900">Create New Order</h3>
                <label className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                    checked={formData.isUrgent}
                    onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                  />
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Mark as Urgent</span>
                </label>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <section className="space-y-4">
                <h4 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                  <User size={20} className="text-blue-600" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      placeholder="Customer Full Name"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                    <input
                      required
                      type="tel"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                      placeholder="+91 00000 00000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
                  <textarea
                    required
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none"
                    placeholder="Full shipping address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </section>

              <div className="h-px bg-gray-100" />

              <section className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Size & Item Breakdown</h5>
                      <button
                        type="button"
                        onClick={addSizeQuantity}
                        className="text-[10px] font-bold bg-black text-white px-3 py-1 rounded-lg flex items-center gap-1.5 hover:bg-gray-800 transition-all uppercase tracking-wider"
                      >
                        <Plus size={14} /> Add Size
                      </button>
                    </div>

                    {formData.sizeBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {formData.sizeBreakdown.map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-3 animate-in fade-in slide-in-from-left-2 duration-200 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group">
                            <button
                              type="button"
                              onClick={() => removeSizeQuantity(idx)}
                              className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 transition-colors bg-gray-50 rounded-lg"
                            >
                              <X size={14} />
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
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Qty</label>
                                <select
                                  value={item.quantity}
                                  onChange={(e) => updateSizeQuantity(idx, 'quantity', parseInt(e.target.value))}
                                  className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black outline-none transition-all text-sm font-bold"
                                >
                                  {Array.from({ length: 1500 }, (_, i) => i + 1).map(n => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Price (₹)</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={item.price || ''}
                                  onChange={(e) => updateSizeQuantity(idx, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black outline-none transition-all text-sm font-bold"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end mt-2">
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
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Colour</label>
                                    <input
                                      type="text"
                                      placeholder="White"
                                      value={item.colour || ''}
                                      onChange={(e) => updateSizeQuantity(idx, 'colour', e.target.value)}
                                      className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-black outline-none transition-all text-xs font-bold"
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
                              <div>
                                <Select
                                  label="Sleeve"
                                  value={item.sleeve || ''}
                                  options={SLEEVE_OPTIONS}
                                  onChange={(v) => updateSizeQuantity(idx, 'sleeve', v)}
                                />
                              </div>
                              <div>
                                <Select
                                  label="Pocket"
                                  value={item.pocket || ''}
                                  options={['Yes', 'No']}
                                  onChange={(v) => updateSizeQuantity(idx, 'pocket', v)}
                                />
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-gray-50 flex justify-end items-center gap-4">
                              <div className="text-right">
                                <div className="text-[8px] font-bold text-gray-400 uppercase italic">Subtotal</div>
                                <div className="text-sm font-black text-brand-primary">₹{(item.quantity * (item.price || 0)).toLocaleString()}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        onClick={addSizeQuantity}
                        className="p-4 border-2 border-dashed border-gray-200 rounded-xl text-center cursor-pointer hover:bg-gray-50 transition-all"
                      >
                        <p className="text-sm text-gray-400">No sizes added. Click to add.</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Quantity:</span>
                      <span className="text-lg font-black text-black">
                        {formData.sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Total Amount (₹)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="0.00"
                        value={formData.totalAmount || ''}
                        onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Advance Pay (₹)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="0.00"
                        value={formData.advancePay || ''}
                        onChange={(e) => setFormData({ ...formData, advancePay: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5 opacity-60">Balance (₹)</label>
                      <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-600">
                        ₹{(formData.totalAmount - formData.advancePay).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="h-px bg-gray-100" />

              <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <FileUpload
                    label="Product Pictures (JPG/PNG)"
                    accept="image/*"
                    onFilesSelected={(files) => setFormData({ ...formData, imageAttachments: files })}
                  />

                  {formData.imageAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.imageAttachments.map((file, idx) => (
                        <div
                          key={idx}
                          onClick={() => setViewingImage(file)}
                          className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-black transition-all flex items-center justify-center bg-gray-50 group relative"
                        >
                          <img src={file} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn size={12} className="text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <FileUpload
                    label="Design PDFs"
                    accept=".pdf"
                    onFilesSelected={(files) => setFormData({ ...formData, pdfAttachments: files })}
                  />

                  {formData.pdfAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.pdfAttachments.map((file, idx) => (
                        <div
                          key={idx}
                          onClick={() => setViewingImage(file)}
                          className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-black transition-all flex items-center justify-center bg-gray-50 group relative"
                        >
                          <FileText size={16} className="text-gray-400" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn size={12} className="text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {viewingImage && (
                <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName="Staff_Ref" />
              )}

              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-6 py-4 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 px-6 py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 shadow-xl active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Order"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Global Hub Detailed View Modal handled by common component */}
      {selectedHubOrder && (
        <OrderDetailModal
          order={selectedHubOrder}
          onClose={() => setSelectedHubOrder(null)}
          isAdmin={isAdmin}
          onUpdateOrder={onUpdateOrder}
          onUpdateStatus={(status) => {
            if (window.confirm(`Change order status to ${status}?`)) {
              onUpdateOrder(selectedHubOrder.id, { status });
              setSelectedHubOrder(prev => prev ? { ...prev, status } : null);
            }
          }}
        />
      )}
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-black outline-none"
      >
        <option value="" disabled>Select {label}</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

const getStatusStyles = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.DRAFT: return 'bg-gray-100 text-gray-600';
    case OrderStatus.ACCOUNTS: return 'bg-amber-100 text-amber-700';
    case OrderStatus.ORDER_MANAGEMENT: return 'bg-blue-100 text-blue-700';
    case OrderStatus.PRODUCTION: return 'bg-purple-100 text-purple-700';
    case OrderStatus.DELIVERY: return 'bg-orange-100 text-orange-700';
    case OrderStatus.DELIVERED: return 'bg-green-100 text-green-700';
    case OrderStatus.HOLD: return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};
