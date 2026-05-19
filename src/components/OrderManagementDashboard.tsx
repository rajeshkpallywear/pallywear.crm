/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Layers, Package, ChevronRight, FileText, Download, ExternalLink, Paperclip, ZoomIn, Share2, Globe, CreditCard, Trash2, Search, Plus } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { cn, getDisplayCategory } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import InventoryManagement from './InventoryManagement';

interface OrderManagementDashboardProps {
  orders: Order[];
  inventory?: any[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
}

export default function OrderManagementDashboard({ orders, inventory = [], onUpdateOrder, onDeleteOrder, isAdmin }: OrderManagementDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [managementFiles, setManagementFiles] = useState<string[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingOrders = orders.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT));

  const handleRemoveManagementFile = (index: number) => {
    setManagementFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingAttachment = async (field: keyof Order, index: number) => {
    if (!selectedOrder) return;
    const currentList = (selectedOrder[field] as string[]) || [];
    const newList = currentList.filter((_, i) => i !== index);

    try {
      await onUpdateOrder(selectedOrder.id, {
        [field]: newList,
        updatedAt: Date.now()
      });

      // Update local selectedOrder to reflect change
      setSelectedOrder({
        ...selectedOrder,
        [field]: newList
      });
    } catch (e) {
      console.error(e);
    }
  };

  const calculateTotalSize = (files: string[]) => {
    return files.reduce((sum, f) => sum + f.length, 0);
  };

  const handleProcessOrder = async () => {
    if (!selectedOrder || isProcessing) return;

    // Check size estimation
    const currentAttachmentsSize = [
      ...(selectedOrder.staffImages || []),
      ...(selectedOrder.staffPdfs || []),
      ...(selectedOrder.accountsAttachments || [])
    ].reduce((s, f) => s + f.length, 0);

    const newAttachmentsSize = managementFiles.reduce((s, f) => s + f.length, 0);
    const totalSizeEstimate = currentAttachmentsSize + newAttachmentsSize;

    // Firestore 1MB limit check (~850k chars of base64)
    if (totalSizeEstimate > 850000) {
      alert("Error: Total attachment size is too large for the database. Current estimate: " + (totalSizeEstimate / 1024).toFixed(0) + "KB. Please remove some existing attachments or new files.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.PRODUCTION,
        orderManagementAttachments: managementFiles,
        updatedAt: Date.now()
      });

      setSelectedOrder(null);
      setManagementFiles([]);
      alert("Success: Order shared with Production Team.");
    } catch (e: any) {
      console.error("Order Management process failed:", e);
      if (e?.message?.includes("exceeds the maximum allowed size")) {
        alert("Failed to share: The total attachment size is too large for Firestore (Limit: 1MB total). Please remove some images or use smaller files.");
      } else {
        alert("Failed to share order. Error: " + (e?.message?.slice(0, 50)));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Order Management</h2>
          <p className="text-gray-500 mt-1">Finalize files and share with production team</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Sync Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Layers className="text-blue-500" size={20} />
            Ready for Processing ({pendingOrders.length})
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
                    <span className="text-[8px] font-bold uppercase py-0.5 px-1 bg-blue-400/20 rounded">
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
                    Accts OK: {new Date(order.updatedAt).toLocaleTimeString()}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-12 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center">
                <Package className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-sm text-gray-500">Wait for accounts to clear orders</p>
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
              <div className="p-8 bg-gray-50/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h4 className="text-2xl font-bold text-gray-900">Processing Order #{selectedOrder.id.slice(-8)}</h4>
                    {selectedOrder.isUrgent && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-pulse">URGENT</span>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase">
                    Order Mgmt Stage
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Customer Info</h5>
                      <p className="font-bold text-gray-900 text-sm">{selectedOrder.customerInfo.name}</p>
                      <p className="text-xs text-gray-600">{selectedOrder.customerInfo.address}</p>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Specifications</h5>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-black text-white rounded text-[10px] font-bold">{getDisplayCategory(selectedOrder)}</span>
                        <span className="px-2 py-1 bg-gray-900 text-white rounded text-[10px] font-bold">Total Qty: {selectedOrder.quantity || 1}</span>
                      </div>

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

                  <div className="space-y-4">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Financials</h5>
                    <div className="p-4 bg-white border border-gray-100 rounded-2xl space-y-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Total</span>
                        <span className="font-bold text-gray-900">₹{(selectedOrder.financials?.totalAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-amber-500">Advance</span>
                        <span className="font-bold text-amber-600">₹{(selectedOrder.financials?.advancePay || 0).toLocaleString()}</span>
                      </div>
                      <div className="h-px bg-gray-50" />
                      <div className="flex justify-between items-center text-red-600">
                        <span className="text-xs font-black uppercase">Balance</span>
                        <span className="font-black">₹{(selectedOrder.financials?.balanceAmount || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest pt-2">Available Assets</h5>
                    <div className="flex flex-col gap-2">
                      <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                            <Paperclip size={16} />
                            <span>Staff Images ({(selectedOrder.staffImages || []).length})</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(selectedOrder.staffImages || []).map((img, idx) => (
                            <div key={idx} className="group relative w-12 h-12 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
                              <img src={img} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                <button onClick={() => setViewingImage(img)} className="p-1 hover:bg-white/20 rounded text-white shadow-sm"><ZoomIn size={12} /></button>
                                <button onClick={() => handleRemoveExistingAttachment('staffImages', idx)} className="p-1 hover:bg-red-500/50 rounded text-red-100"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                            <FileText size={16} />
                            <span>Staff PDFs ({(selectedOrder.staffPdfs || []).length})</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {(selectedOrder.staffPdfs || []).map((pdf, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group">
                              <span className="text-[10px] text-gray-500 truncate max-w-[150px]">PDF_{idx + 1}</span>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                                <button onClick={() => window.open(pdf)} className="text-[10px] text-blue-600 font-bold">View</button>
                                <button onClick={() => handleRemoveExistingAttachment('staffPdfs', idx)} className="text-red-500"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                            <CreditCard size={16} />
                            <span>Billing Docs ({selectedOrder.accountsAttachments.length})</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {selectedOrder.accountsAttachments.map((f, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg group">
                              <span className="text-[10px] text-gray-500 truncate max-w-[150px]">Doc_{idx + 1}</span>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                                <button onClick={() => setViewingImage(f)} className="text-[10px] text-blue-600 font-bold">View</button>
                                <button onClick={() => handleRemoveExistingAttachment('accountsAttachments', idx)} className="text-red-500"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-sm font-bold text-gray-900">Final Production Files (Gerber/Machine ZIP)</h5>
                    <p className="text-xs text-gray-500">Upload ZIP for machine language or HD images</p>
                  </div>
                  <FileUpload
                    label=""
                    accept="image/*,.pdf,.zip"
                    onFilesSelected={(files) => setManagementFiles(prev => [...prev, ...files])}
                  />

                  {managementFiles.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {managementFiles.map((file, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden aspect-video border border-gray-100 bg-gray-50 flex items-center justify-center">
                          {file.startsWith('data:image/') ? (
                            <img src={file} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <FileText size={32} className="text-blue-500" />
                              <span className="text-[10px] font-bold text-gray-500 uppercase">
                                {file.includes('application/zip') || file.includes('zip') ? 'ZIP' : 'PDF'}
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            {file.startsWith('data:image/') && (
                              <button onClick={() => setViewingImage(file)} className="p-1.5 bg-white/20 rounded-lg text-white hover:bg-white/40"><ZoomIn size={16} /></button>
                            )}
                            <button onClick={() => handleRemoveManagementFile(i)} className="p-1.5 bg-red-500/80 rounded-lg text-white hover:bg-red-600"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {viewingImage && (
                  <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`Order_${selectedOrder.id}`} />
                )}

                <div className="h-px bg-gray-100" />

                <div className="pt-4 flex gap-3">
                  {selectedOrder.status === OrderStatus.HOLD ? (
                    <button
                      disabled={isProcessing}
                      onClick={async () => {
                        const newStatus = selectedOrder.previousStatus || OrderStatus.ORDER_MANAGEMENT;
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
                      }}
                      className="px-6 py-4 bg-green-100 text-green-700 rounded-2xl font-bold hover:bg-green-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                    >
                      Release
                    </button>
                  ) : (
                    <button
                      disabled={isProcessing}
                      onClick={async () => {
                        const reason = window.prompt("Enter Hold Reason:");
                        if (reason === null) return;
                        if (!reason.trim()) {
                          alert("Reason is required.");
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
                      }}
                      className="px-6 py-4 bg-red-100 text-red-700 rounded-2xl font-bold hover:bg-red-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                    >
                      Hold
                    </button>
                  )}

                  <button
                    onClick={handleProcessOrder}
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Moving to Factory...
                      </>
                    ) : (
                      <>
                        <Package size={20} />
                        {selectedOrder.status === OrderStatus.HOLD ? 'Hold Active' : 'Move to Factory'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-center">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-4">
                <Layers className="text-gray-300" size={40} />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Waiting for Orders</h4>
              <p className="text-gray-500 max-w-xs mt-2">Manage files and production readiness here.</p>
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

        {/* Inventory Summary Section */}
        <div className="pt-8 border-t border-gray-100">
          <InventoryManagement userRole={isAdmin ? 'admin' : 'order_management'} />
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
