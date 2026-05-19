/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { ClipboardCheck, CreditCard, ChevronRight, FileText, ExternalLink, ZoomIn, Share2, Globe, Trash2 } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';

interface AccountsDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
}

export default function AccountsDashboard({ orders, onUpdateOrder, onDeleteOrder, isAdmin }: AccountsDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [billingFiles, setBillingFiles] = useState<string[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingOrders = orders.filter(o => o.status === OrderStatus.ACCOUNTS || o.status === OrderStatus.HOLD);

  const handleProcessOrder = async () => {
    if (!selectedOrder || isProcessing) return;
    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.ORDER_MANAGEMENT,
        accountsAttachments: billingFiles,
        updatedAt: Date.now()
      });
      setSelectedOrder(null);
      setBillingFiles([]);
      alert("Success: Order moved to Management Hub.");
    } catch (e: any) {
      console.error(e);
      alert("An error occurred while moving the order.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHoldOrder = async () => {
    if (!selectedOrder || isProcessing) return;
    const reason = window.prompt("Enter mandatory reason for putting this order on HOLD:");
    if (!reason) {
      alert("Hold reason is mandatory.");
      return;
    }

    setIsProcessing(true);
    try {
      const newNote = `[HOLD] ${new Date().toLocaleString()}: ${reason}`;
      const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n${newNote}` : newNote;

      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.HOLD,
        holdReason: reason,
        previousStatus: selectedOrder.status,
        notes: updatedNotes,
        updatedAt: Date.now()
      });
      setSelectedOrder(prev => prev ? { ...prev, status: OrderStatus.HOLD, holdReason: reason, previousStatus: selectedOrder.status, notes: updatedNotes } : null);
      alert("Order put on HOLD.");
    } catch (e) {
      alert("Action failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Accounts Dashboard</h2>
        <p className="text-gray-500 mt-1">Review and attach billing documentation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="text-amber-500" size={20} />
            Pending Billing ({pendingOrders.length})
          </h3>
          <div className="space-y-3">
            {pendingOrders.length > 0 ? (
              pendingOrders.map(order => (
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
                <p className="text-sm text-gray-500">No orders pending billing</p>
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
                </section>

                {viewingImage && (
                  <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`Order_${selectedOrder.id}`} />
                )}

                <div className="h-px bg-gray-100" />

                <section className="space-y-4">
                  <h5 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Billing Action</h5>
                  <FileUpload
                    label="Add Billing PDF or Picture (Max 100MB)"
                    onFilesSelected={(files) => setBillingFiles(files)}
                  />
                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={handleHoldOrder}
                      disabled={isProcessing}
                      className="px-6 py-4 bg-red-100 text-red-700 rounded-2xl font-bold hover:bg-red-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70"
                    >
                      Hold
                    </button>
                    <button
                      onClick={handleProcessOrder}
                      disabled={isProcessing}
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
                          Move to Order Hub
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

      {/* Global Order Status Section */}
      <div className="pt-8 border-t border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <Globe className="text-brand-primary" size={24} />
          Global Order Status Hub
        </h3>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[300px]">
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
