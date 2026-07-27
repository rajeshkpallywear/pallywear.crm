/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
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
  Trash2
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { getDisplayCategory, cn, isOrderSizeValid } from '../lib/utils';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';

interface DigitizingDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  isAdmin?: boolean;
}

export default function DigitizingDashboard({ orders, onUpdateOrder, isAdmin }: DigitizingDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'pending' | 'completed'>('pending');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadFiles, setUploadFiles] = useState<string[]>([]);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = (o.customerInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase());

    // Show orders in DESIGN, ORDER_MANAGEMENT, or PRODUCTION status for digitizing
    const relevantStatus = [OrderStatus.DESIGN, OrderStatus.ORDER_MANAGEMENT, OrderStatus.PRODUCTION].includes(o.status);

    if (viewMode === 'pending') {
      return matchesSearch && relevantStatus && !o.machineFiles?.length;
    } else {
      return matchesSearch && (relevantStatus || o.status === OrderStatus.DELIVERY) && (o.machineFiles?.length || 0) > 0;
    }
  });

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
    <div className="space-y-8">
      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMsgSidebarOpen(true)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
          >
            <Upload size={18} />
            <span>Message Order Mgmt</span>
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Find order..."
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-64 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      {/* Digitization Status (Mockup View) */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-4">Digitization Status</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3">Order #</th>
                <th className="px-5 py-3">Design File</th>
                <th className="px-5 py-3">Stitch Count</th>
                <th className="px-5 py-3">Machine Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-xs">No active digitization jobs.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
