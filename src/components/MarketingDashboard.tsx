/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useDebounce } from '../hooks/useDebounce';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, ChevronRight, FileText, User, Phone, MapPin, X, ZoomIn,
  Copy, Share2, Trash2, Package, AlertCircle, AlertTriangle, Mic, Send,
  MessageSquare, Paperclip, Clock, Sparkles, Wand2, ArrowRight,
  ClipboardPaste, CheckCircle2, Check, ShieldCheck, IndianRupee, ClipboardCheck
} from 'lucide-react';
import { Order, OrderStatus, SizeBreakdown, UserRole } from '../types';
import { mockDataService } from '../service/mockDataService';
import OrderDetailModal from './OrderDetailModal';
import { useLeads } from '../context/LeadContext';
import {
  CATEGORIES, JERSEY_MATERIALS, JERSEY_MODELS, SLEEVE_OPTIONS,
  SHIRT_MATERIALS, SHIRT_MODELS, SHIRT_COLOURS, PRINT_TYPES,
  HOODIE_MODELS, HOODIE_COLOURS, SWEATSHIRT_COLOURS,
  PANT_MATERIALS, PANT_COLOURS, TSHIRT_MATERIALS, TSHIRT_COLOURS_MAP,
  OVERSIZED_MATERIALS, OVERSIZED_COLOURS, CORPORATE_GIFT_OPTIONS,
  SIZE_OPTIONS
} from '../constants';
import FileUpload from './FileUpload';
import ImageViewer from './ImageViewer';
import { cn, getDisplayCategory, isOrderSizeValid } from '../lib/utils';
import { useRef } from 'react';
import ConversationDashboard from './ConversationDashboard';
import OrdersChart from './OrdersChart';

interface MarketingDashboardProps {
  orders: Order[];
  inventory?: any[];
  onCreateOrder: (order: Partial<Order>) => Promise<void>;
  onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
  onDeleteOrder?: (id: string) => void;
  isAdmin?: boolean;
  user?: any;
  leadManagerComponent?: React.ReactNode;
}

export default function MarketingDashboard({ orders, inventory = [], onCreateOrder, onUpdateOrder, onDeleteOrder, isAdmin, user, leadManagerComponent }: MarketingDashboardProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [activeShareMenu, setActiveShareMenu] = useState<string | null>(null);
  const [selectedHubOrder, setSelectedHubOrder] = useState<Order | null>(null);
  const { loadOrderAttachments } = useLeads();

  useEffect(() => {
    if (selectedHubOrder) {
      loadOrderAttachments(selectedHubOrder.id).then(attachments => {
        setSelectedHubOrder(prev => prev && prev.id === selectedHubOrder.id ? { ...prev, ...attachments } : prev);
      });
    }
  }, [selectedHubOrder?.id]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [showSubmitReviewModal, setShowSubmitReviewModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    category: CATEGORIES[0],
    details: {} as any,
    imageAttachments: [] as string[],
    pdfAttachments: [] as string[],
    sizeBreakdown: [] as SizeBreakdown[],
    deliveryAmount: 0,
    totalAmount: 0,
    advancePay: 0,
    notes: '',
    voiceNote: '',
    isUrgent: false
  });

  const [selectedSection, setSelectedSection] = useState<'recent' | 'process' | 'design_received' | 'hold' | 'completed'>('recent');

  const [isDesignSidebarOpen, setIsDesignSidebarOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const [noteModal, setNoteModal] = useState<{
    isOpen: boolean;
    orderId: string;
    target: 'design' | 'accounts';
    noteText: string;
  } | null>(null);

  useEffect(() => {
    const handleOpenFeed = () => {
      setIsDesignSidebarOpen(true);
    };
    window.addEventListener('open-conversations-feed', handleOpenFeed);
    return () => {
      window.removeEventListener('open-conversations-feed', handleOpenFeed);
    };
  }, []);

  const resetForm = () => {
    if (isRecordingVoice) {
      stopVoiceRecording();
    }
    setFormData({
      customerName: '',
      phone: '',
      address: '',
      category: CATEGORIES[0],
      details: {},
      imageAttachments: [],
      pdfAttachments: [],
      sizeBreakdown: [],
      deliveryAmount: 0,
      totalAmount: 0,
      advancePay: 0,
      notes: '',
      voiceNote: '',
      isUrgent: false
    });
    setEditingOrderId(null);
    setNoteFeedback(null);
    setRecordingSeconds(0);
    setValidationErrors([]);
    setFieldErrors({});
    setShowSubmitReviewModal(false);
    setShowValidationModal(false);
  };

  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);

  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Microphone access is not supported by your browser or environment.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setFormData(prev => ({ ...prev, voiceNote: base64Audio }));
          setNoteFeedback("✓ Voice note recorded and attached to order!");
          setTimeout(() => setNoteFeedback(null), 3000);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all microphone tracks
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(track => track.stop());
          audioStreamRef.current = null;
        }
      };

      mediaRecorder.start(200);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      alert("Microphone permission was denied or unavailable. Please enable microphone permissions in your browser.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecordingVoice(false);
  };

  const deleteVoiceRecording = () => {
    if (isRecordingVoice) {
      stopVoiceRecording();
    }
    setFormData(prev => ({ ...prev, voiceNote: '' }));
    setRecordingSeconds(0);
    setNoteFeedback("Voice note deleted");
    setTimeout(() => setNoteFeedback(null), 2000);
  };

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handlePasteNoteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setFormData(prev => {
            const existing = (prev.notes || '').trim();
            const newNotes = existing ? `${existing}\n\n${text.trim()}` : text.trim();
            return { ...prev, notes: newNotes };
          });
          setNoteFeedback("✓ Pasted clipboard text into specs!");
          setTimeout(() => setNoteFeedback(null), 2500);
          return;
        }
      }
      setNoteFeedback("💡 Press Ctrl+V inside the text area to paste directly.");
      setTimeout(() => setNoteFeedback(null), 3000);
    } catch (err) {
      setNoteFeedback("💡 Press Ctrl+V inside the text area to paste directly.");
      setTimeout(() => setNoteFeedback(null), 3000);
    }
  };

  const handleCopyNoteToClipboard = async () => {
    if (!formData.notes || !formData.notes.trim()) {
      setNoteFeedback("No notes to copy.");
      setTimeout(() => setNoteFeedback(null), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(formData.notes);
      setNoteFeedback("✓ Copied specs to clipboard!");
      setTimeout(() => setNoteFeedback(null), 2500);
    } catch (err) {
      setNoteFeedback("Failed to copy to clipboard.");
      setTimeout(() => setNoteFeedback(null), 2500);
    }
  };

  // Global image paste handler for the Order Intake Modal
  useEffect(() => {
    if (!isCreating) return;

    const handleGlobalModalPaste = (e: globalThis.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        for (const file of imageFiles) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              setFormData(prev => {
                if (prev.imageAttachments.includes(dataUrl)) return prev;
                return {
                  ...prev,
                  imageAttachments: [...prev.imageAttachments, dataUrl].slice(-10)
                };
              });
              setNoteFeedback("✓ Screenshot/Image attached to blueprints!");
              setTimeout(() => setNoteFeedback(null), 3000);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    };

    window.addEventListener('paste', handleGlobalModalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalModalPaste);
    };
  }, [isCreating]);

  useEffect(() => {
    const handleCreateOrderEvent = () => {
      resetForm();
      setIsCreating(true);
    };
    window.addEventListener('onlineteam-create-order', handleCreateOrderEvent);
    return () => {
      window.removeEventListener('onlineteam-create-order', handleCreateOrderEvent);
    };
  }, [orders]);

  const validateOrderForm = () => {
    const errors: string[] = [];
    const fields: Record<string, string> = {};

    if (!formData.customerName || !formData.customerName.trim()) {
      errors.push("Customer Name is required.");
      fields.customerName = "Customer Name is required";
    }

    const rawPhone = formData.phone.trim().replace(/[\s\-\(\)\+]/g, '');
    if (!formData.phone || !formData.phone.trim()) {
      errors.push("Phone Number is required.");
      fields.phone = "Phone Number is required";
    } else if (rawPhone.length < 10) {
      errors.push("Phone Number must be at least 10 digits.");
      fields.phone = "At least 10 digits required";
    }

    if (!formData.address || !formData.address.trim()) {
      errors.push("Shipping Address is required.");
      fields.address = "Shipping Address is required";
    }

    if (!formData.sizeBreakdown || formData.sizeBreakdown.length === 0) {
      errors.push("At least one item row is required in Item Breakdown.");
      fields.sizeBreakdown = "Add at least one item row";
    } else {
      formData.sizeBreakdown.forEach((item, idx) => {
        const row = idx + 1;
        if (!item.category) {
          errors.push(`Row #${row}: Product Category must be selected.`);
        }
        if (!item.size) {
          errors.push(`Row #${row}: Size must be selected.`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Row #${row} (${item.category || 'Item'} ${item.size || ''}): Quantity must be at least 1.`);
        }
        if (item.price === undefined || item.price === null || item.price <= 0) {
          errors.push(`Row #${row} (${item.category || 'Item'} ${item.size || ''}): Unit Price must be greater than ₹0.`);
        }
      });
    }

    if (!formData.totalAmount || formData.totalAmount <= 0) {
      errors.push("Total Order Amount must be greater than ₹0.");
      fields.totalAmount = "Total amount must be greater than 0";
    }

    if (formData.advancePay > formData.totalAmount) {
      errors.push("Advance Payment cannot be greater than Total Amount.");
      fields.advancePay = "Advance cannot exceed Total Amount";
    }

    return {
      isValid: errors.length === 0,
      errors,
      fields
    };
  };

  const handleInitiateSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateOrderForm();
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setFieldErrors(validation.fields);
      setShowValidationModal(true);
      return;
    }

    setValidationErrors([]);
    setFieldErrors({});
    setShowSubmitReviewModal(true);
  };

  const handleFinalSubmit = async () => {
    if (isProcessing) return;

    const totalQuantity = formData.sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0) || 1;
    const existingOrder = editingOrderId ? orders.find(o => o.id === editingOrderId) : null;
    let computedCategory = formData.category;
    if (formData.sizeBreakdown && formData.sizeBreakdown.length > 0) {
      const categories = Array.from(new Set(formData.sizeBreakdown.map(i => i.category)));
      if (categories.length === 1) {
        computedCategory = categories[0];
      } else if (categories.length > 1) {
        computedCategory = 'Mixed Order';
      }
    }

    const finalOrderData = {
      status: existingOrder ? existingOrder.status : OrderStatus.PENDING,
      category: computedCategory,
      createdBy: existingOrder ? existingOrder.createdBy : (user?.id || user?.uid || 'unknown'),
      createdByName: existingOrder ? existingOrder.createdByName : (user?.name || 'Unknown'),
      claimedBy: existingOrder ? existingOrder.claimedBy : (user?.id || user?.uid || undefined),
      claimedByName: existingOrder ? existingOrder.claimedByName : (user?.name || undefined),
      claimedAt: existingOrder ? existingOrder.claimedAt : Date.now(),
      customerInfo: {
        name: formData.customerName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim()
      },
      details: formData.details,
      sizeBreakdown: formData.sizeBreakdown,
      quantity: totalQuantity,
      isUrgent: formData.isUrgent,
      notes: formData.notes.trim(),
      designNotes: formData.notes.trim(),
      financials: {
        totalAmount: formData.totalAmount,
        advancePay: formData.advancePay,
        balanceAmount: formData.totalAmount - formData.advancePay,
        deliveryAmount: formData.deliveryAmount || 0,
        itemsTotal: formData.sizeBreakdown.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0),
        gstAmount: formData.sizeBreakdown.reduce((sum, i) => sum + ((i.quantity * (i.price || 0) * (i.gstRate || 0)) / 100), 0),
      },
      staffImages: formData.imageAttachments,
      staffPdfs: formData.pdfAttachments,
      staffAttachments: [...formData.imageAttachments, ...formData.pdfAttachments], // Legacy
      marketing_image: formData.imageAttachments[0] || '',
      marketing_notes: formData.notes.trim(),
      voiceNote: formData.voiceNote || undefined,
      updatedAt: Date.now(),
    };

    if (!isOrderSizeValid(finalOrderData)) {
      alert("Error: Total order data limit exceeded (Max 100MB). Please use fewer images or smaller files. Your current attempt is too large for the cloud.");
      return;
    }

    setIsProcessing(true);

    try {
      if (editingOrderId) {
        await onUpdateOrder(editingOrderId, finalOrderData);
        alert("Success: Order updated in portal.");
      } else {
        await onCreateOrder({
          ...finalOrderData,
          status: OrderStatus.PENDING,
          designSentToMarketing: false,
          designCompleted: false,
          original_design_file: '',
          original_design_filename: '',
          original_design_zip: '',
          original_design_zip_filename: '',
          createdAt: Date.now(),
        });
        alert("Success: Order created successfully and added to your queue.");
      }
      setShowSubmitReviewModal(false);
      setIsCreating(false);
      setEditingOrderId(null);
      resetForm();
    } catch (error: any) {
      console.error("Order submission failed:", error);
      const errorMessage = error?.message || "";
      if (errorMessage.includes("ORDER_TOO_LARGE") || errorMessage.includes("exceeds the maximum allowed size") || errorMessage.includes("size")) {
        alert("Failed to submit: Attachments are too large for the database (Max 100MB per order total). Please use fewer or smaller files.");
      } else {
        alert("Failed to submit order. Please check all fields. Error: " + (errorMessage.slice(0, 100)));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateAutoTotal = (breakdown: SizeBreakdown[], delivery: number = 0) => {
    const itemsSum = breakdown.reduce((sum, item) => {
      const base = item.quantity * (item.price || 0);
      const gst = (base * (item.gstRate || 0)) / 100;
      return sum + base + gst;
    }, 0);
    return Math.round((itemsSum + (delivery || 0)) * 100) / 100;
  };

  const addSizeQuantity = () => {
    setFormData(prev => {
      const updated: SizeBreakdown[] = [...prev.sizeBreakdown, {
        category: prev.category,
        size: SIZE_OPTIONS[0],
        quantity: 1,
        price: 0,
        gstRate: 0,
        colour: '',
        printType: '',
        sleeve: '',
        pocket: '',
        material: '',
        model: ''
      }];
      return {
        ...prev,
        sizeBreakdown: updated,
        totalAmount: calculateAutoTotal(updated, prev.deliveryAmount)
      };
    });
  };

  const updateSizeQuantity = (index: number, field: keyof SizeBreakdown, value: any) => {
    setFormData(prev => {
      const updated = [...prev.sizeBreakdown];
      updated[index] = { ...updated[index], [field]: value };
      const newTotal = calculateAutoTotal(updated, prev.deliveryAmount);
      return { ...prev, sizeBreakdown: updated, totalAmount: newTotal };
    });
  };

  const getMaterialsForCategory = (category: string) => {
    switch (category) {
      case 'Jersey': return JERSEY_MATERIALS;
      case 'Shirt': return SHIRT_MATERIALS;
      case 'Pant': return PANT_MATERIALS;
      case 'T-Shirt': return TSHIRT_MATERIALS;
      case 'Oversized': return OVERSIZED_MATERIALS;
      default: return [];
    }
  };

  const getModelsForCategory = (category: string) => {
    switch (category) {
      case 'Jersey': return JERSEY_MODELS;
      case 'Shirt': return SHIRT_MODELS;
      case 'Hoodie': return HOODIE_MODELS;
      case 'T-Shirt': return ['Polo', 'Crewneck', 'V-Neck'];
      case 'Corporate Gift': return CORPORATE_GIFT_OPTIONS;
      default: return [];
    }
  };

  const getColoursForCategory = (category: string, material?: string) => {
    switch (category) {
      case 'Shirt': return SHIRT_COLOURS;
      case 'Hoodie': return HOODIE_COLOURS;
      case 'Sweatshirt': return SWEATSHIRT_COLOURS;
      case 'Pant': return PANT_COLOURS;
      case 'T-Shirt':
        if (material) {
          const key = Object.keys(TSHIRT_COLOURS_MAP).find(k => k.toLowerCase() === material.toLowerCase());
          return key ? TSHIRT_COLOURS_MAP[key] : (TSHIRT_COLOURS_MAP['Comfort'] || []);
        }
        return [];
      case 'Oversized': return OVERSIZED_COLOURS;
      default: return [];
    }
  };

  const getSleevesForCategory = (category: string) => {
    if (category === 'Jersey') return ['pull', 'half'];
    if (['Shirt', 'T-Shirt'].includes(category)) return ['full', 'half'];
    return [];
  };

  const getPocketsForCategory = (category: string) => {
    if (['Shirt', 'T-Shirt'].includes(category)) return ['yes', 'no'];
    return [];
  };

  const removeSizeQuantity = (index: number) => {
    setFormData(prev => {
      const updated = prev.sizeBreakdown.filter((_, i) => i !== index);
      return {
        ...prev,
        sizeBreakdown: updated,
        totalAmount: calculateAutoTotal(updated, prev.deliveryAmount)
      };
    });
  };

  const startEdit = (order: Order) => {
    setEditingOrderId(order.id);
    setValidationErrors([]);
    setFieldErrors({});
    setShowSubmitReviewModal(false);
    setShowValidationModal(false);
    setFormData({
      customerName: order.customerInfo.name,
      phone: order.customerInfo.phone,
      address: order.customerInfo.address,
      category: order.category,
      details: order.details || {},
      imageAttachments: order.staffImages?.length ? order.staffImages : (order.marketing_image ? [order.marketing_image] : []),
      pdfAttachments: order.staffPdfs || [],
      sizeBreakdown: order.sizeBreakdown || [],
      deliveryAmount: order.financials?.deliveryAmount || 0,
      totalAmount: order.financials?.totalAmount || 0,
      advancePay: order.financials?.advancePay || 0,
      notes: order.notes || order.designNotes || order.marketing_notes || '',
      voiceNote: order.voiceNote || '',
      isUrgent: order.isUrgent || false
    });
    setIsCreating(true);
  };

  const debouncedSearchTerm = useDebounce(searchTerm, 150);

  const isReturnedFromDesign = (o: Order) => {
    const s = String(o.status || '').toLowerCase();
    const isPendingOrDraft = s === 'pending' || s === 'draft';
    const hasDesign = Boolean(
      o.designCompleted ||
      o.designSentToMarketing ||
      (o.original_design_file && o.original_design_file.length > 0) ||
      (o.original_design_filename && o.original_design_filename.length > 0) ||
      (o.original_design_zip_filename && o.original_design_zip_filename.length > 0)
    );
    return isPendingOrDraft && hasDesign;
  };

  const isRecentOrder = (o: Order) => {
    const s = String(o.status || '').toLowerCase();
    const isPendingOrDraft = s === 'pending' || s === 'draft';
    return isPendingOrDraft && !isReturnedFromDesign(o);
  };

  const isProcessOrder = (o: Order) => {
    const s = String(o.status || '').toLowerCase();
    const prev = String(o.previousStatus || '').toLowerCase();
    const effStatus = s === 'hold' ? prev : s;
    const isDelivery = effStatus === 'delivery' || effStatus === 'delivered';
    const isPendingOrDraft = effStatus === 'pending' || effStatus === 'draft' || effStatus === '';
    const isPendingHold = s === 'hold' && (!prev || prev === 'pending' || prev === 'draft');
    return !isDelivery && !isPendingOrDraft && !isPendingHold;
  };

  const isHoldOrder = (o: Order) => {
    const s = String(o.status || '').toLowerCase();
    const prev = String(o.previousStatus || '').toLowerCase();
    return s === 'hold' && (!prev || prev === 'pending' || prev === 'draft');
  };

  const isDoneOrder = (o: Order) => {
    const s = String(o.status || '').toLowerCase();
    const prev = String(o.previousStatus || '').toLowerCase();
    return s === 'delivery' || s === 'delivered' || (s === 'hold' && (prev === 'delivery' || prev === 'delivered'));
  };

  const filteredOrders = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase().trim();
    return orders.filter(o => {
      const matchesSearch = !term || (o.customerInfo?.name || '').toLowerCase().includes(term) || o.id.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (selectedSection === 'design_received') {
        return isReturnedFromDesign(o);
      }
      if (selectedSection === 'hold') {
        return isHoldOrder(o);
      }
      if (selectedSection === 'completed') {
        return isDoneOrder(o);
      }
      if (selectedSection === 'process') {
        return isProcessOrder(o);
      }
      // 'recent': newly created orders that have NOT yet returned from designs
      return isRecentOrder(o);
    });
  }, [orders, debouncedSearchTerm, selectedSection]);

  const recentOrdersCount = useMemo(() => orders.filter(isRecentOrder).length, [orders]);
  const designReceivedOrdersCount = useMemo(() => orders.filter(isReturnedFromDesign).length, [orders]);
  const processOrdersCount = useMemo(() => orders.filter(isProcessOrder).length, [orders]);
  const holdOrdersCount = useMemo(() => orders.filter(isHoldOrder).length, [orders]);
  const completedOrdersCount = useMemo(() => orders.filter(isDoneOrder).length, [orders]);

  return (
    <div className="bg-white/70 backdrop-blur-2xl text-gray-900 p-3.5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-white/60 shadow-xl space-y-4 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* Action Buttons Header */}
      <div className="flex items-center justify-end gap-2.5 border-b border-gray-100 pb-3 sm:pb-4">
        <button
          onClick={() => {
            resetForm();
            setIsCreating(true);
          }}
          className="flex items-center justify-center gap-1.5 sm:gap-2 bg-brand-primary text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black hover:opacity-90 transition-all shadow-md active:scale-95 text-[10px] sm:text-xs uppercase cursor-pointer border-none"
        >
          <Plus size={14} className="sm:w-4 sm:h-4" />
          <span>Create Order</span>
        </button>
        <button
          onClick={() => setIsLeadModalOpen(true)}
          className="flex items-center justify-center gap-1.5 sm:gap-2 bg-gray-150 border border-gray-200 text-gray-700 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black hover:bg-gray-200 transition-all shadow-xs active:scale-95 text-[10px] sm:text-xs uppercase cursor-pointer"
        >
          <User size={14} className="sm:w-4 sm:h-4" />
          <span>Create Lead</span>
        </button>
      </div>

      <ConversationDashboard
        isOpen={isDesignSidebarOpen}
        onClose={() => setIsDesignSidebarOpen(false)}
        currentUser={user || { name: 'Marketing Desk', role: 'Marketing' }}
        orders={orders}
        onUpdateOrder={onUpdateOrder}
        onCreateOrder={onCreateOrder}
      />

      {/* Modern Filter Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-white/60 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/60 shadow-xs">
        <button
          onClick={() => setSelectedSection('recent')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center truncate min-w-0",
            selectedSection === 'recent' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800"
          )}
        >
          Recent ({recentOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('process')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center truncate min-w-0",
            selectedSection === 'process' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800"
          )}
        >
          Processing ({processOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('design_received')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center truncate min-w-0 flex items-center justify-center gap-1.5",
            selectedSection === 'design_received'
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
              : "text-purple-700 bg-purple-50/80 hover:bg-purple-100 hover:text-purple-900"
          )}
        >
          <span>🎨 Designs Received</span>
          <span className={cn(
            "px-1.5 py-0.2 rounded-full text-[9px] font-black",
            selectedSection === 'design_received' ? "bg-white/20 text-white" : "bg-purple-200/80 text-purple-900"
          )}>
            {designReceivedOrdersCount}
          </span>
        </button>
        <button
          onClick={() => setSelectedSection('hold')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center truncate min-w-0",
            selectedSection === 'hold' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800"
          )}
        >
          On Hold ({holdOrdersCount})
        </button>
        <button
          onClick={() => setSelectedSection('completed')}
          className={cn(
            "flex-1 sm:flex-initial px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer text-center truncate min-w-0",
            selectedSection === 'completed' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800"
          )}
        >
          Done ({completedOrdersCount})
        </button>
      </div>

      {/* Primary Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Order intake lists */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <Search className="text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search customer or order ID..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto max-h-[calc(100vh-21rem)] min-h-[350px] overflow-y-auto custom-scrollbar pr-1">
            {/* Desktop Table View */}
            <table className="hidden md:table w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-gray-400 uppercase font-black text-[9px] tracking-wider border-b border-gray-100">
                  <th className="pb-3 px-3">Order ID</th>
                  <th className="pb-3 px-3">Customer</th>
                  <th className="pb-3 px-3">Category</th>
                  <th className="pb-3 px-3">Qty</th>
                  <th className="pb-3 px-3">Pipeline Status</th>
                  <th className="pb-3 px-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(order => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedHubOrder(order)}
                      className="hover:bg-gray-50/50 transition-all cursor-pointer"
                    >
                      <td className="py-4 px-3 font-mono text-[10px] text-gray-400">
                        <div className="flex items-center gap-2">
                          #{order.id.slice(-6)}
                          {order.isUrgent && (
                            <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">URGENT</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          {((order.staffImages && order.staffImages[0]) || order.marketing_image || order.original_design_file) && (
                            <div 
                              onClick={(e) => {
                                const imgToView = order.original_design_file || order.staffImages?.[0] || order.marketing_image;
                                if (imgToView) {
                                  e.stopPropagation();
                                  setViewingImage(imgToView);
                                }
                              }}
                              className="w-9 h-9 rounded-lg border border-gray-150 overflow-hidden shrink-0 bg-gray-50 relative group cursor-pointer"
                              title="Click to zoom image"
                            >
                              <img src={order.original_design_file || order.staffImages?.[0] || order.marketing_image} className="w-full h-full object-cover" />
                              {order.original_design_file && (
                                <span className="absolute bottom-0 inset-x-0 bg-purple-600 text-[6px] font-black text-white text-center uppercase">Art</span>
                              )}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-gray-950 uppercase italic">{order.customerInfo?.name || ''}</div>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{order.customerInfo?.phone || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-black uppercase rounded">
                          {getDisplayCategory(order)}
                        </span>
                      </td>
                      <td className="py-4 px-3 font-bold text-gray-900 text-xs">{order.quantity || 1}</td>
                      <td className="py-4 px-3">
                        <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {isReturnedFromDesign(order) ? (
                            <div className="flex flex-col gap-1">
                              <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase w-fit tracking-wider bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                                ✓ Design Received
                              </span>
                              {order.assignedDesigner && (
                                <span className="text-[9.5px] text-purple-700 font-bold">
                                  🎨 Lead: {order.assignedDesigner}
                                </span>
                              )}
                              {order.designNotes && (
                                <span className="text-[8.5px] text-gray-500 italic max-w-[200px] truncate" title={order.designNotes}>
                                  Studio: "{order.designNotes}"
                                </span>
                              )}
                              <div className="flex gap-1.5 mt-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNoteModal({
                                      isOpen: true,
                                      orderId: order.id,
                                      target: 'accounts',
                                      noteText: ''
                                    });
                                  }}
                                  className="text-[9px] font-black text-white bg-brand-primary hover:opacity-90 rounded px-2.5 py-1 transition-all cursor-pointer uppercase tracking-wider shadow-xs"
                                >
                                  💳 Forward to Accounts
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setNoteModal({
                                      isOpen: true,
                                      orderId: order.id,
                                      target: 'design',
                                      noteText: ''
                                    });
                                  }}
                                  className="text-[9px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded px-2 py-1 transition-all cursor-pointer uppercase tracking-wider"
                                >
                                  ✏️ Revise
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase w-fit tracking-wider ${getStatusStyles(order.status)}`}>
                                {order.status.replace('_', ' ')}
                              </span>
                              {order.assignedDesigner && order.assignedDesigner !== 'Unassigned' && order.assignedDesigner !== 'Designer assigned' ? (
                                <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1 mt-0.5">
                                  🎨 {order.assignedDesigner}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                                  🎨 Unassigned
                                </span>
                              )}
                              {(order.status === OrderStatus.PENDING || order.status === OrderStatus.DRAFT) && (
                                <div className="flex gap-1.5 mt-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNoteModal({
                                        isOpen: true,
                                        orderId: order.id,
                                        target: 'design',
                                        noteText: ''
                                      });
                                    }}
                                    className="text-[9px] font-black text-purple-700 bg-purple-50 hover:bg-purple-650 hover:text-white border border-purple-200 rounded px-2 py-0.5 transition-all cursor-pointer uppercase tracking-wider"
                                  >
                                    Designs
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNoteModal({
                                        isOpen: true,
                                        orderId: order.id,
                                        target: 'accounts',
                                        noteText: ''
                                      });
                                    }}
                                    className="text-[9px] font-black text-amber-700 bg-amber-50 hover:bg-amber-650 hover:text-white border border-amber-200 rounded px-2 py-0.5 transition-all cursor-pointer uppercase tracking-wider"
                                  >
                                    Accounts
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {order.status === OrderStatus.HOLD && order.holdReason && (
                          <div className="text-[8px] text-red-500 mt-1 font-bold italic truncate max-w-[80px]" title={order.holdReason}>
                            {order.holdReason}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-3 text-right">
                        <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[9px] font-mono text-gray-400 mr-1">{new Date(order.createdAt).toLocaleDateString()}</span>
                          <button
                            onClick={() => setSelectedHubOrder(order)}
                            className="px-2.5 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border-none"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                      No orders found in this section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Mobile View */}
            <div className="block md:hidden divide-y divide-gray-100 max-h-[calc(100vh-21rem)] overflow-y-auto custom-scrollbar pr-1">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedHubOrder(order)}
                    className="py-4 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex flex-col">
                        <span className="font-mono font-black text-brand-primary">#{order.id.slice(-6)}</span>
                        <span className="text-[9px] text-gray-400 font-mono mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      {order.isUrgent && (
                        <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded animate-pulse">URGENT</span>
                      )}
                    </div>

                    <div className="flex items-start gap-3">
                      {((order.staffImages && order.staffImages[0]) || order.marketing_image || order.original_design_file) && (
                        <div 
                          onClick={(e) => {
                            const imgToView = order.original_design_file || order.staffImages?.[0] || order.marketing_image;
                            if (imgToView) {
                              e.stopPropagation();
                              setViewingImage(imgToView);
                            }
                          }}
                          className="w-12 h-12 rounded-xl border border-gray-150 overflow-hidden shrink-0 bg-gray-50 relative cursor-pointer"
                        >
                          <img src={order.original_design_file || order.staffImages?.[0] || order.marketing_image} className="w-full h-full object-cover" />
                          {order.original_design_file && (
                            <span className="absolute bottom-0 inset-x-0 bg-purple-600 text-[7px] font-black text-white text-center uppercase">Art</span>
                          )}
                        </div>
                      )}
                      <div className="space-y-1">
                        <div className="font-black text-gray-900 text-sm uppercase italic">{order.customerInfo?.name || ''}</div>
                        <a href={`tel:${order.customerInfo?.phone || ''}`} className="text-xs text-gray-500 font-semibold hover:text-brand-primary flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Phone size={10} className="text-brand-primary" /> {order.customerInfo?.phone || ''}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-xl border border-gray-150">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-black uppercase rounded">
                        {getDisplayCategory(order)}
                      </span>
                      <span className="text-xs font-bold text-gray-900">Qty: {order.quantity || 1}</span>
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      {isReturnedFromDesign(order) ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status:</span>
                            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase w-fit tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                              ✓ Design Received
                            </span>
                          </div>
                          {order.assignedDesigner && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Designer:</span>
                              <span className="text-[10px] text-purple-700 font-bold">🎨 {order.assignedDesigner}</span>
                            </div>
                          )}
                          {order.designNotes && (
                            <div className="text-[9px] text-gray-600 bg-purple-50/70 p-2 rounded-xl border border-purple-150 italic">
                              Studio Note: "{order.designNotes}"
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setNoteModal({
                                  isOpen: true,
                                  orderId: order.id,
                                  target: 'accounts',
                                  noteText: ''
                                });
                              }}
                              className="py-2 bg-brand-primary text-white hover:opacity-90 rounded-xl font-black text-[9px] transition-all uppercase cursor-pointer border-none shadow-xs text-center"
                            >
                              💳 To Accounts
                            </button>
                            <button
                              onClick={() => {
                                setNoteModal({
                                  isOpen: true,
                                  orderId: order.id,
                                  target: 'design',
                                  noteText: ''
                                });
                              }}
                              className="py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-black text-[9px] border border-purple-200 transition-colors uppercase cursor-pointer text-center"
                            >
                              ✏️ Revise Art
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status:</span>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase w-fit tracking-wider ${getStatusStyles(order.status)}`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Designer:</span>
                            {order.assignedDesigner && order.assignedDesigner !== 'Unassigned' && order.assignedDesigner !== 'Designer assigned' ? (
                              <span className="text-[10px] text-gray-700 font-bold flex items-center gap-1">
                                🎨 {order.assignedDesigner}
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                🎨 Unassigned
                              </span>
                            )}
                          </div>

                          {order.status === OrderStatus.HOLD && order.holdReason && (
                            <div className="text-[9px] text-red-600 font-bold bg-red-50 p-2 rounded border border-red-200 italic">
                              Blocked Reason: {order.holdReason}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                            {order.status === OrderStatus.PENDING ? (
                              <>
                                <button
                                  onClick={() => {
                                    setNoteModal({
                                      isOpen: true,
                                      orderId: order.id,
                                      target: 'design',
                                      noteText: ''
                                    });
                                  }}
                                  className="py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-black text-[9px] border border-purple-200 transition-colors uppercase cursor-pointer"
                                >
                                  Designs
                                </button>
                                <button
                                  onClick={() => {
                                    setNoteModal({
                                      isOpen: true,
                                      orderId: order.id,
                                      target: 'accounts',
                                      noteText: ''
                                    });
                                  }}
                                  className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-black text-[9px] border border-amber-200 transition-colors uppercase cursor-pointer"
                                >
                                  Accounts
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setSelectedHubOrder(order)}
                                className="col-span-2 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-black text-xs transition-colors uppercase cursor-pointer border-none"
                              >
                                View & Edit
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400 italic">
                  No orders found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Stock Inventory view */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-[2rem] p-4 sm:p-6 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Package size={14} className="text-brand-primary" />
              Stock Inventory
            </h4>
          </div>

          <div className="space-y-4 max-h-[calc(100vh-21rem)] min-h-[350px] overflow-y-auto custom-scrollbar pr-1">
            {inventory && inventory.length > 0 ? (
              Object.values(inventory.reduce((acc: any, item) => {
                const key = `${item.product}-${item.productType}-${item.sleeve || 'none'}-${item.pocket || 'none'}`;
                if (!acc[key]) {
                  acc[key] = {
                    product: item.product,
                    productType: item.productType,
                    sleeve: item.sleeve,
                    pocket: item.pocket,
                    stock: 0,
                    lastDate: item.date
                  };
                }
                if (item.type === 'inward') acc[key].stock += item.quantity;
                else acc[key].stock -= item.quantity;
                return acc;
              }, {})).map((prod: any, idx) => (
                <div key={idx} className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between group hover:border-indigo-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-brand-primary transition-colors shrink-0">
                      <Package size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate text-xs">{prod.product}</p>
                      <p className="text-[9px] text-gray-500 font-black uppercase mt-0.5 flex flex-wrap gap-1 items-center">
                        <span>{prod.productType}</span>

                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-900">₹---</p>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-wider block mt-1",
                      prod.stock > 0 ? "text-green-700" : "text-red-600"
                    )}>
                      {prod.stock > 0 ? `In Stock (${prod.stock})` : `Out of Stock`}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-450 italic text-center py-6">No inventory records found.</p>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Graph Model */}
      <div className="pt-4">
        <OrdersChart orders={orders} />
      </div>

      {/* Forms and Creation Modal */}
      {isCreating && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">
                  {editingOrderId ? 'Modify Order Details' : 'Create Intake Order'}
                </h3>
                <label className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-xl cursor-pointer hover:bg-red-100/50 transition-colors">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-red-300 text-red-650 focus:ring-red-500"
                    checked={formData.isUrgent}
                    onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                  />
                  <span className="text-[9px] font-black text-red-750 uppercase tracking-widest">Mark as Urgent</span>
                </label>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 border-none bg-transparent cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInitiateSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-8 text-left">
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-wider">
                    <User size={16} className="text-brand-primary" />
                    Customer Information
                  </h4>
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">* Mandatory Fields</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 flex items-center justify-between">
                      <span>Customer Name <span className="text-red-500 font-black">*</span></span>
                      {fieldErrors.customerName && <span className="text-[9px] text-red-500 font-bold lowercase tracking-normal">{fieldErrors.customerName}</span>}
                    </label>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-4 py-3 bg-white border rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none transition-colors",
                        fieldErrors.customerName ? "border-red-400 bg-red-50/20 focus:border-red-500" : "border-gray-200"
                      )}
                      placeholder="Full name"
                      value={formData.customerName}
                      onChange={(e) => {
                        setFormData({ ...formData, customerName: e.target.value });
                        if (fieldErrors.customerName) setFieldErrors(prev => ({ ...prev, customerName: '' }));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 flex items-center justify-between">
                      <span>Phone Number <span className="text-red-500 font-black">*</span></span>
                      {fieldErrors.phone && <span className="text-[9px] text-red-500 font-bold lowercase tracking-normal">{fieldErrors.phone}</span>}
                    </label>
                    <input
                      type="tel"
                      className={cn(
                        "w-full px-4 py-3 bg-white border rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none transition-colors",
                        fieldErrors.phone ? "border-red-400 bg-red-50/20 focus:border-red-500" : "border-gray-200"
                      )}
                      placeholder="+91 / 10-digit number"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 flex items-center justify-between">
                    <span>Shipping Address <span className="text-red-500 font-black">*</span></span>
                    {fieldErrors.address && <span className="text-[9px] text-red-500 font-bold lowercase tracking-normal">{fieldErrors.address}</span>}
                  </label>
                  <textarea
                    rows={2}
                    className={cn(
                      "w-full px-4 py-3 bg-white border rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none resize-none transition-colors",
                      fieldErrors.address ? "border-red-400 bg-red-50/20 focus:border-red-500" : "border-gray-200"
                    )}
                    placeholder="Full shipping details & pin code"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value });
                      if (fieldErrors.address) setFieldErrors(prev => ({ ...prev, address: '' }));
                    }}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                  <Package size={16} className="text-brand-primary" />
                  Item Breakdown & Specifications
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span>Sizing & Specification Bench</span>
                      <span className="text-red-500 font-black">*</span>
                    </span>
                    <button
                      type="button"
                      onClick={addSizeQuantity}
                      className="text-[9px] font-black bg-brand-primary text-white px-3.5 py-1.5 rounded-lg hover:opacity-90 transition-all uppercase tracking-wider border-none cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Row
                    </button>
                  </div>

                  {fieldErrors.sizeBreakdown && formData.sizeBreakdown.length === 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                      <AlertCircle size={14} className="text-red-600 shrink-0" />
                      <span>{fieldErrors.sizeBreakdown} (Must add at least 1 row with valid quantity and price)</span>
                    </div>
                  )}

                  {formData.sizeBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      {formData.sizeBreakdown.map((item, idx) => (
                        <div key={idx} className={cn(
                          "p-3 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xs relative group flex flex-col gap-3 transition-colors",
                          (!item.price || item.price <= 0) ? "bg-amber-50/30 border-amber-200" : "bg-gray-50/60 border-gray-100"
                        )}>
                          <button
                            type="button"
                            onClick={() => removeSizeQuantity(idx)}
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors bg-white rounded border border-gray-100 cursor-pointer"
                          >
                            <X size={12} />
                          </button>

                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-end">
                            <div className="col-span-2 sm:col-span-1">
                              <Select
                                label="Category"
                                value={item.category}
                                options={CATEGORIES}
                                onChange={(v) => {
                                  updateSizeQuantity(idx, 'category', v);
                                  updateSizeQuantity(idx, 'material', '');
                                  updateSizeQuantity(idx, 'model', '');
                                  updateSizeQuantity(idx, 'colour', '');
                                }}
                              />
                            </div>
                            <div>
                              <Select
                                label="Size"
                                value={item.size}
                                options={SIZE_OPTIONS}
                                onChange={(v) => updateSizeQuantity(idx, 'size', v)}
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] sm:text-[10px] font-black text-gray-400 sm:text-gray-500 uppercase mb-0.5 sm:mb-1">Qty</label>
                              <select
                                value={item.quantity}
                                onChange={(e) => updateSizeQuantity(idx, 'quantity', parseInt(e.target.value))}
                                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-xl sm:rounded-2xl text-xs text-gray-800 focus:border-brand-primary outline-none"
                              >
                                {Array.from({ length: 1500 }, (_, i) => i + 1).map(n => (
                                  <option key={n} value={n} className="bg-white">{n}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[8px] sm:text-[10px] font-black text-gray-400 sm:text-gray-500 uppercase mb-0.5 sm:mb-1 flex items-center justify-between">
                                <span>Price (₹) <span className="text-red-500 font-black">*</span></span>
                                {(!item.price || item.price <= 0) && <span className="text-[8px] text-amber-600 font-bold lowercase">required</span>}
                              </label>
                              <input
                                type="number"
                                placeholder="0"
                                value={item.price || ''}
                                onChange={(e) => updateSizeQuantity(idx, 'price', parseFloat(e.target.value) || 0)}
                                className={cn(
                                  "w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border rounded-xl sm:rounded-2xl text-xs text-gray-800 focus:border-brand-primary outline-none transition-colors",
                                  (!item.price || item.price <= 0) ? "border-amber-400 bg-amber-50/20 focus:border-amber-500" : "border-gray-200"
                                )}
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] sm:text-[10px] font-black text-gray-400 sm:text-gray-500 uppercase mb-0.5 sm:mb-1">GST (%)</label>
                              <select
                                value={item.gstRate ?? 0}
                                onChange={(e) => updateSizeQuantity(idx, 'gstRate', parseFloat(e.target.value) || 0)}
                                className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-xl sm:rounded-2xl text-xs font-bold text-gray-800 focus:border-brand-primary outline-none"
                              >
                                <option value={0}>0% (No GST)</option>
                                <option value={5}>5% GST</option>
                                <option value={12}>12% GST</option>
                                <option value={18}>18% GST</option>
                                <option value={28}>28% GST</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                            {getMaterialsForCategory(item.category).length > 0 && (
                              <div>
                                <Select
                                  label="Material"
                                  value={item.material || ''}
                                  options={getMaterialsForCategory(item.category)}
                                  onChange={(v) => {
                                    updateSizeQuantity(idx, 'material', v);
                                    if (item.category === 'T-Shirt') updateSizeQuantity(idx, 'colour', '');
                                  }}
                                />
                              </div>
                            )}
                            {getModelsForCategory(item.category).length > 0 && (
                              <div>
                                <Select
                                  label="Model"
                                  value={item.model || ''}
                                  options={getModelsForCategory(item.category)}
                                  onChange={(v) => updateSizeQuantity(idx, 'model', v)}
                                />
                              </div>
                            )}
                            <div>
                              {getColoursForCategory(item.category, item.material).length > 0 ? (
                                <Select
                                  label="Colour"
                                  value={item.colour || ''}
                                  options={getColoursForCategory(item.category, item.material)}
                                  onChange={(v) => updateSizeQuantity(idx, 'colour', v)}
                                />
                              ) : (
                                <div>
                                  <label className="block text-[8px] sm:text-[10px] font-black text-gray-400 sm:text-gray-500 uppercase mb-0.5 sm:mb-1">Colour</label>
                                  <input
                                    type="text"
                                    placeholder="White"
                                    value={item.colour || ''}
                                    onChange={(e) => updateSizeQuantity(idx, 'colour', e.target.value)}
                                    className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-xl sm:rounded-2xl text-xs text-gray-800 focus:border-brand-primary outline-none"
                                  />
                                </div>
                              )}
                            </div>
                            <div>
                              <Select
                                label="Print"
                                value={item.printType || ''}
                                options={PRINT_TYPES}
                                onChange={(v) => updateSizeQuantity(idx, 'printType', v)}
                              />
                            </div>

                          </div>
                          
                          <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-2 text-[10px]">
                            <div className="text-gray-500 font-semibold flex items-center gap-2">
                              <span>Base: ₹{(item.quantity * (item.price || 0)).toLocaleString()}</span>
                              {(item.gstRate || 0) > 0 && (
                                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                  + GST ({item.gstRate}%: ₹{((item.quantity * (item.price || 0) * (item.gstRate || 0)) / 100).toLocaleString()})
                                </span>
                              )}
                            </div>
                            <div className="text-brand-primary font-black italic text-xs">
                              Line Total: ₹{(
                                item.quantity * (item.price || 0) +
                                ((item.quantity * (item.price || 0) * (item.gstRate || 0)) / 100)
                              ).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={addSizeQuantity}
                      className={cn(
                        "p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all text-xs",
                        fieldErrors.sizeBreakdown ? "border-red-300 bg-red-50/20 text-red-600" : "border-gray-250 hover:bg-gray-50/50 text-gray-400"
                      )}
                    >
                      + Click to add a size breakdown row (Required).
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 justify-between items-center bg-gray-50/60 p-3.5 rounded-2xl border border-gray-150">
                    <div className="flex items-center gap-3 text-xs text-gray-500 font-bold">
                      <span>Items Base: ₹{formData.sizeBreakdown.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0).toLocaleString()}</span>
                      {formData.sizeBreakdown.some(i => (i.gstRate || 0) > 0) && (
                        <span className="text-emerald-600">
                          Total GST: ₹{formData.sizeBreakdown.reduce((sum, item) => sum + ((item.quantity * (item.price || 0) * (item.gstRate || 0)) / 100), 0).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Aggregate Sum:</span>
                      <span className="text-base font-black text-gray-900">
                        {formData.sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)} units
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-3 pt-4 border-t border-gray-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Delivery Amount (₹)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none"
                        placeholder="0.00"
                        value={formData.deliveryAmount || ''}
                        onChange={(e) => {
                          const del = parseFloat(e.target.value) || 0;
                          const newTotal = calculateAutoTotal(formData.sizeBreakdown, del);
                          setFormData({ ...formData, deliveryAmount: del, totalAmount: newTotal });
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 flex items-center justify-between">
                        <span>Total Amount (₹) <span className="text-red-500 font-black">*</span></span>
                        {fieldErrors.totalAmount && <span className="text-[8px] text-red-500 font-bold lowercase">{fieldErrors.totalAmount}</span>}
                      </label>
                      <input
                        type="number"
                        className={cn(
                          "w-full px-4 py-3 bg-white border rounded-xl text-xs font-bold text-gray-900 focus:border-brand-primary outline-none transition-colors",
                          fieldErrors.totalAmount ? "border-red-400 bg-red-50/20" : "border-gray-200"
                        )}
                        placeholder="0.00"
                        value={formData.totalAmount || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 });
                          if (fieldErrors.totalAmount) setFieldErrors(prev => ({ ...prev, totalAmount: '' }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5 flex items-center justify-between">
                        <span>Advance Payment (₹)</span>
                        {fieldErrors.advancePay && <span className="text-[8px] text-red-500 font-bold lowercase">{fieldErrors.advancePay}</span>}
                      </label>
                      <input
                        type="number"
                        className={cn(
                          "w-full px-4 py-3 bg-white border rounded-xl text-xs text-green-700 font-bold focus:border-brand-primary outline-none transition-colors",
                          fieldErrors.advancePay ? "border-red-400 bg-red-50/20" : "border-gray-200"
                        )}
                        placeholder="0.00"
                        value={formData.advancePay || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, advancePay: parseFloat(e.target.value) || 0 });
                          if (fieldErrors.advancePay) setFieldErrors(prev => ({ ...prev, advancePay: '' }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 opacity-60">Balance Collected (₹)</label>
                      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl text-xs text-brand-primary font-black flex items-center justify-between">
                        <span>₹{Math.max(0, formData.totalAmount - formData.advancePay).toLocaleString()}</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase">Due</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Instructions and notes */}
              <section className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-150 pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-wider">
                      📋 Client Specs & Notes
                    </h4>
                    {noteFeedback && (
                      <span className="text-[10px] font-bold text-brand-primary bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md animate-in fade-in duration-200">
                        {noteFeedback}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePasteNoteFromClipboard}
                      title="Paste text/records directly from clipboard"
                      className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-brand-primary border border-purple-200 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
                    >
                      <ClipboardPaste size={12} />
                      <span>Paste Record (Ctrl+V)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyNoteToClipboard}
                      title="Copy notes content to clipboard"
                      className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                    >
                      <Copy size={12} />
                      <span>Copy Notes</span>
                    </button>
                    {formData.notes && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, notes: '' });
                          setNoteFeedback("Notes cleared");
                          setTimeout(() => setNoteFeedback(null), 1500);
                        }}
                        title="Clear notes"
                        className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <Trash2 size={11} />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Voice Recording / Microphone Spec Note */}
                <div className="pt-0.5 pb-1">
                  {isRecordingVoice ? (
                    <div className="flex items-center justify-between bg-red-50/90 border-2 border-red-300 p-3 rounded-2xl shadow-xs animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Mic size={16} className="animate-bounce" />
                        </div>
                        <div className="text-left">
                          <span className="text-[11px] font-black text-red-950 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                            Recording in Progress ({formatAudioTime(recordingSeconds)})
                          </span>
                          <span className="text-[9.5px] text-red-700 font-semibold block">
                            Speak voice instructions clearly into your mic...
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={stopVoiceRecording}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs border-none"
                        >
                          <span className="w-2 h-2 bg-white rounded-xs" />
                          <span>Stop & Save Voice</span>
                        </button>
                      </div>
                    </div>
                  ) : formData.voiceNote ? (
                    <div className="bg-purple-50/90 border-2 border-purple-200 p-3 rounded-2xl shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                            <Mic size={14} />
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-purple-950 uppercase tracking-tight block">
                              ✓ Voice Instructions Attached for Designer
                            </span>
                            <span className="text-[9px] text-purple-700 font-medium">
                              Designer can listen to this recording directly in Design Studio
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={startVoiceRecording}
                            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            title="Re-record voice instructions"
                          >
                            <Mic size={11} />
                            <span>Re-record</span>
                          </button>
                          <button
                            type="button"
                            onClick={deleteVoiceRecording}
                            className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            title="Delete voice note"
                          >
                            <Trash2 size={11} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                      <audio controls src={formData.voiceNote} className="w-full h-8 rounded-xl bg-white p-0.5 outline-none shadow-2xs" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-gradient-to-r from-purple-50/80 via-white to-purple-50/50 p-2.5 rounded-2xl border border-purple-150 shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-brand-primary flex items-center justify-center shrink-0">
                          <Mic size={16} />
                        </div>
                        <div className="text-left">
                          <span className="text-[10.5px] font-black text-gray-900 uppercase tracking-tight block">
                            Voice Instructions (Microphone)
                          </span>
                          <span className="text-[9px] text-gray-500 font-medium">
                            Record spoken instructions for logos, placements, and client details
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs hover:scale-102 active:scale-98 border-none"
                      >
                        <Mic size={13} className="animate-pulse" />
                        <span>Record Voice Note</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none resize-y font-mono leading-relaxed"
                    placeholder="Provide client logo dimensions, embroidery directions, layout specs, or paste records directly..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                  <div className="absolute bottom-2.5 right-3 text-[9px] text-gray-400 font-semibold pointer-events-none bg-white/90 px-1 rounded">
                    {formData.notes.length} chars • {formData.notes.split('\n').filter(Boolean).length} lines
                  </div>
                </div>
              </section>

              {/* File Uploads */}
              <section className="border-t border-gray-150 pt-5">
                <div className="space-y-3">
                  <FileUpload
                    label="Reference Blueprints & Sample Images"
                    accept="image/*,.pdf,.zip,.emb,.dst,.cdr"
                    maxFiles={10}
                    initialFiles={formData.imageAttachments}
                    onFilesSelected={(files) => setFormData({ ...formData, imageAttachments: files })}
                    helperText="Supports PNG, JPG, WEBP, ZIP, PDF, EMB, DST, CDR (Drag & Drop or Ctrl+V to paste screenshot)"
                  />
                </div>
              </section>

              {/* Action Buttons */}
              <div className="pt-6 flex gap-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 px-6 py-4 bg-brand-primary text-white rounded-xl font-black text-xs uppercase shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 border-none cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>Submit Order Details</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Validation Alert Warning Modal */}
      {showValidationModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border border-red-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-left"
          >
            <div className="p-5 sm:p-6 bg-red-50/90 border-b border-red-100 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-red-500/20">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black text-red-950 uppercase tracking-tight">
                  Fill Required Order Details
                </h3>
                <p className="text-xs text-red-700 font-semibold mt-0.5 leading-relaxed">
                  Please fill all mandatory details to submit this order.
                </p>
              </div>
              <button
                onClick={() => setShowValidationModal(false)}
                className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 hover:text-red-700 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-3.5 max-h-[55vh] overflow-y-auto custom-scrollbar">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Missing or Incomplete Details:
              </p>
              <div className="space-y-2">
                {validationErrors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 bg-red-50/60 rounded-xl border border-red-100 text-xs text-red-900 font-bold">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" />
                    <span className="leading-snug">{err}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowValidationModal(false)}
                className="w-full py-3 bg-brand-primary hover:opacity-90 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border-none text-center"
              >
                Return & Fill Details
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Submit Order Details Summary & Confirmation Modal */}
      {showSubmitReviewModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[115] flex items-center justify-center p-3 sm:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border border-gray-100 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-left"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-gray-900 uppercase italic tracking-tight">
                      {editingOrderId ? 'Review & Update Order Details' : 'Submit Order Details Verification'}
                    </h3>
                    {formData.isUrgent && (
                      <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase animate-pulse">
                        URGENT
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-500 font-semibold mt-0.5">
                    All mandatory details verified • Review summary before final confirmation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitReviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 border-none bg-transparent cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 custom-scrollbar bg-slate-50/40">
              {/* Customer Information Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs space-y-3">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-2">
                  <User size={14} className="text-brand-primary" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Customer Name</span>
                    <span className="text-xs font-black text-gray-900 uppercase mt-0.5 block">{formData.customerName}</span>
                  </div>
                  <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Phone Number</span>
                    <a href={`tel:${formData.phone}`} className="text-xs font-black text-brand-primary mt-0.5 flex items-center gap-1.5 hover:underline">
                      <Phone size={12} /> {formData.phone}
                    </a>
                  </div>
                  <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Shipping Address</span>
                    <span className="text-xs font-bold text-gray-800 mt-0.5 block whitespace-pre-wrap">{formData.address}</span>
                  </div>
                </div>
              </div>

              {/* Items & Size Breakdown Table */}
              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Package size={14} className="text-brand-primary" />
                    Item Breakdown & Specifications
                  </h4>
                  <span className="text-[10px] font-black text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-lg">
                    {formData.sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0)} Total Units
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 font-black uppercase text-[9px] tracking-wider border-b border-gray-150">
                        <th className="py-2.5 px-3">Item / Category</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Specs (Material/Model/Colour)</th>
                        <th className="py-2.5 px-3">Print Type</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-right">GST</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.sizeBreakdown.map((item, idx) => {
                        const base = item.quantity * (item.price || 0);
                        const gst = (base * (item.gstRate || 0)) / 100;
                        const total = base + gst;
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-3">
                              <span className="font-bold text-gray-900 uppercase">{item.category}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded font-black text-[10px]">
                                {item.size}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[10px] text-gray-600">
                              {[item.material, item.model, item.colour, item.sleeve ? `${item.sleeve} sleeve` : null, item.pocket ? `pocket: ${item.pocket}` : null]
                                .filter(Boolean)
                                .join(' • ') || 'Standard'}
                            </td>
                            <td className="py-3 px-3 text-[10px] text-gray-600">{item.printType || '—'}</td>
                            <td className="py-3 px-3 text-center font-black text-gray-900">{item.quantity}</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-gray-700">₹{(item.price || 0).toLocaleString()}</td>
                            <td className="py-3 px-3 text-right text-[10px] font-bold text-emerald-700">
                              {item.gstRate ? `${item.gstRate}% (₹${gst.toLocaleString()})` : '0%'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-brand-primary text-xs">
                              ₹{total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs space-y-3">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-100 pb-2">
                  <IndianRupee size={14} className="text-brand-primary" />
                  Financial Summary
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Items Base Total</span>
                    <span className="text-xs sm:text-sm font-black text-gray-800 mt-0.5 block">
                      ₹{formData.sizeBreakdown.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Total GST</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-700 mt-0.5 block">
                      ₹{formData.sizeBreakdown.reduce((sum, item) => sum + ((item.quantity * (item.price || 0) * (item.gstRate || 0)) / 100), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Delivery Fee</span>
                    <span className="text-xs sm:text-sm font-black text-gray-800 mt-0.5 block">
                      ₹{(formData.deliveryAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-brand-primary/5 p-3 rounded-xl border border-brand-primary/20">
                    <span className="text-[9px] font-black text-brand-primary uppercase block">Total Order Amount</span>
                    <span className="text-sm sm:text-base font-black text-brand-primary mt-0.5 block">
                      ₹{formData.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black text-emerald-800 uppercase block">Advance Payment Received</span>
                      <span className="text-sm sm:text-base font-black text-emerald-700 mt-0.5 block">₹{formData.advancePay.toLocaleString()}</span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Paid</span>
                  </div>
                  <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black text-amber-800 uppercase block">Balance Payment Due</span>
                      <span className="text-sm sm:text-base font-black text-amber-900 mt-0.5 block">₹{Math.max(0, formData.totalAmount - formData.advancePay).toLocaleString()}</span>
                    </div>
                    <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase">Due</span>
                  </div>
                </div>
              </div>

              {/* Client Specs & Notes & Voice Note */}
              {(formData.notes || formData.voiceNote) && (
                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs space-y-4">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                    📋 Client Specifications & Instructions
                  </h4>
                  {formData.voiceNote && (
                    <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 space-y-1.5">
                      <div className="flex items-center gap-2 text-purple-900 text-xs font-black uppercase">
                        <Mic size={14} className="text-brand-primary" />
                        <span>Voice Note Attached</span>
                      </div>
                      <audio controls src={formData.voiceNote} className="w-full h-8 rounded-lg bg-white p-0.5 outline-none" />
                    </div>
                  )}
                  {formData.notes && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs font-mono text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {formData.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Blueprints / Images Attachments */}
              {formData.imageAttachments && formData.imageAttachments.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs space-y-3">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                    🖼️ Reference Artwork & Files ({formData.imageAttachments.length})
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {formData.imageAttachments.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => setViewingImage(img)}
                        className="aspect-square rounded-xl border border-gray-200 overflow-hidden bg-gray-50 cursor-pointer hover:opacity-90 transition-all shadow-2xs"
                      >
                        <img src={img} alt={`attachment ${i+1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="sticky bottom-0 bg-white px-5 sm:px-8 py-4 border-t border-gray-150 flex flex-wrap gap-3 z-10">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setShowSubmitReviewModal(false)}
                className="flex-1 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase border-none cursor-pointer transition-all text-center"
              >
                ✏️ Back to Edit Details
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleFinalSubmit}
                className="flex-1 px-6 py-3.5 bg-brand-primary hover:opacity-95 text-white rounded-xl font-black text-xs uppercase shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 border-none cursor-pointer flex items-center justify-center gap-2 text-center"
              >
                {isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Submission...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>✓ Confirm & Place Order</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Global detailed view modal */}
      {selectedHubOrder && (
        <OrderDetailModal
          order={selectedHubOrder}
          onClose={() => setSelectedHubOrder(null)}
          isAdmin={isAdmin}
          onUpdateOrder={onUpdateOrder}
          onEdit={(ord) => {
            setSelectedHubOrder(null);
            startEdit(ord);
          }}
        />
      )}

      {/* Note modal */}
      {noteModal && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between text-left">
              <h3 className="text-base font-black text-gray-900 uppercase italic tracking-tight">
                {noteModal.target === 'design' ? 'Send to Designs Studio' : 'Send to Billing Desk'}
              </h3>
              <button
                onClick={() => setNoteModal(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Required Instructions
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs text-gray-800 outline-none focus:border-brand-primary resize-none"
                  rows={4}
                  placeholder={
                    noteModal.target === 'design' 
                      ? "Describe vector specs, materials and details..." 
                      : "Describe payment status, invoices or discount codes..."
                  }
                  value={noteModal.noteText}
                  onChange={(e) => setNoteModal({ ...noteModal, noteText: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setNoteModal(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-[10px] uppercase border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={!noteModal.noteText.trim() || isProcessing}
                  onClick={async () => {
                    if (!noteModal.noteText.trim()) return;
                    setIsProcessing(true);
                    try {
                      const updates: Partial<Order> = {
                        status: noteModal.target === 'design' ? OrderStatus.DESIGN : OrderStatus.ACCOUNTS,
                        updatedAt: Date.now()
                      };
                      if (noteModal.target === 'design') {
                        const existingOrder = orders.find(o => o.id === noteModal.orderId);
                        updates.notes = noteModal.noteText.trim();
                        updates.designNotes = noteModal.noteText.trim();
                        // Preserve the designer who already claimed/was assigned to this order
                        if (existingOrder?.assignedDesigner && existingOrder.assignedDesigner !== 'Unassigned' && existingOrder.assignedDesigner !== 'Designer assigned') {
                          updates.assignedDesigner = existingOrder.assignedDesigner;
                        }
                        if (existingOrder?.claimedBy) {
                          updates.claimedBy = existingOrder.claimedBy;
                        }
                        if (existingOrder?.claimedByName) {
                          updates.claimedByName = existingOrder.claimedByName;
                        }
                        updates.designSentToMarketing = false;
                        updates.designCompleted = false;
                      } else {
                        updates.accountsNotes = noteModal.noteText.trim();
                      }
                      await onUpdateOrder(noteModal.orderId, updates);
                      alert(`Order #${noteModal.orderId.slice(-6)} forwarded to ${noteModal.target === 'design' ? 'Designs Queue' : 'Accounts Queue'}!`);
                      setNoteModal(null);
                    } catch (err) {
                      alert("Action failed.");
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  className="flex-1 py-3 bg-brand-primary hover:opacity-90 text-white disabled:opacity-50 rounded-xl font-black text-[10px] uppercase border-none cursor-pointer text-center"
                >
                  Confirm Forward
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isLeadModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setIsLeadModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-655 rounded-full hover:bg-gray-100 transition-colors z-10 border-none bg-transparent cursor-pointer"
            >
              <X size={20} />
            </button>
            {leadManagerComponent}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: string) => void }) {
  return (
    <div className="space-y-1 sm:space-y-1.5 text-left">
      <label className="block text-[8px] sm:text-[10px] font-black text-gray-400 sm:text-gray-500 uppercase tracking-widest">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl sm:rounded-2xl px-2.5 sm:px-4 py-1.5 sm:py-2.5 text-xs text-gray-800 focus:border-brand-primary outline-none"
      >
        <option value="" disabled className="bg-white text-gray-400">Select {label}</option>
        {options.map(opt => <option key={opt} value={opt} className="bg-white text-gray-800">{opt}</option>)}
      </select>
    </div>
  );
}

const getStatusStyles = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.DRAFT: return 'bg-gray-100 text-gray-500 border border-gray-200';
    case OrderStatus.ACCOUNTS: return 'bg-amber-50 text-amber-700 border border-amber-200';
    case OrderStatus.DESIGN: return 'bg-purple-50 text-purple-700 border border-purple-200';
    case OrderStatus.ORDER_MANAGEMENT: return 'bg-blue-50 text-blue-700 border border-blue-200';
    case OrderStatus.PRODUCTION: return 'bg-purple-50 text-purple-700 border border-purple-200';
    case OrderStatus.DELIVERY: return 'bg-orange-50 text-orange-700 border border-orange-200';
    case OrderStatus.DELIVERED: return 'bg-green-50 text-green-700 border border-green-200';
    case OrderStatus.HOLD: return 'bg-red-50 text-red-750 border border-red-200';
    default: return 'bg-gray-100 text-gray-500';
  }
};
