/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Layers,
  Package,
  ChevronRight,
  FileText,
  Download,
  ExternalLink,
  Paperclip,
  ZoomIn,
  Share2,
  Globe,
  CreditCard,
  Trash2,
  Search,
  Plus,
  Activity,
  Users,
  Upload,
  Palette,
  Send,
  MessageSquare,
  Check,
  Clock,
  AlertCircle,
  X,
  Truck
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { cn, getDisplayCategory, isOrderSizeValid } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import InventoryManagement from './InventoryManagement';
import Logo from './Logo';
import OrdersChart from './OrdersChart';
import { getApiBaseUrl } from '../lib/apiConfig';

export interface ChatMessage {
  id: string;
  sender: string;
  senderRole: string;
  text: string;
  attachments: string[];
  createdAt: number;
}

interface OrderManagementDashboardProps {
  orders: Order[];
  inventory?: any[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
}

export default function OrderManagementDashboard({ orders, inventory = [], onUpdateOrder, onDeleteOrder, isAdmin }: OrderManagementDashboardProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSection, setSelectedSection] = useState<'recent' | 'process' | 'hold' | 'completed' | 'vendors'>('recent');
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [vendorExpenses, setVendorExpenses] = useState<any[]>([]);
  const [registeredVendors, setRegisteredVendors] = useState<any[]>([]);

  const fetchVendorsAndExpenses = async () => {
    try {
      const base = getApiBaseUrl();
      const resExp = await fetch(`${base}/api/expenses?type=vendor`);
      const dataExp = await resExp.json();
      if (dataExp.success) {
        setVendorExpenses(dataExp.expenses || []);
      }

      const resUsers = await fetch(`${base}/api/users`);
      const dataUsers = await resUsers.json();
      if (Array.isArray(dataUsers)) {
        const filtered = dataUsers.filter((u: any) => u.role === 'vendor' || u.role?.toLowerCase() === 'vendor');
        setRegisteredVendors(filtered);
      }
    } catch (e) {
      console.error('Failed to fetch vendors/expenses:', e);
    }
  };

  useEffect(() => {
    fetchVendorsAndExpenses();
  }, []);

  // Filter lists based on selected tabs
  const filteredOrders = orders.filter(o => {
    const matchesSearch = (o.customerInfo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedSection === 'hold') {
      return o.status === OrderStatus.HOLD && (o.previousStatus === OrderStatus.ORDER_MANAGEMENT || !o.previousStatus);
    }
    if (selectedSection === 'completed') {
      return [OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(o.status);
    }
    if (selectedSection === 'process') {
      return o.status === OrderStatus.PRODUCTION;
    }
    if (selectedSection === 'vendors') {
      return o.status === OrderStatus.ORDER_MANAGEMENT;
    }
    // 'recent' shows Order Management active queue
    return o.status === OrderStatus.ORDER_MANAGEMENT || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT);
  });

  const recentOrdersCount = orders.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT)).length;
  const processOrdersCount = orders.filter(o => o.status === OrderStatus.PRODUCTION).length;
  const holdOrdersCount = orders.filter(o => o.status === OrderStatus.HOLD && (o.previousStatus === OrderStatus.ORDER_MANAGEMENT || !o.previousStatus)).length;
  const completedOrdersCount = orders.filter(o => [OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(o.status)).length;

  // Auto-select first order if none is selected (except completed tab)
  useEffect(() => {
    if (selectedSection === 'completed') {
      setSelectedOrder(null);
    } else if (filteredOrders.length > 0 && (!selectedOrder || !filteredOrders.some(o => o.id === selectedOrder.id))) {
      setSelectedOrder(filteredOrders[0]);
    }
  }, [orders, selectedSection]);

  const handleProcessOrder = async () => {
    if (!selectedOrder || isProcessing) return;

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.PRODUCTION,
        updatedAt: Date.now()
      });

      setSelectedOrder(null);
      alert("Success: Order shared with Production Team.");
    } catch (e: any) {
      console.error("Order Management process failed:", e);
      alert("Failed to share order.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHoldOrder = async () => {
    if (!selectedOrder || isProcessing) return;

    if (selectedOrder.status === OrderStatus.HOLD) {
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
      return;
    }

    const reason = window.prompt("Enter Hold Reason:");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Hold reason is mandatory.");
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
  };

  const handleAssignToVendor = async (vendorName: string, amount: number, notesText: string) => {
    if (!selectedOrder || isProcessing) return;
    if (!vendorName) {
      alert("Please select a vendor.");
      return;
    }
    
    setIsProcessing(true);
    try {
      const base = getApiBaseUrl();
      const res = await fetch(`${base}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'vendor',
          vendorName: vendorName,
          productName: `${getDisplayCategory(selectedOrder)} (Order #${selectedOrder.id.slice(-6)})`,
          qty: String(selectedOrder.quantity || 1),
          amount: amount,
          notes: notesText || `Assigned order #${selectedOrder.id.slice(-6)} to vendor ${vendorName}`,
          date: new Date().toISOString().split('T')[0]
        })
      });
      
      const data = await res.json();
      if (data.success) {
        await onUpdateOrder(selectedOrder.id, {
          status: OrderStatus.PRODUCTION,
          notes: selectedOrder.notes 
            ? `${selectedOrder.notes}\n[VENDOR DISPATCH] Assigned to vendor: ${vendorName} with payout ₹${amount}`
            : `[VENDOR DISPATCH] Assigned to vendor: ${vendorName} with payout ₹${amount}`,
          updatedAt: Date.now()
        });
        
        alert(`Order successfully dispatched to vendor: ${vendorName}!`);
        setSelectedOrder(null);
        fetchVendorsAndExpenses();
      } else {
        alert("Failed to create vendor purchase order.");
      }
    } catch (err) {
      console.error(err);
      alert("Error dispatching order to vendor.");
    } finally {
      setIsProcessing(false);
    }
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

      setSelectedOrder({
        ...selectedOrder,
        [field]: newList
      });
    } catch (e) {
      console.error(e);
    }
  };

  const [isMsgSidebarOpen, setIsMsgSidebarOpen] = useState(false);
  const [msgRequest, setMsgRequest] = useState({
    message: '',
    attachments: [] as string[]
  });

  const [isDesignMsgSidebarOpen, setIsDesignMsgSidebarOpen] = useState(false);
  const [designMsgRequest, setDesignMsgRequest] = useState({
    message: '',
    attachments: [] as string[]
  });

  const [refreshChatCounter, setRefreshChatCounter] = useState(0);

  const parseNotesToMessages = (notes: string | undefined, targetTeam: 'DIGITIZER' | 'DESIGNER'): ChatMessage[] => {
    if (!notes) return [];
    const list: ChatMessage[] = [];

    const blocks = notes.split(/\[ORDER MGMT -> /i);
    blocks.forEach((block, index) => {
      if (index === 0) return;
      const teamHeader = targetTeam === 'DIGITIZER' ? 'DIGITIZER]' : 'DESIGNER]';
      if (block.toUpperCase().startsWith(teamHeader)) {
        const cleaned = block.substring(teamHeader.length).trim();
        const firstNewline = cleaned.indexOf('\n');
        let timestampText = '';
        let text = cleaned;
        if (firstNewline !== -1) {
          timestampText = cleaned.substring(0, firstNewline).trim();
          text = cleaned.substring(firstNewline + 1).trim();
        }

        list.push({
          id: `parsed_${targetTeam}_${index}_${index}`,
          sender: 'Order Management',
          senderRole: 'order_management',
          text: text,
          attachments: [],
          createdAt: isNaN(Date.parse(timestampText))
            ? ((selectedOrder?.createdAt || Date.now()) + index * 1000)
            : Date.parse(timestampText)
        });
      }
    });

    const replyBlocks = notes.split(targetTeam === 'DIGITIZER' ? /\[DIGITIZER -> ORDER MGMT\]/i : /\[DESIGNER -> ORDER MGMT\]/i);
    replyBlocks.forEach((block, index) => {
      if (index === 0) return;
      const cleaned = block.trim();
      const firstNewline = cleaned.indexOf('\n');
      let timestampText = '';
      let text = cleaned;
      if (firstNewline !== -1) {
        timestampText = cleaned.substring(0, firstNewline).trim();
        text = cleaned.substring(firstNewline + 1).trim();
      }

      list.push({
        id: `parsed_reply_${targetTeam}_${index}`,
        sender: targetTeam === 'DIGITIZER' ? 'Digitizer Team' : 'Designer Team',
        senderRole: targetTeam === 'DIGITIZER' ? 'digitizer' : 'designer',
        text: text,
        attachments: [],
        createdAt: isNaN(Date.parse(timestampText))
          ? ((selectedOrder?.createdAt || Date.now()) + index * 1200)
          : Date.parse(timestampText)
      });
    });

    return list.sort((a, b) => a.createdAt - b.createdAt);
  };

  const getCombinedMessages = (targetTeam: 'digitizer' | 'designer'): ChatMessage[] => {
    if (!selectedOrder) return [];
    const storageKey = `pallywear_om_chats_${targetTeam}_${selectedOrder.id}`;
    const localSaved = localStorage.getItem(storageKey);
    let localMsgs: ChatMessage[] = [];
    if (localSaved) {
      try {
        localMsgs = JSON.parse(localSaved);
      } catch (e) { }
    }

    const parsedNotesMsgs = parseNotesToMessages(selectedOrder.notes, targetTeam === 'digitizer' ? 'DIGITIZER' : 'DESIGNER');
    const combined = [...parsedNotesMsgs, ...localMsgs];
    return combined.sort((a, b) => a.createdAt - b.createdAt);
  };

  const sendToDigitizer = async () => {
    const textMsg = msgRequest.message.trim();
    if (!textMsg && msgRequest.attachments.length === 0) {
      alert("Please provide a message or attachments.");
      return;
    }

    if (!selectedOrder) {
      alert("Please select an order first.");
      return;
    }

    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toLocaleString();
    const newNote = `[ORDER MGMT -> DIGITIZER] ${dateStr}\n${textMsg}`;
    const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;
    const finalDesignAttachments = [...(selectedOrder.designAttachments || []), ...msgRequest.attachments];

    setIsProcessing(true);
    try {
      const newChatMsg: ChatMessage = {
        id: `om_msg_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'Order Management',
        senderRole: 'order_management',
        text: textMsg || 'Sent attachments: ' + msgRequest.attachments.length + ' file(s)',
        attachments: msgRequest.attachments,
        createdAt: timestamp
      };

      const storageKey = `pallywear_om_chats_digitizer_${selectedOrder.id}`;
      const existingSaved = localStorage.getItem(storageKey);
      let existingMsgs: ChatMessage[] = [];
      if (existingSaved) {
        try {
          existingMsgs = JSON.parse(existingSaved);
        } catch (e) { }
      }
      existingMsgs.push(newChatMsg);
      localStorage.setItem(storageKey, JSON.stringify(existingMsgs));

      await onUpdateOrder(selectedOrder.id, {
        notes: updatedNotes,
        designAttachments: finalDesignAttachments,
        updatedAt: timestamp
      });

      setSelectedOrder({
        ...selectedOrder,
        notes: updatedNotes,
        designAttachments: finalDesignAttachments,
        updatedAt: timestamp
      });

      setMsgRequest({ message: '', attachments: [] });
      setRefreshChatCounter(prev => prev + 1);

      setTimeout(async () => {
        const replyKey = `pallywear_om_chats_digitizer_${selectedOrder.id}`;
        const currentSaved = localStorage.getItem(replyKey);
        let currentMsgs: ChatMessage[] = [];
        if (currentSaved) {
          try {
            currentMsgs = JSON.parse(currentSaved);
          } catch (e) { }
        }

        const responseText = `Hi, Order Management. We have received the instruction details for order #${selectedOrder.id.slice(-6)}. Reviewing specifications now.`;
        const incomingMsg: ChatMessage = {
          id: `dig_incoming_${Date.now()}`,
          sender: 'Digitizer Team',
          senderRole: 'digitizer',
          text: responseText,
          attachments: [],
          createdAt: Date.now()
        };
        currentMsgs.push(incomingMsg);
        localStorage.setItem(replyKey, JSON.stringify(currentMsgs));

        const autoNote = `[DIGITIZER -> ORDER MGMT] ${new Date().toLocaleString()}\n${responseText}`;
        const completeNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${autoNote}` : autoNote;

        await onUpdateOrder(selectedOrder.id, {
          notes: completeNotes,
          updatedAt: Date.now()
        });

        setSelectedOrder(prev => prev ? { ...prev, notes: completeNotes, updatedAt: Date.now() } : null);
        setRefreshChatCounter(prev => prev + 1);
      }, 1500);

    } catch (error) {
      console.error(error);
      alert("Failed to send message.");
    } finally {
      setIsProcessing(false);
    }
  };

  const sendToDesigner = async () => {
    const textMsg = designMsgRequest.message.trim();
    if (!textMsg && designMsgRequest.attachments.length === 0) {
      alert("Please provide a message or attachments.");
      return;
    }

    if (!selectedOrder) {
      alert("Please select an order first from the list.");
      return;
    }

    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toLocaleString();
    const newNote = `[ORDER MGMT -> DESIGNER] ${dateStr}\n${textMsg}`;
    const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;
    const finalStaffImages = [...(selectedOrder.staffImages || []), ...designMsgRequest.attachments];

    setIsProcessing(true);
    try {
      const newChatMsg: ChatMessage = {
        id: `om_msg_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'Order Management',
        senderRole: 'order_management',
        text: textMsg || 'Sent attachments: ' + designMsgRequest.attachments.length + ' file(s)',
        attachments: designMsgRequest.attachments,
        createdAt: timestamp
      };

      const storageKey = `pallywear_om_chats_designer_${selectedOrder.id}`;
      const existingSaved = localStorage.getItem(storageKey);
      let existingMsgs: ChatMessage[] = [];
      if (existingSaved) {
        try {
          existingMsgs = JSON.parse(existingSaved);
        } catch (e) { }
      }
      existingMsgs.push(newChatMsg);
      localStorage.setItem(storageKey, JSON.stringify(existingMsgs));

      await onUpdateOrder(selectedOrder.id, {
        notes: updatedNotes,
        staffImages: finalStaffImages,
        status: OrderStatus.DESIGN,
        updatedAt: timestamp
      });

      setSelectedOrder({
        ...selectedOrder,
        notes: updatedNotes,
        staffImages: finalStaffImages,
        status: OrderStatus.DESIGN,
        updatedAt: timestamp
      });

      setDesignMsgRequest({ message: '', attachments: [] });
      setRefreshChatCounter(prev => prev + 1);

      setTimeout(async () => {
        const replyKey = `pallywear_om_chats_designer_${selectedOrder.id}`;
        const currentSaved = localStorage.getItem(replyKey);
        let currentMsgs: ChatMessage[] = [];
        if (currentSaved) {
          try {
            currentMsgs = JSON.parse(currentSaved);
          } catch (e) { }
        }

        const responseText = `Received your designer notes. I have re-opened the artwork specs and set status to 'DESIGN'. Thanks!`;
        const incomingMsg: ChatMessage = {
          id: `des_incoming_${Date.now()}`,
          sender: 'Designer Team',
          senderRole: 'designer',
          text: responseText,
          attachments: [],
          createdAt: Date.now()
        };
        currentMsgs.push(incomingMsg);
        localStorage.setItem(replyKey, JSON.stringify(currentMsgs));

        const autoNote = `[DESIGNER -> ORDER MGMT] ${new Date().toLocaleString()}\n${responseText}`;
        const completeNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${autoNote}` : autoNote;

        await onUpdateOrder(selectedOrder.id, {
          notes: completeNotes,
          updatedAt: Date.now()
        });

        setSelectedOrder(prev => prev ? { ...prev, notes: completeNotes, updatedAt: Date.now() } : null);
        setRefreshChatCounter(prev => prev + 1);
      }, 1500);

    } catch (error) {
      console.error(error);
      alert("Failed to send message.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Sync Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-150 shadow-sm">
        <div>
          <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.25em] block mb-1">Pallywear Portal</span>
          <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Order Management Deck</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 bg-gray-50 border border-gray-150 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-black uppercase flex items-center gap-2 transition-all cursor-pointer"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Sync Data
          </button>
        </div>
      </div>

      {/* Top Filter Buttons */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-gray-150 gap-1.5 overflow-x-auto shadow-xs w-full">
        {([
          { key: 'recent', label: '⏳ Live OM Queue', count: recentOrdersCount },
          { key: 'process', label: '⚙️ In Production', count: processOrdersCount },
          { key: 'hold', label: '⏸ On Hold', count: holdOrdersCount },
          { key: 'completed', label: '✓ Completed / Shipped', count: completedOrdersCount },
          { key: 'vendors', label: '🤝 Vendor Dispatch', count: vendorExpenses.length }
        ] as any[]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => { setSelectedSection(key); setSelectedOrder(null); }}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border-none cursor-pointer",
              selectedSection === key
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            )}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-inner px-3 py-1 flex items-center">
        <Search className="text-gray-400 mr-2" size={16} />
        <input
          type="text"
          placeholder="Filter by Customer, Category, or ID..."
          className="w-full bg-transparent outline-none text-xs font-medium text-slate-800 py-1.5"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Main interactive grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Orders list */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Layers size={14} className="text-indigo-500" />
              Active Orders ({filteredOrders.length})
            </h3>

            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1.5 cursor-pointer",
                      selectedOrder?.id === order.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]"
                        : "bg-white border-gray-100 hover:border-brand-primary/20 shadow-xs"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono opacity-60">#{order.id.slice(-8)}</span>
                      <span className="text-[8px] font-black uppercase py-0.5 px-1.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 shrink-0">
                        {getDisplayCategory(order)}
                      </span>
                    </div>

                    <div className="font-bold text-xs truncate">{order.customerInfo.name}</div>

                    <div className="flex justify-between items-center text-[10px] opacity-75 mt-1">
                      <span>Qty: {order.quantity}</span>
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Indicators */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {order.original_design_file && (
                        <span className="text-[8px] font-black uppercase bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-150">
                          Design Sent
                        </span>
                      )}
                      {(order.machineFiles || []).length > 0 && (
                        <span className="text-[8px] font-black uppercase bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-150 animate-pulse">
                          Digitized ({(order.machineFiles || []).length})
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center">
                  <Package className="mx-auto text-gray-300 mb-2 animate-bounce-slow" size={24} />
                  <p className="text-xs text-gray-500">No active orders found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Active detail space */}
        <div className="lg:col-span-2">
          {selectedOrder ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden text-left"
            >
              {/* Workspace Header */}
              <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Order verification workspace</span>
                  <h4 className="text-base font-black text-slate-900">Order #{selectedOrder.id}</h4>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-black uppercase">
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Workspace Body */}
              <div className="p-6 space-y-6">
                {/* Client detail grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150/40 text-left">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Customer Specs</span>
                    <p className="text-xs font-bold text-slate-800">{selectedOrder.customerInfo.name}</p>
                    <p className="text-[10px] text-gray-500 font-medium">{selectedOrder.customerInfo.phone}</p>
                    <p className="text-[9.5px] text-gray-400 italic mt-1">{selectedOrder.customerInfo.address}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150/40 text-left">
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Category & Quantities</span>
                    <p className="text-xs font-bold text-slate-800">{getDisplayCategory(selectedOrder)}</p>
                    <p className="text-[10px] text-gray-500 font-medium">Total Quantity: {selectedOrder.quantity}</p>
                    <p className="text-[10px] text-brand-primary font-black uppercase mt-1">Total Amount: ${selectedOrder.financials?.totalAmount}</p>
                  </div>
                </div>

                {/* Notes box */}
                {(selectedOrder.notes || selectedOrder.designNotes) && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1 text-left">
                    <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block">
                      📝 Notes / Instructions Log:
                    </span>
                    <p className="text-xs text-gray-800 font-medium whitespace-pre-line leading-relaxed">
                      {selectedOrder.notes || selectedOrder.designNotes}
                    </p>
                  </div>
                )}

                {/* Accounts invoice billing files */}
                {selectedOrder.accountsAttachments && selectedOrder.accountsAttachments.length > 0 && (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-gray-250/20 text-left">
                    <h5 className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider mb-3">Accounts Billing Invoice / Documents</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedOrder.accountsAttachments.map((file, i) => (
                        <div key={i} className="flex flex-col gap-2 p-2 bg-white rounded-xl border border-gray-150 group relative">
                          <div className="aspect-square rounded-lg overflow-hidden relative bg-gray-50 flex items-center justify-center border border-gray-100">
                            {file.startsWith('data:image/') ? (
                              <img src={file} className="w-full h-full object-cover" />
                            ) : (
                              <FileText size={24} className="text-amber-500" />
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                              {file.startsWith('data:image/') && (
                                <button
                                  onClick={() => setViewingImage(file)}
                                  className="p-1 bg-white/20 hover:bg-white/40 rounded-full text-white border-none cursor-pointer"
                                >
                                  <ZoomIn size={12} />
                                </button>
                              )}
                              <a
                                href={file}
                                download={`billing_doc_${i + 1}_order_${selectedOrder.id.slice(-6)}`}
                                className="p-1 bg-white/20 hover:bg-white/40 rounded-full text-white cursor-pointer"
                              >
                                <Download size={12} />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Original design image uploaded by designer */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-gray-250/20 text-left">
                  <h5 className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider mb-3">Original Design Image (Designs Output)</h5>
                  {selectedOrder.original_design_file ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-gray-150">
                      {selectedOrder.original_design_file.startsWith('data:image/') ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0 relative group">
                          <img src={selectedOrder.original_design_file} className="w-full h-full object-cover" />
                          <button
                            onClick={() => setViewingImage(selectedOrder.original_design_file!)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                          >
                            <ZoomIn size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-indigo-500 flex-shrink-0">
                          <FileText size={20} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{selectedOrder.original_design_filename || 'Original Design Image'}</p>
                        <p className="text-[8px] text-gray-400 font-bold uppercase">Designer Output</p>
                      </div>
                      <a
                        href={selectedOrder.original_design_file}
                        download={selectedOrder.original_design_filename || `original_design_${selectedOrder.id}`}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Download size={10} />
                        Download Original File
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No designer outputs found.</p>
                  )}
                </div>

                {/* Digitizer's zip garage files */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-gray-250/20 text-left">
                  <h5 className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider mb-3">Digitizer Embroidery Production Files</h5>
                  {selectedOrder.machineFiles && selectedOrder.machineFiles.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedOrder.machineFiles.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-150">
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-indigo-500" />
                            <span className="text-xs font-mono font-bold text-slate-800">production_file_{idx + 1}.zip</span>
                          </div>
                          <a
                            href={file}
                            download={`digitizer_file_${idx + 1}_order_${selectedOrder.id}`}
                            className="p-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-slate-700 border-none cursor-pointer"
                          >
                            <Download size={12} />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No digitizer machine files uploaded yet.</p>
                  )}
                </div>

                {/* Vendor Assignment Box */}
                {selectedSection === 'vendors' && (
                  <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 text-left space-y-4">
                    <h5 className="text-[11px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                      <Truck size={14} />
                      Vendor Order Dispatch Desk
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Select Vendor</label>
                        <select 
                          id="vendor_select"
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" disabled>-- Choose Registered Vendor --</option>
                          {registeredVendors.map(vendor => (
                            <option key={vendor.id} value={vendor.name}>{vendor.name} ({vendor.email})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Contract Amount (INR)</label>
                        <input
                          id="vendor_amount"
                          type="number"
                          defaultValue={selectedOrder.totalPrice || 0}
                          placeholder="Payout amount"
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Production Instructions / Specs</label>
                      <textarea
                        id="vendor_instructions"
                        rows={3}
                        placeholder="Write colors, patterns, material or pocket details..."
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>

                    <button
                      onClick={() => {
                        const sel = document.getElementById('vendor_select') as HTMLSelectElement;
                        const amt = document.getElementById('vendor_amount') as HTMLInputElement;
                        const inst = document.getElementById('vendor_instructions') as HTMLTextAreaElement;
                        if (!sel || !sel.value) {
                          alert("Please select a vendor first!");
                          return;
                        }
                        handleAssignToVendor(sel.value, Number(amt?.value || 0), inst?.value || '');
                      }}
                      disabled={isProcessing}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-none"
                    >
                      {isProcessing ? 'Dispatching...' : 'Assign & Dispatch to Vendor'}
                    </button>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              {selectedSection === 'recent' && selectedOrder.status === OrderStatus.ORDER_MANAGEMENT && (
                <div className="p-6 border-t border-gray-50 bg-gray-50/20 flex justify-end gap-3">
                  <button
                    disabled={isProcessing}
                    onClick={handleHoldOrder}
                    className="px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-red-200"
                  >
                    <AlertCircle size={14} />
                    Hold Order
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={handleProcessOrder}
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer border-none"
                  >
                    {isProcessing ? 'Processing...' : 'Send to Production'}
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {selectedSection === 'hold' && selectedOrder.status === OrderStatus.HOLD && (
                <div className="p-6 border-t border-gray-50 bg-gray-50/20 flex justify-end">
                  <button
                    disabled={isProcessing}
                    onClick={handleHoldOrder}
                    className="px-6 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border border-green-200"
                  >
                    Release Hold
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="h-[50vh] flex flex-col items-center justify-center p-12 bg-gray-50 border border-dashed border-gray-200 rounded-3xl text-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-xs flex items-center justify-center mb-4">
                <Layers className="text-gray-300" size={28} />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Select an Order to Start</h4>
              <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">
                Choose a pending design order from the left sidebar to verify all designer outputs, billing images, digitizing files, and dispatch them to the production dashboard.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Inventory Summary Section */}
      <div className="pt-4 border-t border-gray-100 pb-8">
        <InventoryManagement userRole={isAdmin ? 'admin' : 'order_management'} />
      </div>

      {/* Analytics Graph Model */}
      <div className="pt-4 pb-8">
        <OrdersChart orders={orders} />
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

      {/* Global Image Viewer Modal */}
      {viewingImage && (
        <ImageViewer
          src={viewingImage}
          onClose={() => setViewingImage(null)}
          fileName={`Verification_Attachment_${selectedOrder?.id}`}
        />
      )}

      {/* Communication Sidebar */}
      {isMsgSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsMsgSidebarOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-black text-white text-left">
              <div className="flex items-center gap-3">
                <Logo iconOnly />
                <div className="text-left">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/90">Communicate to Digitizer</h3>
                  <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest text-left">
                    {selectedOrder ? `Order #${selectedOrder.id.slice(-6)} • ${selectedOrder.customerInfo.name}` : "Interactive Chat"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMsgSidebarOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/75 border-none bg-transparent cursor-pointer"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Scrollable Chat Feed Area */}
            <div
              id="digitizer_chat_scroll"
              className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 text-left"
              style={{ scrollBehavior: 'smooth' }}
            >
              {selectedOrder ? (
                (() => {
                  const msgs = getCombinedMessages('digitizer');
                  if (msgs.length === 0) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                        <MessageSquare className="mx-auto mb-2 opacity-50" size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest mb-1 text-gray-500">Normal Conversation Thread</p>
                        <p className="text-xs max-w-xs leading-relaxed text-gray-400">Initialize chat with Digitizing Team below. Messages stay persistent.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-4">
                      {msgs.map((msg, index) => {
                        const isOM = msg.senderRole === 'order_management';
                        return (
                          <div
                            key={msg.id || index}
                            className={cn(
                              "flex flex-col max-w-[85%] rounded-2xl p-4 shadow-sm relative clear-both my-2",
                              isOM
                                ? "bg-black text-white ml-auto rounded-tr-none text-right"
                                : "bg-white text-gray-800 mr-auto rounded-tl-none border border-gray-100 text-left"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1 gap-4">
                              <span className={cn("text-[9px] font-black uppercase tracking-wider", isOM ? "text-brand-primary" : "text-blue-600")}>
                                {msg.sender}
                              </span>
                              <span className="text-[8px] opacity-60 font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-left break-words">{msg.text}</p>

                            {/* Render message level attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-white/10">
                                {msg.attachments.map((att, i) => (
                                  <div key={i} className="group relative w-12 h-12 rounded border border-gray-200 overflow-hidden bg-gray-100">
                                    <img src={att} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button
                                        onClick={() => setViewingImage(att)}
                                        className="text-white hover:scale-110 transition-transform"
                                        title="View"
                                      >
                                        <ZoomIn size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <p className="text-center text-xs text-gray-400">Select an order first</p>
              )}
            </div>

            {/* Sidebar Active Inputs Block */}
            <div className="p-4 border-t border-gray-100 bg-white space-y-3 shrink-0">
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Type Instructions</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-xs font-medium resize-none shadow-inner animate-none"
                  placeholder="Ask a question or specify stitching details here..."
                  value={msgRequest.message}
                  onChange={(e) => setMsgRequest(prev => ({ ...prev, message: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendToDigitizer();
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Share Files</span>
                  {msgRequest.attachments.length > 0 && (
                    <span className="text-[9px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <Check size={10} /> {msgRequest.attachments.length} Ready
                    </span>
                  )}
                </div>

                <FileUpload
                  label="Upload Artwork References"
                  accept="image/*,.pdf"
                  onFilesSelected={(files) => setMsgRequest(prev => ({ ...prev, attachments: files }))}
                />
              </div>

              <button
                disabled={isProcessing || !selectedOrder || (!msgRequest.message.trim() && msgRequest.attachments.length === 0)}
                onClick={sendToDigitizer}
                className="w-full py-3.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-transform text-xs cursor-pointer border-none"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span>Send to Digitizer</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Designer Communication Sidebar */}
      {isDesignMsgSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsDesignMsgSidebarOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col"
          >
            {/* Sidebar Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-purple-900 text-white text-left">
              <div className="flex items-center gap-3">
                <Logo iconOnly />
                <div className="text-left">
                  <h3 className="text-sm font-black uppercase tracking-widest text-white/95">Communicate to Designer</h3>
                  <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest text-left">
                    {selectedOrder ? `Order #${selectedOrder.id.slice(-6)} • ${selectedOrder.customerInfo.name}` : "Interactive Chat"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDesignMsgSidebarOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/75 border-none bg-transparent cursor-pointer"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Scrollable Chat Feed Area */}
            <div
              id="designer_chat_scroll"
              className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 text-left"
              style={{ scrollBehavior: 'smooth' }}
            >
              {selectedOrder ? (
                (() => {
                  const msgs = getCombinedMessages('designer');
                  if (msgs.length === 0) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                        <MessageSquare className="mx-auto mb-2 text-purple-500 opacity-55" size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest mb-1 text-purple-700">Normal Conversation Thread</p>
                        <p className="text-xs max-w-xs leading-relaxed text-gray-400">Initialize design feedback. Updates order in real-time under Design Stage.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-4">
                      {msgs.map((msg, index) => {
                        const isOM = msg.senderRole === 'order_management';
                        return (
                          <div
                            key={msg.id || index}
                            className={cn(
                              "flex flex-col max-w-[85%] rounded-2xl p-4 shadow-sm relative clear-both my-2",
                              isOM
                                ? "bg-purple-900 text-white ml-auto rounded-tr-none text-right"
                                : "bg-white text-gray-800 mr-auto rounded-tl-none border border-gray-100 text-left"
                            )}
                          >
                            <div className="flex items-center justify-between mb-1 gap-4 text-left">
                              <span className={cn("text-[9px] font-black uppercase tracking-wider", isOM ? "text-purple-300" : "text-purple-700")}>
                                {msg.sender}
                              </span>
                              <span className="text-[8px] opacity-60 font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap text-left break-words">{msg.text}</p>

                            {/* Render attachments */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-purple-100">
                                {msg.attachments.map((att, i) => (
                                  <div key={i} className="group relative w-12 h-12 rounded border border-gray-100 overflow-hidden bg-gray-50">
                                    <img src={att} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button
                                        onClick={() => setViewingImage(att)}
                                        className="text-white hover:scale-110 transition-transform"
                                        title="View"
                                      >
                                        <ZoomIn size={12} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <p className="text-center text-xs text-gray-400">Select an order first</p>
              )}
            </div>

            {/* Sidebar Active Inputs Block */}
            <div className="p-4 border-t border-gray-100 bg-white space-y-3 shrink-0">
              <div className="space-y-1 text-left">
                <label className="text-[9px] font-black text-purple-900 uppercase tracking-widest block">Type Brand/Design instructions</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-xs font-medium resize-none shadow-inner"
                  placeholder="Give placement advice, material comments, or feedback text..."
                  value={designMsgRequest.message}
                  onChange={(e) => setDesignMsgRequest(prev => ({ ...prev, message: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendToDesigner();
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Design Files</span>
                  {designMsgRequest.attachments.length > 0 && (
                    <span className="text-[9px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <Check size={10} /> {designMsgRequest.attachments.length} Ready
                    </span>
                  )}
                </div>

                <FileUpload
                  label="Upload Brand Guidelines / Refs"
                  accept="image/*,.pdf text/plain"
                  onFilesSelected={(files) => setDesignMsgRequest(prev => ({ ...prev, attachments: files }))}
                />
              </div>

              <button
                disabled={isProcessing || !selectedOrder || (!designMsgRequest.message.trim() && designMsgRequest.attachments.length === 0)}
                onClick={sendToDesigner}
                className="w-full py-3.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-transform text-xs cursor-pointer border-none"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span>Send to Design Team</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
