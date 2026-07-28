/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  Plus,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Calendar,
  User,
  Truck,
  CheckCircle,
  Shirt,
  Scissors,
  Layers,
  ChevronRight,
  Upload,
  Globe,
  ShoppingCart,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { useLeads } from '../context/LeadContext';
import { InventoryMovement, Order, OrderStatus } from '../types';
import { CATEGORIES, SLEEVE_OPTIONS, POCKET_OPTIONS } from '../constants';
import { cn } from '../lib/utils';
import FileUpload from './FileUpload';
import { getApiBaseUrl } from '../lib/apiConfig';

const API_BASE = getApiBaseUrl() + '/api';

interface InventoryManagementProps {
  userRole?: string;
}

interface ChannelListing {
  id: string;
  platform: string;
  productName: string;
  sku: string;
  price: number;
  stock: number;
  details?: string;
  image?: string;
  createdAt: number;
}

export default function InventoryManagement({ userRole }: InventoryManagementProps) {
  const isStaff = userRole === 'staff';
  const { inventory, orders, addInventoryMovement, deleteInventoryMovement, updateOrder } = useLeads();
  
  // Sidebar Sub-View tabs
  const [activeSubView, setActiveSubView] = useState<'products' | 'movement_logs' | 'amazon' | 'flipkart' | 'meesho' | 'production_orders'>('products');
  
  // Inward/Outward sub-tabs inside logs
  const [movementTab, setMovementTab] = useState<'logs' | 'inward' | 'outward'>('logs');
  const [searchTerm, setSearchTerm] = useState('');

  // Channel upload listings state
  const [listings, setListings] = useState<ChannelListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [showListingForm, setShowListingForm] = useState(false);
  const [listingFile, setListingFile] = useState<string>('');
  const [listingForm, setListingForm] = useState({
    productName: '',
    sku: '',
    price: '',
    stock: '',
    details: ''
  });

  // Fetch channel listings when platform changes
  const fetchChannelListings = async (platform: string) => {
    setLoadingListings(true);
    try {
      const res = await fetch(`${API_BASE}/channel-listings?platform=${platform}`);
      const data = await res.json();
      if (data.success) {
        setListings(data.listings || []);
      }
    } catch (e) {
      console.error('Failed to fetch channel listings:', e);
    } finally {
      setLoadingListings(false);
    }
  };

  useEffect(() => {
    if (['amazon', 'flipkart', 'meesho'].includes(activeSubView)) {
      fetchChannelListings(activeSubView);
      setShowListingForm(false);
      setListingFile('');
      setListingForm({ productName: '', sku: '', price: '', stock: '', details: '' });
    }
  }, [activeSubView]);

  // Derived product list from inventory movements
  const productStock = Object.values(inventory.reduce((acc: any, item) => {
    const key = `${item.product}-${item.productType}-${item.sleeve || 'none'}-${item.pocket || 'none'}`;
    if (!acc[key]) {
      acc[key] = {
        id: key,
        name: item.product,
        type: item.productType,
        sleeve: item.sleeve,
        pocket: item.pocket,
        stock: 0,
        price: '---',
        status: 'Enabled'
      };
    }
    if (item.type === 'inward') acc[key].stock += item.quantity;
    else acc[key].stock -= item.quantity;
    return acc;
  }, {})) as any[];

  const filteredProducts = productStock.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [inwardForm, setInwardForm] = useState({
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    product: CATEGORIES[0],
    productType: '',
    sleeve: SLEEVE_OPTIONS[0],
    pocket: POCKET_OPTIONS[0],
    transportName: '',
    transportNumber: '',
    quantity: 1
  });

  const [outwardForm, setOutwardForm] = useState({
    customer: '',
    date: new Date().toISOString().split('T')[0],
    orderId: '',
    quantity: 1,
    productType: '',
    sleeve: SLEEVE_OPTIONS[0],
    pocket: POCKET_OPTIONS[0]
  });

  const handleAddInward = async (e: React.FormEvent) => {
    e.preventDefault();
    await addInventoryMovement({
      type: 'inward',
      ...inwardForm
    });
    setInwardForm({
      vendor: '',
      date: new Date().toISOString().split('T')[0],
      product: CATEGORIES[0],
      productType: '',
      sleeve: SLEEVE_OPTIONS[0],
      pocket: POCKET_OPTIONS[0],
      transportName: '',
      transportNumber: '',
      quantity: 1
    });
    setMovementTab('logs');
    alert('Inventory inward recorded successfully.');
  };

  const handleAddOutward = async (e: React.FormEvent) => {
    e.preventDefault();
    await addInventoryMovement({
      type: 'outward',
      product: inwardForm.product, // Default to selected category
      ...outwardForm
    });
    setOutwardForm({
      customer: '',
      date: new Date().toISOString().split('T')[0],
      orderId: '',
      quantity: 1,
      productType: '',
      sleeve: SLEEVE_OPTIONS[0],
      pocket: POCKET_OPTIONS[0]
    });
    setMovementTab('logs');
    alert('Inventory outward recorded successfully.');
  };

  // Channel Listing Submit
  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingForm.productName || !listingForm.price) {
      alert('Please fill out product name and price.');
      return;
    }

    try {
      const id = `listing-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const body = {
        id,
        platform: activeSubView,
        productName: listingForm.productName,
        sku: listingForm.sku,
        price: parseFloat(listingForm.price) || 0,
        stock: parseInt(listingForm.stock, 10) || 0,
        details: listingForm.details,
        image: listingFile || null
      };

      const res = await fetch(`${API_BASE}/channel-listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setListingForm({ productName: '', sku: '', price: '', stock: '', details: '' });
        setListingFile('');
        setShowListingForm(false);
        fetchChannelListings(activeSubView);
        alert('Listing details uploaded successfully.');
      } else {
        alert('Failed to upload listing.');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving channel listing.');
    }
  };

  // Delete Channel Listing
  const handleDeleteListing = async (id: string) => {
    if (!confirm('Delete this listing?')) return;
    try {
      await fetch(`${API_BASE}/channel-listings/${id}`, { method: 'DELETE' });
      setListings(ls => ls.filter(l => l.id !== id));
      alert('Listing deleted.');
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Receiving complete production orders into inventory stock
  const handleReceiveProductionOrder = async (order: Order) => {
    const whyReason = window.prompt("Reason for receiving into inventory (Why):", "Production intake verification completed");
    if (whyReason === null) return;
    if (!whyReason.trim()) {
      alert("Reason is required to receive order.");
      return;
    }

    try {
      // 1. Record Inward movement
      await addInventoryMovement({
        type: 'inward',
        vendor: 'Production Factory Intake',
        date: new Date().toISOString().split('T')[0],
        product: order.category,
        productType: order.details || 'Production Finished Goods',
        sleeve: 'none',
        pocket: 'no',
        transportName: whyReason.trim(),
        transportNumber: 'IN-FACTORY',
        quantity: order.quantity
      });

      // 2. Mark order as received by updating notes/status
      const receiptNotes = `[INVENTORY] ${new Date().toLocaleString()}: Stock accepted into inventory by manager. Reason: ${whyReason.trim()}`;
      await updateOrder(order.id, {
        notes: order.notes ? `${order.notes}\n${receiptNotes}` : receiptNotes,
        updatedAt: Date.now()
      });

      alert(`Success: Completed order accepted into Inventory Stock. Inward ledger updated.`);
    } catch (e) {
      console.error(e);
      alert('Failed to receive order.');
    }
  };

  const filteredInventory = inventory.filter(item =>
    (item.vendor || item.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.productType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Completed production orders (orders in PRODUCTION state or completed logs ready for delivery)
  const productionOrders = orders.filter(o =>
    [OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(o.status)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-left">
      {/* Sub-Sidebar Navigation */}
      <div className="lg:col-span-1 lg:order-last bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Layers className="text-brand-primary" size={18} />
          <h3 className="text-xs font-black uppercase text-gray-500 tracking-widest">Inventory Modules</h3>
        </div>

        {/* Core Stock & Movement Links */}
        <div className="space-y-1.5">
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block px-1 mb-1">Store Controls</span>
          <button
            onClick={() => setActiveSubView('products')}
            className={cn(
              "w-full text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between font-bold text-xs cursor-pointer",
              activeSubView === 'products'
                ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]"
                : "bg-white border-gray-100 text-gray-700 hover:border-gray-300"
            )}
          >
            <div className="flex items-center gap-2">
              <span>📦</span>
              <span>Stock Overview</span>
            </div>
            <ChevronRight size={12} className="opacity-50" />
          </button>

          <button
            onClick={() => {
              setActiveSubView('movement_logs');
              setMovementTab('logs');
            }}
            className={cn(
              "w-full text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between font-bold text-xs cursor-pointer",
              activeSubView === 'movement_logs'
                ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]"
                : "bg-white border-gray-100 text-gray-700 hover:border-gray-300"
            )}
          >
            <div className="flex items-center gap-2">
              <span>⚖️</span>
              <span>Inward / Outward Ledger</span>
            </div>
            <ChevronRight size={12} className="opacity-50" />
          </button>
        </div>

        {/* E-Commerce sales channels */}
        <div className="space-y-1.5 pt-2 border-t border-gray-50">
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block px-1 mb-1 font-mono">E-Commerce Uploads</span>
          {[
            { id: 'amazon', label: 'Amazon Store', icon: '🅰️', color: 'text-orange-500' },
            { id: 'flipkart', label: 'Flipkart Store', icon: '🛒', color: 'text-blue-500' },
            { id: 'meesho', label: 'Meesho Store', icon: '🛍️', color: 'text-pink-500' }
          ].map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveSubView(ch.id as any)}
              className={cn(
                "w-full text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between font-bold text-xs cursor-pointer",
                activeSubView === ch.id
                  ? "bg-[#0ea5e9] text-white border-[#0ea5e9] shadow-md scale-[1.01]"
                  : "bg-white border-gray-100 text-gray-700 hover:border-gray-300"
              )}
            >
              <div className="flex items-center gap-2">
                <span>{ch.icon}</span>
                <span>{ch.label}</span>
              </div>
              <ChevronRight size={12} className="opacity-50" />
            </button>
          ))}
        </div>

        {/* Production Factory Dispatch Queue */}
        <div className="space-y-1.5 pt-2 border-t border-gray-50">
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block px-1 mb-1 font-mono">Operations</span>
          <button
            onClick={() => setActiveSubView('production_orders')}
            className={cn(
              "w-full text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between font-bold text-xs cursor-pointer",
              activeSubView === 'production_orders'
                ? "bg-emerald-800 text-white border-emerald-800 shadow-md scale-[1.01]"
                : "bg-white border-gray-100 text-gray-700 hover:border-gray-300"
            )}
          >
            <div className="flex items-center gap-2">
              <span>🏭</span>
              <span>Production Orders ({productionOrders.length})</span>
            </div>
            <ChevronRight size={12} className="opacity-50" />
          </button>
        </div>
      </div>

      {/* Main Workspace Detail Panel */}
      <div className="lg:col-span-3 lg:order-first bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-6">
        
        {/* VIEW 1: Stock Overview */}
        {activeSubView === 'products' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Package className="text-brand-primary" size={20} />
                Products & Stock Inventory
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">Live counts of available garments and assets.</p>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-gray-50 pb-4">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveSubView('movement_logs');
                    setMovementTab('inward');
                  }}
                  className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm"
                >
                  <ArrowDownLeft size={12} /> Record Inward
                </button>
                <button
                  onClick={() => {
                    setActiveSubView('movement_logs');
                    setMovementTab('outward');
                  }}
                  className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm"
                >
                  <ArrowUpRight size={12} /> Record Outward
                </button>
              </div>
            </div>

            {/* Stock Table */}
            <div className="overflow-x-auto rounded-2xl border border-gray-150">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <th className="px-5 py-3.5">Product Name</th>
                    <th className="px-5 py-3.5">Type/Material</th>
                    <th className="px-5 py-3.5 text-right">Available Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-slate-700">
                  {filteredProducts.map((prod, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                        <Shirt size={14} className="text-slate-400" />
                        {prod.name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-semibold">{prod.type || 'Standard'}</td>
                      <td className="px-5 py-3.5 text-right font-black text-xs">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full",
                          prod.stock <= 0 ? "bg-red-50 text-red-600 font-bold" : "bg-emerald-50 text-emerald-700 font-extrabold"
                        )}>
                          {prod.stock} Units
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 italic">No products currently recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VIEW 2: Inward / Outward Ledger Logs */}
        {activeSubView === 'movement_logs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Stock Movement Logs</h2>
                <p className="text-gray-500 text-xs mt-0.5">Detailed records of goods intake and release.</p>
              </div>

              {/* Sub tabs selectors */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                {(['logs', 'inward', 'outward'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setMovementTab(t)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border-none",
                      movementTab === t ? "bg-white text-slate-900 shadow-xs" : "text-gray-500 hover:text-slate-900"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB: Logs list */}
            {movementTab === 'logs' && (
              <div className="space-y-4">
                <div className="relative max-w-sm">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="overflow-x-auto rounded-2xl border border-gray-150">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Vendor / Client</th>
                        <th className="px-5 py-3">Product Name</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3 text-right">Qty</th>
                        <th className="px-5 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 font-medium text-slate-700">
                      {filteredInventory.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3.5">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider inline-block",
                              item.type === 'inward' ? "bg-green-50 text-green-700 border border-green-200" : "bg-orange-50 text-orange-700 border border-orange-200"
                            )}>
                              {item.type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-800">
                            {item.type === 'inward' ? item.vendor : item.customer}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-slate-950">
                            {item.product} <span className="text-[10px] text-gray-400 font-medium font-mono">{item.productType}</span>
                          </td>
                          <td className="px-5 py-3.5">{new Date(item.date).toLocaleDateString()}</td>
                          <td className="px-5 py-3.5 text-right font-black text-slate-900">{item.quantity}</td>
                          <td className="px-5 py-3.5 text-center">
                            <button
                              onClick={() => deleteInventoryMovement(item.id)}
                              className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded border-none bg-transparent cursor-pointer transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredInventory.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400 italic">No movement logs found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: Inward Form */}
            {movementTab === 'inward' && (
              <form onSubmit={handleAddInward} className="bg-slate-50 p-6 rounded-2xl border border-gray-150/40 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-green-700 mb-2">Record Inward (Receipts)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Vendor Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cotton Mills Co"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                      value={inwardForm.vendor}
                      onChange={e => setInwardForm({ ...inwardForm, vendor: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Date</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                      value={inwardForm.date}
                      onChange={e => setInwardForm({ ...inwardForm, date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Product Category</label>
                    <select
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                      value={inwardForm.product}
                      onChange={e => setInwardForm({ ...inwardForm, product: e.target.value })}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Product Type / Materials</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cotton-180, Heavy Knit"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                      value={inwardForm.productType}
                      onChange={e => setInwardForm({ ...inwardForm, productType: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Transport Logistics Name</label>
                    <input
                      type="text"
                      placeholder="e.g. DTDC Courier"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                      value={inwardForm.transportName}
                      onChange={e => setInwardForm({ ...inwardForm, transportName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Vehicle / Tracking Number</label>
                    <input
                      type="text"
                      placeholder="e.g. MH-12-XX-1234"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                      value={inwardForm.transportNumber}
                      onChange={e => setInwardForm({ ...inwardForm, transportNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400">Quantity (Units)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                    value={inwardForm.quantity}
                    onChange={e => setInwardForm({ ...inwardForm, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-98 transition-all border-none cursor-pointer"
                >
                  Record Inward Stock Intake
                </button>
              </form>
            )}

            {/* TAB: Outward Form */}
            {movementTab === 'outward' && (
              <form onSubmit={handleAddOutward} className="bg-slate-50 p-6 rounded-2xl border border-gray-150/40 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-orange-700 mb-2">Record Outward (Releases)</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Customer Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                      value={outwardForm.customer}
                      onChange={e => setOutwardForm({ ...outwardForm, customer: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Date</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                      value={outwardForm.date}
                      onChange={e => setOutwardForm({ ...outwardForm, date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Order ID Ref</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ORD-102938"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                      value={outwardForm.orderId}
                      onChange={e => setOutwardForm({ ...outwardForm, orderId: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Product Type</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cotton-180"
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                      value={outwardForm.productType}
                      onChange={e => setOutwardForm({ ...outwardForm, productType: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-gray-400">Quantity (Units)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                    value={outwardForm.quantity}
                    onChange={e => setOutwardForm({ ...outwardForm, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-98 transition-all border-none cursor-pointer"
                >
                  Record Outward Stock Release
                </button>
              </form>
            )}
          </div>
        )}

        {/* VIEW 3: E-Commerce Store Platforms (Amazon, Flipkart, Meesho) */}
        {['amazon', 'flipkart', 'meesho'].includes(activeSubView) && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-50 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 capitalize">
                  <Globe className="text-blue-500" size={20} />
                  {activeSubView} Listing Hub
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">Upload, configure, and save details for items listing on {activeSubView}.</p>
              </div>

              <button
                onClick={() => setShowListingForm(!showListingForm)}
                className="px-4 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border-none shadow-sm"
              >
                {showListingForm ? <X size={14} /> : <Plus size={14} />}
                <span>{showListingForm ? 'Cancel Upload' : 'Upload Item Details'}</span>
              </button>
            </div>

            {/* Listing Form */}
            <AnimatePresence>
              {showListingForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleSaveListing}
                  className="bg-slate-50 p-6 rounded-2xl border border-gray-150/60 space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400">Product Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Printed Polo T-Shirt, Pallywear Special"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                        value={listingForm.productName}
                        onChange={e => setListingForm({ ...listingForm, productName: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400">Seller SKU ID</label>
                      <input
                        type="text"
                        placeholder="e.g. PW-POLO-BLK-M"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                        value={listingForm.sku}
                        onChange={e => setListingForm({ ...listingForm, sku: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400">Selling Price (INR)</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 899"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                        value={listingForm.price}
                        onChange={e => setListingForm({ ...listingForm, price: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400">Stock Qty Allocated</label>
                      <input
                        type="number"
                        placeholder="e.g. 50"
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold"
                        value={listingForm.stock}
                        onChange={e => setListingForm({ ...listingForm, stock: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Listing Features & Details</label>
                    <textarea
                      rows={3}
                      placeholder="Enter description bullet points, fabric parameters, keywords..."
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-xs font-semibold resize-none"
                      value={listingForm.details}
                      onChange={e => setListingForm({ ...listingForm, details: e.target.value })}
                    />
                  </div>

                  {/* Image upload */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Upload Product Image / Reference sheet</label>
                    <FileUpload
                      label=""
                      maxFiles={1}
                      onFilesSelected={(files) => {
                        if (files && files[0]) setListingFile(files[0]);
                      }}
                    />
                    {listingFile && (
                      <div className="aspect-square w-16 rounded border border-gray-200 overflow-hidden mt-2 relative">
                        <img src={listingFile} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setListingFile('')}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 cursor-pointer border-none"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-[#0ea5e9] hover:bg-[#0284c7] text-white rounded-xl text-xs font-black uppercase tracking-wider active:scale-98 transition-all border-none cursor-pointer"
                  >
                    Save & Sync {activeSubView} Listing
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Platform listings table */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Listings on {activeSubView}</h3>
              {loadingListings ? (
                <div className="py-8 text-center text-xs text-gray-400 animate-pulse">Fetching platform products...</div>
              ) : listings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {listings.map(l => (
                    <div key={l.id} className="bg-slate-50 p-4 rounded-2xl border border-gray-150 flex items-start gap-4">
                      {l.image ? (
                        <div className="aspect-square w-16 bg-white border border-gray-200 rounded-xl overflow-hidden shrink-0">
                          <img src={l.image} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-white border border-dashed border-gray-200 rounded-xl flex items-center justify-center shrink-0 text-slate-300">
                          <Shirt size={24} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-bold text-xs text-slate-900 truncate">{l.productName}</p>
                        <div className="flex gap-2 text-[10px] font-mono text-gray-400">
                          <span>SKU: {l.sku || 'N/A'}</span>
                          <span>•</span>
                          <span>Price: ₹{l.price}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="px-2 py-0.5 bg-sky-50 border border-sky-200 rounded text-[9px] font-black text-sky-700 uppercase">
                            Stock: {l.stock} units
                          </span>
                          <button
                            onClick={() => handleDeleteListing(l.id)}
                            className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center text-xs text-gray-400">
                  No active items uploaded for this platform yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: Completed Production Orders Queue */}
        {activeSubView === 'production_orders' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                <CheckCircle2 className="text-emerald-600" size={20} />
                Finished Production Intake Queue
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">Orders currently completed in production that are ready to be dispatched or checked-in to inventory.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-150">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <th className="px-5 py-3.5">Order ID</th>
                    <th className="px-5 py-3.5">Customer Name</th>
                    <th className="px-5 py-3.5">Garment Category</th>
                    <th className="px-5 py-3.5 text-center">Quantity</th>
                    <th className="px-5 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-medium text-slate-700">
                  {productionOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-black text-slate-900">{order.id}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        <div>
                          <span>{order.customerName}</span>
                          <span className="text-[9px] block text-gray-400 font-normal">{order.customerCompany || 'Direct Retail'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-indigo-600">{order.category}</td>
                      <td className="px-5 py-3.5 text-center font-black text-slate-900">{order.quantity} Pcs</td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleReceiveProductionOrder(order)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer border-none transition-colors"
                        >
                          <ArrowRight size={10} /> Receive into Inventory
                        </button>
                      </td>
                    </tr>
                  ))}
                  {productionOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 italic">No completed orders waiting in queue.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
