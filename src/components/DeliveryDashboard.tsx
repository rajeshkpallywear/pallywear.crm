import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Truck, Download, ChevronRight, FileText, CheckCircle, Package, ZoomIn, Share2, Globe, Trash2, TrendingUp, MapPin, Phone, Clock, AlertCircle, ExternalLink } from 'lucide-react';
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
    <div className="bg-[#0B0F19] text-slate-100 p-6 rounded-[2.5rem] border border-slate-900 shadow-2xl space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
        <div>
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.25em] block mb-1">Pallywear CRM Portal</span>
          <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Order Fulfillment & Delivery Status</h2>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-orange-500/20 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Sync Data
        </button>
      </div>

      {/* Mock Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-[#131B2E]/70 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pending Orders</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shadow-inner">
              <Clock size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight text-white">230</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +230
            </span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-[#131B2E]/70 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Awaiting Digitisation</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shadow-inner">
              <Globe size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight text-white">55</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +55
            </span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-[#131B2E]/70 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">In Productions</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shadow-inner">
              <Package size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight text-white">100</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +400
            </span>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-[#131B2E]/70 backdrop-blur-md border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col gap-2 relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shipped Orders</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shadow-inner">
              <Truck size={14} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight text-white">1,465</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              +1.95%
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Tracker */}
        <div className="lg:col-span-2 bg-[#131B2E]/50 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Delivery Map & ETA Tracker</h4>
            <span className="text-[9px] font-bold text-slate-400 bg-[#0B0F19] px-2.5 py-1 rounded-xl">Real-Time Routing</span>
          </div>
          <div className="relative h-40 bg-[#090D1A] rounded-2xl overflow-hidden flex items-center justify-center border border-slate-900">
            {/* Simulated Vector World Map */}
            <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 800 400" fill="none" stroke="#fff" strokeWidth="1">
              <path d="M150,150 Q300,100 450,150 T700,200" strokeDasharray="5,5" />
              <path d="M200,220 Q400,180 600,250" strokeDasharray="3,3" />
            </svg>
            
            {/* Active flight paths and labels */}
            <div className="absolute top-1/3 left-1/4 flex flex-col items-center">
              <div className="w-3.5 h-3.5 rounded-full bg-orange-500 animate-ping absolute" />
              <div className="w-2.5 h-2.5 rounded-full bg-orange-400 border-2 border-slate-900 relative" />
              <span className="text-[8px] bg-slate-900/90 text-slate-300 font-bold px-1.5 py-0.5 rounded mt-1 shadow border border-slate-800">Order #40409: A1 Port</span>
            </div>

            <div className="absolute top-1/2 left-2/3 flex flex-col items-center">
              <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 animate-ping absolute" />
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 border-2 border-slate-900 relative" />
              <span className="text-[8px] bg-slate-900/90 text-slate-300 font-bold px-1.5 py-0.5 rounded mt-1 shadow border border-slate-800">Order #45422: M1 Center</span>
            </div>
            
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider absolute bottom-3 right-4">Live Dispatch Feeds</span>
          </div>
        </div>

        {/* Delivery Type Breakdown */}
        <div className="bg-[#131B2E]/50 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl flex flex-col justify-between">
          <div className="border-b border-slate-900 pb-3">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Delivery Type Status</h4>
          </div>

          <div className="space-y-3.5 my-auto py-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white uppercase tracking-tight">Embroidery Run</span>
              <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] font-black rounded-lg">Active</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white uppercase tracking-tight">Embroidery Run</span>
              <span className="px-2.5 py-0.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[9px] font-black rounded-lg">Active</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white uppercase tracking-tight">Print on Demand</span>
              <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-black rounded-lg">Queue</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white uppercase tracking-tight">Custom Maidgoods</span>
              <span className="px-2.5 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-black rounded-lg">Queue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Filter buttons */}
      <div className="flex items-center gap-2 p-1 bg-slate-950/60 border border-slate-900 rounded-2xl w-fit">
        <button
          onClick={() => setSelectedSection('recent')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer",
            selectedSection === 'recent' ? "bg-orange-650 text-white shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          All Shipments ({recentOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('process')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer",
            selectedSection === 'process' ? "bg-orange-650 text-white shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          In Transit ({processOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('hold')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer",
            selectedSection === 'hold' ? "bg-orange-650 text-white shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          Holds ({holdOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('completed')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer",
            selectedSection === 'completed' ? "bg-orange-650 text-white shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          Delivered ({completedOrdersCount})
        </button>
      </div>

      {/* Critical Deliveries Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List of deliveries */}
        <div className="space-y-4">
          <div className="border-b border-slate-900 pb-3">
            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Critical Delivery Issues</h4>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={cn(
                    "w-full text-left p-5 rounded-3xl border transition-all flex flex-col gap-3 hover:scale-[1.01] hover:border-orange-500/20 cursor-pointer",
                    selectedOrder?.id === order.id
                      ? "bg-orange-650 border-orange-600 text-white shadow-2xl"
                      : "bg-[#131B2E]/50 border-slate-800/80"
                  )}
                >
                  <div className="flex justify-between items-center w-full">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono opacity-60">#{order.id.slice(-6)}</span>
                      {order.status === OrderStatus.HOLD && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded w-fit mt-1">HOLD</span>
                      )}
                      {order.isUrgent && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse w-fit mt-0.5">URGENT</span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 bg-slate-900/60 text-slate-300 text-[8px] uppercase font-bold rounded">
                      {getDisplayCategory(order)}
                    </span>
                  </div>

                  <div className="font-bold text-base uppercase italic leading-tight">{order.customerInfo.name}</div>

                  {order.status === OrderStatus.HOLD && order.holdReason && (
                    <div className="text-[9px] text-red-400 font-bold bg-red-950/20 p-2 rounded italic border border-red-550/20">
                      Blocked Reason: "{order.holdReason}"
                    </div>
                  )}

                  <div className="text-[9px] text-slate-400 flex items-center gap-1.5">
                    <MapPin size={10} className="shrink-0 text-slate-500" />
                    <span className="truncate">{order.customerInfo.address}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-10 bg-[#131B2E]/30 border border-dashed border-slate-800 rounded-3xl text-center">
                <CheckCircle className="mx-auto text-slate-500 mb-2" size={24} />
                <p className="text-xs text-slate-400">No active delivery orders found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detail details panel */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#131B2E]/50 border border-slate-800/80 rounded-[2rem] p-6 shadow-xl space-y-6"
            >
              <div className="flex justify-between items-start border-b border-slate-900 pb-4">
                <div>
                  <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest font-bold">Delivery Active Node</span>
                  <h4 className="text-2xl font-black text-white uppercase italic mt-0.5">#{selectedOrder.id.slice(-8)}</h4>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedHubOrder(selectedOrder)}
                    className="px-3.5 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer"
                    title="Click to open full size page for this order"
                  >
                    <ExternalLink size={14} />
                    View Full Size Order
                  </button>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase block">Phone Dial</span>
                    <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                      <Phone size={12} className="text-orange-400" />
                      {selectedOrder.customerInfo.phone}
                    </div>
                  </div>
                </div>
              </div>

              {/* Details & Balance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shipping Address</span>
                  <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-2xl flex items-start gap-3">
                    <MapPin size={20} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300 font-bold leading-relaxed">{selectedOrder.customerInfo.address}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cash Balance Due</span>
                  <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-2xl flex flex-col justify-center">
                    <span className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-0.5">Payment collect</span>
                    <span className="text-2xl font-black text-red-400 italic">₹{(selectedOrder.financials?.balanceAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Order Breakdown</span>
                <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                  {selectedOrder.sizeBreakdown?.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-750">{item.size}</span>
                        <span className="text-xs text-slate-400 font-semibold">{item.colour} {item.printType && `| ${item.printType}`}</span>
                      </div>
                      <span className="text-xs text-white font-black italic">x {item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 border-t border-slate-900 pt-4">
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
                    className="px-6 py-4 bg-green-950/20 border border-green-900/40 text-green-400 rounded-2xl font-black uppercase text-xs hover:bg-green-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                    className="px-6 py-4 bg-red-950/20 border border-red-900/40 text-red-400 rounded-2xl font-black uppercase text-xs hover:bg-red-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <AlertCircle size={14} />
                    Hold Ship
                  </button>
                )}

                {selectedOrder.status === OrderStatus.DELIVERED ? (
                  <div className="flex-1 py-4 bg-green-950/20 text-green-400 border border-green-900/40 rounded-2xl font-black uppercase text-center flex items-center justify-center gap-2 text-xs">
                    <CheckCircle size={16} />
                    Delivered Successfully
                  </div>
                ) : (
                  <button
                    onClick={handleFinishDelivery}
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    className="flex-1 py-4 bg-orange-650 hover:bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 shadow-lg shadow-orange-650/20"
                  >
                    {isProcessing ? "Confirming..." : "Confirm Order Delivery"}
                    <CheckCircle size={14} />
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 bg-[#131B2E]/30 border border-dashed border-slate-800 rounded-[2.5rem] text-center">
              <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mb-6 text-slate-500 shadow-2xl">
                <Truck size={36} />
              </div>
              <h4 className="text-xl font-black text-white uppercase italic">Delivery Workspace</h4>
              <p className="text-slate-400 max-w-xs mt-2 text-xs font-semibold">Select a shipment order to access customer address maps, phone lines, and confirm collections.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Order History Hub */}
      <div className="pt-8 border-t border-slate-900">
        <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 mb-6">
          <Globe className="text-orange-500" size={20} />
          Order History Hub
        </h3>
        <div className="bg-[#131B2E]/50 border border-slate-800/80 rounded-[2rem] shadow-xl overflow-hidden">
          <table className="hidden md:table w-full text-left text-xs border-collapse">
            <thead className="bg-[#131B2E] border-b border-slate-900">
              <tr className="text-slate-400 font-black uppercase text-[9px] tracking-widest">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Update Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {orders.slice(0, 5).map(order => (
                <tr key={order.id} onClick={() => setSelectedHubOrder(order)} className="hover:bg-[#1E294B]/20 cursor-pointer transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">#{order.id.slice(-8)}</td>
                  <td className="px-6 py-4 font-bold text-white">{order.customerInfo.name}</td>
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
          <div className="block md:hidden divide-y divide-slate-900">
            {orders.slice(0, 5).map(order => (
              <div
                key={order.id}
                onClick={() => setSelectedHubOrder(order)}
                className="p-4 bg-transparent space-y-3 active:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-black text-orange-400">#{order.id.slice(-8)}</span>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">{new Date(order.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="font-black text-white text-sm">{order.customerInfo.name}</div>
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
    case OrderStatus.DELIVERY: return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
    case OrderStatus.DELIVERED: return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    case OrderStatus.HOLD: return 'bg-red-500/10 text-red-400 border border-red-500/20';
    default: return 'bg-slate-800 text-slate-400';
  }
};
