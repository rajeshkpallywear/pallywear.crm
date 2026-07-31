/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Scissors,
  FileText,
  Download,
  ZoomIn,
  Package,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Archive,
  Upload,
  Trash2,
  ExternalLink,
  MessageSquare,
  X
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn, isOrderSizeValid } from '../lib/utils';
import { useLeads } from '../context/LeadContext';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import OrderDetailModal from './OrderDetailModal';
import OrdersChart from './OrdersChart';

interface DigitizingDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  isAdmin?: boolean;
}

export default function DigitizingDashboard({ orders, onUpdateOrder, isAdmin }: DigitizingDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'pending' | 'completed'>('pending');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadFiles, setUploadFiles] = useState<string[]>([]);
  const { loadOrderAttachments } = useLeads();

  useEffect(() => {
    if (selectedOrder && !selectedOrder.original_design_file && (!selectedOrder.machineFiles || selectedOrder.machineFiles.length === 0)) {
      loadOrderAttachments(selectedOrder.id).then(attachments => {
        setSelectedOrder(prev => prev && prev.id === selectedOrder.id ? { ...prev, ...attachments } : prev);
      });
    }
  }, [selectedOrder?.id]);

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch = (o.customerInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Show orders in DESIGN, ORDER_MANAGEMENT, or PRODUCTION status for digitizing
    // If in DESIGN status, only show if the original design file uploader is complete (ready for digitizing)
    const isOrderReady = o.status !== OrderStatus.DESIGN || !!o.original_design_file;
    const relevantStatus = [OrderStatus.DESIGN, OrderStatus.ORDER_MANAGEMENT, OrderStatus.PRODUCTION].includes(o.status) && isOrderReady;

    if (viewMode === 'pending') {
      return matchesSearch && relevantStatus && !o.machineFiles?.length;
    } else {
      return matchesSearch && o.status === OrderStatus.DELIVERED;
    }
  });

  // Auto-select first order when section, view mode or search changes (except completed mode)
  useEffect(() => {
    if (viewMode === 'completed') {
      setSelectedOrder(null);
    } else if (filteredOrders.length > 0) {
      if (!selectedOrder || !filteredOrders.some(o => o.id === selectedOrder.id)) {
        setSelectedOrder(filteredOrders[0]);
      }
    } else {
      setSelectedOrder(null);
    }
  }, [viewMode, searchTerm, filteredOrders.length]);

  const handleUploadSpecs = async () => {
    if (!selectedOrder || uploadFiles.length === 0) return;

    const nextOrderState = {
      ...selectedOrder,
      machineFiles: [...(selectedOrder.machineFiles || []), ...uploadFiles]
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Sync failed: Data might be too large (Max 100MB per order in current setup). Try using a smaller ZIP file.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        machineFiles: [...(selectedOrder.machineFiles || []), ...uploadFiles],
        status: OrderStatus.ORDER_MANAGEMENT,
        updatedAt: Date.now()
      });

      setUploadFiles([]);
      setSelectedOrder(null);
      alert("Garage ZIP file uploaded successfully and order sent to Order Management!");
    } catch (error) {
      console.error(error);
      alert("Failed to upload files.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMachineFile = async (index: number) => {
    if (!selectedOrder || !window.confirm("Remove this production file?")) return;

    const newFiles = [...(selectedOrder.machineFiles || [])];
    newFiles.splice(index, 1);

    try {
      await onUpdateOrder(selectedOrder.id, { machineFiles: newFiles });
      alert("File removed.");
      setSelectedOrder(prev => prev ? { ...prev, machineFiles: newFiles } : null);
    } catch (e) {
      alert("Failed to remove file.");
    }
  };

  const [isMsgSidebarOpen, setIsMsgSidebarOpen] = useState(false);
  const [msgRequest, setMsgRequest] = useState({
    message: '',
    attachments: [] as string[]
  });

  const sendToOrderMgmt = async () => {
    if (!msgRequest.message && msgRequest.attachments.length === 0) {
      alert("Please provide a message or attachments.");
      return;
    }

    if (!selectedOrder) {
      alert("Please select an order first.");
      return;
    }

    const newNote = `[MESSAGE FROM DIGITIZER] ${new Date().toLocaleString()}\n${msgRequest.message}`;
    const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;

    const nextOrderState = {
      ...selectedOrder,
      notes: updatedNotes,
      staffImages: [...(selectedOrder.staffImages || []), ...msgRequest.attachments]
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Sync failed: Data might be too large (Max 100MB per order in current setup). Try using smaller or fewer images.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        notes: updatedNotes,
        staffImages: [...(selectedOrder.staffImages || []), ...msgRequest.attachments],
        updatedAt: Date.now()
      });

      alert("Message sent to Order Management!");
      setIsMsgSidebarOpen(false);
      setMsgRequest({ message: '', attachments: [] });
    } catch (error) {
      console.error(error);
      alert("Failed to send message.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        {/* Toggle buttons for pending vs completed */}
        <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-150 gap-1 w-full sm:w-auto">
          <button
            onClick={() => { setViewMode('pending'); setSelectedOrder(null); }}
            className={cn(
              "flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
              viewMode === 'pending'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            ⏳ Pending ({orders.filter(o => [OrderStatus.DESIGN, OrderStatus.ORDER_MANAGEMENT, OrderStatus.PRODUCTION].includes(o.status) && (o.status !== OrderStatus.DESIGN || !!o.original_design_file) && !o.machineFiles?.length).length})
          </button>
          <button
            onClick={() => { setViewMode('completed'); setSelectedOrder(null); }}
            className={cn(
              "flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
              viewMode === 'completed'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            ✓ Done ({orders.filter(o => o.status === OrderStatus.DELIVERED).length})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {selectedOrder && (
            <button
              onClick={() => setIsMsgSidebarOpen(true)}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center gap-1.5 shrink-0 border border-indigo-100"
            >
              <MessageSquare size={14} />
              <span>Contact OM</span>
            </button>
          )}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search client or Order ID..."
              className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all w-full font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Order list */}
        <div className={cn("lg:col-span-1 space-y-4", selectedOrder ? "hidden lg:block" : "block")}>
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Scissors size={14} className="text-indigo-500" />
              Digitizing Queue ({filteredOrders.length})
            </h3>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <button
                    key={order.id}
                    onClick={() => order.status !== OrderStatus.DELIVERED && setSelectedOrder(order)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1.5",
                      order.status === OrderStatus.DELIVERED
                        ? "bg-white border-gray-100 cursor-default opacity-85"
                        : selectedOrder?.id === order.id
                          ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01] cursor-pointer"
                          : "bg-white border-gray-100 hover:border-indigo-100 shadow-xs cursor-pointer"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono opacity-60">#{order.id.slice(-6)}</span>
                      <span className="text-[8px] font-black uppercase py-0.5 px-1.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 shrink-0">
                        {getDisplayCategory(order)}
                      </span>
                    </div>

                    <div className="font-bold text-xs truncate">{order.customerInfo.name}</div>

                    <div className="flex justify-between items-center text-[10px] opacity-75 mt-1">
                      <span>Qty: {order.quantity}</span>
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>

                    {order.original_design_file && (
                      <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-150 flex items-center gap-1 text-[9px] font-bold text-green-600">
                        <CheckCircle size={10} />
                        Original design file ready
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="p-8 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center">
                  <Package className="mx-auto text-gray-300 mb-2 animate-bounce-slow" size={24} />
                  <p className="text-xs text-gray-500">No matching orders in queue</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Active Workspace */}
        <div className={cn("lg:col-span-2", selectedOrder ? "block" : "hidden lg:block")}>
          {selectedOrder ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex flex-col gap-2">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="lg:hidden w-fit px-3 py-1.5 bg-gray-150 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border-none cursor-pointer"
                >
                  <ArrowLeft size={14} /> Back to List
                </button>
                <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Order workspace</span>
                  <h4 className="text-base font-black text-slate-900">#{selectedOrder.id}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black uppercase">
                    {selectedOrder.status}
                  </span>
                </div>
              </div>
            </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Client Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150/40 text-left">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Customer Specs</span>
                    <p className="text-xs font-bold text-slate-800">{selectedOrder.customerInfo.name}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{selectedOrder.customerInfo.phone}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150/40 text-left">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Details & Quantity</span>
                    <p className="text-xs font-bold text-slate-800">{getDisplayCategory(selectedOrder)}</p>
                    <p className="text-[10px] text-gray-500 font-medium">Total Qty: {selectedOrder.quantity}</p>
                  </div>
                </div>

                {/* Intake Notes Display Box */}
                {(selectedOrder.notes || selectedOrder.designNotes) && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1 text-left">
                    <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block">
                      📝 Design Instructions / Intake Notes:
                    </span>
                    <p className="text-xs text-gray-800 font-medium whitespace-pre-line leading-relaxed">
                      {selectedOrder.designNotes || selectedOrder.notes}
                    </p>
                  </div>
                )}

                {/* Designer Uploaded Original image */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-gray-250/20 text-left">
                  <h5 className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider mb-3">Original Design Image</h5>
                  {selectedOrder.original_design_file ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-gray-150">
                      {selectedOrder.original_design_file.startsWith('data:image/') ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 relative group">
                          <img src={selectedOrder.original_design_file} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setViewingImage(selectedOrder.original_design_file!)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                          >
                            <ZoomIn size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-indigo-500 flex-shrink-0">
                          <FileText size={24} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{selectedOrder.original_design_filename || 'Original Design Image'}</p>
                        <p className="text-[9px] text-gray-400 font-semibold uppercase">HD Quality Available</p>
                      </div>
                      <a
                        href={selectedOrder.original_design_file}
                        download={selectedOrder.original_design_filename || `original_design_${selectedOrder.id}`}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 shadow cursor-pointer text-center whitespace-nowrap"
                      >
                        <Download size={12} />
                        Download HD File
                      </a>
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-red-200 rounded-xl bg-red-50/20 text-center text-red-500 font-bold text-xs flex items-center justify-center gap-2">
                      <AlertCircle size={16} />
                      No original design file has been sent from designs dashboard yet.
                    </div>
                  )}
                </div>

                {/* Upload Machine Files Zip box */}
                {viewMode === 'pending' && (
                  <div className="bg-indigo-50/20 p-5 rounded-2xl border border-indigo-100 text-left space-y-4">
                    <h5 className="text-[10.5px] font-black text-indigo-900 uppercase tracking-wider">Embroidery / Garage ZIP File Upload</h5>
                    <FileUpload
                      label="Upload EMB, DST, CDR, or ZIP file (Auto-Optimized)"
                      onFilesSelected={(files) => setUploadFiles(prev => [...prev, ...files])}
                    />

                    {uploadFiles.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Queue for Upload:</p>
                        {uploadFiles.map((file, i) => (
                          <div key={i} className="flex justify-between items-center text-[10px] bg-white p-2 rounded-lg border border-indigo-100">
                            <span className="truncate max-w-[180px] font-mono font-bold text-indigo-950">Machine_File_{i + 1}.zip</span>
                            <button
                              onClick={() => setUploadFiles(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer text-[10px] font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Completed files display block */}
                {selectedOrder.machineFiles && selectedOrder.machineFiles.length > 0 && (
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200 text-left">
                    <h5 className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider mb-3">Uploaded Machine/Production Files</h5>
                    <div className="space-y-2">
                      {selectedOrder.machineFiles.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-150">
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-gray-400" />
                            <span className="text-xs font-mono font-bold text-slate-800">Production_Code_{idx + 1}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={file}
                              download={`Machine_File_${idx + 1}_Order_${selectedOrder.id}`}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-slate-700 transition-colors"
                              title="Download production file"
                            >
                              <Download size={14} />
                            </a>
                            {isAdmin && (
                              <button
                                onClick={() => handleRemoveMachineFile(idx)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg border-none cursor-pointer"
                                title="Delete file"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              {viewMode === 'pending' && (
                <div className="p-6 border-t border-gray-50 bg-gray-50/20 flex justify-end gap-3">
                  <button
                    disabled={isProcessing || uploadFiles.length === 0}
                    onClick={handleUploadSpecs}
                    className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Send to Order Management'}
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="h-[50vh] flex flex-col items-center justify-center p-12 bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-xs flex items-center justify-center mb-4">
                <Scissors className="text-gray-300 animate-pulse-subtle" size={28} />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Select an Order to Start</h4>
              <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">
                Choose a pending design order from the left sidebar to view the designer's original output, download HD specifications, and upload the production zip files.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Graph Model */}
      <div className="pt-4">
        <OrdersChart orders={orders} />
      </div>

      {/* Global Image Viewer Modal */}
      {viewingImage && (
        <ImageViewer
          src={viewingImage}
          onClose={() => setViewingImage(null)}
          fileName={`Original_Design_${selectedOrder?.id}`}
        />
      )}

      {/* Message Sidebar Modal drawer */}
      {isMsgSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-end">
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white h-full w-full max-w-md p-6 shadow-2xl flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black uppercase text-indigo-900 tracking-wider">Contact Order Management</h3>
                <button
                  onClick={() => setIsMsgSidebarOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Your message</label>
                <textarea
                  rows={6}
                  placeholder="Enter details or flags for order management..."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white outline-none focus:border-indigo-500 font-medium leading-relaxed resize-none"
                  value={msgRequest.message}
                  onChange={(e) => setMsgRequest(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Attachments</label>
                <FileUpload
                  label="Upload reference files if any"
                  onFilesSelected={(files) => setMsgRequest(prev => ({ ...prev, attachments: [...prev.attachments, ...files] }))}
                />
                {msgRequest.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {msgRequest.attachments.map((file, idx) => (
                      <div key={idx} className="relative w-12 h-12 bg-indigo-50 border border-indigo-150 rounded-lg overflow-hidden shrink-0 group">
                        <img src={file} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setMsgRequest(prev => ({ ...prev, attachments: prev.attachments.filter((_, idx2) => idx2 !== idx) }))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white border-none cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => setIsMsgSidebarOpen(false)}
                className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-xs font-bold uppercase transition-all"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing || (!msgRequest.message && msgRequest.attachments.length === 0)}
                onClick={sendToOrderMgmt}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md disabled:opacity-50"
              >
                Send Message
              </button>
            </div>
          </motion.div>
        </div>
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
