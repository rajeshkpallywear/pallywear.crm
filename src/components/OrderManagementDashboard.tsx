/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Layers, Package, ChevronRight, FileText, Download, ExternalLink, Paperclip, ZoomIn, Share2, Globe, CreditCard, Trash2, Search, Plus, Activity, Users, Upload, Palette, Send, MessageSquare, Check, Clock } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { cn, getDisplayCategory, isOrderSizeValid } from '../lib/utils';
import OrderDetailModal from './OrderDetailModal';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import InventoryManagement from './InventoryManagement';
import Logo from './Logo';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const PRODUCTION_PIPELINE_DATA: { name: string; value: number; color: string }[] = [];

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
  const [selectedSection, setSelectedSection] = useState<'recent' | 'process' | 'hold' | 'completed'>('recent');
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);

  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingOrders = orders.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT));

  const filteredOrders = orders.filter(o => {
    if (selectedSection === 'hold') {
      return o.status === OrderStatus.HOLD && (o.previousStatus === OrderStatus.ORDER_MANAGEMENT || !o.previousStatus);
    }
    if (selectedSection === 'completed') {
      return [OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(o.status);
    }
    if (selectedSection === 'process') {
      return o.status === OrderStatus.ORDER_MANAGEMENT && !!o.assignedDesigner;
    }
    return o.status === OrderStatus.ORDER_MANAGEMENT || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT);
  });

  const recentOrdersCount = orders.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT)).length;
  const processOrdersCount = orders.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT && !!o.assignedDesigner).length;
  const holdOrdersCount = orders.filter(o => o.status === OrderStatus.HOLD && (o.previousStatus === OrderStatus.ORDER_MANAGEMENT || !o.previousStatus)).length;
  const completedOrdersCount = orders.filter(o => [OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(o.status)).length;

  // Auto-select first order if none is selected
  useEffect(() => {
    const list = filteredOrders;
    if (list.length > 0 && (!selectedOrder || !list.some(o => o.id === selectedOrder.id))) {
      setSelectedOrder(list[0]);
    }
  }, [orders, selectedSection]);



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

    // Check total order document size of next state
    const nextOrderState = {
      ...selectedOrder,
      orderManagementAttachments: []
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 100MB). Please remove some existing attachments before adding management files.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.PRODUCTION,
        orderManagementAttachments: [],
        updatedAt: Date.now()
      });

      setSelectedOrder(null);
      alert("Success: Order shared with Production Team.");
    } catch (e: any) {
      console.error("Order Management process failed:", e);
      if (e?.message?.includes("exceeds the maximum allowed size")) {
        alert("Failed to share: The total attachment size is too large for database (Limit: 100MB total). Please remove some images or use smaller files.");
      } else {
        alert("Failed to share order. Error: " + (e?.message?.slice(0, 50)));
      }
    } finally {
      setIsProcessing(false);
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

    // Split by blocks that start with bracket notes
    const blocks = notes.split(/\[ORDER MGMT -> /i);
    blocks.forEach((block, index) => {
      if (index === 0) return; // leading text
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

    // Extract digitized/designer responses from notes if formatted as [DIGITIZER -> ORDER MGMT] or similar
    const lines = notes.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('[DIGITIZER ->') && targetTeam === 'DIGITIZER') {
        const indexText = line.indexOf(']');
        const text = indexText !== -1 ? line.substring(indexText + 1).trim() : line;
        list.push({
          id: `dig_resp_notes_${index}`,
          sender: 'Digitizer Team',
          senderRole: 'digitizer',
          text: text,
          attachments: [],
          createdAt: (selectedOrder?.updatedAt || Date.now()) - 300000 + index * 1000
        });
      } else if (line.includes('[DESIGNER ->') && targetTeam === 'DESIGNER') {
        const indexText = line.indexOf(']');
        const text = indexText !== -1 ? line.substring(indexText + 1).trim() : line;
        list.push({
          id: `des_resp_notes_${index}`,
          sender: 'Designer Team',
          senderRole: 'designer',
          text: text,
          attachments: [],
          createdAt: (selectedOrder?.updatedAt || Date.now()) - 300000 + index * 1000
        });
      }
    });

    return list;
  };

  const getCombinedMessages = (type: 'digitizer' | 'designer'): ChatMessage[] => {
    if (!selectedOrder) return [];

    // 1. Parse from notes
    const notesMsgs = parseNotesToMessages(selectedOrder.notes, type === 'digitizer' ? 'DIGITIZER' : 'DESIGNER');

    // 2. Read from localStorage for interactive thread
    const storageKey = `pallywear_om_chats_${type}_${selectedOrder.id}`;
    const saved = localStorage.getItem(storageKey);
    let storageMsgs: ChatMessage[] = [];
    if (saved) {
      try {
        storageMsgs = JSON.parse(saved);
      } catch (e) {
        storageMsgs = [];
      }
    }

    // 3. Combine both lists, deduplicate by text context
    const combined = [...notesMsgs];
    storageMsgs.forEach(item => {
      const exists = combined.some(c =>
        (c.text === item.text && Math.abs(c.createdAt - item.createdAt) < 5000) ||
        c.id === item.id
      );
      if (!exists) {
        combined.push(item);
      }
    });

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

    // Prepare next state and validate size constraints
    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toLocaleString();
    const newNote = `[ORDER MGMT -> DIGITIZER] ${dateStr}\n${textMsg}`;
    const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;
    const finalDesignAttachments = [...(selectedOrder.designAttachments || []), ...msgRequest.attachments];

    const nextOrderState = {
      ...selectedOrder,
      notes: updatedNotes,
      designAttachments: finalDesignAttachments,
      updatedAt: timestamp
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 100MB total across all cloud-saved attachments on this order). Please use smaller or fewer images, or clear some existing files first.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create message object
      const newChatMsg: ChatMessage = {
        id: `om_msg_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'Order Management',
        senderRole: 'order_management',
        text: textMsg || 'Sent attachments: ' + msgRequest.attachments.length + ' file(s)',
        attachments: msgRequest.attachments,
        createdAt: timestamp
      };

      // 2. Save message object to localStorage chat history, wrapped safely to prevent quota crashes
      const storageKey = `pallywear_om_chats_digitizer_${selectedOrder.id}`;
      const existingSaved = localStorage.getItem(storageKey);
      let existingMsgs: ChatMessage[] = [];
      if (existingSaved) {
        try {
          existingMsgs = JSON.parse(existingSaved);
        } catch (e) { }
      }
      existingMsgs.push(newChatMsg);
      try {
        localStorage.setItem(storageKey, JSON.stringify(existingMsgs));
      } catch (e) {
        console.warn("localStorage quota exceeded for digitizer chats", e);
      }

      // 3. Save to order state & DB
      await onUpdateOrder(selectedOrder.id, {
        notes: updatedNotes,
        designAttachments: finalDesignAttachments,
        updatedAt: timestamp
      });

      // Update local state instantly so the UI reflects the change
      setSelectedOrder({
        ...selectedOrder,
        notes: updatedNotes,
        designAttachments: finalDesignAttachments,
        updatedAt: timestamp
      });

      // Clear input, keep sidebar open!
      setMsgRequest({ message: '', attachments: [] });
      setRefreshChatCounter(prev => prev + 1);

      // Simulate a quick digitizer auto reply to show real conversational action!
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
        try {
          localStorage.setItem(replyKey, JSON.stringify(currentMsgs));
        } catch (e) {
          console.warn("localStorage quota exceeded for digitizer auto-reply", e);
        }

        // Also save to database
        const autoNote = `[DIGITIZER -> ORDER MGMT] ${new Date().toLocaleString()}\n${responseText}`;
        const currentDBNotes = selectedOrder.notes;
        const completeNotes = currentDBNotes ? `${currentDBNotes}\n\n${autoNote}` : autoNote;

        try {
          await onUpdateOrder(selectedOrder.id, {
            notes: completeNotes,
            updatedAt: Date.now()
          });

          setSelectedOrder(prev => prev ? { ...prev, notes: completeNotes, updatedAt: Date.now() } : null);
          setRefreshChatCounter(prev => prev + 1);
        } catch (dbError) {
          console.error("Failed to append auto reply notes to order DB", dbError);
        }
      }, 1500);

    } catch (error) {
      console.error(error);
      alert("Failed to send message: " + (error instanceof Error ? error.message : String(error)));
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

    // Prepare next state and validate size constraints
    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toLocaleString();
    const newNote = `[ORDER MGMT -> DESIGNER] ${dateStr}\n${textMsg}`;
    const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;
    const finalStaffImages = [...(selectedOrder.staffImages || []), ...designMsgRequest.attachments];

    const nextOrderState = {
      ...selectedOrder,
      notes: updatedNotes,
      staffImages: finalStaffImages,
      status: OrderStatus.DESIGN,
      updatedAt: timestamp
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 100MB total across all cloud-saved attachments on this order). Please use smaller or fewer images, or clear some existing files first.");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create message object
      const newChatMsg: ChatMessage = {
        id: `om_msg_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
        sender: 'Order Management',
        senderRole: 'order_management',
        text: textMsg || 'Sent attachments: ' + designMsgRequest.attachments.length + ' file(s)',
        attachments: designMsgRequest.attachments,
        createdAt: timestamp
      };

      // 2. Save message object to localStorage chat history, wrapped safely to prevent quota crashes
      const storageKey = `pallywear_om_chats_designer_${selectedOrder.id}`;
      const existingSaved = localStorage.getItem(storageKey);
      let existingMsgs: ChatMessage[] = [];
      if (existingSaved) {
        try {
          existingMsgs = JSON.parse(existingSaved);
        } catch (e) { }
      }
      existingMsgs.push(newChatMsg);
      try {
        localStorage.setItem(storageKey, JSON.stringify(existingMsgs));
      } catch (e) {
        console.warn("localStorage quota exceeded for designer chats", e);
      }

      // 3. Save to order state & DB
      await onUpdateOrder(selectedOrder.id, {
        notes: updatedNotes,
        staffImages: finalStaffImages,
        status: OrderStatus.DESIGN,
        updatedAt: timestamp
      });

      // Update local state instantly so the UI reflects the change
      setSelectedOrder({
        ...selectedOrder,
        notes: updatedNotes,
        staffImages: finalStaffImages,
        status: OrderStatus.DESIGN,
        updatedAt: timestamp
      });

      // Clear input, keep sidebar open!
      setDesignMsgRequest({ message: '', attachments: [] });
      setRefreshChatCounter(prev => prev + 1);

      // Simulate a quick designer auto reply to show real conversational action!
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
        try {
          localStorage.setItem(replyKey, JSON.stringify(currentMsgs));
        } catch (e) {
          console.warn("localStorage quota exceeded for designer auto-reply", e);
        }

        // Also save to database
        const autoNote = `[DESIGNER -> ORDER MGMT] ${new Date().toLocaleString()}\n${responseText}`;
        const currentDBNotes = selectedOrder.notes;
        const completeNotes = currentDBNotes ? `${currentDBNotes}\n\n${autoNote}` : autoNote;

        try {
          await onUpdateOrder(selectedOrder.id, {
            notes: completeNotes,
            updatedAt: Date.now()
          });

          setSelectedOrder(prev => prev ? { ...prev, notes: completeNotes, updatedAt: Date.now() } : null);
          setRefreshChatCounter(prev => prev + 1);
        } catch (dbError) {
          console.error("Failed to append auto reply notes to order DB", dbError);
        }
      }, 1500);

    } catch (error) {
      console.error(error);
      alert("Failed to send message: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Mockup Management Cockpit Dashboard */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-150 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <div>
            <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.25em] block mb-1">Pallywear Cockpit</span>
            <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Order Management Dashboard</h2>
          </div>
          <div className="text-xs text-gray-500 font-bold bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            Coemm Deck v2024
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vendor Expense */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-1.5 shadow-xs relative overflow-hidden">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vendor Expense</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-gray-900">â€”</span>
            </div>
          </div>
          {/* Production Status */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-1.5 shadow-xs relative overflow-hidden">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-black">Production Status</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-brand-primary">â€”</span>
            </div>
          </div>
          {/* Vendor Delivery Score */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-1.5 shadow-xs relative overflow-hidden">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Vendor Delivery Score</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-gray-900">â€”</span>
            </div>
          </div>
          {/* Active Team Members */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col gap-1.5 shadow-xs relative overflow-hidden">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Team Members</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-gray-900">â€”</span>
            </div>
          </div>
        </div>

        {/* Global Order Status Pipeline & Production Pipeline Recharts Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Global Order Status Pipeline */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4">
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Global Order Status</h4>
            <div className="flex items-center justify-between gap-1.5 overflow-x-auto py-2">
              {[
                { label: 'RECVD', active: true, color: 'bg-blue-650' },
                { label: 'CONFIRMD', active: true, color: 'bg-emerald-500' },
                { label: 'PROD', active: true, color: 'bg-amber-500' },
                { label: 'SHIPPED', active: false, color: 'bg-gray-300' }
              ].map((stage, idx, arr) => (
                <div key={idx} className="flex items-center flex-1 min-w-0">
                  <div className={cn(
                    "flex-1 text-center py-4 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider text-white shadow-xs",
                    stage.active ? stage.color : "bg-gray-200 text-gray-400"
                  )}>
                    {stage.label}
                  </div>
                  {idx < arr.length - 1 && (
                    <ChevronRight size={16} className="text-gray-300 mx-1 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Production Pipeline Recharts Bar Chart */}
          <div className="lg:col-span-1 bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Production Pipeline</h4>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PRODUCTION_PIPELINE_DATA} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 9, borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {PRODUCTION_PIPELINE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Cockpit Row: Order Status Feed & Vendor Activity Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Status Feed */}
          <div className="lg:col-span-1 bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4">
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Order Status Feed</h4>
            <div className="space-y-3">
            <div className="text-center text-gray-400 py-6 text-xs">No active orders in feed.</div>
            </div>
          </div>

          {/* Vendor Activity & Agent Performance table */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-5 shadow-xs space-y-4">
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Vendor Activity & Agent Performance</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                    <th className="px-4 py-2.5">Interventions</th>
                    <th className="px-4 py-2.5">Workers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-gray-400 text-xs">No vendor activity recorded.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full">
          <button
            onClick={() => setIsMsgSidebarOpen(true)}
            className="px-4 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md flex items-center gap-2 active:scale-95 text-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload size={16} />
            <span className="text-[10px] uppercase tracking-widest font-black">Message to Digitizer</span>
          </button>
          <button
            onClick={() => setIsDesignMsgSidebarOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md flex items-center gap-2 active:scale-95 text-xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Palette size={16} />
            <span className="text-[10px] uppercase tracking-widest font-black">Message to Designer</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Sync Data
          </button>
        </div>
      </div>

      {/* Inventory Summary Section */}
      <div className="pt-4 border-t border-gray-100 pb-12">
        <InventoryManagement userRole={isAdmin ? 'admin' : 'order_management'} />
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
                    {selectedOrder ? `Order #${selectedOrder.id.slice(-6)} â€¢ ${selectedOrder.customerInfo.name}` : "Interactive Chat"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMsgSidebarOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/75"
              >
                <Trash2 size={20} className="rotate-45" />
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
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-xs font-medium resize-none shadow-inner"
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
                className="w-full py-3.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-transform text-xs"
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
                    {selectedOrder ? `Order #${selectedOrder.id.slice(-6)} â€¢ ${selectedOrder.customerInfo.name}` : "Interactive Chat"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDesignMsgSidebarOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/75"
              >
                <Trash2 size={20} className="rotate-45" />
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
                className="w-full py-3.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] transition-transform text-xs"
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

const getStatusStyles = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.DRAFT: return 'bg-gray-100 text-gray-600';
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
