import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Truck, Download, ChevronRight, FileText, CheckCircle, Package, ZoomIn, Share2, Globe, Trash2, TrendingUp, MapPin, Phone, Clock, AlertCircle, ExternalLink, Activity } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import ImageViewer from './ImageViewer';

interface DeliveryDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
}

export default function DeliveryDashboard({ orders, onUpdateOrder, onDeleteOrder, isAdmin }: DeliveryDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSection, setSelectedSection] = useState<'recent' | 'process' | 'hold' | 'completed'>('recent');
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredOrders = orders.filter(o => {
    if (selectedSection === 'hold') {
      return o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY;
    }
    if (selectedSection === 'completed') {
      return o.status === OrderStatus.DELIVERED;
    }
    if (selectedSection === 'process') {
      return o.status === OrderStatus.DELIVERY;
    }
    return o.status === OrderStatus.DELIVERY || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY);
  });

  // Auto-select first order when section or filtered order list changes
  useEffect(() => {
    if (filteredOrders.length > 0) {
      if (!selectedOrder || !filteredOrders.some(o => o.id === selectedOrder.id)) {
        setSelectedOrder(filteredOrders[0]);
      }
    } else {
      setSelectedOrder(null);
    }
  }, [selectedSection, filteredOrders.length]);

  const recentOrdersCount = orders.filter(o => o.status === OrderStatus.DELIVERY || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY)).length;
  const processOrdersCount = orders.filter(o => o.status === OrderStatus.DELIVERY).length;
  const holdOrdersCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY).length;
  const completedOrdersCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;

  const handleFinishDelivery = async () => {
    if (!selectedOrder || isProcessing) return;
    setIsProcessing(true);

    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.DELIVERED,
        updatedAt: Date.now()
      });

      setSelectedOrder(null);
      alert("Order successfully delivered!");
    } catch (e) {
      console.error(e);
      alert("Failed to confirm delivery.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white text-slate-800 p-6 rounded-3xl border border-gray-100 shadow-xs space-y-8 text-left">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.25em] block mb-1">Pallywear CRM Portal</span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Order Fulfillment & Delivery Status</h2>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2.5 bg-slate-50 border border-gray-200 hover:border-orange-500/20 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Sync Data
        </button>
      </div>

      {/* Dynamic Real Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <button
          onClick={() => setSelectedSection('recent')}
          className={cn(
            "flex items-center gap-2.5 p-2.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer text-left",
            selectedSection === 'recent' ? "bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-600/20 scale-[1.02]" : "bg-white border-gray-100 shadow-xs hover:border-orange-500/40 hover:scale-[1.01]"
          )}
        >
          <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shadow-xs shrink-0", selectedSection === 'recent' ? "bg-white/20 text-white" : "bg-orange-50 text-orange-600")}>
            <Package size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[9px] font-bold uppercase tracking-wider truncate", selectedSection === 'recent' ? "text-white/80" : "text-gray-400")}>All Shipments</p>
            <p className="text-sm sm:text-xl font-black leading-none mt-0.5">{recentOrdersCount}</p>
          </div>
        </button>

        <button
          onClick={() => setSelectedSection('process')}
          className={cn(
            "flex items-center gap-2.5 p-2.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer text-left",
            selectedSection === 'process' ? "bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-600/20 scale-[1.02]" : "bg-white border-gray-100 shadow-xs hover:border-orange-500/40 hover:scale-[1.01]"
          )}
        >
          <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shadow-xs shrink-0", selectedSection === 'process' ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600")}>
            <Truck size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[9px] font-bold uppercase tracking-wider truncate", selectedSection === 'process' ? "text-white/80" : "text-gray-400")}>In Transit</p>
            <p className="text-sm sm:text-xl font-black leading-none mt-0.5">{processOrdersCount}</p>
          </div>
        </button>

        <button
          onClick={() => setSelectedSection('hold')}
          className={cn(
            "flex items-center gap-2.5 p-2.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer text-left",
            selectedSection === 'hold' ? "bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-600/20 scale-[1.02]" : "bg-white border-gray-100 shadow-xs hover:border-orange-500/40 hover:scale-[1.01]"
          )}
        >
          <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shadow-xs shrink-0", selectedSection === 'hold' ? "bg-white/20 text-white" : "bg-red-50 text-red-500")}>
            <Activity size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[9px] font-bold uppercase tracking-wider truncate", selectedSection === 'hold' ? "text-white/80" : "text-gray-400")}>Holds</p>
            <p className="text-sm sm:text-xl font-black leading-none mt-0.5">{holdOrdersCount}</p>
          </div>
        </button>

        <button
          onClick={() => setSelectedSection('completed')}
          className={cn(
            "flex items-center gap-2.5 p-2.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer text-left",
            selectedSection === 'completed' ? "bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-600/20 scale-[1.02]" : "bg-white border-gray-100 shadow-xs hover:border-orange-500/40 hover:scale-[1.01]"
          )}
        >
          <div className={cn("w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors shadow-xs shrink-0", selectedSection === 'completed' ? "bg-white/20 text-white" : "bg-green-50 text-green-600")}>
            <TrendingUp size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[9px] font-bold uppercase tracking-wider truncate", selectedSection === 'completed' ? "text-white/80" : "text-gray-400")}>Delivered</p>
            <p className="text-sm sm:text-xl font-black leading-none mt-0.5">{completedOrdersCount}</p>
          </div>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Delivery Queue */}
        <div className="space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Delivery Queue ({filteredOrders.length})</h4>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={cn(
                    "w-full text-left p-5 rounded-3xl border transition-all flex flex-col gap-3 hover:scale-[1.01] cursor-pointer",
                    selectedOrder?.id === order.id
                      ? "bg-orange-600 border-orange-600 text-white shadow-lg"
                      : "bg-slate-50 border-gray-200 text-slate-800 hover:bg-slate-100/85"
                  )}
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="flex flex-col">
                      <span className={cn("text-[10px] font-mono", selectedOrder?.id === order.id ? "text-orange-100" : "text-slate-400")}>#{order.id.slice(-6)}</span>
                      {order.status === OrderStatus.HOLD && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded w-fit mt-1">HOLD</span>
                      )}
                      {order.isUrgent && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse w-fit mt-0.5">URGENT</span>
                      )}
                    </div>
                    <span className={cn("px-2 py-0.5 text-[8px] uppercase font-bold rounded", selectedOrder?.id === order.id ? "bg-orange-700/50 text-orange-100" : "bg-gray-200 text-gray-700")}>
                      {getDisplayCategory(order)}
                    </span>
                  </div>

                  <div className="font-bold text-base uppercase italic leading-tight">{order.customerInfo.name}</div>

                  {order.status === OrderStatus.HOLD && order.holdReason && (
                    <div className="text-[9px] text-red-600 font-bold bg-red-50 p-2 rounded italic border border-red-200/50">
                      Blocked Reason: "{order.holdReason}"
                    </div>
                  )}

                  <div className={cn("text-[9px] flex items-center gap-1.5", selectedOrder?.id === order.id ? "text-orange-100" : "text-slate-500")}>
                    <MapPin size={10} className="shrink-0" />
                    <span className="truncate">{order.customerInfo.address || 'No address specified'}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-10 bg-slate-50 border border-dashed border-gray-200 rounded-3xl text-center">
                <CheckCircle className="mx-auto text-slate-400 mb-2" size={24} />
                <p className="text-xs text-slate-500 font-medium">No active delivery orders found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Delivery Workspace */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 border border-gray-200 rounded-[2rem] p-6 shadow-md space-y-6 text-slate-800"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
                <div>
                  <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest font-bold">Delivery Active Node</span>
                  <h4 className="text-2xl font-black text-slate-900 uppercase italic mt-0.5">#{selectedOrder.id.slice(-8)}</h4>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedHubOrder(selectedOrder)}
                    className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                    title="Click to open full size page for this order"
                  >
                    <ExternalLink size={14} />
                    View Full Size Order
                  </button>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase block">Phone Dial</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                      <Phone size={12} className="text-orange-600" />
                      <a href={`tel:${selectedOrder.customerInfo.phone}`} className="hover:text-orange-600 no-underline text-slate-900">
                        {selectedOrder.customerInfo.phone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Details & Balance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shipping Address</span>
                  <div className="p-4 bg-white border border-gray-200 rounded-2xl flex items-start gap-3 shadow-xs">
                    <MapPin size={20} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-700 font-bold leading-relaxed">{selectedOrder.customerInfo.address || 'No address specified'}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cash Balance Due</span>
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col justify-center shadow-xs">
                    <span className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-0.5">Payment Collect</span>
                    <span className="text-2xl font-black text-red-600 italic">₹{(selectedOrder.financials?.balanceAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Order Breakdown ({selectedOrder.quantity} units)</span>
                <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                  {selectedOrder.sizeBreakdown?.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white border border-gray-200 rounded-xl flex justify-between items-center shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{item.size}</span>
                        <span className="text-xs text-slate-600 font-semibold">{item.colour} {item.printType && `| ${item.printType}`}</span>
                      </div>
                      <span className="text-xs text-slate-900 font-black italic">x {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 border-t border-gray-200 pt-4">
                {selectedOrder.status === OrderStatus.HOLD ? (
                  <button
                    disabled={isProcessing}
                    onClick={async () => {
                      const newStatus = selectedOrder.previousStatus || OrderStatus.DELIVERY;
                      if (window.confirm(`Release order back to ${newStatus}?`)) {
                        setIsProcessing(true);
                        try {
                          await onUpdateOrder(selectedOrder.id, {
                            status: newStatus,
                            previousStatus: undefined,
                            updatedAt: Date.now()
                          });
                          setSelectedOrder(prev => prev ? { ...prev, status: newStatus, previousStatus: undefined } : null);
                          alert("Order released back to active delivery.");
                        } catch (e) {
                          alert("Action failed.");
                        } finally {
                          setIsProcessing(false);
                        }
                      }
                    }}
                    className="px-6 py-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl font-black uppercase text-xs hover:bg-green-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    Release Hold
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
                        alert("Order shipment put on Hold.");
                      } catch (e) {
                        alert("Action failed.");
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    className="px-6 py-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-black uppercase text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <AlertCircle size={14} />
                    Hold Ship
                  </button>
                )}

                {selectedOrder.status === OrderStatus.DELIVERED ? (
                  <div className="flex-1 py-4 bg-green-50 text-green-700 border border-green-200 rounded-2xl font-black uppercase text-center flex items-center justify-center gap-2 text-xs">
                    <CheckCircle size={16} />
                    Delivered Successfully
                  </div>
                ) : (
                  <button
                    onClick={handleFinishDelivery}
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 shadow-lg shadow-orange-600/10"
                  >
                    {isProcessing ? "Confirming..." : "Confirm Order Delivery"}
                    <CheckCircle size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 bg-slate-50 border border-dashed border-gray-200 rounded-[2.5rem] text-center">
              <div className="w-20 h-20 bg-white border border-gray-200 rounded-3xl flex items-center justify-center mb-6 text-slate-400 shadow-md">
                <Truck size={36} />
              </div>
              <h4 className="text-xl font-black text-slate-800 uppercase italic">Delivery Workspace</h4>
              <p className="text-slate-500 max-w-xs mt-2 text-xs font-semibold">Select a shipment order to access customer address details, phone lines, and confirm collections.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Order History Hub */}
      <div className="pt-8 border-t border-gray-100">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-6">
          <Globe className="text-orange-600" size={20} />
          Order History Hub
        </h3>
        <div className="bg-white border border-gray-200 rounded-[2rem] shadow-xs overflow-hidden">
          <table className="hidden md:table w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-gray-100">
              <tr className="text-slate-400 font-black uppercase text-[9px] tracking-widest">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Update Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.slice(0, 5).map(order => (
                <tr key={order.id} onClick={() => setSelectedHubOrder(order)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-orange-600 font-bold">#{order.id.slice(-8)}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{order.customerInfo.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${getStatusStyles(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-[10px] text-slate-400 font-mono">
                    {new Date(order.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-gray-100">
            {orders.slice(0, 5).map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedHubOrder(order)}
                className="p-4 bg-white space-y-3 active:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-black text-orange-600">#{order.id.slice(-8)}</span>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">{new Date(order.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="font-black text-slate-900 text-sm">{order.customerInfo.name}</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status:</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${getStatusStyles(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {viewingImage && (
        <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`Order_${selectedOrder?.id}`} />
      )}

      {selectedHubOrder && (
        <OrderDetailModal
          order={selectedHubOrder}
          onClose={() => setSelectedHubOrder(null)}
          isAdmin={isAdmin}
          onUpdateOrder={onUpdateOrder}
        />
      )}
    </div>
  );
}

const getStatusStyles = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.DELIVERY: return 'bg-orange-50 text-orange-700 border border-orange-200';
    case OrderStatus.DELIVERED: return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case OrderStatus.HOLD: return 'bg-red-50 text-red-700 border border-red-200';
    default: return 'bg-slate-100 text-slate-600';
  }
};
