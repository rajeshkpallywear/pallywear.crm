import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Factory, Download, ChevronRight, FileText, CheckCircle, Package, ZoomIn, Share2, Globe, Trash2, TrendingUp, Clock, AlertCircle, Sparkles, Wand2, Scissors, ShieldAlert, ExternalLink, FolderOpen, Edit3, Save, Copy, Mic, MessageSquare, X, Camera, Upload, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn, downloadFile } from '../lib/utils';
import { useLeads } from '../context/LeadContext';
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
  const [isEditingProductionNotes, setIsEditingProductionNotes] = useState(false);
  const [productionNoteInput, setProductionNoteInput] = useState('');
  const [noteToast, setNoteToast] = useState<string | null>(null);
  const [showClientSpecs, setShowClientSpecs] = useState(false);
  const [completedProductionImages, setCompletedProductionImages] = useState<string[]>([]);
  const { loadOrderAttachments } = useLeads();

  useEffect(() => {
    if (selectedOrder) {
      loadOrderAttachments(selectedOrder.id).then(attachments => {
        setSelectedOrder(prev => prev && prev.id === selectedOrder.id ? { ...prev, ...attachments } : prev);
      });
      setProductionNoteInput(selectedOrder.productionNotes || '');
      setIsEditingProductionNotes(false);
      setCompletedProductionImages(selectedOrder.details?.productionImages || selectedOrder.details?.finishedGarmentImages || []);
    } else {
      setCompletedProductionImages([]);
    }
  }, [selectedOrder?.id]);

  // Helper to handle image capture from camera or file upload with compression
  const handleProductionImageCaptureOrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const readFiles: string[] = [];
    for (let i = 0; i < files.length; i++) {
      let file: File = files[i];
      try {
        if (file.type.startsWith('image/')) {
          file = await imageCompression(file, {
            maxSizeMB: 0.8,
            maxWidthOrHeight: 1400,
            useWebWorker: true
          });
        }
      } catch (err) {
        console.warn('Image compression skipped:', err);
      }

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      readFiles.push(base64);
    }

    setCompletedProductionImages(prev => [...prev, ...readFiles]);
    e.target.value = '';
  };

  const handleSaveProductionNote = async () => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        productionNotes: productionNoteInput.trim(),
        updatedAt: Date.now()
      });
      setSelectedOrder(prev => prev ? { ...prev, productionNotes: productionNoteInput.trim(), updatedAt: Date.now() } : null);
      setIsEditingProductionNotes(false);
      setNoteToast("✓ Production notes updated successfully!");
      setTimeout(() => setNoteToast(null), 3000);
    } catch (e) {
      alert("Failed to save production note.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyProductionNote = async () => {
    if (!selectedOrder?.productionNotes) return;
    try {
      await navigator.clipboard.writeText(selectedOrder.productionNotes);
      setNoteToast("✓ Copied production notes!");
      setTimeout(() => setNoteToast(null), 2000);
    } catch (e) {
      setNoteToast("Failed to copy");
      setTimeout(() => setNoteToast(null), 2000);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (selectedSection === 'recent') {
      return o.status === OrderStatus.PRODUCTION && !o.details?.productionStarted;
    }
    if (selectedSection === 'process') {
      return o.status === OrderStatus.PRODUCTION && o.details?.productionStarted === true;
    }
    if (selectedSection === 'hold') {
      return o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION;
    }
    if (selectedSection === 'completed') {
      return o.status === OrderStatus.DELIVERED;
    }
    return o.status === OrderStatus.PRODUCTION && !o.details?.productionStarted;
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

  const recentOrdersCount = orders.filter(o => o.status === OrderStatus.PRODUCTION && !o.details?.productionStarted).length;
  const processOrdersCount = orders.filter(o => o.status === OrderStatus.PRODUCTION && o.details?.productionStarted === true).length;
  const holdOrdersCount = orders.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION).length;
  const completedOrdersCount = orders.filter(o => o.status === OrderStatus.DELIVERED).length;

  const handleFinishProduction = async () => {
    if (!selectedOrder || isProcessing) return;
    setIsProcessing(true);

    try {
      const images = completedProductionImages;
      const existingManagement = selectedOrder.orderManagementAttachments || [];
      const updatedManagement = Array.from(new Set([...existingManagement, ...images]));
      const photoNote = images.length > 0 ? ` (${images.length} finished product photos attached)` : '';
      const completionNote = `[PRODUCTION COMPLETED] ${new Date().toLocaleString()}: Finished goods manufactured and sent to Inventory Management intake.${photoNote}`;
      const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n${completionNote}` : completionNote;

      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.DELIVERY,
        notes: updatedNotes,
        orderManagementAttachments: updatedManagement,
        details: {
          ...(selectedOrder.details || {}),
          productionCompleted: true,
          productionCompletedAt: Date.now(),
          productionImages: images,
          finishedGarmentImages: images
        },
        updatedAt: Date.now()
      });

      setSelectedOrder(null);
      setCompletedProductionImages([]);
      alert(`Success: Order #${selectedOrder.id.slice(-8)} finished and forwarded to Inventory Management Intake Queue${images.length > 0 ? ' with finished product photos' : ''}!`);
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
    <div className="bg-white text-slate-800 p-3.5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-gray-200 shadow-xl space-y-4 sm:space-y-8 text-left">
      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-gray-100 border border-gray-200 rounded-xl sm:rounded-2xl w-full sm:w-fit">
        <button
          onClick={() => setSelectedSection('recent')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-6 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest transition-all border-none cursor-pointer text-center truncate min-w-0",
            selectedSection === 'recent' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 bg-transparent"
          )}
        >
          Recent ({recentOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('process')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-6 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest transition-all border-none cursor-pointer text-center truncate min-w-0",
            selectedSection === 'process' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 bg-transparent"
          )}
        >
          Processing ({processOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('hold')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-6 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest transition-all border-none cursor-pointer text-center truncate min-w-0",
            selectedSection === 'hold' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 bg-transparent"
          )}
        >
          Hold ({holdOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('completed')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-6 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest transition-all border-none cursor-pointer text-center truncate min-w-0",
            selectedSection === 'completed' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-900 bg-transparent"
          )}
        >
          Done ({completedOrdersCount})
        </button>
      </div>

      {/* Pipeline Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Left Column: Product Design Pipeline */}
        <div className={cn("space-y-4", selectedOrder ? "hidden lg:block" : "block")}>
          <div className="border-b border-gray-150 pb-3">
            <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Product Design Pipeline</h4>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => order.status !== OrderStatus.DELIVERED && setSelectedOrder(order)}
                  className={cn(
                    "w-full text-left p-5 rounded-3xl border transition-all flex flex-col gap-3 hover:scale-[1.01]",
                    order.status === OrderStatus.DELIVERED
                      ? "bg-slate-50 border-gray-200 text-slate-800 cursor-default opacity-85 hover:bg-slate-50 hover:scale-100"
                      : selectedOrder?.id === order.id
                        ? "bg-indigo-600 border-indigo-650 text-white shadow-xl cursor-pointer"
                        : "bg-slate-50 border-gray-200 text-slate-800 hover:bg-slate-100/85 cursor-pointer"
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className={cn("text-[10px] font-bold uppercase tracking-wider", selectedOrder?.id === order.id ? "text-indigo-200" : "text-brand-primary")}>
                      Created by: {order.createdByName || 'System'}
                    </div>
                    {(() => {
                      if (!order.createdAt) return null;
                      const d = new Date(order.createdAt);
                      const now = new Date();
                      const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                      return isToday ? (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500 text-white shadow-xs">
                          ⚡ Today
                        </span>
                      ) : null;
                    })()}
                  </div>
                  
                  {order.productionNotes && (
                    <div className={cn(
                      "text-[9.5px] p-2.5 rounded-xl border text-left font-medium line-clamp-2",
                      selectedOrder?.id === order.id
                        ? "bg-indigo-700/60 border-indigo-400 text-indigo-50"
                        : "bg-indigo-50/80 border-indigo-150 text-indigo-950"
                    )}>
                      <span className="font-black uppercase text-[8px] tracking-wider block text-indigo-400">
                        🏭 Prod Note:
                      </span>
                      {order.productionNotes}
                    </div>
                  )}

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
        <div className={cn("lg:col-span-2", selectedOrder ? "block" : "hidden lg:block")}>
          {selectedOrder ? (
            <motion.div
              layoutId={selectedOrder.id}
              className="bg-slate-50 border border-gray-200 rounded-[2rem] p-6 shadow-md space-y-6 text-slate-800"
            >
              <div className="flex flex-col gap-2 border-b border-gray-200 pb-4">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="lg:hidden w-fit px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border-none cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back to List
                </button>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Active Station Workspace • Created by: {selectedOrder.createdByName || 'System'}</span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic mt-0.5">#{selectedOrder.id.slice(-8)}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadAllAttachments(selectedOrder)}
                    className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <Download size={14} />
                    Download Assets
                  </button>
                </div>
              </div>
            </div>

              {/* Production Floor Instructions Banner & Editor */}
              <div className="bg-white border-2 border-indigo-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-indigo-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Factory size={14} />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-tight flex items-center gap-1.5">
                        🏭 Production & Factory Floor Instructions
                      </h5>
                      <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider block">
                        Floor specifications & manufacturing directions
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {noteToast && (
                      <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-in fade-in">
                        {noteToast}
                      </span>
                    )}
                    {selectedOrder.productionNotes && !isEditingProductionNotes && (
                      <button
                        type="button"
                        onClick={handleCopyProductionNote}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all border border-indigo-200 cursor-pointer shadow-2xs"
                        title="Copy production notes to clipboard"
                      >
                        <Copy size={11} />
                        <span>Copy</span>
                      </button>
                    )}
                    {!isEditingProductionNotes ? (
                      <button
                        type="button"
                        onClick={() => {
                          setProductionNoteInput(selectedOrder.productionNotes || '');
                          setIsEditingProductionNotes(true);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all border-none cursor-pointer shadow-xs"
                      >
                        <Edit3 size={11} />
                        <span>{selectedOrder.productionNotes ? 'Edit Note' : '+ Add Production Note'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={handleSaveProductionNote}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all border-none cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <Save size={11} />
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => {
                            setProductionNoteInput(selectedOrder.productionNotes || '');
                            setIsEditingProductionNotes(false);
                          }}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all border border-gray-200 cursor-pointer"
                        >
                          <X size={11} />
                          <span>Cancel</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isEditingProductionNotes ? (
                  <div className="space-y-2">
                    <textarea
                      rows={4}
                      value={productionNoteInput}
                      onChange={(e) => setProductionNoteInput(e.target.value)}
                      placeholder="Enter specific factory floor directions, stitching specs, fabric guidelines, packaging rules..."
                      className="w-full p-3 bg-indigo-50/40 border border-indigo-200 rounded-xl text-xs font-mono text-gray-900 focus:border-indigo-600 focus:bg-white outline-none resize-y leading-relaxed"
                    />
                    <div className="flex justify-between items-center text-[9px] text-gray-400 font-semibold px-1">
                      <span>Press "Save" above to update production floor instructions immediately.</span>
                      <span>{productionNoteInput.length} chars</span>
                    </div>
                  </div>
                ) : selectedOrder.productionNotes ? (
                  <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-150 text-xs font-mono text-indigo-950 whitespace-pre-wrap leading-relaxed">
                    {selectedOrder.productionNotes}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400 font-medium">
                    No special production notes recorded during intake. Click "<span className="font-bold text-indigo-600">+ Add Production Note</span>" above if the factory floor needs instructions.
                  </div>
                )}

                {/* Secondary: Client Specs / Marketing & Voice Notes */}
                {(selectedOrder.notes || selectedOrder.designNotes || selectedOrder.marketing_notes || selectedOrder.voiceNote) && (
                  <div className="pt-2 border-t border-indigo-100/60">
                    <button
                      type="button"
                      onClick={() => setShowClientSpecs(!showClientSpecs)}
                      className="w-full flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-wider py-1 bg-transparent border-none cursor-pointer hover:text-slate-900"
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageSquare size={12} className="text-purple-600" />
                        📋 Marketing & Client Specifications ({showClientSpecs ? 'Hide' : 'View'})
                      </span>
                      <ChevronRight size={12} className={cn("transition-transform", showClientSpecs ? "rotate-90" : "")} />
                    </button>

                    {showClientSpecs && (
                      <div className="mt-2 space-y-2.5 animate-in fade-in duration-150">
                        {selectedOrder.voiceNote && (
                          <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200 space-y-1">
                            <div className="flex items-center gap-1.5 text-purple-900 text-[10px] font-black uppercase">
                              <Mic size={12} className="text-purple-600 animate-pulse" />
                              <span>Client Voice Instructions:</span>
                            </div>
                            <audio controls src={selectedOrder.voiceNote} className="w-full h-7 rounded-lg bg-white p-0.5 outline-none" />
                          </div>
                        )}
                        {(selectedOrder.notes || selectedOrder.designNotes || selectedOrder.marketing_notes) && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-gray-200 text-[11px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {selectedOrder.notes || selectedOrder.designNotes || selectedOrder.marketing_notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
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

                {/* Desk 4: Original Design Assets (Required view for production) */}
                <div className="space-y-2">
                  <h6 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Original Design Assets</h6>
                  {(selectedOrder.original_design_file || selectedOrder.original_design_zip) ? (
                    <div className="space-y-2">
                      {selectedOrder.original_design_file && (
                        <div className="flex flex-col gap-1.5 p-2 bg-purple-50/50 border border-purple-150 rounded-xl">
                          <div className="aspect-video w-full rounded overflow-hidden relative group bg-white">
                            <img src={selectedOrder.original_design_file} className="w-full h-full object-cover" />
                            <button
                              onClick={() => setViewingImage(selectedOrder.original_design_file!)}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white border-none cursor-pointer"
                            >
                              <ZoomIn size={12} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => downloadFile(selectedOrder.original_design_file, selectedOrder.original_design_filename || `Design_Original_${selectedOrder.id.slice(-6)}.png`)}
                            className="w-full py-1 text-center bg-purple-600 hover:bg-purple-700 text-white rounded text-[8px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 border-none"
                          >
                            <Download size={8} /> Download PNG (HD)
                          </button>
                        </div>
                      )}

                      {selectedOrder.original_design_zip && (
                        <button
                          type="button"
                          onClick={() => downloadFile(selectedOrder.original_design_zip, selectedOrder.original_design_zip_filename || `Design_Package_${selectedOrder.id.slice(-6)}.zip`)}
                          className="w-full p-2 bg-indigo-50/50 border border-indigo-150 rounded-xl flex items-center justify-between text-indigo-700 font-bold hover:bg-indigo-100 transition-colors cursor-pointer border-none"
                          title="Download Design ZIP Package"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FolderOpen size={13} className="shrink-0 text-indigo-600" />
                            <span className="truncate text-[9px]">{selectedOrder.original_design_zip_filename || 'Design_Package.zip'}</span>
                          </div>
                          <Download size={9} className="shrink-0 ml-1" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-400 italic block">None uploaded</span>
                  )}
                </div>

                {/* Desk 5: Stitch Files (Digitizer Sent Garage File) */}
                <div className="space-y-2">
                  <h6 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Stitch Files (Garage)</h6>
                  {(selectedOrder.machineFiles || []).map((f, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => downloadFile(f, `Stitch_Garage_File_${i + 1}_order_${selectedOrder.id}.dst`)}
                      className="w-full p-2 bg-indigo-50/40 border border-indigo-100 rounded-xl truncate hover:border-indigo-200 transition-colors flex items-center justify-between text-indigo-600 font-bold block cursor-pointer border-none"
                      title="Click to download garage production file"
                    >
                      <span className="truncate text-[10px]">Stitch_{i + 1}.dst</span>
                      <Download size={10} className="shrink-0 ml-1" />
                    </button>
                  ))}
                  {(selectedOrder.machineFiles || []).length === 0 && (
                    <span className="text-[9px] text-slate-400 italic block">None uploaded</span>
                  )}
                </div>
              </div>

              {/* Finished Garments Photo Capture & Upload (QC / Finished Goods) */}
              <div className="bg-slate-50/90 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-indigo-150 shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Camera size={14} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        📸 Finished Garment Photos (QC & Verification)
                      </h5>
                      <p className="text-[10px] text-gray-500 font-semibold">
                        Take live photos or upload finished product pictures before sending to Inventory Management
                      </p>
                    </div>
                  </div>
                  {completedProductionImages.length > 0 && (
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                      ✓ {completedProductionImages.length} {completedProductionImages.length === 1 ? 'Photo' : 'Photos'} Attached
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 flex-wrap pt-1">
                  {/* Preview Thumbnails */}
                  {completedProductionImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group w-16 h-16 rounded-xl overflow-hidden border-2 border-indigo-200 shrink-0 bg-white shadow-xs"
                    >
                      <img
                        src={img}
                        alt="Finished Garment"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setViewingImage(img)}
                      />
                      <button
                        type="button"
                        onClick={() => setCompletedProductionImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0 right-0 bg-red-600 text-white p-1 rounded-bl hover:bg-red-700 cursor-pointer border-none shadow-xs"
                        title="Remove photo"
                      >
                        <X size={10} />
                      </button>
                      <div
                        onClick={() => setViewingImage(img)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                      >
                        <ZoomIn size={14} />
                      </div>
                    </div>
                  ))}

                  {/* Camera Button */}
                  <label
                    className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    title="Take live photo using device camera"
                  >
                    <Camera size={15} className="text-amber-600" />
                    <span>Take Photo (Camera)</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleProductionImageCaptureOrUpload}
                    />
                  </label>

                  {/* Upload Image Button */}
                  <label
                    className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    title="Upload photos from device"
                  >
                    <Upload size={15} className="text-indigo-600" />
                    <span>Upload Product Photos</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      className="hidden"
                      onChange={handleProductionImageCaptureOrUpload}
                    />
                  </label>
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

                {!selectedOrder.details?.productionStarted ? (
                  <button
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    onClick={async () => {
                      if (isProcessing) return;
                      setIsProcessing(true);
                      try {
                        await onUpdateOrder(selectedOrder.id, {
                          details: {
                            ...selectedOrder.details,
                            productionStarted: true
                          },
                          updatedAt: Date.now()
                        });
                        setSelectedOrder(prev => prev ? {
                          ...prev,
                          details: {
                            ...prev.details,
                            productionStarted: true
                          }
                        } : null);
                        alert("Production run started and moved to processing!");
                      } catch (e) {
                        alert("Failed to start production.");
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-650/10"
                  >
                    Start Production Run
                    <CheckCircle size={14} />
                  </button>
                ) : (
                  <button
                    onClick={handleFinishProduction}
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-650/10"
                  >
                    {isProcessing ? "Completing run..." : `Finish Production & Send to Inventory Management${completedProductionImages.length > 0 ? ` (${completedProductionImages.length} Photos Attached)` : ''}`}
                    <CheckCircle size={14} />
                  </button>
                )}
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
