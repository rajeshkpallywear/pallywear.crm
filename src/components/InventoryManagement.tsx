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
  X,
  Phone,
  MapPin,
  ExternalLink,
  CreditCard,
  FileText,
  Download,
  ZoomIn
} from 'lucide-react';
import { useLeads } from '../context/LeadContext';
import { InventoryMovement, Order, OrderStatus } from '../types';
import { CATEGORIES, SLEEVE_OPTIONS, POCKET_OPTIONS } from '../constants';
import { cn, getDisplayCategory } from '../lib/utils';
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
  const [productionTab, setProductionTab] = useState<'intake' | 'delivery' | 'shipped'>('intake');
  const [searchTerm, setSearchTerm] = useState('');
  const [shipForms, setShipForms] = useState<Record<string, { courierName: string; trackingNumber: string }>>({});

  // Intake Order Processing state
  const [selectedIntakeOrder, setSelectedIntakeOrder] = useState<Order | null>(null);
  const [dispatchMode, setDispatchMode] = useState<'none' | 'courier'>('none');
  const [selectedCourier, setSelectedCourier] = useState<string>('Professional Courier');
  const [courierTrackingNo, setCourierTrackingNo] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

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

  const handleShipOrder = async (order: Order, courierName: string, trackingNumber: string) => {
    if (!courierName.trim() || !trackingNumber.trim()) {
      alert("Please enter both Courier Partner and Tracking Number.");
      return;
    }

    try {
      await addInventoryMovement({
        type: 'outward',
        customer: order.customerInfo?.name || 'Retail Client',
        date: new Date().toISOString().split('T')[0],
        product: order.category,
        productType: order.details?.productType || 'Finished Goods Delivery',
        sleeve: 'none',
        pocket: 'no',
        transportName: courierName.trim(),
        transportNumber: trackingNumber.trim(),
        quantity: order.quantity
      });

      const shipNotes = `[DELIVERY] ${new Date().toLocaleString()}: Goods dispatched via ${courierName.trim()}. Tracking ID: ${trackingNumber.trim()}`;
      await updateOrder(order.id, {
        status: OrderStatus.DELIVERED,
        notes: order.notes ? `${order.notes}\n${shipNotes}` : shipNotes,
        details: {
          ...(order.details || {}),
          courierName: courierName.trim(),
          trackingNumber: trackingNumber.trim(),
          shippedAt: Date.now()
        },
        updatedAt: Date.now()
      });

      alert(`Success: Order #${order.id} shipped and marked as Delivered.`);
    } catch (e) {
      console.error(e);
      alert('Failed to ship order.');
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
      <div className="lg:col-span-1 bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-5">
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
      <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-6">
        
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-150 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-600" size={20} />
                  Production & Delivery Management
                </h2>
                <p className="text-gray-500 text-xs mt-0.5">Control finished goods check-in and delivery tracking logs.</p>
              </div>

              {/* Sub-tabs to toggle between intake, delivery, and shipped */}
              <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                {([
                  { key: 'intake', label: '📥 Intake Queue' },
                  { key: 'delivery', label: '🚚 Delivery & Courier' },
                  { key: 'shipped', label: '✓ Shipped Archive' }
                ] as const).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setProductionTab(t.key)}
                    className={cn(
                      "px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border-none",
                      productionTab === t.key ? "bg-white text-slate-900 shadow-xs" : "text-gray-500 hover:text-slate-900"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {productionTab === 'intake' && (
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
                    {orders.filter(o => o.status === OrderStatus.DELIVERY).map(order => (
                      <tr
                        key={order.id}
                        onClick={() => {
                          setSelectedIntakeOrder(order);
                          setDispatchMode('none');
                        }}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-3.5 font-mono font-black text-indigo-600">#{order.id.slice(-8)}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          <div>
                            <span>{order.customerInfo?.name}</span>
                            <span className="text-[9px] block text-gray-400 font-normal">{order.customerInfo?.phone || 'Direct Retail'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-700">{getDisplayCategory(order)}</td>
                        <td className="px-5 py-3.5 text-center font-black text-slate-900">{order.quantity} Pcs</td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIntakeOrder(order);
                              setDispatchMode('none');
                            }}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer border-none transition-colors shadow-xs"
                          >
                            <ArrowRight size={10} /> Take & View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orders.filter(o => o.status === OrderStatus.DELIVERY).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 italic font-medium">No completed orders waiting in delivery queue.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {productionTab === 'delivery' && (
              <div className="overflow-x-auto rounded-2xl border border-gray-150">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      <th className="px-5 py-3.5">Order ID</th>
                      <th className="px-5 py-3.5">Customer Name</th>
                      <th className="px-5 py-3.5">Garment Category</th>
                      <th className="px-5 py-3.5">Courier Partner</th>
                      <th className="px-5 py-3.5">Tracking Number</th>
                      <th className="px-5 py-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-slate-700">
                    {orders.filter(o => o.status === OrderStatus.DELIVERY).map(order => {
                      const currentForm = shipForms[order.id] || { courierName: '', trackingNumber: '' };
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3.5 font-black text-slate-900">{order.id}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-800">
                            <div>
                              <span>{order.customerInfo?.name}</span>
                              <span className="text-[9px] block text-gray-400 font-normal">{order.customerInfo?.phone || 'Direct Retail'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-bold text-indigo-600">{order.category} ({order.quantity} Pcs)</td>
                          <td className="px-5 py-3.5">
                            <input
                              type="text"
                              placeholder="e.g. DHL Express"
                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 w-36"
                              value={currentForm.courierName}
                              onChange={e => setShipForms({
                                ...shipForms,
                                [order.id]: { ...currentForm, courierName: e.target.value }
                              })}
                            />
                          </td>
                          <td className="px-5 py-3.5">
                            <input
                              type="text"
                              placeholder="e.g. TRK123456789"
                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500 w-44"
                              value={currentForm.trackingNumber}
                              onChange={e => setShipForms({
                                ...shipForms,
                                [order.id]: { ...currentForm, trackingNumber: e.target.value }
                              })}
                            />
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <button
                              onClick={() => handleShipOrder(order, currentForm.courierName, currentForm.trackingNumber)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer border-none transition-colors"
                            >
                              <Truck size={10} /> Ship Goods
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {orders.filter(o => o.status === OrderStatus.DELIVERY).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 italic">No checked-in inventory orders ready for courier dispatch.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {productionTab === 'shipped' && (
              <div className="overflow-x-auto rounded-2xl border border-gray-150">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                      <th className="px-5 py-3.5">Order ID</th>
                      <th className="px-5 py-3.5">Customer Name</th>
                      <th className="px-5 py-3.5">Garment Category</th>
                      <th className="px-5 py-3.5">Courier Partner</th>
                      <th className="px-5 py-3.5">Tracking Number</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 font-medium text-slate-700">
                    {orders.filter(o => o.status === OrderStatus.DELIVERED).map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3.5 font-black text-slate-900">{order.id}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-800">
                          <div>
                            <span>{order.customerInfo?.name}</span>
                            <span className="text-[9px] block text-gray-400 font-normal">{order.customerInfo?.phone || 'Direct Retail'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-indigo-600">{order.category} ({order.quantity} Pcs)</td>
                        <td className="px-5 py-3.5 text-slate-500 font-semibold">{order.details?.courierName || 'Standard Post'}</td>
                        <td className="px-5 py-3.5 font-mono text-slate-600 font-bold">{order.details?.trackingNumber || 'LOCAL-DELIVERY'}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="px-2.5 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded text-[9px] font-black uppercase tracking-wider">
                            Delivered
                          </span>
                        </td>
                      </tr>
                    ))}
                    {orders.filter(o => o.status === OrderStatus.DELIVERED).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 italic">No shipped/delivered orders found in history.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* FULL ORDER INTAKE MODAL WITH COURIER & DELIVERY OPTIONS */}
      <AnimatePresence>
        {selectedIntakeOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white border border-gray-100 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6 relative text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-0.5">Inventory Intake Queue • Production Order</span>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic">#{selectedIntakeOrder.id.slice(-8)}</h3>
                </div>
                <button
                  onClick={() => setSelectedIntakeOrder(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Order Info & Address */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-gray-150 space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase">Customer Name</span>
                  <p className="text-sm font-bold text-slate-900">{selectedIntakeOrder.customerInfo?.name}</p>
                  <div className="pt-1 flex items-center gap-1.5 text-xs text-indigo-600 font-bold">
                    <Phone size={12} />
                    <a href={`tel:${selectedIntakeOrder.customerInfo?.phone}`} className="hover:underline text-indigo-600">
                      {selectedIntakeOrder.customerInfo?.phone}
                    </a>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-gray-150 space-y-1">
                  <span className="text-[9px] font-black text-gray-400 uppercase">Shipping Address</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedIntakeOrder.customerInfo?.address || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-800 font-bold flex items-start gap-1.5 hover:text-red-600 transition-colors group no-underline"
                  >
                    <MapPin size={14} className="text-red-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span className="leading-tight group-hover:underline">{selectedIntakeOrder.customerInfo?.address || 'No address specified'}</span>
                    <ExternalLink size={10} className="shrink-0 text-gray-400" />
                  </a>
                </div>

                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-1">
                  <span className="text-[9px] font-black text-emerald-700 uppercase">Garment Category & Balance</span>
                  <p className="text-xs font-bold text-emerald-900">{getDisplayCategory(selectedIntakeOrder)} ({selectedIntakeOrder.quantity} Pcs)</p>
                  <p className="text-lg font-black text-emerald-700 italic mt-1">₹{(selectedIntakeOrder.financials?.balanceAmount || 0).toLocaleString()} <span className="text-[9px] font-bold uppercase text-emerald-600">Balance Due</span></p>
                </div>
              </div>

              {/* Size Breakdown */}
              {selectedIntakeOrder.sizeBreakdown && selectedIntakeOrder.sizeBreakdown.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Garment Size Breakdown</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {selectedIntakeOrder.sizeBreakdown.map((item, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 border border-gray-150 rounded-2xl flex flex-col justify-between gap-1.5 shadow-sm">
                        <div className="flex justify-between items-start w-full">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wide">{item.category}</span>
                          <span className="text-[10px] font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-gray-200">{item.size}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-bold leading-tight space-y-0.5 mt-1">
                          {item.colour && <div>Colour: <span className="text-slate-800 font-semibold">{item.colour}</span></div>}
                          {item.material && <div>Material: <span className="text-slate-800 font-semibold">{item.material}</span></div>}
                          {item.printType && <div>Print: <span className="text-slate-800 font-semibold">{item.printType}</span></div>}
                          {item.model && <div>Model: <span className="text-slate-800 font-semibold">{item.model}</span></div>}
                          {item.sleeve && <div>Sleeve: <span className="text-slate-800 font-semibold">{item.sleeve}</span></div>}
                          {item.pocket && <div>Pocket: <span className="text-slate-800 font-semibold">{item.pocket}</span></div>}
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-gray-200/60 flex justify-between items-center text-xs font-black">
                          <span className="text-slate-400">Qty</span>
                          <span className="text-slate-800 italic">x {item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirement Notes */}
              {(selectedIntakeOrder.notes || selectedIntakeOrder.designNotes || selectedIntakeOrder.accountsNotes) && (
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Requirement Notes & Instructions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedIntakeOrder.notes && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-gray-150 space-y-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase">General Specifications</span>
                        <p className="text-xs font-bold text-slate-700 whitespace-pre-wrap">{selectedIntakeOrder.notes}</p>
                      </div>
                    )}
                    {selectedIntakeOrder.designNotes && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-gray-150 space-y-1">
                        <span className="text-[9px] font-black text-indigo-600 uppercase">Design & Customization Details</span>
                        <p className="text-xs font-bold text-indigo-900 whitespace-pre-wrap">{selectedIntakeOrder.designNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DISPATCH ACTION OPTIONS */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-gray-200 space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Select Dispatch Method for this Intake Order</h4>

                {dispatchMode === 'none' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Option 1: In-House Delivery */}
                    <button
                      onClick={() => {
                        if (!selectedIntakeOrder) return;
                        const orderId = selectedIntakeOrder.id;
                        const details = selectedIntakeOrder.details || {};
                        setSelectedIntakeOrder(null);
                        setDispatchMode('none');
                        updateOrder(orderId, {
                          status: OrderStatus.DELIVERY,
                          details: { ...details, dispatchType: 'in_house' },
                          updatedAt: Date.now()
                        });
                        alert("Order successfully shared to Delivery Dashboard for in-house delivery!");
                      }}
                      className="p-5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:scale-[1.01] border-none"
                    >
                      <Truck size={24} />
                      <span>🚚 Share to Delivery Dashboard</span>
                      <span className="text-[9px] text-orange-100 font-normal lowercase">Forward order to in-house delivery team</span>
                    </button>

                    {/* Option 2: Courier Shipping */}
                    <button
                      onClick={() => setDispatchMode('courier')}
                      className="p-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 cursor-pointer transition-all shadow-md hover:scale-[1.01] border-none"
                    >
                      <Package size={24} />
                      <span>📦 Courier Shipping</span>
                      <span className="text-[9px] text-blue-100 font-normal lowercase">Select courier partner (DTDC, Professional, etc.)</span>
                    </button>
                  </div>
                )}

                {/* Courier Selection Sub-panel */}
                {dispatchMode === 'courier' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <span className="text-xs font-black text-blue-700 uppercase tracking-wider">Which Courier Partner?</span>
                      <button onClick={() => setDispatchMode('none')} className="text-[10px] font-bold text-gray-500 hover:text-gray-900 border-none bg-transparent cursor-pointer">
                        ← Back to Options
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[
                        'Professional Courier',
                        'DTDC Express',
                        'ST Courier',
                        'Blue Dart',
                        'India Post',
                        'Porter',
                        'Dunzo / Shadowfax',
                        'Custom / Other'
                      ].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedCourier(c)}
                          className={cn(
                            "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                            selectedCourier === c
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-gray-400">Tracking / AWB / Consignment Number</label>
                      <input
                        type="text"
                        placeholder="e.g. TRK987654321"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none text-xs font-bold"
                        value={courierTrackingNo}
                        onChange={(e) => setCourierTrackingNo(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setDispatchMode('none')}
                        className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-black text-xs uppercase border-none cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedCourier.trim()) {
                            alert("Please select a courier partner.");
                            return;
                          }
                          if (!selectedIntakeOrder) return;
                          const orderId = selectedIntakeOrder.id;
                          const details = selectedIntakeOrder.details || {};
                          const courier = selectedCourier;
                          const tracking = courierTrackingNo.trim() || 'COURIER-DISPATCH';

                          setSelectedIntakeOrder(null);
                          setDispatchMode('none');

                          updateOrder(orderId, {
                            status: OrderStatus.DELIVERED,
                            details: {
                              ...details,
                              dispatchType: 'courier',
                              courierName: courier,
                              trackingNumber: tracking
                            },
                            updatedAt: Date.now()
                          });
                          alert(`Order successfully dispatched via ${courier}!`);
                        }}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase border-none cursor-pointer shadow-md"
                      >
                        Confirm {selectedCourier} Dispatch
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
