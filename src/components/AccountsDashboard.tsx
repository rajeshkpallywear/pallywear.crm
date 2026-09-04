/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ClipboardCheck, CreditCard, ChevronRight, ChevronDown, FileText, ExternalLink, ZoomIn, Share2, Globe, Trash2, Download, Package, Activity, TrendingUp, Clock, Building2, Users, Truck, IndianRupee, Store, Edit, Eye, Mic, MapPin, User, Phone, Sparkles, FolderOpen } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn, isOrderSizeValid } from '../lib/utils';
import { useLeads } from '../context/LeadContext';
import OrderDetailModal from './OrderDetailModal';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import VendorExpensePage from './VendorExpensePage';
import OtherExpensePage from './OtherExpensePage';
import ExpensesHub from './ExpensesHub';
import OrdersChart from './OrdersChart';

type SidebarView = 'orders' | 'vendor-expense' | 'office-expense' | 'salary' | 'delivery-expense' | 'revenue' | 'expenses-hub';

interface AccountsDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
  user?: any;
  sidebarView?: SidebarView;
}

export default function AccountsDashboard({ orders, onUpdateOrder, onDeleteOrder, isAdmin, user, sidebarView = 'orders' }: AccountsDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSection, setSelectedSection] = useState<'recent' | 'hold' | 'completed' | 'revenue'>('recent');
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [billingFiles, setBillingFiles] = useState<string[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { loadOrderAttachments } = useLeads();

  useEffect(() => {
    if (selectedOrder) {
      loadOrderAttachments(selectedOrder.id).then(attachments => {
        setSelectedOrder(prev => prev && prev.id === selectedOrder.id ? { ...prev, ...attachments } : prev);
      });
    }
  }, [selectedOrder?.id]);

  useEffect(() => {
    setBillingFiles([]);
  }, [selectedOrder?.id]);

  const pendingOrders = orders.filter(o => o.status === OrderStatus.ACCOUNTS || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS));

  const filteredOrders = orders.filter(o => {
    if (selectedSection === 'hold') {
      return o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS;
    }
    if (selectedSection === 'completed') {
      return o.status === OrderStatus.DELIVERED;
    }
    return o.status === OrderStatus.ACCOUNTS;
  });

  // Auto-select first order when section or filtered order list changes (except completed tab)
  useEffect(() => {
    if (selectedSection === 'completed') {
      setSelectedOrder(null);
    } else if (filteredOrders.length > 0) {
      if (!selectedOrder || !filteredOrders.some(o => o.id === selectedOrder.id)) {
        setSelectedOrder(filteredOrders[0]);
      }
    } else {
      setSelectedOrder(null);
    }
  }, [selectedSection, filteredOrders.length]);

  const recentOrdersCount = orders.filter(o => o.status === OrderStatus.ACCOUNTS).length;
  const holdOrdersCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS).length;
  const completedOrdersCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;

  const handleProcessOrder = async () => {
    if (!selectedOrder || isProcessing) return;

    // Size check on next state
    const nextOrderState = {
      ...selectedOrder,
      accountsAttachments: billingFiles
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 100MB). Please reduce the number of attachments or compress images in accounts.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.DESIGN,
        accountsAttachments: billingFiles,
        sentByAccounts: true,
        updatedAt: Date.now()
      });
      setSelectedOrder(null);
      setBillingFiles([]);
      alert("Success: Order sent to Design.");
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes("exceeds the maximum allowed size")) {
        alert("Action failed: The order document is now too large (Max 100MB). Please reduce the number of attachments.");
      } else {
        alert("An error occurred while sending the order: " + (e?.message || e));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHoldOrder = async () => {
    if (!selectedOrder || isProcessing) return;

    if (selectedOrder.status === OrderStatus.HOLD) {
      const newStatus = selectedOrder.previousStatus || OrderStatus.ACCOUNTS;
      if (window.confirm(`Release order back to ${newStatus}?`)) {
        setIsProcessing(true);
        try {
          await onUpdateOrder(selectedOrder.id, {
            status: newStatus,
            previousStatus: undefined,
            updatedAt: Date.now()
          });
          setSelectedOrder(prev => prev ? { ...prev, status: newStatus, previousStatus: undefined } : null);
          alert("Order released.");
        } catch (e) {
          alert("Action failed.");
        } finally {
          setIsProcessing(false);
        }
      }
      return;
    }

    const reason = window.prompt("Enter mandatory reason for putting this order on HOLD:");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Hold reason is mandatory.");
      return;
    }

    setIsProcessing(true);
    try {
      const newNote = `[HOLD] ${new Date().toLocaleString()}: ${reason.trim()}`;
      const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n${newNote}` : newNote;

      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.HOLD,
        holdReason: reason.trim(),
        previousStatus: selectedOrder.status,
        notes: updatedNotes,
        updatedAt: Date.now()
      });
      setSelectedOrder(prev => prev ? { ...prev, status: OrderStatus.HOLD, holdReason: reason.trim(), previousStatus: selectedOrder.status, notes: updatedNotes } : null);
      alert("Order put on HOLD.");
    } catch (e) {
      alert("Action failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSidebarContent = () => {
    if (sidebarView === 'vendor-expense') return <VendorExpensePage user={user} />;
    if (sidebarView === 'office-expense') return <OtherExpensePage user={user} expenseType="office" title="Office Expense" description="Track day-to-day office expenses" icon={<Building2 size={20}/>} color="#8b5cf6" />;
    if (sidebarView === 'salary') return <OtherExpensePage user={user} expenseType="salary" title="Salary" description="Monthly salary payments to staff" icon={<Users size={20}/>} color="#0ea5e9" extraFields="salary" />;
    if (sidebarView === 'delivery-expense') return <OtherExpensePage user={user} expenseType="delivery" title="Delivery Expense" description="Courier and logistics costs" icon={<Truck size={20}/>} color="#f59e0b" extraFields="delivery" />;
    if (sidebarView === 'expenses-hub') return <ExpensesHub user={user} />;
    return null;
  };

  return (
    <div className="space-y-6">
      {sidebarView !== 'orders' ? (
        <div className="bg-white/85 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-lg">
          {renderSidebarContent()}
        </div>
      ) : (
      <div className="space-y-8">


      {/* Summary Stats Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <button
          onClick={() => setSelectedSection('recent')}
          className={cn(
            "flex items-center gap-2.5 p-2.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer text-left",
            selectedSection === 'recent' ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20 scale-[1.02]" : "bg-white border-gray-150 shadow-xs hover:border-brand-primary/40 hover:scale-[1.01]"
          )}
          title="Recent Orders: All received orders"
        >
          <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shadow-xs shrink-0", selectedSection === 'recent' ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600")}>
            <Package size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[9px] font-bold uppercase tracking-wider truncate", selectedSection === 'recent' ? "text-white/80" : "text-gray-400")}>Recent</p>
            <p className="text-sm sm:text-xl font-black leading-none mt-0.5">{recentOrdersCount}</p>
          </div>
        </button>

        <button
          onClick={() => setSelectedSection('hold')}
          className={cn(
            "flex items-center gap-2.5 p-2.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer text-left",
            selectedSection === 'hold' ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20 scale-[1.02]" : "bg-white border-gray-100 shadow-xs hover:border-brand-primary/40 hover:scale-[1.01]"
          )}
          title="Hold Orders: Blocked/Payment issues"
        >
          <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shadow-xs shrink-0", selectedSection === 'hold' ? "bg-white/20 text-white" : "bg-red-50 text-red-500")}>
            <Activity size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[9px] font-bold uppercase tracking-wider truncate", selectedSection === 'hold' ? "text-white/80" : "text-gray-400")}>On Hold</p>
            <p className="text-sm sm:text-xl font-black leading-none mt-0.5">{holdOrdersCount}</p>
          </div>
        </button>

        <button
          onClick={() => setSelectedSection('completed')}
          className={cn(
            "flex items-center gap-2.5 p-2.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer text-left",
            selectedSection === 'completed' ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20 scale-[1.02]" : "bg-white border-gray-150 shadow-xs hover:border-brand-primary/40 hover:scale-[1.01]"
          )}
          title="Completed Orders: Fully delivered and paid"
        >
          <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shadow-xs shrink-0", selectedSection === 'completed' ? "bg-white/20 text-white" : "bg-green-50 text-green-600")}>
            <TrendingUp size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[9px] font-bold uppercase tracking-wider truncate", selectedSection === 'completed' ? "text-white/80" : "text-gray-400")}>Done</p>
            <p className="text-sm sm:text-xl font-black leading-none mt-0.5">{completedOrdersCount}</p>
          </div>
        </button>

        <button
          onClick={() => setSelectedSection('revenue')}
          className={cn(
            "flex items-center gap-2.5 p-2.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer text-left",
            selectedSection === 'revenue' ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20 scale-[1.02]" : "bg-white border-gray-150 shadow-xs hover:border-brand-primary/40 hover:scale-[1.01]"
          )}
          title="Revenue Ledger: Manually and auto-created income records"
        >
          <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shadow-xs shrink-0", selectedSection === 'revenue' ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-600")}>
            <IndianRupee size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[9px] font-bold uppercase tracking-wider truncate", selectedSection === 'revenue' ? "text-white/80" : "text-gray-400")}>Revenue</p>
            <p className="text-sm sm:text-base font-black leading-none mt-0.5">Ledger</p>
          </div>
        </button>
      </div>

      {selectedSection === 'revenue' ? (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <OtherExpensePage user={user} expenseType="revenue" title="Revenue Ledger" description="Income and revenue records" icon={<IndianRupee size={20}/>} color="#16a34a" extraFields="revenue" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={cn("lg:col-span-1 space-y-4", selectedOrder ? "hidden lg:block" : "block")}>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <ClipboardCheck className="text-amber-500" size={16} />
            {selectedSection === 'recent' ? 'Pending Billing' : selectedSection === 'hold' ? 'On Hold Billing' : 'Completed Invoices'} ({filteredOrders.length})
          </h3>
          <div className="space-y-3">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => order.status !== OrderStatus.DELIVERED && setSelectedOrder(order)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all space-y-2",
                    order.status === OrderStatus.DELIVERED
                      ? "bg-white border-gray-100 cursor-default opacity-85"
                      : selectedOrder?.id === order.id
                        ? "bg-black text-white border-black shadow-lg scale-[1.02] cursor-pointer"
                        : "bg-white border-gray-100 hover:border-gray-300 shadow-sm cursor-pointer"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-mono opacity-60">#{order.id.slice(-6)}</span>
                      {order.status === OrderStatus.HOLD && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded ml-1">ON HOLD</span>
                      )}
                      {order.isUrgent && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded animate-pulse">URGENT</span>
                      )}
                      {order.voiceNote && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[8px] font-black px-1 rounded flex items-center gap-0.5">
                          🎙️ Voice
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] font-bold uppercase py-0.5 px-1 bg-gray-400/20 rounded">
                      {getDisplayCategory(order)}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-sm truncate">{order.customerInfo.name}</div>
                    <div className={cn("text-[9px] font-bold uppercase tracking-wide", selectedOrder?.id === order.id ? "text-gray-300" : "text-brand-primary")}>
                      By: {order.createdByName || 'System'}
                    </div>
                  </div>
                  {order.status === OrderStatus.HOLD && order.holdReason && (
                    <div className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded italic border border-red-100">
                      Reason: {order.holdReason}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                    <span className={selectedOrder?.id === order.id ? 'text-gray-300' : 'text-gray-500'}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                    <span className={cn("font-black", selectedOrder?.id === order.id ? "text-emerald-400" : "text-gray-900")}>
                      ₹{(order.financials?.totalAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedHubOrder(order);
                    }}
                    className={cn(
                      "w-full py-1 px-2 rounded-xl text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all border cursor-pointer",
                      selectedOrder?.id === order.id
                        ? "bg-white/10 hover:bg-white/20 text-white border-white/20"
                        : "bg-purple-50 hover:bg-purple-100 text-brand-primary border-purple-200 shadow-2xs"
                    )}
                  >
                    <Eye size={12} />
                    <span>View Full Details</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="p-12 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center">
                <CreditCard className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-sm text-gray-500">No orders in this state</p>
              </div>
            )}
          </div>
        </div>

        <div className={cn("lg:col-span-2", selectedOrder ? "block" : "hidden lg:block")}>
          {selectedOrder ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl border border-gray-150 shadow-sm overflow-hidden"
            >
              <div className="p-6 sm:p-8 border-b border-gray-100 bg-white">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="lg:hidden mb-4 flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all border-none cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back to List
                </button>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">ORDER SPECIFICATIONS & BILLING</span>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <h4 className="text-2xl font-black text-gray-900 tracking-tight">#{selectedOrder.id}</h4>
                      <span className="text-xs text-gray-500 font-bold">(Created by: {selectedOrder.createdByName || 'System'})</span>
                      <button
                        onClick={() => {
                          const newId = window.prompt("Enter new Order ID:", selectedOrder.id);
                          if (newId && newId.trim() && newId !== selectedOrder.id) {
                            onUpdateOrder(selectedOrder.id, { id: newId.trim() })
                              .then(() => {
                                alert(`Order ID updated successfully to ${newId.trim()}!`);
                                setSelectedOrder(prev => prev ? { ...prev, id: newId.trim() } : null);
                              })
                              .catch((err) => {
                                console.error(err);
                                alert("Failed to update Order ID. ID might already exist.");
                              });
                          }
                        }}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900 transition-colors cursor-pointer border-none bg-transparent"
                        title="Edit Order ID"
                      >
                        <Edit size={15} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedHubOrder(selectedOrder)}
                      className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-none"
                    >
                      <Eye size={13} />
                      <span>Open Full Modal</span>
                    </button>
                    <span className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">
                      Status: {selectedOrder.status}
                    </span>
                  </div>
                </div>

                {/* Customer Info & Order Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/70 p-5 rounded-2xl border border-gray-150">
                  <div className="space-y-2">
                    <h5 className="text-[10.5px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-1.5">
                      <User size={13} />
                      Customer Details
                    </h5>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-gray-900">{selectedOrder.customerInfo.name}</p>
                      <a href={`tel:${selectedOrder.customerInfo.phone}`} className="text-xs text-gray-700 hover:text-brand-primary font-semibold flex items-center gap-1.5">
                        <Phone size={12} className="text-brand-primary" /> {selectedOrder.customerInfo.phone}
                      </a>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.customerInfo.address || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-1.5 text-xs text-gray-600 hover:text-red-600 mt-1 leading-relaxed"
                      >
                        <MapPin size={13} className="text-red-500 shrink-0 mt-0.5" />
                        <span>{selectedOrder.customerInfo.address || 'No address specified'}</span>
                      </a>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-[10.5px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-1.5">
                      <Package size={13} />
                      Category & Technical Details
                    </h5>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-black uppercase">
                          {getDisplayCategory(selectedOrder)}
                        </span>
                        <span className="text-xs font-bold text-gray-600">
                          Total Quantity: <strong className="text-gray-950">{selectedOrder.quantity || 1} pcs</strong>
                        </span>
                        {selectedOrder.isUrgent && (
                          <span className="px-2 py-0.5 bg-red-500 text-white rounded text-[9px] font-black uppercase animate-pulse">
                            🚨 Urgent Rush
                          </span>
                        )}
                      </div>

                      {/* Technical details key-values */}
                      {selectedOrder.details && Object.keys(selectedOrder.details).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {Object.entries(selectedOrder.details).map(([k, v]) => (
                            <div key={k} className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-semibold text-gray-700 shadow-2xs">
                              <span className="text-gray-400 uppercase font-black mr-1">{k}:</span>
                              <span className="font-bold text-gray-900">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Specs, Notes & Voice Instructions */}
                <div className="mt-5 space-y-3">
                  {(selectedOrder.notes || selectedOrder.designNotes || selectedOrder.marketing_notes) && (
                    <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-1 text-left">
                      <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest block flex items-center gap-1.5">
                        📋 Client Specifications & Intake Notes:
                      </span>
                      <p className="text-xs text-gray-800 font-semibold whitespace-pre-line leading-relaxed">
                        {selectedOrder.notes || selectedOrder.designNotes || selectedOrder.marketing_notes}
                      </p>
                    </div>
                  )}

                  {/* Voice Note Audio Player */}
                  {selectedOrder.voiceNote && (
                    <div className="p-3.5 bg-purple-50/90 border-2 border-purple-200 rounded-2xl space-y-2 text-left shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Mic size={14} className="text-purple-600 animate-pulse" />
                          🎙️ Client Voice Instructions from Marketing:
                        </span>
                        <span className="text-[8.5px] font-extrabold bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Audio Note Attached
                        </span>
                      </div>
                      <audio controls src={selectedOrder.voiceNote} className="w-full h-8 rounded-xl bg-white p-0.5 outline-none shadow-2xs" />
                    </div>
                  )}

                  {selectedOrder.accountsNotes && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-left">
                      <span className="text-[9.5px] font-black text-blue-800 uppercase tracking-wider block mb-0.5">Accounts Record Notes:</span>
                      <p className="text-xs text-blue-950 font-semibold italic">"{selectedOrder.accountsNotes}"</p>
                    </div>
                  )}
                </div>

                {/* Detailed Size Breakdown Table */}
                {selectedOrder.sizeBreakdown && selectedOrder.sizeBreakdown.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10.5px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
                        <Package size={13} className="text-brand-primary" />
                        Complete Sizing Breakdown Table ({selectedOrder.sizeBreakdown.length} items)
                      </h5>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-2xs">
                      <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-200">
                            <th className="px-3 py-2">Category</th>
                            <th className="px-3 py-2">Size</th>
                            <th className="px-3 py-2">Color</th>
                            <th className="px-3 py-2">Print / Style</th>
                            <th className="px-3 py-2">Sleeve / Pocket</th>
                            <th className="px-3 py-2">Material / Model</th>
                            <th className="px-3 py-2 text-center">Qty</th>
                            <th className="px-3 py-2 text-right">Price</th>
                            <th className="px-3 py-2 text-right">GST %</th>
                            <th className="px-3 py-2 text-right">Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white font-semibold text-gray-800">
                          {selectedOrder.sizeBreakdown.map((item, idx) => {
                            const base = item.quantity * (item.price || 0);
                            const gst = (base * (item.gstRate || 0)) / 100;
                            const total = base + gst;
                            return (
                              <tr key={idx} className="hover:bg-purple-50/40 transition-colors">
                                <td className="px-3 py-2 font-black text-brand-primary uppercase text-[11px]">{item.category}</td>
                                <td className="px-3 py-2 font-black text-gray-900 bg-gray-50/50">{item.size}</td>
                                <td className="px-3 py-2">{item.colour || '-'}</td>
                                <td className="px-3 py-2">{item.printType || '-'}</td>
                                <td className="px-3 py-2">{[item.sleeve, item.pocket].filter(Boolean).join(' | ') || '-'}</td>
                                <td className="px-3 py-2">{[item.material, item.model].filter(Boolean).join(' | ') || '-'}</td>
                                <td className="px-3 py-2 text-center font-black text-gray-900">{item.quantity}</td>
                                <td className="px-3 py-2 text-right font-mono">₹{item.price || 0}</td>
                                <td className="px-3 py-2 text-right font-mono">{item.gstRate || 0}%</td>
                                <td className="px-3 py-2 text-right font-black text-emerald-700 font-mono">₹{total.toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Financial Summary Breakdown */}
                <div className="mt-6 space-y-2">
                  <h5 className="text-[10.5px] font-black text-gray-700 uppercase tracking-widest">Financial Overview</h5>
                  <div className="p-5 bg-white border border-gray-200 rounded-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 shadow-xs text-center">
                    <div className="bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                      <p className="text-[8.5px] font-black text-gray-400 uppercase tracking-wider">Items Total</p>
                      <p className="text-sm font-black text-gray-900 mt-0.5">₹{(selectedOrder.financials?.itemsTotal || selectedOrder.financials?.totalAmount || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                      <p className="text-[8.5px] font-black text-gray-400 uppercase tracking-wider">GST Amount</p>
                      <p className="text-sm font-black text-gray-900 mt-0.5">₹{(selectedOrder.financials?.gstAmount || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                      <p className="text-[8.5px] font-black text-gray-400 uppercase tracking-wider">Delivery</p>
                      <p className="text-sm font-black text-gray-900 mt-0.5">₹{(selectedOrder.financials?.deliveryAmount || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                      <p className="text-[8.5px] font-black text-brand-primary uppercase tracking-wider">Grand Total</p>
                      <p className="text-base font-black text-brand-primary mt-0.5">₹{(selectedOrder.financials?.totalAmount || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      <p className="text-[8.5px] font-black text-amber-600 uppercase tracking-wider">Advance Paid</p>
                      <p className="text-base font-black text-amber-700 mt-0.5">₹{(selectedOrder.financials?.advancePay || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-red-50 p-2.5 rounded-xl border border-red-200">
                      <p className="text-[8.5px] font-black text-red-600 uppercase tracking-wider">Balance Due</p>
                      <p className="text-base font-black text-red-700 mt-0.5">₹{(selectedOrder.financials?.balanceAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Assets, Documents & Output Files */}
              <div className="p-6 sm:p-8 space-y-8 bg-gray-50/30">
                <section className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pictures */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-2xs space-y-3">
                      <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                        <span>Staff Pictures & References ({[...(selectedOrder.marketing_image ? [selectedOrder.marketing_image] : []), ...(selectedOrder.staffImages || [])].length})</span>
                      </h5>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {selectedOrder.marketing_image && (
                          <div
                            onClick={() => setViewingImage(selectedOrder.marketing_image!)}
                            className="aspect-square bg-purple-50 rounded-xl border-2 border-brand-primary/40 overflow-hidden cursor-pointer relative group shadow-2xs"
                            title="Marketing Main Image"
                          >
                            <img src={selectedOrder.marketing_image} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn size={16} />
                            </div>
                            <span className="absolute bottom-0 inset-x-0 bg-brand-primary/80 text-[7px] text-white text-center font-black uppercase py-0.5">Marketing</span>
                          </div>
                        )}
                        {(selectedOrder.staffImages || []).map((file, idx) => {
                          if (file === selectedOrder.marketing_image) return null;
                          return (
                            <div
                              key={idx}
                              onClick={() => setViewingImage(file)}
                              className="aspect-square bg-gray-100 rounded-xl border border-gray-200 overflow-hidden cursor-pointer relative group hover:shadow-md transition-all shadow-2xs"
                            >
                              <img src={file} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <ZoomIn size={16} />
                              </div>
                            </div>
                          );
                        })}
                        {!selectedOrder.marketing_image && (selectedOrder.staffImages || []).length === 0 && (
                          <p className="text-xs text-gray-400 italic col-span-3 py-4 text-center">No images uploaded</p>
                        )}
                      </div>
                    </div>

                    {/* Staff PDFs & Specs */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-2xs space-y-3">
                      <h5 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                        <span>Staff Documents & Specifications ({(selectedOrder.staffPdfs || []).length})</span>
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {(selectedOrder.staffPdfs || []).map((file, idx) => (
                          <div
                            key={idx}
                            onClick={() => setViewingImage(file)}
                            className="p-3 bg-gray-50 hover:bg-purple-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-gray-600 hover:text-brand-primary"
                          >
                            <FileText size={22} className="text-purple-600" />
                            <span className="text-[9px] font-black uppercase">Doc #{idx + 1}</span>
                            <span className="text-[8px] text-gray-400">View Spec</span>
                          </div>
                        ))}
                        {(selectedOrder.staffPdfs || []).length === 0 && (
                          <p className="text-xs text-gray-400 italic col-span-2 py-4 text-center">No PDF documents</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Design Deliverables Output */}
                  {(selectedOrder.original_design_file || selectedOrder.original_design_zip || (selectedOrder.designAttachments && selectedOrder.designAttachments.length > 0)) && (
                    <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-150 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={14} className="text-purple-600" />
                          Design Deliverables (Ready for Production / Digitizing)
                        </h5>
                        <span className="text-[9px] font-black bg-purple-200/60 text-purple-800 px-2 py-0.5 rounded-full">
                          Original Quality Assets
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedOrder.original_design_file && (
                          <div className="bg-white p-3 rounded-xl border border-purple-200 flex items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                onClick={() => setViewingImage(selectedOrder.original_design_file!)}
                                className="w-10 h-10 rounded-lg overflow-hidden border border-purple-100 bg-gray-50 cursor-pointer relative shrink-0"
                              >
                                <img src={selectedOrder.original_design_file} alt="Original PNG" className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">
                                  {selectedOrder.original_design_filename || 'Original_Design.png'}
                                </p>
                                <span className="text-[9px] text-purple-700 font-extrabold">Original PNG Asset</span>
                              </div>
                            </div>
                            <a
                              href={selectedOrder.original_design_file}
                              download={selectedOrder.original_design_filename || `Design_Original_${selectedOrder.id.slice(-6)}.png`}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[9.5px] font-black uppercase transition-all flex items-center gap-1 shadow-2xs no-underline shrink-0"
                            >
                              <Download size={11} />
                              Download
                            </a>
                          </div>
                        )}

                        {selectedOrder.original_design_zip && (
                          <div className="bg-white p-3 rounded-xl border border-indigo-200 flex items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                <FolderOpen size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">
                                  {selectedOrder.original_design_zip_filename || 'Design_Package.zip'}
                                </p>
                                <span className="text-[9px] text-indigo-700 font-extrabold">Design ZIP Archive</span>
                              </div>
                            </div>
                            <a
                              href={selectedOrder.original_design_zip}
                              download={selectedOrder.original_design_zip_filename || `Design_Package_${selectedOrder.id.slice(-6)}.zip`}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9.5px] font-black uppercase transition-all flex items-center gap-1 shadow-2xs no-underline shrink-0"
                            >
                              <Download size={11} />
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {viewingImage && (
                  <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`Order_${selectedOrder.id}`} />
                )}

                <div className="h-px bg-gray-200" />

                {/* Billing Action Section */}
                <section className="bg-white p-5 rounded-2xl border border-gray-150 shadow-2xs space-y-4">
                  <h5 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                    <CreditCard size={14} className="text-amber-600" />
                    Accounts Billing Action & Document Attachment
                  </h5>
                  <FileUpload
                    key={selectedOrder.id}
                    label="Attach Billing Invoice / Payment Receipt (PNG, JPG, PDF)"
                    onFilesSelected={(files) => setBillingFiles(files)}
                  />
                  <div className="pt-3 flex flex-wrap gap-3">
                    <button
                      onClick={handleHoldOrder}
                      disabled={isProcessing}
                      className={cn(
                        "px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 cursor-pointer border-none",
                        selectedOrder.status === OrderStatus.HOLD ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"
                      )}
                    >
                      {selectedOrder.status === OrderStatus.HOLD ? "✓ Release from Hold" : "⏸ Put on Hold"}
                    </button>
                    <button
                      onClick={handleProcessOrder}
                      disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                      className="flex-1 py-3.5 bg-black text-white rounded-2xl font-black uppercase text-xs tracking-wider hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 cursor-pointer border-none"
                      title="Send invoice to Design team for this account"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Forward & Send to Design</span>
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                  {billingFiles.length === 0 && (
                    <p className="text-[10px] text-center text-amber-600 font-bold font-mono uppercase tracking-wider">
                      Notice: You can attach payment receipts or advance invoices before forwarding.
                    </p>
                  )}
                </section>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-center">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4">
                <CreditCard className="text-gray-300" size={40} />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Select an Order</h4>
              <p className="text-gray-500 max-w-xs mt-2">Choose a pending order from the list on the left to inspect full specs and proceed with billing.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Analytics Graph Model */}
      <div className="pt-4">
        <OrdersChart orders={orders} />
      </div>



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
      )}
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
