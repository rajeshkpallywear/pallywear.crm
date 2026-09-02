/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Palette,
  Search,
  Clock,
  ChevronRight,
  FileText,
  Download,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  ZoomIn,
  Trash2,
  Paperclip,
  Upload,
  Package,
  Mic,
  MessageSquare,
  Send,
  Eye,
  X,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import OrderDetailModal from './OrderDetailModal';
import { useLeads } from '../context/LeadContext';
import { cn, getDisplayCategory, isOrderSizeValid } from '../lib/utils';
import ConversationDashboard, { Conversation } from './ConversationDashboard';
import OrdersChart from './OrdersChart';

interface DesignDashboardProps {
  orders: Order[];
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  user: any;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderRole: string;
  text: string;
  attachments: string[];
  createdAt: number;
}

export default function DesignDashboard({ orders, onUpdateOrder, user }: DesignDashboardProps) {
  // Primary Tabs: 'marketing_queue' for Marketing pipeline, 'accounts_queue' for Accounts pipeline
  const [activeChannel, setActiveChannel] = useState<'marketing_queue' | 'accounts_queue'>('marketing_queue');

  // Subsection filters: 'unclaimed', 'my_tasks', 'hold', 'completed'
  const [selectedSection, setSelectedSection] = useState<'unclaimed' | 'my_tasks' | 'hold' | 'completed'>('unclaimed');

  // Searching/Filtering
  const [searchTerm, setSearchTerm] = useState('');

  // Selection
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStaffChatOpen, setIsStaffChatOpen] = useState(false);
  const [selectedItemIdForStaffChat, setSelectedItemIdForStaffChat] = useState<string | null>(null);

  const { loadOrderAttachments, invoices } = useLeads();

  useEffect(() => {
    if (selectedOrder) {
      loadOrderAttachments(selectedOrder.id).then(attachments => {
        setSelectedOrder(prev => prev && prev.id === selectedOrder.id ? { ...prev, ...attachments } : prev);
        if (attachments.designAttachments) setDesignFiles(attachments.designAttachments);
        if (attachments.machineFiles) setMachineFiles(attachments.machineFiles);
        if (attachments.original_design_file) setOriginalFile(attachments.original_design_file);
        if (attachments.original_design_filename) setOriginalFilename(attachments.original_design_filename);
        if (attachments.original_design_zip) setDesignZipFile(attachments.original_design_zip);
        if (attachments.original_design_zip_filename) setDesignZipFilename(attachments.original_design_zip_filename);
      });
    }
  }, [selectedOrder?.id]);

  // Local File Assemble State
  const [designFiles, setDesignFiles] = useState<string[]>([]);
  const [machineFiles, setMachineFiles] = useState<string[]>([]);
  const [designNotesText, setDesignNotesText] = useState('');
  const [originalFile, setOriginalFile] = useState<string>('');
  const [originalFilename, setOriginalFilename] = useState<string>('');
  const [designZipFile, setDesignZipFile] = useState<string>('');
  const [designZipFilename, setDesignZipFilename] = useState<string>('');

  // Local Conversations List (Staff Conversations)
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Backoffice/OM Chat Integration state for selected order
  const [omMessages, setOmMessages] = useState<ChatMessage[]>([]);
  const [omNewMessage, setOmNewMessage] = useState('');
  const [omNewAttachments, setOmNewAttachments] = useState<string[]>([]);
  const [refreshChatCounter, setRefreshChatCounter] = useState(0);

  // Custom Hold/Return Prompts State
  const [customPrompt, setCustomPrompt] = useState<{
    type: 'return' | 'hold';
    title: string;
    description: string;
    placeholder: string;
    actionLabel: string;
    onHiddenSubmit: (val: string) => Promise<void>;
  } | null>(null);
  const [promptInputValue, setPromptInputValue] = useState('');
  const [promptError, setPromptError] = useState('');

  const designerName = user?.name || 'Arun';

  // Load staff interactions from local storage
  const loadStaffConversations = () => {
    const saved = localStorage.getItem('pallywear_conversations');
    if (saved) {
      try {
        setConversations(JSON.parse(saved));
      } catch (e) {
        setConversations([]);
      }
    } else {
      setConversations([]);
    }
  };

  useEffect(() => {
    loadStaffConversations();
  }, [isStaffChatOpen]);

  // Load Order Management Chats dynamically when an order is opened or counter changes
  useEffect(() => {
    if (selectedOrder && activeChannel === 'order_management') {
      const storageKey = `pallywear_om_chats_designer_${selectedOrder.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setOmMessages(JSON.parse(saved));
        } catch (e) {
          setOmMessages([]);
        }
      } else {
        setOmMessages([]);
      }
    }
  }, [selectedOrder, activeChannel, refreshChatCounter]);

  // Assist sorting / parsing designer name rules
  const isClaimedByMe = (item: any) => {
    if (!item?.assignedDesigner) return false;
    const clean = String(item.assignedDesigner).trim().toLowerCase();
    const myName = String(designerName || '').toLowerCase();
    return clean.includes(myName) || myName.includes(clean);
  };

  const isUnclaimedItem = (assigned: string) => {
    if (!assigned) return true;
    const clean = String(assigned).trim().toLowerCase();
    return clean === 'unassigned' || clean === 'designer assigned' || clean === '' || clean.includes('staff');
  };

  const isClaimedByOther = (item: any) => {
    return !isUnclaimedItem(item?.assignedDesigner) && !isClaimedByMe(item);
  };

  // 1. Process Order and Conversation Items for MARKETING QUEUE (Marketing Sent)
  const marketingOrderItems = (orders || [])
    .filter(o => {
      const isDesignPhase = o.status === OrderStatus.DESIGN;
      const isHoldFromDesign = o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DESIGN;
      const isCompletedDesign = o.status === OrderStatus.DELIVERED;
      const isMarketing = !o.sentByAccounts && (!o.accountsAttachments || o.accountsAttachments.length === 0);
      return (isDesignPhase || isHoldFromDesign || isCompletedDesign) && isMarketing;
    })
    .map(o => {
      const isCompleted = o.status === OrderStatus.DELIVERED;

      const orderNotes = o.notes || o.designNotes || (o.sizeBreakdown && o.sizeBreakdown.length > 0 
        ? o.sizeBreakdown.map(s => [s.category, s.material, s.colour, s.printType, s.model].filter(Boolean).join(' ')).filter(Boolean).join(' | ') 
        : '') || 'No notes';

      return {
        id: o.id,
        isOrder: true,
        customerName: o.customerInfo?.name || '',
        phone: o.customerInfo?.phone || '',
        category: o.category || 'T-Shirt',
        quantity: o.quantity || 1,
        notes: orderNotes,
        isUrgent: o.isUrgent || false,
        assignedDesigner: o.assignedDesigner || 'Unassigned',
        createdByName: o.createdByName || '',
        status: o.status,
        isHold: o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DESIGN,
        isCompleted: isCompleted,
        createdAt: o.createdAt || Date.now(),
        staffImages: o.staffImages || [],
        staffPdfs: o.staffPdfs || [],
        marketing_image: o.marketing_image || '',
        accountsAttachments: [],
        sizeBreakdown: o.sizeBreakdown || []
      };
    });

  // Pure consultation chats from staff interactions
  const staffConsultationItems = (conversations || [])
    .filter(c => !(orders || []).some(o => o.id === c.id))
    .map(c => {
      const isCompleted = !!c.replies && c.replies.length > 0;
      return {
        id: c.id,
        isOrder: false,
        customerName: c.customerName || 'Staff Consultation',
        phone: 'Staff Consultation',
        category: 'Art Consult',
        quantity: 0,
        notes: c.message || '',
        isUrgent: false,
        assignedDesigner: c.staffName || 'Unassigned',
        createdByName: c.staffName || 'Staff',
        status: isCompleted ? OrderStatus.ORDER_MANAGEMENT : OrderStatus.DESIGN, // simulate pipeline
        isHold: false,
        isCompleted: isCompleted,
        createdAt: c.createdAt || Date.now(),
        staffImages: c.imageAttachments || [],
        staffPdfs: c.pdfAttachments || [],
        marketing_image: '',
        accountsAttachments: [],
        sizeBreakdown: []
      };
    });

  const marketingCombinedList = [...marketingOrderItems, ...staffConsultationItems];

  // 2. Process Items for ACCOUNTS QUEUE (Accounts Sent)
  const accountsOrderItems = (orders || [])
    .filter(o => {
      const isDesignPhase = o.status === OrderStatus.DESIGN;
      const isHoldFromDesign = o.status === OrderStatus.HOLD && (o.previousStatus === OrderStatus.DESIGN || o.previousStatus === OrderStatus.ACCOUNTS);
      const isCompletedDesign = o.status === OrderStatus.DELIVERED;
      const isAccounts = o.sentByAccounts || (o.accountsAttachments && o.accountsAttachments.length > 0);
      return (isDesignPhase || isHoldFromDesign || isCompletedDesign) && isAccounts;
    })
    .map(o => {
      const chatKey = `pallywear_om_chats_designer_${o.id}`;
      const hasOmChat = !!localStorage.getItem(chatKey);

      const isCompleted = o.status === OrderStatus.DELIVERED;
      const orderNotes = o.notes || o.designNotes || (o.sizeBreakdown && o.sizeBreakdown.length > 0 
        ? o.sizeBreakdown.map(s => [s.category, s.material, s.colour, s.printType, s.model].filter(Boolean).join(' ')).filter(Boolean).join(' | ') 
        : '') || 'No notes';

      return {
        id: o.id,
        isOrder: true,
        customerName: o.customerInfo?.name || '',
        phone: o.customerInfo?.phone || '',
        category: o.category || 'T-Shirt',
        quantity: o.quantity || 1,
        notes: orderNotes,
        isUrgent: o.isUrgent || false,
        assignedDesigner: o.assignedDesigner || 'Unassigned',
        createdByName: o.createdByName || '',
        status: o.status,
        isHold: o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DESIGN,
        isCompleted: isCompleted,
        createdAt: o.createdAt || Date.now(),
        hasOmChat: hasOmChat,
        staffImages: o.staffImages || [],
        staffPdfs: o.staffPdfs || [],
        marketing_image: o.marketing_image || '',
        accountsAttachments: o.accountsAttachments || [],
        sizeBreakdown: o.sizeBreakdown || []
      };
    });

  // Filter lists based on primary tab and subsection
  const getFilteredItems = () => {
    let baseList = activeChannel === 'marketing_queue' ? marketingCombinedList : accountsOrderItems;

    // Filter by subsection
    if (selectedSection === 'hold') {
      baseList = baseList.filter(item => item.isHold);
    } else if (selectedSection === 'completed') {
      baseList = baseList.filter(item => item.isCompleted);
    } else if (selectedSection === 'unclaimed') {
      baseList = baseList.filter(item => isUnclaimedItem(item.assignedDesigner) && !item.isCompleted && !item.isHold);
    } else if (selectedSection === 'my_tasks') {
      baseList = baseList.filter(item => isClaimedByMe(item) && !item.isCompleted && !item.isHold);
    }

    // Search term matching
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      baseList = baseList.filter(item =>
        (item.customerName || '').toLowerCase().includes(term) ||
        (item.id || '').toLowerCase().includes(term) ||
        (item.category || '').toLowerCase().includes(term) ||
        (item.notes || '').toLowerCase().includes(term)
      );
    }

    // Queue Sorting: return a new sorted array copy
    return [...baseList].sort((a, b) => {
      const aMine = isClaimedByMe(a) ? 2 : (isUnclaimedItem(a.assignedDesigner) ? 1 : 0);
      const bMine = isClaimedByMe(b) ? 2 : (isUnclaimedItem(b.assignedDesigner) ? 1 : 0);
      if (aMine !== bMine) return bMine - aMine;
      if ((a.isUrgent ? 1 : 0) !== (b.isUrgent ? 1 : 0)) return (b.isUrgent ? 1 : 0) - (a.isUrgent ? 1 : 0);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  };

  // Get counters for high-level buttons
  const getChannelStats = (channel: 'marketing_queue' | 'accounts_queue') => {
    const baseList = channel === 'marketing_queue' ? marketingCombinedList : accountsOrderItems;
    const unclaimedCount = baseList.filter(item => isUnclaimedItem(item.assignedDesigner) && !item.isCompleted && !item.isHold).length;
    const myTasksCount = baseList.filter(item => isClaimedByMe(item) && !item.isCompleted && !item.isHold).length;
    const holdCount = baseList.filter(item => item.isHold).length;
    const completedCount = baseList.filter(item => item.isCompleted).length;
    const totalCount = baseList.length;

    return { unclaimedCount, myTasksCount, holdCount, completedCount, totalCount };
  };

  const handleClaimItem = async (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsProcessing(true);
    try {
      if (item.isOrder) {
        await onUpdateOrder(item.id, {
          assignedDesigner: designerName,
          claimedBy: user?.id || user?.uid,
          claimedByName: designerName,
          claimedAt: Date.now(),
          updatedAt: Date.now()
        });
        alert(`Success: Order #${item.id.slice(-8)} is now claimed by you! Opening Workspace...`);
        const fullOrder = orders.find(o => o.id === item.id);
        if (fullOrder) {
          setSelectedOrder({ ...fullOrder, assignedDesigner: designerName, claimedBy: user?.id || user?.uid, claimedByName: designerName });
          // Initialize file arrays
          setDesignFiles(fullOrder.designAttachments || []);
          setMachineFiles(fullOrder.machineFiles || []);
          setDesignNotesText(fullOrder.notes || fullOrder.designNotes || '');
          setOriginalFile(fullOrder.original_design_file || '');
          setOriginalFilename(fullOrder.original_design_filename || '');
          setDesignZipFile(fullOrder.original_design_zip || '');
          setDesignZipFilename(fullOrder.original_design_zip_filename || '');
        }
      } else {
        // Pure Consultation
        const saved = localStorage.getItem('pallywear_conversations') || '[]';
        let currentConvs: Conversation[] = [];
        try {
          currentConvs = JSON.parse(saved);
        } catch (e) { }

        const updated = currentConvs.map(c => {
          if (c.id === item.id) {
            return { ...c, staffName: designerName };
          }
          return c;
        });

        localStorage.setItem('pallywear_conversations', JSON.stringify(updated));
        loadStaffConversations();
        setSelectedItemIdForStaffChat(item.id);
        alert(`Success: Consultation claimed by you! Opening Staff dialogue panel...`);
        setIsStaffChatOpen(true);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to claim design item.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReleaseItem = async (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to release Order #${item.id.slice(-8)} back to the open queue?`)) return;
    setIsProcessing(true);
    try {
      if (item.isOrder) {
        await onUpdateOrder(item.id, {
          assignedDesigner: 'Unassigned',
          claimedBy: undefined,
          claimedByName: undefined,
          claimedAt: undefined,
          updatedAt: Date.now()
        });
        if (selectedOrder?.id === item.id) {
          setSelectedOrder(null);
        }
        alert(`Order #${item.id.slice(-8)} released back to open Design Queue.`);
      }
    } catch (e) {
      alert("Failed to release item.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenWorkspace = (item: any) => {
    if (item.status === OrderStatus.DELIVERED) {
      return;
    }
    if (item.isOrder) {
      const fullOrder = orders.find(o => o.id === item.id);
      if (fullOrder) {
        setSelectedOrder(fullOrder);
        setDesignFiles(fullOrder.designAttachments || []);
        setMachineFiles(fullOrder.machineFiles || []);
        setDesignNotesText(fullOrder.notes || fullOrder.designNotes || '');
        setOriginalFile(fullOrder.original_design_file || '');
        setOriginalFilename(fullOrder.original_design_filename || '');
        setDesignZipFile(fullOrder.original_design_zip || '');
        setDesignZipFilename(fullOrder.original_design_zip_filename || '');
      }
    } else {
      setSelectedItemIdForStaffChat(item.id);
      setIsStaffChatOpen(true);
    }
  };

  const handleSendToMarketing = async () => {
    if (!selectedOrder || isProcessing) return;

    if (!originalFile && !designZipFile && designFiles.length === 0) {
      alert("Validation Error: Please upload at least the Design PNG (Original Quality), Design ZIP Package, or Vector Output before sending to Marketing.");
      return;
    }

    if (!designNotesText.trim()) {
      alert("Validation Error: Please fill in the Design Studio Output Notes before sending to Marketing.");
      return;
    }

    const nextOrderState = {
      ...selectedOrder,
      original_design_file: originalFile,
      original_design_filename: originalFilename,
      original_design_zip: designZipFile,
      original_design_zip_filename: designZipFilename,
      designAttachments: designFiles,
      machineFiles: machineFiles,
      designNotes: designNotesText
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 100MB). Please use a smaller file size.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.PENDING,
        designCompleted: true,
        designSentToMarketing: true,
        designCompletedAt: Date.now(),
        original_design_file: originalFile,
        original_design_filename: originalFilename,
        original_design_zip: designZipFile,
        original_design_zip_filename: designZipFilename,
        designAttachments: designFiles,
        machineFiles: machineFiles,
        designNotes: designNotesText,
        updatedAt: Date.now()
      });
      setSelectedOrder(null);
      setDesignFiles([]);
      setMachineFiles([]);
      setDesignNotesText('');
      setOriginalFile('');
      setOriginalFilename('');
      setDesignZipFile('');
      setDesignZipFilename('');
      alert("Success: Artwork completed and sent back to Marketing Dashboard (Designs Received section).");
    } catch (e) {
      console.error(e);
      alert("An error occurred while moving the order.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendToDigitizer = async () => {
    if (!selectedOrder || isProcessing) return;

    if (!originalFile && !designZipFile) {
      alert("Validation Error: Please upload the Original Design PNG or Design ZIP Package before sending to Digitizer.");
      return;
    }

    const nextOrderState = {
      ...selectedOrder,
      original_design_file: originalFile,
      original_design_filename: originalFilename,
      original_design_zip: designZipFile,
      original_design_zip_filename: designZipFilename,
      designAttachments: designFiles,
      machineFiles: machineFiles,
      designNotes: designNotesText
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 100MB). Please use a smaller file size.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        original_design_file: originalFile,
        original_design_filename: originalFilename,
        original_design_zip: designZipFile,
        original_design_zip_filename: designZipFilename,
        designAttachments: designFiles,
        machineFiles: machineFiles,
        designNotes: designNotesText,
        updatedAt: Date.now()
      });
      setSelectedOrder(null);
      setDesignFiles([]);
      setMachineFiles([]);
      setDesignNotesText('');
      setOriginalFile('');
      setOriginalFilename('');
      setDesignZipFile('');
      setDesignZipFilename('');
      alert("Success: Original design file uploaded and order made available to Digitizer.");
    } catch (e) {
      console.error(e);
      alert("An error occurred while sending to Digitizer.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendToOrderManagement = async () => {
    if (!selectedOrder || isProcessing) return;

    if (!originalFile && !designZipFile && designFiles.length === 0) {
      alert("Validation Error: Please upload the Design PNG, Design ZIP Package, or Output Files before sending to Order Management.");
      return;
    }

    const nextOrderState = {
      ...selectedOrder,
      original_design_file: originalFile,
      original_design_filename: originalFilename,
      original_design_zip: designZipFile,
      original_design_zip_filename: designZipFilename,
      designAttachments: designFiles,
      machineFiles: machineFiles,
      designNotes: designNotesText
    };

    if (!isOrderSizeValid(nextOrderState)) {
      alert("Error: Total order data limit exceeded (Max 100MB). Please use a smaller file size.");
      return;
    }

    setIsProcessing(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        status: OrderStatus.ORDER_MANAGEMENT,
        original_design_file: originalFile,
        original_design_filename: originalFilename,
        original_design_zip: designZipFile,
        original_design_zip_filename: designZipFilename,
        designAttachments: designFiles,
        machineFiles: machineFiles,
        designNotes: designNotesText,
        updatedAt: Date.now()
      });
      setSelectedOrder(null);
      setDesignFiles([]);
      setMachineFiles([]);
      setDesignNotesText('');
      setOriginalFile('');
      setOriginalFilename('');
      setDesignZipFile('');
      setDesignZipFilename('');
      alert("Success: Original design files uploaded and order sent to Order Management.");
    } catch (e) {
      console.error(e);
      alert("An error occurred while sending to Order Management.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReturnToCreator = () => {
    if (!selectedOrder || isProcessing) return;

    setPromptInputValue('');
    setPromptError('');
    setCustomPrompt({
      type: 'return',
      title: 'Move Back to Staff/Sales',
      description: 'Explain why you are moving this design back to the Sales/Staff creator (e.g. invalid logo files, size specification contradiction):',
      placeholder: 'Enter return reason details here...',
      actionLabel: 'Return to Staff',
      onHiddenSubmit: async (reason) => {
        setIsProcessing(true);
        try {
          const newNote = `[REWORK RETURNED BY DESIGNER] ${new Date().toLocaleString()}: ${reason.trim()}`;
          const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;

          await onUpdateOrder(selectedOrder.id, {
            status: OrderStatus.PENDING,
            notes: updatedNotes,
            updatedAt: Date.now()
          });
          setSelectedOrder(null);
          setCustomPrompt(null);
          alert("Order returned to Staff successfully.");
        } catch (e) {
          console.error(e);
          setPromptError("Database update failed. Please try again.");
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handlePutOnHold = async () => {
    if (!selectedOrder || isProcessing) return;

    if (selectedOrder.status === OrderStatus.HOLD) {
      // Resume design work directly
      setIsProcessing(true);
      try {
        await onUpdateOrder(selectedOrder.id, {
          status: OrderStatus.DESIGN,
          previousStatus: undefined,
          holdReason: undefined,
          updatedAt: Date.now()
        });

        // Update local state instant view
        setSelectedOrder(prev => prev ? { ...prev, status: OrderStatus.DESIGN, holdReason: undefined } : null);
        alert("Design work is now active again.");
      } catch (e) {
        console.error(e);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    setPromptInputValue('');
    setPromptError('');
    setCustomPrompt({
      type: 'hold',
      title: 'Place Design on Hold',
      description: 'Provide an active reason for placing this design on Hold:',
      placeholder: 'Enter hold reason (e.g. pending customer logo vector format, pending color swatch decision)...',
      actionLabel: 'Place on Hold',
      onHiddenSubmit: async (reason) => {
        setIsProcessing(true);
        try {
          const newNote = `[DESIGN PIPELINE ON HOLD] ${new Date().toLocaleString()}: ${reason.trim()}`;
          const updatedNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${newNote}` : newNote;

          await onUpdateOrder(selectedOrder.id, {
            status: OrderStatus.HOLD,
            previousStatus: OrderStatus.DESIGN,
            holdReason: reason.trim(),
            notes: updatedNotes,
            updatedAt: Date.now()
          });
          setSelectedOrder(null);
          setCustomPrompt(null);
          alert("Design artwork successfully put on hold.");
        } catch (e) {
          console.error(e);
          setPromptError("Database update failed. Please try again.");
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleSendOmChatMessage = async () => {
    if (!selectedOrder || (!omNewMessage.trim() && omNewAttachments.length === 0)) return;

    const timestamp = Date.now();
    const cleanMsg = omNewMessage.trim();

    const newChatMsg: ChatMessage = {
      id: `des_msg_${timestamp}`,
      sender: `Designer (${designerName})`,
      senderRole: 'designer',
      text: cleanMsg || `Uploaded ${omNewAttachments.length} reference file(s)`,
      attachments: omNewAttachments,
      createdAt: timestamp
    };

    // Construct local additions
    const storageKey = `pallywear_om_chats_designer_${selectedOrder.id}`;
    const nextMsgs = [...omMessages, newChatMsg];
    localStorage.setItem(storageKey, JSON.stringify(nextMsgs));

    // Also update order logs
    const appendNote = `[DESIGNER CHAT] ${new Date(timestamp).toLocaleString()}: ${cleanMsg}`;
    const nextNotes = selectedOrder.notes ? `${selectedOrder.notes}\n\n${appendNote}` : appendNote;

    try {
      await onUpdateOrder(selectedOrder.id, {
        notes: nextNotes,
        staffImages: [...(selectedOrder.staffImages || []), ...omNewAttachments],
        updatedAt: timestamp
      });

      setOmMessages(nextMsgs);
      setOmNewMessage('');
      setOmNewAttachments([]);
      setRefreshChatCounter(prev => prev + 1);
    } catch (e) {
      console.error(e);
      alert("Failed to deliver chat message.");
    }
  };

  const handleRemoveFile = (index: number, type: 'design' | 'machine') => {
    if (type === 'design') {
      setDesignFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setMachineFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const activeStats = getChannelStats(activeChannel);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header section with synchronized database updates */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 italic text-xs font-bold">
            ðŸ”’ Designer Account: {designerName}
          </div>
        </div>
      </div>

      {/* Primary Communication Channel Navigations */}
      <div className="flex border-b border-gray-150 bg-white p-1 sm:p-2 rounded-xl sm:rounded-2xl shadow-xs gap-1 sm:gap-2">
        <button
          onClick={() => {
            setActiveChannel('marketing_queue');
            setSelectedSection('unclaimed');
          }}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-2 border-none truncate min-w-0",
            activeChannel === 'marketing_queue'
              ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
              : "bg-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          )}
        >
          📢 Marketing Sent ({getChannelStats('marketing_queue').totalCount})
        </button>
        <button
          onClick={() => {
            setActiveChannel('accounts_queue');
            setSelectedSection('unclaimed');
          }}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-2 border-none truncate min-w-0",
            activeChannel === 'accounts_queue'
              ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
              : "bg-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          )}
        >
          💳 Accounts Sent ({getChannelStats('accounts_queue').totalCount})
        </button>
      </div>

      {/* Design Project Queue — Live Orders */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-150 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Palette className="text-brand-primary" size={18} />
            <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider">
              {activeChannel === 'marketing_queue' ? '📢 Marketing Forwarded Queue' : '💳 Accounts Forwarded Queue'}
            </h4>
            <span className="text-[10px] font-black text-brand-primary bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-xl">
              {getFilteredItems().length} Order{getFilteredItems().length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Search bar inside queue */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 sm:w-72">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search queue orders, client, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-xs text-gray-800 placeholder:text-gray-400 outline-none w-full"
            />
          </div>
        </div>

        {/* Section Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {([
            { key: 'unclaimed', label: '⚡ Open to Claim', count: activeStats.unclaimedCount },
            { key: 'my_tasks', label: '⭐ My Claimed Tasks', count: activeStats.myTasksCount },
            { key: 'hold', label: '⏸ On Hold', count: activeStats.holdCount },
            { key: 'completed', label: '✓ Done', count: activeStats.completedCount },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setSelectedSection(key)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer",
                selectedSection === key
                  ? "bg-brand-primary text-white border-brand-primary shadow-sm"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:border-brand-primary/40 hover:bg-gray-100"
              )}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto">
          <table className="hidden md:table w-full text-left text-xs whitespace-nowrap border-collapse">
            <thead>
              <tr className="bg-gray-50/80 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="px-4 py-3">Queue Pos / ID</th>
                <th className="px-4 py-3">Customer & Requirements</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Queue Status & Designer</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {getFilteredItems().length > 0 ? (
                getFilteredItems().map((item, idx) => {
                  const isSelected = selectedOrder?.id === item.id;
                  const claimedByMe = isClaimedByMe(item);
                  const isUnclaimed = isUnclaimedItem(item.assignedDesigner);

                  const matchingInvoice = (invoices || []).find(inv => 
                    inv?.leadId === item.id || 
                    (inv?.billToPhone && inv.billToPhone === item.phone) ||
                    (inv?.billToName && item.customerName && String(inv.billToName).toLowerCase() === String(item.customerName).toLowerCase())
                  );

                  return (
                    <tr
                      key={item.id}
                      onClick={() => item.status !== OrderStatus.DELIVERED && handleOpenWorkspace(item)}
                      className={cn(
                        "transition-all",
                        item.status === OrderStatus.DELIVERED
                          ? "cursor-default opacity-85 hover:bg-transparent"
                          : isSelected
                            ? "bg-purple-50/70 border-l-4 border-l-purple-600 cursor-pointer"
                            : claimedByMe
                              ? "bg-emerald-50/20 hover:bg-emerald-50/40 cursor-pointer"
                              : "hover:bg-gray-50/60 cursor-pointer"
                      )}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-500 text-xs">#{idx + 1}</span>
                            <span className="font-mono text-xs font-black text-brand-primary">
                              #{item.id.slice(-8)}
                            </span>
                            {item.isUrgent && (
                              <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse tracking-wide uppercase">URGENT</span>
                            )}
                          </div>
                          {matchingInvoice && (
                            <span className="font-mono text-[9px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded w-fit">
                              Invoice: {matchingInvoice.invoiceNumber}
                            </span>
                          )}
                          <span className="text-[9px] text-gray-400 font-mono">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {((item.staffImages && item.staffImages[0]) || item.marketing_image) && (
                            <div className="w-10 h-10 rounded-xl border border-gray-150 overflow-hidden shrink-0 bg-gray-50">
                              <img src={item.staffImages?.[0] || item.marketing_image} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex flex-col gap-0.5 max-w-[240px]">
                            <span className="font-black text-gray-900 text-xs uppercase italic truncate">{item.customerName}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-primary">
                              By: {item.createdByName || 'Marketing'}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">{item.phone}</span>
                            {item.notes && item.notes !== 'No notes' && (
                              <span className="text-[9px] text-gray-400 italic truncate" title={item.notes}>
                                Note: {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-150 rounded text-[9px] font-black uppercase tracking-tight w-fit inline-block">
                          {getDisplayCategory(item as any)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {item.isCompleted ? (
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                            ✓ Completed
                          </span>
                        ) : item.isHold ? (
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
                            ⏸ On Hold
                          </span>
                        ) : isUnclaimed ? (
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-center gap-1 w-fit mx-auto">
                            ⚡ Open in Queue
                          </span>
                        ) : claimedByMe ? (
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center gap-1 w-fit mx-auto">
                            ⭐ Assigned to You
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-250 flex items-center justify-center gap-1 w-fit mx-auto" title={`Claimed by ${item.assignedDesigner}`}>
                            🔒 {item.assignedDesigner}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {item.isCompleted ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenWorkspace(item)}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-black uppercase cursor-pointer border-none"
                            >
                              Review Assets
                            </button>
                          </div>
                        ) : isUnclaimed ? (
                          <button
                            disabled={isProcessing}
                            onClick={(e) => handleClaimItem(item, e)}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer border-none flex items-center gap-1 ml-auto"
                          >
                            ⚡ Claim / Take Task
                          </button>
                        ) : claimedByMe ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => handleReleaseItem(item, e)}
                              className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                              title="Release back to open queue"
                            >
                              Release
                            </button>
                            <button
                              onClick={() => handleOpenWorkspace(item)}
                              className="px-3.5 py-1.5 bg-black hover:bg-gray-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-none shadow-xs flex items-center gap-1"
                            >
                              <span>Workspace</span>
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled
                            className="px-2.5 py-1.5 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-[9px] font-bold uppercase cursor-not-allowed ml-auto"
                            title={`Claimed by ${item.assignedDesigner}. Action locked.`}
                          >
                            🔒 Claimed
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                    No orders found in this design queue section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-gray-150">
            {getFilteredItems().length > 0 ? (
              getFilteredItems().map((item, idx) => {
                const isSelected = selectedOrder?.id === item.id;
                const claimedByMe = isClaimedByMe(item);
                const isUnclaimed = isUnclaimedItem(item.assignedDesigner);

                return (
                  <div
                    key={item.id}
                    onClick={() => item.status !== OrderStatus.DELIVERED && handleOpenWorkspace(item)}
                    className={cn(
                      "p-4 space-y-3",
                      claimedByMe ? "bg-emerald-50/20" : ""
                    )}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-500 text-xs">#{idx + 1}</span>
                        <span className="font-mono font-black text-brand-primary">#{item.id.slice(-8)}</span>
                        {item.isUrgent && (
                          <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded animate-pulse tracking-wide uppercase">URGENT</span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400 font-mono">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-start gap-3">
                      {((item.staffImages && item.staffImages[0]) || item.marketing_image) && (
                        <div className="w-12 h-12 rounded-xl border border-gray-250 overflow-hidden shrink-0 bg-gray-50">
                          <img src={item.staffImages?.[0] || item.marketing_image} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="font-black text-gray-900 text-sm uppercase italic">{item.customerName}</div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-brand-primary">
                          By: {item.createdByName || 'Marketing'}
                        </div>
                        <a href={`tel:${item.phone}`} className="text-xs text-gray-500 font-semibold hover:text-brand-primary flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Phone size={12} className="text-brand-primary" /> {item.phone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-150 rounded text-[9px] font-black uppercase">
                        {getDisplayCategory(item as any)}
                      </span>
                      {isUnclaimed ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-black uppercase">
                          ⚡ Open in Queue
                        </span>
                      ) : claimedByMe ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[9px] font-black uppercase">
                          ⭐ Assigned to You
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-250 rounded text-[9px] font-bold uppercase">
                          🔒 {item.assignedDesigner}
                        </span>
                      )}
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      {item.isCompleted ? (
                        <button
                          onClick={() => handleOpenWorkspace(item)}
                          className="col-span-2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-none"
                        >
                          Review Assets
                        </button>
                      ) : isUnclaimed ? (
                        <button
                          disabled={isProcessing}
                          onClick={(e) => handleClaimItem(item, e)}
                          className="col-span-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-none shadow-md"
                        >
                          ⚡ Claim / Take Task
                        </button>
                      ) : claimedByMe ? (
                        <>
                          <button
                            onClick={(e) => handleReleaseItem(item, e)}
                            className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                          >
                            Release
                          </button>
                          <button
                            onClick={() => handleOpenWorkspace(item)}
                            className="py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-none shadow-md flex items-center justify-center gap-1"
                          >
                            <span>Workspace</span>
                            <ChevronRight size={14} />
                          </button>
                        </>
                      ) : (
                        <button
                          disabled
                          className="col-span-2 py-2.5 bg-gray-100 text-gray-400 border border-gray-200 rounded-xl text-xs font-bold uppercase cursor-not-allowed"
                        >
                          🔒 Claimed by {item.assignedDesigner}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-400 italic font-medium text-xs">
                No orders found in this design queue section.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Graph Model */}
      <div className="pt-4">
        <OrdersChart orders={orders} />
      </div>

      {/* Staff Chats Embedded Modal / Conversation Side-Drawer */}
      <ConversationDashboard
        isOpen={isStaffChatOpen}
        onClose={() => {
          setIsStaffChatOpen(false);
          setSelectedItemIdForStaffChat(null);
        }}
        currentUser={user || { name: designerName, role: 'designer' }}
        orders={orders}
        onUpdateOrder={onUpdateOrder}
        initialSelectedId={selectedItemIdForStaffChat}
      />

      {/* High-Fidelity Interactive Workspace Modal for Selected Order */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
          >
            {/* Modal header */}
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Palette size={20} className="text-purple-600 animate-pulse" />
                  Art Workspace
                </h3>
                <p className="text-xs text-gray-500 font-bold uppercase tabular-nums">Pipeline Order #{selectedOrder.id}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setDesignFiles([]);
                  setMachineFiles([]);
                  setOriginalFile('');
                  setOriginalFilename('');
                  setDesignZipFile('');
                  setDesignZipFilename('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Hold Alert Notification Banner */}
              {selectedOrder.status === OrderStatus.HOLD && (
                <div className="bg-red-50 border border-red-200 p-5 rounded-2xl flex items-start gap-4 text-left">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={24} />
                  <div>
                    <h5 className="text-sm font-black text-red-900 uppercase italic">Artwork Production is Currently Blocked (On Hold)</h5>
                    <p className="text-xs text-red-700 font-semibold mt-1">Stated Impediment: "{selectedOrder.holdReason || 'No details provided'}"</p>
                    <p className="text-[10px] text-red-500 font-bold mt-1">Use the "Resume Active Work" button in the action footer to lift holds and upload vector outputs.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Customer Details, Sizing Breakdown, Reference Attachments */}
                <div className="lg:col-span-6 space-y-6">
                  {/* Customer Spec Card */}
                  <section className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
                    <h4 className="text-[10.5px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-gray-200 pb-2">
                      <User size={13} />
                      Order Details
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-black text-sm shadow-sm">
                        {selectedOrder.customerInfo?.name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{selectedOrder.customerInfo?.name || 'Customer'}</p>
                        <p className="text-[9.5px] font-bold uppercase tracking-wider text-brand-primary">Created by: {selectedOrder.createdByName || 'System'}</p>
                      </div>
                    </div>

                    {/* Marketing / Order Intake Notes Display Box */}
                    <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-1 text-left">
                      <span className="text-[9.5px] font-black text-amber-800 uppercase tracking-widest block flex items-center gap-1.5">
                        📋 Marketing / Client Intake Notes:
                      </span>
                      <p className="text-xs text-gray-800 font-semibold whitespace-pre-line leading-relaxed">
                        {selectedOrder.notes || selectedOrder.designNotes || 'No notes provided by marketing.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider pl-0.5">Design Studio Output Notes</label>
                        {!designNotesText.trim() && (
                          <span className="text-[10px] text-red-500 font-bold">⚠️ Required before sending</span>
                        )}
                      </div>
                      <textarea
                        value={designNotesText}
                        onChange={(e) => setDesignNotesText(e.target.value)}
                        rows={4}
                        placeholder="Write down any notes, pantone color codes, or print dimensions for the design here..."
                        className={cn(
                          "w-full px-4 py-3 bg-white border rounded-2xl text-xs font-semibold focus:outline-none focus:border-brand-primary resize-none",
                          !designNotesText.trim() ? "border-red-300 focus:border-red-500 bg-red-50/10" : "border-gray-200"
                        )}
                      />
                    </div>
                  </section>

                  {/* Reference Attachments from Sales Desk */}
                  <section className="space-y-3">
                    <h4 className="text-[10.5px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-gray-105">
                      <Paperclip size={13} />
                      Sales Reference Attachments ({[...(selectedOrder.staffImages || []), ...(selectedOrder.staffPdfs || [])].length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[...(selectedOrder.staffImages || []), ...(selectedOrder.staffPdfs || [])].map((file, i) => {
                        const isAudio = file.startsWith('data:audio/');
                        return (
                          <div key={i} className="flex flex-col gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-100 group relative">
                            <div className="aspect-square rounded-xl overflow-hidden relative bg-white flex items-center justify-center border border-gray-150">
                              {file.startsWith('data:image/') ? (
                                <img src={file} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : isAudio ? (
                                <div className="flex flex-col items-center gap-2 text-purple-600">
                                  <Mic size={28} />
                                  <span className="text-[8px] font-black uppercase">Voice spec</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2 text-red-500">
                                  <FileText size={28} />
                                  <span className="text-[8px] font-black uppercase">PDF Specification</span>
                                </div>
                              )}

                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                {file.startsWith('data:image/') && (
                                  <button
                                    onClick={() => setViewingImage(file)}
                                    className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all border-none cursor-pointer"
                                  >
                                    <ZoomIn size={14} />
                                  </button>
                                )}
                                <a
                                  href={file}
                                  download={`Ref_Spec_${i + 1}_Order_${selectedOrder.id.slice(-6)}`}
                                  className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all cursor-pointer"
                                >
                                  <Download size={14} />
                                </a>
                              </div>
                            </div>
                            {(isAudio || file.includes('audio/')) && (
                              <audio controls className="w-full h-5 scale-90 mt-1">
                                <source src={file} />
                              </audio>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                {/* Right Column: Outputs Upload Bench (PNG, ZIP, PDFs) & Chat Hub */}
                <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
                  {/* Vector/Machine Language File Assembly Desk */}
                  <div className="bg-purple-50/40 p-5 rounded-2xl border border-purple-100 space-y-5">
                    <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                      <h4 className="text-[11px] font-black text-purple-900 uppercase tracking-wider flex items-center gap-2">
                        <Upload size={14} />
                        Outputs Upload Bench (Original PNG & ZIP)
                      </h4>
                      <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        Lossless Quality
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Upload 1: Design PNG Image (100% Original Lossless Quality) */}
                      <div className={cn(
                        "space-y-2 bg-white p-3.5 rounded-xl border transition-all",
                        !originalFile ? "border-purple-200" : "border-purple-300 shadow-xs"
                      )}>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-gray-700 uppercase tracking-tight flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            1. Design PNG Image (Original Full Quality)
                          </p>
                          {originalFile ? (
                            <span className="text-[9px] text-green-600 font-extrabold flex items-center gap-1">
                              ✓ Original Quality Ready
                            </span>
                          ) : (
                            <span className="text-[9px] text-purple-600 font-bold">✨ Recommended (PNG)</span>
                          )}
                        </div>

                        {originalFile ? (
                          <div className="flex items-center justify-between gap-3 bg-purple-50/60 p-3 rounded-xl border border-purple-150">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                onClick={() => setViewingImage(originalFile)}
                                className="w-12 h-12 rounded-lg overflow-hidden border border-purple-200 bg-white cursor-pointer relative group shrink-0"
                                title="Click to zoom full image"
                              >
                                <img src={originalFile} alt="Original PNG" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <ZoomIn size={14} />
                                </div>
                              </div>
                              <div className="text-left min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate" title={originalFilename || 'Original Design Image'}>
                                  {originalFilename || 'Original_Design.png'}
                                </p>
                                <p className="text-[10px] text-purple-700 font-extrabold">100% Original Lossless Quality</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={originalFile}
                                download={originalFilename || `Design_Original_${selectedOrder.id.slice(-6)}.png`}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 shadow-xs cursor-pointer no-underline"
                                title="Download Original Quality PNG"
                              >
                                <Download size={11} />
                                Download PNG
                              </a>
                              <button
                                onClick={() => {
                                  setOriginalFile('');
                                  setOriginalFilename('');
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                                title="Remove and replace"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <FileUpload
                            key={`png_${selectedOrder.id}`}
                            label=""
                            accept="image/png,image/*"
                            preserveOriginalQuality={true}
                            maxFiles={1}
                            helperText="Upload lossless PNG image in full original resolution (No compression)"
                            onFilesWithMetadataSelected={(files) => {
                              if (files && files[0]) {
                                setOriginalFile(files[0].data);
                                setOriginalFilename(files[0].name);
                              }
                            }}
                            onFilesSelected={(files) => {
                              if (files && files[0] && !originalFile) {
                                setOriginalFile(files[0]);
                                setOriginalFilename('Original_Design.png');
                              }
                            }}
                          />
                        )}
                      </div>

                      {/* Upload 2: Design ZIP Package (Vector / Production Archive) */}
                      <div className={cn(
                        "space-y-2 bg-white p-3.5 rounded-xl border transition-all",
                        !designZipFile ? "border-indigo-200" : "border-indigo-300 shadow-xs"
                      )}>
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-gray-700 uppercase tracking-tight flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            2. Design ZIP Package (Vector / Source Package)
                          </p>
                          {designZipFile ? (
                            <span className="text-[9px] text-green-600 font-extrabold flex items-center gap-1">
                              ✓ ZIP Ready
                            </span>
                          ) : (
                            <span className="text-[9px] text-indigo-600 font-bold">📦 ZIP / Vector Archive</span>
                          )}
                        </div>

                        {designZipFile ? (
                          <div className="flex items-center justify-between gap-3 bg-indigo-50/60 p-3 rounded-xl border border-indigo-150">
                            <div className="flex items-center gap-3 min-w-0 text-left">
                              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                                <FolderOpen size={20} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate" title={designZipFilename || 'Design_Package.zip'}>
                                  {designZipFilename || 'Design_Package.zip'}
                                </p>
                                <p className="text-[10px] text-indigo-700 font-bold">Production ZIP Archive (Original Quality)</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={designZipFile}
                                download={designZipFilename || `Design_Package_${selectedOrder.id.slice(-6)}.zip`}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 shadow-xs cursor-pointer no-underline"
                                title="Download Original ZIP Archive"
                              >
                                <Download size={11} />
                                Download ZIP
                              </a>
                              <button
                                onClick={() => {
                                  setDesignZipFile('');
                                  setDesignZipFilename('');
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                                title="Remove and replace"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <FileUpload
                            key={`zip_${selectedOrder.id}`}
                            label=""
                            accept=".zip,.rar,.7z,.emb,.dst,.cdr,.ai,.psd,application/zip"
                            preserveOriginalQuality={true}
                            maxFiles={1}
                            helperText="Upload ZIP package containing raw vectors (.ai, .cdr, .psd, .dst, .emb)"
                            onFilesWithMetadataSelected={(files) => {
                              if (files && files[0]) {
                                setDesignZipFile(files[0].data);
                                setDesignZipFilename(files[0].name);
                              }
                            }}
                            onFilesSelected={(files) => {
                              if (files && files[0] && !designZipFile) {
                                setDesignZipFile(files[0]);
                                setDesignZipFilename('Design_Package.zip');
                              }
                            }}
                          />
                        )}
                      </div>

                      {/* Upload 3: Additional Vector Outputs / Deliverables */}
                      <div className="space-y-2 bg-white p-3.5 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-gray-700 uppercase tracking-tight flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-gray-400" />
                            3. Additional Vector Outputs / PDFs ({designFiles.length})
                          </p>
                        </div>
                        <FileUpload
                          key={`files_${selectedOrder.id}`}
                          label=""
                          accept=".pdf,image/*,.zip"
                          preserveOriginalQuality={true}
                          helperText="Upload additional mockup PDFs or tracing sheets"
                          onFilesSelected={(files) => setDesignFiles(prev => [...prev, ...files])}
                        />
                        {designFiles.length > 0 && (
                          <div className="max-h-[100px] overflow-y-auto space-y-1 mt-2">
                            {designFiles.map((file, i) => (
                              <div key={i} className="flex justify-between items-center text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText size={13} className="text-purple-600 shrink-0" />
                                  <span className="truncate max-w-[150px] font-mono font-bold">Deliverable_{i + 1}.pdf</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={file}
                                    download={`Deliverable_${i + 1}_Order_${selectedOrder.id.slice(-6)}`}
                                    className="text-purple-600 hover:text-purple-800 font-bold"
                                  >
                                    Download
                                  </a>
                                  <button
                                    onClick={() => handleRemoveFile(i, 'design')}
                                    className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chat Panel Interface (Only Backoffice Chat) */}
                  <div className="bg-gray-50 rounded-2xl border border-gray-150 p-4 shrink-0 flex flex-col gap-3 min-h-[260px] justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                          <MessageSquare size={12} />
                          Backoffice Coordinator Chat
                        </span>
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      </div>

                      {/* Live Channel */}
                      <div className="space-y-3">
                        <div className="max-h-[160px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar text-xs">
                          {omMessages.length === 0 ? (
                            <p className="italic text-gray-400 text-center py-4 text-xs">No messages with Backoffice coordinates yet.</p>
                          ) : (
                            omMessages.map((msg, idx) => {
                              const isDesigner = msg.senderRole === 'designer';
                              return (
                                <div key={idx} className={cn(
                                  "p-3 rounded-2xl max-w-[85%] space-y-1 block text-left",
                                  isDesigner ? "bg-black text-white ml-auto" : "bg-gray-200 text-gray-900 mr-auto"
                                )}>
                                  <p className="text-[9px] font-black opacity-60 uppercase">{msg.sender}</p>
                                  <p className="font-medium text-xs leading-relaxed">{msg.text}</p>
                                  {msg.attachments && msg.attachments.map((att, i) => (
                                    <div key={i} className="flex items-center gap-1.5 mt-1 bg-white/10 p-1.5 rounded-lg">
                                      <Paperclip size={10} />
                                      <span className="text-[9px] truncate max-w-[130px]">Reference File</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Message Trigger Form */}
                        <div className="flex gap-2 border-t border-gray-200 pt-3">
                          <input
                            type="text"
                            placeholder="Send re-work details to Manager..."
                            className="flex-1 text-xs bg-white border border-gray-200 rounded-xl px-3 outline-none text-gray-800 font-medium"
                            value={omNewMessage}
                            onChange={(e) => setOmNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendOmChatMessage();
                            }}
                          />
                          <button
                            onClick={handleSendOmChatMessage}
                            className="h-9 w-9 bg-black text-white flex items-center justify-center rounded-xl hover:bg-gray-800 transition-all cursor-pointer border-none"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal actions footer */}
            <div className="p-8 border-t border-gray-100 flex flex-col sm:flex-row gap-4 shrink-0 bg-gray-50/50">
              {/* Hold / Resume buttons */}
              {selectedOrder.status === OrderStatus.HOLD ? (
                <button
                  disabled={isProcessing}
                  onClick={handlePutOnHold}
                  className="px-6 py-4 bg-green-100 hover:bg-green-200 text-green-800 rounded-2xl font-black uppercase text-xs tracking-wider transition-all scale-100 hover:scale-[1.02] border-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle size={15} />
                  Resume Active Work
                </button>
              ) : (
                <button
                  disabled={isProcessing}
                  onClick={handlePutOnHold}
                  className="px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-black uppercase text-xs tracking-wider transition-all scale-100 hover:scale-[1.02] border-none flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Clock size={15} />
                  Request Design Hold
                </button>
              )}

              {/* Show action buttons depending on whether it is Accounts Sent vs Marketing Sent */}
              {(activeChannel === 'accounts_queue' || (selectedOrder.accountsAttachments || []).length > 0) ? (
                /* Accounts Sent Order -> Send to Digitizer & Send to Order Management */
                <>
                  <button
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    onClick={handleSendToDigitizer}
                    className="flex-1 py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all scale-100 hover:scale-[1.01] active:scale-95 shadow-lg border-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing files...' : 'Send to Digitizer'}
                    <CheckCircle size={15} />
                  </button>
                  <button
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    onClick={handleSendToOrderManagement}
                    className="flex-1 py-4 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all scale-100 hover:scale-[1.01] active:scale-95 shadow-lg border-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Send to Order Management'}
                    <CheckCircle size={15} />
                  </button>
                </>
              ) : (
                /* Marketing Sent Order -> Return to Marketing & Send to Marketing */
                <>
                  <button
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    onClick={handleReturnToCreator}
                    className="px-6 py-4 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-2xl font-black uppercase text-xs tracking-wider transition-all scale-100 hover:scale-[1.02] border-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    Return to Marketing
                  </button>
                  <button
                    disabled={isProcessing || selectedOrder.status === OrderStatus.HOLD}
                    onClick={handleSendToMarketing}
                    className="flex-1 py-4 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-2xl font-black uppercase text-xs tracking-wider transition-all scale-100 hover:scale-[1.01] active:scale-95 shadow-lg border-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 animate-pulse"
                  >
                    {isProcessing ? 'Processing files...' : 'Send to Marketing'}
                    <CheckCircle size={15} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Global Image Viewer Modal */}
      {viewingImage && (
        <ImageViewer
          src={viewingImage}
          onClose={() => setViewingImage(null)}
          fileName="Reference_Trace"
        />
      )}

      {/* Custom dialog prompts for Return or Hold reasons */}
      <AnimatePresence>
        {customPrompt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden p-6 text-left border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <AlertCircle className="text-amber-500" size={18} />
                  {customPrompt.title}
                </h4>
                <button
                  onClick={() => setCustomPrompt(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              <p className="text-xs text-gray-600 font-semibold mb-4 leading-relaxed">
                {customPrompt.description}
              </p>

              <div className="space-y-4">
                <textarea
                  className="w-full text-xs p-3 border border-gray-200 outline-none rounded-xl bg-gray-50 focus:bg-white resize-none h-24 text-gray-800 font-semibold leading-relaxed"
                  placeholder={customPrompt.placeholder}
                  value={promptInputValue}
                  onChange={(e) => setPromptInputValue(e.target.value)}
                />

                {promptError && (
                  <p className="text-[10px] text-red-500 font-extrabold">{promptError}</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setCustomPrompt(null)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black rounded-lg text-[10px] uppercase border-none cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isProcessing || !promptInputValue.trim()}
                    onClick={() => {
                      if (!promptInputValue.trim()) {
                        setPromptError("Please write something to confirm.");
                        return;
                      }
                      customPrompt.onHiddenSubmit(promptInputValue);
                    }}
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-black rounded-lg text-[10px] uppercase border-none cursor-pointer disabled:opacity-50"
                  >
                    {customPrompt.actionLabel}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Custom simple arrow icons needed if ArrowLeft is missing or has a duplicate name
function ArrowLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}
