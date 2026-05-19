import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Search,
  Clock,
  ChevronRight,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  User,
  Trash2,
  Paperclip,
  Upload,
  Package,
  Mic,
  ZoomIn
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import { cn, getDisplayCategory, isOrderSizeValid } from '../lib/utils';

interface DigitizingDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  isAdmin?: boolean;
}

export default function DigitizingDashboard({ orders, onUpdateOrder, isAdmin }: DigitizingDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [machineFiles, setMachineFiles] = useState<string[]>([]);

  // Filter orders that might need digitizing (Design, Order Management, or Production)
  const relevantOrders = orders.filter(o => 
    [OrderStatus.DESIGN, OrderStatus.ORDER_MANAGEMENT, OrderStatus.PRODUCTION].includes(o.status)
  ).sort((a, b) => b.updatedAt - a.updatedAt);

  const filteredOrders = relevantOrders.filter(o =>
    o.customerInfo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.includes(searchTerm)
  );

  const handleProcessOrder = async () => {
    if (!selectedOrder || isProcessing) return;

    if (machineFiles.length === 0) {
      alert("Please upload machine files before marking as complete.");
      return;
    }

    const nextOrderState = {
      ...selectedOrder,
      machineFiles: [...(selectedOrder.machineFiles || []), ...machineFiles]
    };

    if (!isOrderSizeValid(nextOrderState as Order)) {
      alert("Error: Total order data limit exceeded (Max 1MB). Please use smaller files.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        machineFiles: nextOrderState.machineFiles,
        updatedAt: Date.now()
      });
      setSelectedOrder(null);
      setMachineFiles([]);
      alert("Success: Machine files uploaded successfully.");
    } catch (e: any) {
      console.error(e);
      alert("An error occurred while uploading files.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFile = (index: number) => {
    setMachineFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Digitizing Hub</h2>
          <p className="text-gray-500 mt-1">Review artwork and upload embroidery machine files</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100 italic font-medium">
          <Users size={20} />
          <span>Digitizing & Embroidery</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3 flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 max-w-md shadow-sm">
            <Search className="text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search orders..."
              className="bg-transparent border-none outline-none text-sm w-full font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-400">
                      <div className="flex items-center gap-2">
                        #{order.id.slice(-8)}
                        {order.isUrgent && (
                          <span className="bg-red-500 text-white text-[8px] font-black px-1 rounded">URGENT</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{order.customerInfo.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-black uppercase tracking-tight">
                        {getDisplayCategory(order)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-xs capitalize text-gray-600">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 ml-auto"
                      >
                        View Details
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                    No orders require digitizing at the moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Digitizing Workspace</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tabular-nums">Order #{selectedOrder.id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Trash2 size={24} className="text-gray-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <section>
                    <h4 className="text-[10px] font-black text-brand-primary uppercase mb-3 flex items-center gap-2">
                      <User size={12} />
                      Order Instructions
                    </h4>
                    <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Notes & Instructions</p>
                        <p className="text-xs font-medium text-gray-700 whitespace-pre-wrap">{selectedOrder.notes || 'No notes available.'}</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[10px] font-black text-brand-primary uppercase mb-3 flex items-center gap-2">
                      <Paperclip size={12} />
                      Artwork & References
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[...(selectedOrder.designAttachments || []), ...(selectedOrder.staffImages || [])].map((file, i) => {
                        return (
                          <div
                            key={i}
                            className="flex flex-col gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-100 group"
                          >
                            <div className="aspect-square rounded-xl overflow-hidden relative bg-white flex items-center justify-center border border-gray-100">
                              {file.startsWith('data:image/') ? (
                                <img src={file} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                  <FileText size={32} />
                                  <span className="text-[8px] font-black uppercase">Document</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                {file.startsWith('data:image/') && (
                                  <button
                                    onClick={() => setViewingImage(file)}
                                    className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all hover:scale-110"
                                  >
                                    <ZoomIn size={16} />
                                  </button>
                                )}
                                <a
                                  href={file}
                                  download={`Artwork_${i + 1}`}
                                  className="p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all hover:scale-110"
                                >
                                  <Download size={16} />
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <div className="space-y-8 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
                  <section>
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Upload size={18} className="text-blue-600" />
                      Upload Machine Files (.dst, .pes, .zip)
                    </h4>
                    <FileUpload
                      label="Upload Embroidery Files"
                      accept=".zip,.dst,.pes,.jef,.exp"
                      onFilesSelected={(files) => setMachineFiles(prev => [...prev, ...files])}
                    />
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      {machineFiles.map((file, i) => (
                         <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center group">
                          <Upload size={20} className="text-blue-500" />
                          <button onClick={() => handleRemoveFile(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10} /></button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 flex gap-4 shrink-0 bg-gray-50/30">
              <button onClick={() => setSelectedOrder(null)} className="px-6 py-4 border border-gray-200 rounded-2xl font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleProcessOrder}
                disabled={isProcessing || machineFiles.length === 0}
                className="flex-[2] px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {isProcessing ? <Clock className="animate-spin" /> : <CheckCircle size={20} />}
                Upload Files
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {viewingImage && (
        <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName="Artwork" />
      )}
    </div>
  );
}
