/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { ClipboardCheck, CreditCard, ChevronRight, ChevronDown, FileText, ExternalLink, ZoomIn, Share2, Globe, Trash2, Download, Package, Activity, TrendingUp, Clock, Building2, Users, Truck, IndianRupee, Store } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn, isOrderSizeValid } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import VendorExpensePage from './VendorExpensePage';
import OtherExpensePage from './OtherExpensePage';

type SidebarView = 'orders' | 'vendor-expense' | 'office-expense' | 'salary' | 'delivery-expense' | 'revenue';

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
  const [selectedSection, setSelectedSection] = useState<'recent' | 'process' | 'hold' | 'completed'>('recent');
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [billingFiles, setBillingFiles] = useState<string[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingOrders = orders.filter(o => o.status === OrderStatus.ACCOUNTS || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS));

  const filteredOrders = orders.filter(o => {
    if (selectedSection === 'hold') {
      return o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS;
    }
    if (selectedSection === 'completed') {
      return ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS].includes(o.status) && !(o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS);
    }
    if (selectedSection === 'process') {
      return o.status === OrderStatus.ACCOUNTS;
    }
    return o.status === OrderStatus.ACCOUNTS || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS);
  });

  const recentOrdersCount = orders.filter(o => o.status === OrderStatus.ACCOUNTS || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS)).length;
  const processOrdersCount = orders.filter(o => o.status === OrderStatus.ACCOUNTS).length;
  const holdOrdersCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS).length;
  const completedOrdersCount = orders.filter(o => ![OrderStatus.DRAFT, OrderStatus.PENDING, OrderStatus.ACCOUNTS].includes(o.status) && !(o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS)).length;

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
        status: OrderStatus.ORDER_MANAGEMENT,
        accountsAttachments: billingFiles,
        updatedAt: Date.now()
      });
      setSelectedOrder(null);
      setBillingFiles([]);
      alert("Success: Order moved to Order Management Hub.");
    } catch (e: any) {
      console.error(e);
      if (e?.message?.includes("exceeds the maximum allowed size")) {
        alert("Action failed: The order document is now too large (Max 100MB). Please reduce the number of attachments.");
      } else {
        alert("An error occurred while moving the order.");
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
            updatedAt: Date.now()
          });
          setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
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
    if (sidebarView === 'revenue') return <OtherExpensePage user={user} expenseType="revenue" title="Revenue" description="Income and revenue records" icon={<IndianRupee size={20}/>} color="#16a34a" extraFields="revenue" />;
    return null;
  };

  return (
    <div className="space-y-6">
      {sidebarView !== 'orders' ? (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          {renderSidebarContent()}
        </div>
      ) : (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Accounts Dashboard</h2>
          <p className="text-gray-500 mt-1">Review and attach billing documentation</p>
        </div>

      {/* Summary Stats Section */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setSelectedSection('recent')}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all cursor-pointer",
            selectedSection === 'recent' ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20 scale-[1.02]" : "bg-white border-gray-100 shadow-sm hover:border-brand-primary/40 hover:scale-[1.01]"
          )}
          title="Recent Orders: All received orders"
        >
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm", selectedSection === 'recent' ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600")}>
            <Package size={18} />
          </div>
          <span className="text-xl font-black leading-none">{recentOrdersCount}</span>
        </button>

        <button
          onClick={() => setSelectedSection('process')}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all cursor-pointer",
            selectedSection === 'process' ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20 scale-[1.02]" : "bg-white border-gray-100 shadow-sm hover:border-brand-primary/40 hover:scale-[1.01]"
          )}
          title="Process Orders: Active in-progress orders"
        >
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm", selectedSection === 'process' ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600")}>
            <Clock size={18} />
          </div>
          <span className="text-xl font-black leading-none">{processOrdersCount}</span>
        </button>

        <button
          onClick={() => setSelectedSection('hold')}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all cursor-pointer",
            selectedSection === 'hold' ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20 scale-[1.02]" : "bg-white border-gray-100 shadow-sm hover:border-brand-primary/40 hover:scale-[1.01]"
          )}
          title="Hold Orders: Blocked/Payment issues"
        >
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm", selectedSection === 'hold' ? "bg-white/20 text-white" : "bg-red-50 text-red-500")}>
            <Activity size={18} />
          </div>
          <span className="text-xl font-black leading-none">{holdOrdersCount}</span>
        </button>

        <button
          onClick={() => setSelectedSection('completed')}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all cursor-pointer",
            selectedSection === 'completed' ? "bg-brand-primary border-brand-primary text-white shadow-md shadow-brand-primary/20 scale-[1.02]" : "bg-white border-gray-100 shadow-sm hover:border-brand-primary/40 hover:scale-[1.01]"
          )}
          title="Completed Orders: Fully delivered and paid"
        >
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-sm", selectedSection === 'completed' ? "bg-white/20 text-white" : "bg-green-50 text-green-600")}>
            <TrendingUp size={18} />
          </div>
          <span className="text-xl font-black leading-none">{completedOrdersCount}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <ClipboardCheck className="text-amber-500" size={16} />
            {selectedSection === 'total' ? 'All Billing Records' : selectedSection === 'hold' ? 'On Hold Billing' : 'Completed Invoices'} ({filteredOrders.length})
          </h3>
          <div className="space-y-3">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedOrder?.id === order.id
                    ? 'bg-black text-white border-black shadow-lg scale-[1.02]'
                    : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono opacity-60">#{order.id.slice(-6)}</span>
                      {order.status === OrderStatus.HOLD && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded ml-1">ON HOLD</span>
                      )}
                      {order.isUrgent && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded animate-pulse">URGENT</span>
                      )}
                    </div>
                    <span className="text-[8px] font-bold uppercase py-0.5 px-1 bg-gray-400/20 rounded">
                      {getDisplayCategory(order)}
                    </span>
                  </div>
                  <div className="font-bold truncate">{order.customerInfo.name}</div>
                  {order.status === OrderStatus.HOLD && order.holdReason && (
                    <div className="text-[10px] text-red-500 font-bold mt-1 bg-red-50 px-1.5 py-0.5 rounded italic border border-red-100">
                      Reason: {order.holdReason}
                    </div>
                  )}
                  <div className={`text-xs mt-1 ${selectedOrder?.id === order.id ? 'text-gray-300' : 'text-gray-500'}`}>
                    Created: {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-12 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center">
                <CreditCard className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-sm text-gray-500">No orders in this state</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedOrder ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="p-8 border-b border-gray-50 bg-gray-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="text-xs font-mono text-gray-400">ORDER DETAILS</span>
                    <h4 className="text-2xl font-bold text-gray-900">#{selectedOrder.id.slice(-8)}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wider">
                      Status: {selectedOrder.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer Info</h5>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{selectedOrder.customerInfo.name}</p>
                      <p className="text-xs text-gray-600">{selectedOrder.customerInfo.phone}</p>
                      <p className="text-xs text-gray-600 mt-1">{selectedOrder.customerInfo.address}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order Category</h5>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{getDisplayCategory(selectedOrder)} <span className="text-xs font-normal text-gray-500">(Total Qty: {selectedOrder.quantity || 1})</span></p>

                      {selectedOrder.sizeBreakdown && selectedOrder.sizeBreakdown.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          {selectedOrder.sizeBreakdown.map((item, idx) => (
                            <div key={idx} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col gap-1">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-black text-brand-primary uppercase">{item.category}</span>
                                <span className="text-[10px] font-black text-gray-900 bg-gray-50 px-1 rounded">{item.size}</span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-bold leading-tight">
                                {item.colour && <div>Col: {item.colour}</div>}
                                {item.printType && <div>Prn: {item.printType}</div>}
                              </div>
                              <div className="mt-1 pt-1 border-t border-gray-50 flex justify-between items-center bg-gray-50/50 -mx-3 -mb-3 px-3 py-2 rounded-b-xl">
                                <span className="text-[10px] font-black text-gray-900">Qty: {item.quantity}</span>
                                <span className="text-[10px] font-black text-brand-primary">₹{item.price}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-white border border-gray-200 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Amount</p>
                    <p className="text-2xl font-black text-gray-900">₹{(selectedOrder.financials?.totalAmount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">Advance Pay</p>
                    <p className="text-2xl font-black text-amber-600">₹{(selectedOrder.financials?.advancePay || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Balance Due</p>
                    <p className="text-2xl font-black text-red-600">₹{(selectedOrder.financials?.balanceAmount || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h5 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Staff Pictures</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(selectedOrder.staffImages || []).map((file, idx) => (
                        <div key={idx} className="aspect-square bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center group relative overflow-hidden">
                          <img src={file} className="w-full h-full object-cover" />
                          <div
                            onClick={() => setViewingImage(file)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          >
                            <ZoomIn size={16} className="text-white" />
                          </div>
                        </div>
                      ))}
                      {(selectedOrder.staffImages || []).length === 0 && <p className="text-xs text-gray-400 italic">No pictures</p>}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Staff PDFs</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(selectedOrder.staffPdfs || []).map((file, idx) => (
                        <div key={idx} className="aspect-square bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center group relative overflow-hidden">
                          <FileText size={24} className="text-gray-400" />
                          <div
                            onClick={() => setViewingImage(file)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          >
                            <ExternalLink size={16} className="text-white" />
                          </div>
                        </div>
                      ))}
                      {(selectedOrder.staffPdfs || []).length === 0 && <p className="text-xs text-gray-400 italic">No PDFs</p>}
                    </div>
                  </div>
                  {(selectedOrder.designAttachments?.length || 0) > 0 && (
                    <div className="md:col-span-2">
                      <h5 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-4 border-t border-gray-50 pt-4">Design Studio Output</h5>
                      <div className="flex flex-wrap gap-3">
                        {selectedOrder.designAttachments?.map((file, idx) => (
                          <div key={idx} onClick={() => setViewingImage(file)} className="w-16 h-16 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-center cursor-pointer hover:shadow-md transition-all text-purple-500">
                            {file.startsWith('data:image/') ? <img src={file} className="w-full h-full object-cover rounded-xl" /> : <FileText size={24} />}
                          </div>
                        ))}
                        {selectedOrder.designMachineFiles?.map((file, idx) => (
                          <div key={idx} onClick={() => setViewingImage(file)} className="w-16 h-16 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center cursor-pointer hover:shadow-md transition-all text-indigo-500">
                            <Download size={24} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {viewingImage && (
                  <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`Order_${selectedOrder.id}`} />
                )}

                <div className="h-px bg-gray-100" />

                <section className="space-y-4">
                  <h5 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Billing Action</h5>
                  <FileUpload
                    label="Add Billing PDF or Picture (Auto-Optimized)"
                    onFilesSelected={(files) => setBillingFiles(files)}
                  />
                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={handleHoldOrder}
                      disabled={isProcessing}
                      className={cn(
                        "px-6 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70",
                        selectedOrder.status === OrderStatus.HOLD ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"
                      )}
                    >
                      {selectedOrder.status === OrderStatus.HOLD ? "Release" : "Hold"}
                    </button>
                    <button
                      onClick={handleProcessOrder}
                      disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                      className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Moving...
                        </>
                      ) : (
                        <>
                          <ChevronRight size={20} />
                          {selectedOrder.status === OrderStatus.HOLD ? 'Hold Active' : 'Move to Order Management'}
                        </>
                      )}
                    </button>
                    {billingFiles.length === 0 && (
                      <p className="text-[10px] text-center text-amber-600 font-bold mt-2 font-mono uppercase tracking-wider">
                        Warning: No billing documents attached
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-center">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4">
                <CreditCard className="text-gray-300" size={40} />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Select an Order</h4>
              <p className="text-gray-500 max-w-xs mt-2">Choose a pending order from the list on the left to start billing process.</p>
            </div>
          )}
        </div>
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
