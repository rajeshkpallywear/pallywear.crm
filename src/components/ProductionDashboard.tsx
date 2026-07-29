import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Factory, Download, ChevronRight, FileText, CheckCircle, Package, ZoomIn, Share2, Globe, Trash2, TrendingUp, Clock, AlertCircle, Sparkles, Wand2, Scissors, ShieldAlert, ExternalLink } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import ImageViewer from './ImageViewer';
import OrdersChart from './OrdersChart';

interface ProductionDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
}

export default function ProductionDashboard({ orders, onUpdateOrder, onDeleteOrder, isAdmin }: ProductionDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSection, setSelectedSection] = useState<'recent' | 'process' | 'hold' | 'completed'>('recent');
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredOrders = orders.filter(o => {
    if (selectedSection === 'hold') {
      return o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION;
    }
    if (selectedSection === 'completed') {
      return o.status === OrderStatus.DELIVERY || o.status === OrderStatus.DELIVERED;
    }
    if (selectedSection === 'process') {
      return o.status === OrderStatus.PRODUCTION;
    }
    return o.status === OrderStatus.PRODUCTION || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION);
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

  const recentOrdersCount = orders.filter(o => o.status === OrderStatus.PRODUCTION || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION)).length;
  const processOrdersCount = orders.filter(o => o.status === OrderStatus.PRODUCTION).length;
  const holdOrdersCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION).length;
  const completedOrdersCount = orders.filter(o => o.status === OrderStatus.DELIVERY || o.status === OrderStatus.DELIVERED).length;

  const handleFinishProduction = async () => {
    if (!selectedOrder || isProcessing) return;
    setIsProcessing(true);

    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.DELIVERY,
        updatedAt: Date.now()
      });

      setSelectedOrder(null);
      alert("Success: Production run completed! Dispatched to delivery team.");
    } catch (e) {
      console.error(e);
      alert("Failed to move order forward.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAllAttachments = (order: Order) => {
    const allAttachments = [
      ...(order.staffImages || []),
      ...(order.staffPdfs || []),
      ...(order.accountsAttachments || []),
      ...(order.designAttachments || []),
      ...(order.machineFiles || []),
      ...(order.orderManagementAttachments || [])
    ].filter(Boolean);

    if (allAttachments.length === 0) {
      alert('No attachments found for this order.');
      return;
    }

    const confirmMsg = `This will attempt to open ${allAttachments.length} files in separate tabs. Please allow popups if prompted. Continue?`;
    if (allAttachments.length > 1 && !confirm(confirmMsg)) {
      return;
    }

    allAttachments.forEach((url, i) => {
      setTimeout(() => {
        window.open(url, '_blank');
      }, i * 300);
    });
  };

  return (
    <div className="bg-white text-slate-800 p-6 rounded-[2.5rem] border border-gray-200 shadow-xl space-y-8 text-left">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.25em] block mb-1">Pallywear CRM Portal</span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Production Run Board</h2>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2.5 bg-slate-50 border border-gray-200 hover:border-indigo-500/20 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Sync Data
        </button>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 border border-gray-200 rounded-2xl w-fit">
        <button
          onClick={() => setSelectedSection('recent')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer",
            selectedSection === 'recent' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 bg-transparent"
          )}
        >
          All Runs ({recentOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('process')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer",
            selectedSection === 'process' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 bg-transparent"
          )}
        >
          Processing ({processOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('hold')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer",
            selectedSection === 'hold' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 bg-transparent"
          )}
        >
          Hold ({holdOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('completed')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer",
            selectedSection === 'completed' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 bg-transparent"
          )}
        >
          Completed ({completedOrdersCount})
        </button>
      </div>

      {/* Pipeline Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Left Column: Product Design Pipeline */}
        <div className="space-y-4">
          <div className="border-b border-gray-150 pb-3">
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Product Design Pipeline</h4>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={cn(
                    "w-full text-left p-5 rounded-3xl border transition-all flex flex-col gap-3 hover:scale-[1.01] cursor-pointer",
                    selectedOrder?.id === order.id
                      ? "bg-indigo-600 border-indigo-650 text-white shadow-xl"
                      : "bg-slate-50 border-gray-200 text-slate-800 hover:bg-slate-100/85"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <span className={cn("text-[10px] font-mono", selectedOrder?.id === order.id ? "text-indigo-200" : "text-slate-400")}>#{order.id.slice(-6)}</span>
                      {order.status === OrderStatus.HOLD && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded w-fit mt-1">HOLD</span>
                      )}
                      {order.isUrgent && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse w-fit mt-0.5">URGENT</span>
                      )}
                    </div>
                    <span className={cn("px-2 py-0.5 text-[8px] uppercase font-bold rounded", selectedOrder?.id === order.id ? "bg-indigo-700/50 text-indigo-100" : "bg-gray-200 text-gray-700")}>
                      {getDisplayCategory(order)}
                    </span>
                  </div>
                  
                  <div className="font-bold text-base uppercase italic leading-tight">{order.customerInfo.name}</div>
                  
                  {order.status === OrderStatus.HOLD && order.holdReason && (
                    <div className="text-[9px] text-red-600 font-bold bg-red-50 p-2 rounded italic border border-red-200/50">
                      Blocked Reason: "{order.holdReason}"
                    </div>
                  )}

                  <div className={cn("text-[9px] font-mono flex items-center gap-1.5", selectedOrder?.id === order.id ? "text-indigo-200" : "text-slate-500")}>
                    <Clock size={10} />
                    <span>Updated: {new Date(order.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-10 bg-slate-50 border border-dashed border-gray-200 rounded-3xl text-center">
                <CheckCircle className="mx-auto text-slate-400 mb-2" size={24} />
                <p className="text-xs text-slate-500 font-medium">All current runs are completed.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Work Station details */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <motion.div
              layoutId={selectedOrder.id}
              className="bg-slate-50 border border-gray-200 rounded-[2rem] p-6 shadow-md space-y-6 text-slate-800"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
                <div>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Active Station Workspace</span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic mt-0.5">#{selectedOrder.id.slice(-8)}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedHubOrder(selectedOrder)}
                    className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer shadow-xs border border-indigo-150"
                    title="Click to open full size page for this order"
                  >
                    <ExternalLink size={14} />
                    View Full Size Order
                  </button>
                  <button
                    onClick={() => downloadAllAttachments(selectedOrder)}
                    className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <Download size={14} />
                    Download Assets
                  </button>
                </div>
              </div>

              {/* Order Breakdown Grid */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs border-b border-gray-200 pb-2">
                  <span className="font-black text-slate-500 uppercase tracking-wider">Specifications & Breakdown</span>
                  <span className="font-bold text-slate-600 italic">{selectedOrder.quantity} units total</span>
                </div>
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                  {selectedOrder.sizeBreakdown?.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-white border border-gray-200 rounded-xl flex flex-col gap-2 shadow-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-indigo-600 uppercase">{item.category}</span>
                        <span className="text-[10px] font-black text-slate-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{item.size}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                        {item.colour && <div><span className="text-[8px] text-slate-400 block">Colour</span>{item.colour}</div>}
                        {item.printType && <div><span className="text-[8px] text-slate-400 block">Print</span>{item.printType}</div>}
                        {item.material && <div><span className="text-[8px] text-slate-400 block">Material</span>{item.material}</div>}
                        {item.model && <div><span className="text-[8px] text-slate-400 block">Model</span>{item.model}</div>}
                      </div>
                      <div className="text-right text-[10px] font-black text-slate-900 italic">
                        Qty: {item.quantity} units
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachment Desks */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs border-t border-gray-200 pt-4">
                {/* Desk 1 */}
                <div className="space-y-2">
                  <h6 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Staff Pics</h6>
                  {(selectedOrder.staffImages || []).map((f, i) => (
                    <div
                      key={i}
                      onClick={() => setViewingImage(f)}
                      className="p-2 bg-white border border-gray-200 rounded-xl truncate cursor-pointer hover:border-gray-300 transition-colors flex items-center justify-between text-slate-700 shadow-2xs"
                    >
                      <span className="truncate text-[10px]">Img_{i + 1}</span>
                      <ZoomIn size={10} />
                    </div>
                  ))}
                </div>

                {/* Desk 2 */}
                <div className="space-y-2">
                  <h6 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ref PDFs</h6>
                  {(selectedOrder.staffPdfs || []).map((f, i) => (
                    <div
                      key={i}
                      onClick={() => setViewingImage(f)}
                      className="p-2 bg-white border border-gray-200 rounded-xl truncate cursor-pointer hover:border-gray-300 transition-colors flex items-center justify-between text-slate-700 shadow-2xs"
                    >
                      <span className="truncate text-[10px]">Doc_{i + 1}</span>
                      <FileText size={10} className="text-slate-450" />
                    </div>
                  ))}
                </div>

                {/* Desk 3 */}
                <div className="space-y-2">
                  <h6 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Art Outputs</h6>
                  {(selectedOrder.designAttachments || []).map((f, i) => (
                    <div
                      key={i}
                      onClick={() => setViewingImage(f)}
                      className="p-2 bg-white border border-gray-200 rounded-xl truncate cursor-pointer hover:border-gray-300 transition-colors flex items-center justify-between text-slate-700 shadow-2xs"
                    >
                      <span className="truncate text-[10px]">Vector_{i + 1}</span>
                      <ZoomIn size={10} />
                    </div>
                  ))}
                </div>

                {/* Desk 4: Original Design Image (Required view for production) */}
                <div className="space-y-2">
                  <h6 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Original Design</h6>
                  {selectedOrder.original_design_file ? (
                    <div className="flex flex-col gap-1.5 p-2 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                      {selectedOrder.original_design_file.startsWith('data:image/') ? (
                        <div className="aspect-video w-full rounded overflow-hidden relative group">
                          <img src={selectedOrder.original_design_file} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setViewingImage(selectedOrder.original_design_file!)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white border-none cursor-pointer"
                          >
                            <ZoomIn size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full h-10 bg-slate-100 flex items-center justify-center rounded text-indigo-600">
                          <FileText size={16} />
                        </div>
                      )}
                      <a
                        href={selectedOrder.original_design_file}
                        download={selectedOrder.original_design_filename || "original_design"}
                        className="w-full py-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[8px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Download size={8} /> HD Download
                      </a>
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-400 italic block">None uploaded</span>
                  )}
                </div>

                {/* Desk 5: Stitch Files (Digitizer Sent Garage File) */}
                <div className="space-y-2">
                  <h6 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Stitch Files (Garage)</h6>
                  {(selectedOrder.machineFiles || []).map((f, i) => (
                    <a
                      key={i}
                      href={f}
                      download={`Stitch_Garage_File_${i + 1}_order_${selectedOrder.id}`}
                      className="p-2 bg-indigo-50/40 border border-indigo-100 rounded-xl truncate hover:border-indigo-200 transition-colors flex items-center justify-between text-indigo-600 font-bold block no-underline cursor-pointer"
                      title="Click to download garage production file"
                    >
                      <span className="truncate text-[10px]">Stitch_{i + 1}.dst</span>
                      <Download size={10} className="shrink-0 ml-1" />
                    </a>
                  ))}
                  {(selectedOrder.machineFiles || []).length === 0 && (
                    <span className="text-[9px] text-slate-400 italic block">None uploaded</span>
                  )}
                </div>
              </div>

              {/* Action Buttons Panel */}
              <div className="flex gap-3 border-t border-gray-200 pt-4">
                {selectedOrder.status === OrderStatus.HOLD ? (
                  <button
                    disabled={isProcessing}
                    onClick={async () => {
                      const newStatus = selectedOrder.previousStatus || OrderStatus.PRODUCTION;
                      if (window.confirm(`Release order back to ${newStatus}?`)) {
                        setIsProcessing(true);
                        try {
                          await onUpdateOrder(selectedOrder.id, {
                            status: newStatus,
                            previousStatus: undefined,
                            updatedAt: Date.now()
                          });
                          setSelectedOrder(prev => prev ? { ...prev, status: newStatus, previousStatus: undefined } : null);
                          alert("Order released back to production run!");
                        } catch (e) {
                          alert("Action failed.");
                        } finally {
                          setIsProcessing(false);
                        }
                      }
                    }}
                    className="px-6 py-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl font-black uppercase text-xs hover:bg-green-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    Release Run
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
                        alert("Order run put on Hold.");
                      } catch (e) {
                        alert("Action failed.");
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    className="px-6 py-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-black uppercase text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <AlertCircle size={14} />
                    Hold Run
                  </button>
                )}

                <button
                  onClick={handleFinishProduction}
                  disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-650/10"
                >
                  {isProcessing ? "Completing run..." : "Finish Production & Send to Inventory Management"}
                  <CheckCircle size={14} />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-20 bg-slate-50 border border-dashed border-gray-200 rounded-[2.5rem] text-center">
              <div className="w-20 h-20 bg-white border border-gray-200 rounded-3xl flex items-center justify-center mb-6 text-slate-400 shadow-md">
                <Factory size={36} />
              </div>
              <h4 className="text-xl font-black text-slate-800 uppercase italic">Active Work Station</h4>
              <p className="text-slate-500 max-w-xs mt-2 text-xs font-semibold">Select a production pipeline order from the list to view blueprints and trigger outputs.</p>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Graph Model */}
      <div className="pt-4">
        <OrdersChart orders={orders} />
      </div>

      {viewingImage && (
        <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`Blueprint_${selectedOrder?.id}`} />
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
