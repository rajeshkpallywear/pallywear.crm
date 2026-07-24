
import { motion } from 'motion/react';
import { X, User, Phone, MapPin, FileText, Globe, Clock, AlertCircle, CheckCircle, Download, ZoomIn } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import ImageViewer from './ImageViewer';
import WorkflowVisualizer from './WorkflowVisualizer';
import { useState, useEffect } from 'react';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus?: (status: OrderStatus) => void;
  onUpdateOrder?: (id: string, updates: Partial<Order>) => Promise<void>;
  isAdmin?: boolean;
  onEdit?: (order: Order) => void;
}

export default function OrderDetailModal({ order, onClose, onUpdateStatus, onUpdateOrder, isAdmin, onEdit }: OrderDetailModalProps) {
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Order>(order);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [noteModal, setNoteModal] = useState<{
    target: 'design' | 'accounts';
    noteText: string;
  } | null>(null);

  useEffect(() => {
    setEditedOrder(order);
  }, [order]);

  const handleSave = async () => {
    if (!onUpdateOrder) return;
    setIsSaving(true);
    try {
      await onUpdateOrder(order.id, { ...editedOrder, updatedAt: Date.now() });
      setIsEditing(false);
    } catch (error) {
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusStyles = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DRAFT: return 'bg-gray-100 text-gray-600';
      case OrderStatus.PENDING: return 'bg-red-100 text-red-700';
      case OrderStatus.ACCOUNTS: return 'bg-amber-100 text-amber-700';
      case OrderStatus.DESIGN: return 'bg-purple-100 text-purple-700';
      case OrderStatus.ORDER_MANAGEMENT: return 'bg-blue-100 text-blue-700';
      case OrderStatus.PRODUCTION: return 'bg-purple-100 text-purple-700';
      case OrderStatus.DELIVERY: return 'bg-orange-100 text-orange-700';
      case OrderStatus.DELIVERED: return 'bg-green-100 text-green-700';
      case OrderStatus.HOLD: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[40px] shadow-2xl w-full max-w-5xl overflow-hidden"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h3 className="text-3xl font-black text-gray-900 tracking-tighter">Order Details</h3>
              <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest ${getStatusStyles(order.status)}`}>
                {order.status.replace('_', ' ')}
              </span>
              {order.isUrgent && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-pulse uppercase">URGENT</span>
              )}
            </div>
            <span className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-widest">Access Protocol - ID: #{order.id}</span>
          </div>
          <div className="flex items-center gap-3">
            {onUpdateOrder && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-3 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-brand-primary/90 transition-all shadow-md"
              >
                Edit Details
              </button>
            )}
            {onEdit && !isEditing && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(order);
                }}
                className="px-6 py-3 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-800 transition-all shadow-md"
              >
                Edit Order Form
              </button>
            )}
            {isEditing && (
              <button
                disabled={isSaving}
                onClick={handleSave}
                className="px-6 py-3 bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-green-700 transition-all shadow-md flex items-center gap-2"
              >
                {isSaving ? 'Saving...' : 'Confirm Update'}
              </button>
            )}
            {isEditing && (
              <button
                onClick={() => { setIsEditing(false); setEditedOrder(order); }}
                className="px-6 py-3 bg-gray-200 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onClose}
              className="p-3 hover:bg-white rounded-2xl shadow-sm border border-transparent hover:border-gray-100 transition-all text-gray-400 hover:text-gray-900"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-8 flex flex-col gap-8 max-h-[70vh] overflow-y-auto">
          <WorkflowVisualizer order={order} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100/50 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Customer Contact</p>
                  <div className="space-y-3">
                    {isEditing ? (
                      <>
                        <input
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm"
                          value={editedOrder.customerInfo.name}
                          onChange={e => setEditedOrder({ ...editedOrder, customerInfo: { ...editedOrder.customerInfo, name: e.target.value } })}
                          placeholder="Customer Name"
                        />
                        <input
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm"
                          value={editedOrder.customerInfo.phone}
                          onChange={e => setEditedOrder({ ...editedOrder, customerInfo: { ...editedOrder.customerInfo, phone: e.target.value } })}
                          placeholder="Phone"
                        />
                        <textarea
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs"
                          value={editedOrder.customerInfo.address}
                          onChange={e => setEditedOrder({ ...editedOrder, customerInfo: { ...editedOrder.customerInfo, address: e.target.value } })}
                          placeholder="Address"
                          rows={2}
                        />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 text-gray-900 font-bold">
                          <User size={18} className="text-brand-primary" />
                          {order.customerInfo.name}
                        </div>
                        <div className="flex items-center gap-3 text-gray-500 text-sm font-medium">
                          <Phone size={18} className="text-brand-primary/60" />
                          {order.customerInfo.phone}
                        </div>
                        <div className="flex flex-start gap-3 text-gray-500 text-xs mt-2 italic leading-relaxed">
                          <MapPin size={18} className="text-brand-primary/40 shrink-0" />
                          {order.customerInfo.address}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-brand-primary/5 p-6 rounded-[32px] border border-brand-primary/10 shadow-sm flex flex-col justify-between">
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-2">Billing Data</p>
                  <div className="space-y-4">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase">Grand Total</label>
                          <input
                            type="number"
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-black text-lg"
                            value={editedOrder.financials.totalAmount}
                            onChange={e => {
                              const total = parseFloat(e.target.value) || 0;
                              setEditedOrder({ ...editedOrder, financials: { ...editedOrder.financials, totalAmount: total, balanceAmount: total - editedOrder.financials.advancePay } });
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase">Advance Paid</label>
                          <input
                            type="number"
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-sm text-green-600"
                            value={editedOrder.financials.advancePay}
                            onChange={e => {
                              const adv = parseFloat(e.target.value) || 0;
                              setEditedOrder({ ...editedOrder, financials: { ...editedOrder.financials, advancePay: adv, balanceAmount: editedOrder.financials.totalAmount - adv } });
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">Grand Total</span>
                          <span className="text-2xl font-black text-gray-900">₹{(order.financials?.totalAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-green-600">Paid Amount</span>
                            <span className="font-black text-gray-900">₹{(order.financials?.advancePay || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-red-600">Pending Pay</span>
                            <span className="font-black text-gray-900">₹{(order.financials?.balanceAmount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-[32px] shadow-sm p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Itemised Breakdown</p>
                  <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {isEditing ? (
                      editedOrder.sizeBreakdown?.reduce((sum, i) => sum + i.quantity, 0) || editedOrder.quantity || 0
                    ) : (
                      order.sizeBreakdown?.reduce((sum, i) => sum + i.quantity, 0) || order.quantity || 0
                    )} Total Units
                  </span>
                </div>
                <div className="space-y-3">
                  {isEditing ? (
                    editedOrder.sizeBreakdown?.length ? (
                      editedOrder.sizeBreakdown.map((item, idx) => (
                        <div key={idx} className="p-4 bg-white rounded-2xl border border-gray-200 space-y-3 shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-brand-primary uppercase">{item.category}</span>
                            <input
                              type="text"
                              className="w-20 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-center"
                              value={item.size}
                              onChange={e => {
                                const updated = [...editedOrder.sizeBreakdown];
                                updated[idx] = { ...updated[idx], size: e.target.value };
                                setEditedOrder({ ...editedOrder, sizeBreakdown: updated });
                              }}
                              placeholder="Size"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase">Quantity</label>
                              <input
                                type="number"
                                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                                value={item.quantity}
                                onChange={e => {
                                  const qty = parseInt(e.target.value, 10) || 0;
                                  const updated = [...editedOrder.sizeBreakdown];
                                  updated[idx] = { ...updated[idx], quantity: qty };
                                  const newQty = updated.reduce((sum, i) => sum + i.quantity, 0);
                                  const newTotal = updated.reduce((sum, i) => sum + (i.quantity * i.price), 0);
                                  setEditedOrder({
                                    ...editedOrder,
                                    sizeBreakdown: updated,
                                    quantity: newQty,
                                    financials: {
                                      ...editedOrder.financials,
                                      totalAmount: newTotal,
                                      balanceAmount: newTotal - editedOrder.financials.advancePay
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase">Rate (₹)</label>
                              <input
                                type="number"
                                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-brand-primary"
                                value={item.price}
                                onChange={e => {
                                  const rate = parseFloat(e.target.value) || 0;
                                  const updated = [...editedOrder.sizeBreakdown];
                                  updated[idx] = { ...updated[idx], price: rate };
                                  const newTotal = updated.reduce((sum, i) => sum + (i.quantity * i.price), 0);
                                  setEditedOrder({
                                    ...editedOrder,
                                    sizeBreakdown: updated,
                                    financials: {
                                      ...editedOrder.financials,
                                      totalAmount: newTotal,
                                      balanceAmount: newTotal - editedOrder.financials.advancePay
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[8px]">
                            <div>
                              <label className="text-[8px] text-gray-400 block mb-0.5">Material</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                                value={item.material || ''}
                                onChange={e => {
                                  const updated = [...editedOrder.sizeBreakdown];
                                  updated[idx] = { ...updated[idx], material: e.target.value };
                                  setEditedOrder({ ...editedOrder, sizeBreakdown: updated });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-[8px] text-gray-400 block mb-0.5">Colour</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                                value={item.colour || ''}
                                onChange={e => {
                                  const updated = [...editedOrder.sizeBreakdown];
                                  updated[idx] = { ...updated[idx], colour: e.target.value };
                                  setEditedOrder({ ...editedOrder, sizeBreakdown: updated });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-[8px] text-gray-400 block mb-0.5">Print</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                                value={item.printType || ''}
                                onChange={e => {
                                  const updated = [...editedOrder.sizeBreakdown];
                                  updated[idx] = { ...updated[idx], printType: e.target.value };
                                  setEditedOrder({ ...editedOrder, sizeBreakdown: updated });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-[8px] text-gray-400 block mb-0.5">Model</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                                value={item.model || ''}
                                onChange={e => {
                                  const updated = [...editedOrder.sizeBreakdown];
                                  updated[idx] = { ...updated[idx], model: e.target.value };
                                  setEditedOrder({ ...editedOrder, sizeBreakdown: updated });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400 italic text-xs bg-gray-50 rounded-[24px]">
                        No specific size breakdown available to edit.
                      </div>
                    )
                  ) : (
                    order.sizeBreakdown?.length ? (
                      order.sizeBreakdown.map((item, idx) => (
                        <div key={idx} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-brand-primary/20 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-black text-brand-primary uppercase tracking-tight">{item.category}</span>
                            <span className="text-xs font-black text-gray-900 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">{item.size}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            {item.material && <div><span className="text-[8px] text-gray-400 block mb-0.5">Material</span>{item.material}</div>}
                            {item.colour && <div><span className="text-[8px] text-gray-400 block mb-0.5">Colour</span>{item.colour}</div>}
                            {item.printType && <div><span className="text-[8px] text-gray-400 block mb-0.5">Print</span>{item.printType}</div>}
                            {item.model && <div><span className="text-[8px] text-gray-400 block mb-0.5">Model</span>{item.model}</div>}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-end">
                            <div className="flex items-center gap-4">
                              <span className="text-[10px] font-black text-gray-900">Qty: {item.quantity}</span>
                              <span className="text-[10px] font-black text-brand-primary">Rate: ₹{item.price}</span>
                            </div>
                            <span className="text-xs font-black text-gray-900">Total: ₹{(item.quantity * (item.price || 0)).toLocaleString()}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400 italic text-xs bg-gray-50 rounded-[24px]">
                        No specific size breakdown available for this record.
                      </div>
                    )
                  )}
                </div>
              </div>

              {Object.keys(order.details || {}).length > 0 && (
                <div className="bg-gray-50/30 rounded-[32px] p-6 border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Technical Details</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(order.details).map(([k, v]) => (
                      <div key={k} className="px-3 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <span className="text-[10px] font-black text-gray-400 uppercase block">{k}</span>
                        <span className="text-sm font-bold text-gray-900">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100/50 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Visual Evidence</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Pictures</p>
                    <div className="flex flex-wrap gap-2">
                      {order.staffImages?.map((img, i) => (
                        <div
                          key={i}
                          onClick={() => setViewingImage(img)}
                          className="w-16 h-16 rounded-xl border border-white shadow-sm overflow-hidden cursor-pointer hover:scale-105 transition-all"
                        >
                          <img src={img} className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {!order.staffImages?.length && <span className="text-[10px] text-gray-300 italic">None</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Documents</p>
                    <div className="flex flex-wrap gap-2">
                      {order.staffPdfs?.map((pdf, i) => (
                        <div
                          key={i}
                          onClick={() => setViewingImage(pdf)}
                          className="w-16 h-16 rounded-xl bg-white border border-gray-100 flex items-center justify-center cursor-pointer hover:shadow-md transition-all text-gray-400 hover:text-brand-primary"
                          title="Staff PDF"
                        >
                          <FileText size={24} />
                        </div>
                      ))}
                      {!order.staffPdfs?.length && <span className="text-[10px] text-gray-300 italic">None</span>}
                    </div>
                  </div>
                  {order.orderManagementAttachments?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase mb-2">Management Files</p>
                      <div className="flex flex-wrap gap-2">
                        {order.orderManagementAttachments.map((file, i) => (
                          <div
                            key={i}
                            onClick={() => setViewingImage(file)}
                            className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all text-blue-500 group"
                          >
                            {file.includes('zip') ? <Download size={24} /> : <FileText size={24} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {order.designAttachments && order.designAttachments.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2">Design Output / Deliverables</p>
                      <div className="flex flex-wrap gap-3">
                        {order.designAttachments.map((file, i) => {
                          const isImage = file.startsWith('data:image/') || file.includes('image/');
                          return (
                            <div key={i} className="flex flex-col gap-2 p-2 bg-purple-50/50 rounded-2xl border border-purple-100 group relative">
                              <div className="w-16 h-16 rounded-xl overflow-hidden relative bg-white flex items-center justify-center border border-purple-200">
                                {isImage ? (
                                  <img src={file} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex flex-col items-center gap-1 text-purple-600">
                                    <FileText size={20} />
                                    <span className="text-[7px] font-black uppercase">ZIP / FILE</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                  {isImage && (
                                    <button
                                      onClick={() => setViewingImage(file)}
                                      className="p-1 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all border-none cursor-pointer"
                                    >
                                      <ZoomIn size={12} />
                                    </button>
                                  )}
                                  <a
                                    href={file}
                                    download={`Design_Output_${i + 1}_Order_${order.id.slice(-6)}`}
                                    className="p-1 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all cursor-pointer"
                                  >
                                    <Download size={12} />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(order.notes || order.designNotes) && (
                    <div className="mt-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-100 text-left">
                      <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block mb-1">Marketing / Design Notes</span>
                      <p className="text-xs font-semibold text-purple-900 whitespace-pre-line">"{order.notes || order.designNotes}"</p>
                    </div>
                  )}
                  {order.accountsNotes && (
                    <div className="mt-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-left">
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block mb-1">Accounts Notes</span>
                      <p className="text-xs font-semibold text-amber-900 italic">"{order.accountsNotes}"</p>
                    </div>
                  )}
                  {order.machineFiles?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase mb-2">Machine Language (ZIP)</p>
                      <div className="flex flex-wrap gap-2">
                        {order.machineFiles.map((file, i) => (
                          <div
                            key={i}
                            onClick={() => setViewingImage(file)}
                            className="w-16 h-16 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center cursor-pointer hover:shadow-md transition-all text-indigo-500"
                          >
                            <Download size={24} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {order.accountsAttachments?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-amber-500 uppercase mb-2">Billing Docs</p>
                      <div className="flex flex-wrap gap-2">
                        {order.accountsAttachments.map((file, i) => (
                          <div
                            key={i}
                            onClick={() => setViewingImage(file)}
                            className="w-16 h-16 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center cursor-pointer hover:shadow-md transition-all text-amber-500"
                          >
                            {file.startsWith('data:image/') ? <img src={file} className="w-full h-full object-cover rounded-xl" /> : <FileText size={24} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {onUpdateStatus && (
                <div className="bg-gray-900 p-6 rounded-[32px] shadow-xl text-white space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Management Actions</p>
                  <div className="grid grid-cols-1 gap-2">
                    {order.status === OrderStatus.HOLD ? (
                      <div className="space-y-3">
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                          <p className="text-[10px] font-black text-red-400 uppercase mb-1">Hold Reason</p>
                          <p className="text-sm font-bold text-red-700">{order.holdReason || 'No reason provided'}</p>
                        </div>
                        <button
                          disabled={isProcessingAction}
                          onClick={async () => {
                            const newStatus = order.previousStatus || OrderStatus.ACCOUNTS;
                            if (window.confirm(`Release order back to ${newStatus.replace('_', ' ')}?`)) {
                              setIsProcessingAction(true);
                              try {
                                if (onUpdateOrder) {
                                  await onUpdateOrder(order.id, {
                                    status: newStatus,
                                    previousStatus: undefined,
                                    updatedAt: Date.now()
                                  });
                                } else if (onUpdateStatus) {
                                  onUpdateStatus(newStatus);
                                }
                                alert("Order released successfully.");
                              } catch (e) {
                                alert("Failed to release order.");
                              } finally {
                                setIsProcessingAction(false);
                              }
                            }
                          }}
                          className="w-full py-3 bg-green-500/20 text-green-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <CheckCircle size={14} /> {isProcessingAction ? 'Processing...' : 'Release Order'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {order.status === OrderStatus.PENDING && (
                          <div className="flex flex-col gap-2">
                            <button
                              disabled={isProcessingAction}
                              onClick={() => {
                                setNoteModal({
                                  target: 'design',
                                  noteText: ''
                                });
                              }}
                              className="w-full py-3 bg-purple-600 hover:bg-purple-750 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-black cursor-pointer"
                            >
                              <CheckCircle size={14} /> Send to Designs
                            </button>
                            <button
                              disabled={isProcessingAction}
                              onClick={() => {
                                setNoteModal({
                                  target: 'accounts',
                                  noteText: ''
                                });
                              }}
                              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-black cursor-pointer"
                            >
                              <CheckCircle size={14} /> Send to Accounts
                            </button>
                          </div>
                        )}
                        <button
                          disabled={isProcessingAction}
                          onClick={async () => {
                            const reason = window.prompt("Enter Mandatory Hold Reason:");
                            if (reason === null) return; // Cancelled
                            if (!reason.trim()) {
                              alert("Hold reason is required.");
                              return;
                            }

                            setIsProcessingAction(true);
                            try {
                              const newNote = `[HOLD] ${new Date().toLocaleString()}: ${reason}`;
                              const updatedNotes = order.notes ? `${order.notes}\n${newNote}` : newNote;

                              const updates = {
                                status: OrderStatus.HOLD,
                                holdReason: reason.trim(),
                                previousStatus: order.status,
                                notes: updatedNotes,
                                updatedAt: Date.now()
                              };

                              if (onUpdateOrder) {
                                await onUpdateOrder(order.id, updates);
                              } else if (onUpdateStatus) {
                                onUpdateStatus(OrderStatus.HOLD);
                              }
                              alert("Order put on HOLD.");
                            } catch (e) {
                              alert("Failed to put order on hold.");
                            } finally {
                              setIsProcessingAction(false);
                            }
                          }}
                          className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <AlertCircle size={14} /> {isProcessingAction ? 'Processing...' : 'Hold Order'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        <div className="p-8 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-gray-400">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest">Timestamp</span>
              <span className="text-sm font-black text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="w-px h-8 bg-gray-200 hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest">Agent</span>
              <span className="text-sm font-black text-gray-900">{order.customerInfo.name.split(' ')[0]} Hub</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-10 py-4 bg-black text-white rounded-[24px] font-black uppercase tracking-[0.1em] text-xs hover:bg-gray-800 active:scale-95 transition-all shadow-xl"
          >
            Close Report
          </button>
        </div>

        {viewingImage && (
          <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`Order_${order.id}`} />
        )}
        {noteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  {noteModal.target === 'design' ? 'Send to Designs' : 'Send to Accounts'}
                </h3>
                <button
                  onClick={() => setNoteModal(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Instructions / Notes (Required)
                  </label>
                  <textarea
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all resize-none"
                    rows={4}
                    placeholder={
                      noteModal.target === 'design' 
                        ? "Enter design requirements, dimensions, logo placement..." 
                        : "Enter billing instructions, payment terms, advance details..."
                    }
                    value={noteModal.noteText}
                    onChange={(e) => setNoteModal({ ...noteModal, noteText: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setNoteModal(null)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!noteModal.noteText.trim() || isProcessingAction}
                    onClick={async () => {
                      if (!noteModal.noteText.trim()) return;
                      setIsProcessingAction(true);
                      try {
                        const updates: Partial<Order> = {
                          status: noteModal.target === 'design' ? OrderStatus.DESIGN : OrderStatus.ACCOUNTS,
                          updatedAt: Date.now()
                        };
                        if (noteModal.target === 'design') {
                          updates.designNotes = noteModal.noteText.trim();
                        } else {
                          updates.accountsNotes = noteModal.noteText.trim();
                        }
                        
                        if (onUpdateOrder) {
                          await onUpdateOrder(order.id, updates);
                        } else if (onUpdateStatus) {
                          onUpdateStatus(updates.status);
                        }
                        
                        alert(`Success: Order sent to ${noteModal.target === 'design' ? 'Designs' : 'Accounts'}.`);
                        setNoteModal(null);
                        onClose();
                      } catch (err) {
                        alert("Failed to update order.");
                      } finally {
                        setIsProcessingAction(false);
                      }
                    }}
                    className="flex-1 py-3 bg-brand-primary hover:bg-opacity-95 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md text-center"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
