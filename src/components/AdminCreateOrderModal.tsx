import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Plus, User, Phone, MapPin, Package, AlertCircle, AlertTriangle,
  Mic, Trash2, Copy, ClipboardPaste, CheckCircle2, Factory, ShieldCheck,
  Clock, IndianRupee, Send
} from 'lucide-react';
import { Order, OrderStatus, SizeBreakdown } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import FileUpload from './FileUpload';
import imageCompression from 'browser-image-compression';
import { cn, isOrderSizeValid } from '../lib/utils';
import {
  CATEGORIES, JERSEY_MATERIALS, JERSEY_MODELS, SLEEVE_OPTIONS,
  SHIRT_MATERIALS, SHIRT_MODELS, SHIRT_COLOURS, PRINT_TYPES,
  HOODIE_MODELS, HOODIE_COLOURS, SWEATSHIRT_COLOURS,
  PANT_MATERIALS, PANT_COLOURS, TSHIRT_MATERIALS, TSHIRT_COLOURS_MAP,
  OVERSIZED_MATERIALS, OVERSIZED_COLOURS, CORPORATE_GIFT_OPTIONS,
  SIZE_OPTIONS
} from '../constants';

interface AdminCreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: (order: any) => void;
}

function EditableSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  allowCustom = true
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
}) {
  const isValueInOptions = options && options.some(opt => opt.toLowerCase() === (value || '').toLowerCase());
  const [isCustomMode, setIsCustomMode] = useState<boolean>(!isValueInOptions && Boolean(value));

  useEffect(() => {
    if (value && options && !options.some(opt => opt.toLowerCase() === value.toLowerCase())) {
      setIsCustomMode(true);
    }
  }, [value, options]);

  return (
    <div className="space-y-1 sm:space-y-1.5 text-left">
      <div className="flex items-center justify-between">
        <label className="block text-[8px] sm:text-[10px] font-black text-gray-400 sm:text-gray-500 uppercase tracking-widest">
          {label}
        </label>
        {allowCustom && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              const nextMode = !isCustomMode;
              setIsCustomMode(nextMode);
              if (!nextMode && !isValueInOptions && options && options.length > 0) {
                onChange(options[0]);
              }
            }}
            className="text-[8px] sm:text-[9px] font-bold text-brand-primary hover:underline flex items-center gap-0.5 border-none bg-transparent cursor-pointer p-0"
            title={isCustomMode ? "Switch to standard list" : "Switch to custom edit"}
          >
            {isCustomMode ? (
              <span className="text-gray-500 hover:text-brand-primary">📋 List</span>
            ) : (
              <span>✏️ Custom</span>
            )}
          </button>
        )}
      </div>

      {isCustomMode ? (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || `Type custom ${label.toLowerCase()}...`}
          className="w-full bg-white border border-brand-primary/40 focus:border-brand-primary rounded-xl px-2.5 py-1.5 text-xs text-gray-800 font-semibold outline-none shadow-2xs"
          autoFocus
        />
      ) : (
        <select
          value={isValueInOptions ? value : ''}
          onChange={(e) => {
            if (e.target.value === '__custom__') {
              setIsCustomMode(true);
            } else {
              onChange(e.target.value);
            }
          }}
          className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-2 text-xs text-gray-800 focus:border-brand-primary outline-none cursor-pointer"
        >
          <option value="" disabled className="bg-white text-gray-400">Select {label}</option>
          {(options || []).map(opt => (
            <option key={opt} value={opt} className="bg-white text-gray-800">{opt}</option>
          ))}
          {allowCustom && (
            <option value="__custom__" className="bg-amber-50 text-amber-700 font-bold">
              ✏️ Other / Custom (Edit...)
            </option>
          )}
        </select>
      )}
    </div>
  );
}

export default function AdminCreateOrderModal({ isOpen, onClose, onSubmitSuccess }: AdminCreateOrderModalProps) {
  const { user } = useAuth();
  const { addOrder } = useLeads();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);
  const [productionNoteFeedback, setProductionNoteFeedback] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    address: '',
    category: CATEGORIES[0] || 'T-Shirt',
    details: {} as any,
    imageAttachments: [] as string[],
    pdfAttachments: [] as string[],
    sizeBreakdown: [] as SizeBreakdown[],
    deliveryAmount: 0,
    totalAmount: 0,
    advancePay: 0,
    notes: '',
    productionNotes: '',
    voiceNote: '',
    isUrgent: false,
    sendToDestination: OrderStatus.PENDING as OrderStatus
  });

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const resetForm = () => {
    if (isRecordingVoice) {
      stopVoiceRecording();
    }
    setFormData({
      customerName: '',
      phone: '',
      address: '',
      category: CATEGORIES[0] || 'T-Shirt',
      details: {},
      imageAttachments: [],
      pdfAttachments: [],
      sizeBreakdown: [
        {
          category: CATEGORIES[0] || 'T-Shirt',
          size: SIZE_OPTIONS[2] || 'M',
          quantity: 1,
          price: 400,
          gstRate: 5,
          colour: '',
          printType: 'DTF',
          sleeve: '',
          pocket: '',
          material: '',
          model: ''
        }
      ],
      deliveryAmount: 0,
      totalAmount: 420,
      advancePay: 0,
      notes: '',
      productionNotes: '',
      voiceNote: '',
      isUrgent: false,
      sendToDestination: OrderStatus.PENDING
    });
    setNoteFeedback(null);
    setProductionNoteFeedback(null);
    setRecordingSeconds(0);
    setValidationErrors([]);
    setFieldErrors({});
    setShowValidationModal(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Global paste handler to attach images/screenshots from clipboard directly
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalModalPaste = async (e: globalThis.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (!file) continue;

          try {
            let processedFile: File | Blob = file;
            try {
              processedFile = await imageCompression(file, {
                maxSizeMB: 0.35,
                maxWidthOrHeight: 1600,
                initialQuality: 0.82,
                useWebWorker: true
              });
            } catch (compErr) {
              console.warn("Clipboard image compression fallback:", compErr);
            }

            const reader = new FileReader();
            reader.onload = (loadEvent) => {
              const dataUrl = loadEvent.target?.result as string;
              if (dataUrl) {
                setFormData((prev) => ({
                  ...prev,
                  imageAttachments: [...prev.imageAttachments, dataUrl].slice(-10)
                }));
                setNoteFeedback("✓ Screenshot/Image attached to order!");
                setTimeout(() => setNoteFeedback(null), 3000);
              }
            };
            reader.readAsDataURL(processedFile);
          } catch (err) {
            console.error("Failed to read pasted image:", err);
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalModalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalModalPaste);
    };
  }, [isOpen]);

  // Sizing and Category Helper Mappings
  const calculateAutoTotal = (breakdown: SizeBreakdown[], delivery: number = 0) => {
    const itemsSum = breakdown.reduce((sum, item) => {
      const base = item.quantity * (item.price || 0);
      const gst = Math.round((base * (item.gstRate || 0)) / 100);
      return sum + base + gst;
    }, 0);
    return Math.round(itemsSum + (delivery || 0));
  };

  const addSizeQuantity = () => {
    setFormData(prev => {
      const updated: SizeBreakdown[] = [...prev.sizeBreakdown, {
        category: prev.category,
        size: SIZE_OPTIONS[2] || 'M',
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

  // Voice recording helpers
  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Microphone access is not supported by your browser.");
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
      alert("Microphone permission was denied. Please allow microphone access.");
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

  const handlePasteProductionNoteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setFormData(prev => {
            const existing = (prev.productionNotes || '').trim();
            const newNotes = existing ? `${existing}\n\n${text.trim()}` : text.trim();
            return { ...prev, productionNotes: newNotes };
          });
          setProductionNoteFeedback("✓ Pasted clipboard text into production notes!");
          setTimeout(() => setProductionNoteFeedback(null), 2500);
          return;
        }
      }
      setProductionNoteFeedback("💡 Press Ctrl+V inside the text area to paste directly.");
      setTimeout(() => setProductionNoteFeedback(null), 3000);
    } catch (err) {
      setProductionNoteFeedback("💡 Press Ctrl+V inside the text area to paste directly.");
      setTimeout(() => setProductionNoteFeedback(null), 3000);
    }
  };

  const handleCopyProductionNoteToClipboard = async () => {
    if (!formData.productionNotes || !formData.productionNotes.trim()) {
      setProductionNoteFeedback("No production notes to copy.");
      setTimeout(() => setProductionNoteFeedback(null), 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(formData.productionNotes);
      setProductionNoteFeedback("✓ Copied production notes to clipboard!");
      setTimeout(() => setProductionNoteFeedback(null), 2500);
    } catch (err) {
      setProductionNoteFeedback("Failed to copy to clipboard.");
      setTimeout(() => setProductionNoteFeedback(null), 2500);
    }
  };

  // Form Validation
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validateOrderForm();
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setFieldErrors(validation.fields);
      setShowValidationModal(true);
      return;
    }

    const totalQuantity = formData.sizeBreakdown.reduce((sum, item) => sum + item.quantity, 0) || 1;
    let computedCategory = formData.category;
    if (formData.sizeBreakdown && formData.sizeBreakdown.length > 0) {
      const categories = Array.from(new Set(formData.sizeBreakdown.map(i => i.category)));
      if (categories.length === 1) {
        computedCategory = categories[0];
      } else if (categories.length > 1) {
        computedCategory = 'Mixed Order';
      }
    }

    const targetStatus = formData.sendToDestination || OrderStatus.PENDING;
    const isDesignDestination = targetStatus === OrderStatus.DESIGN;
    const isAccountsDestination = targetStatus === OrderStatus.ACCOUNTS;

    const newOrderData: Partial<Order> = {
      status: targetStatus,
      category: computedCategory,
      createdBy: user?.id || user?.uid || 'admin',
      createdByName: user?.name || 'CEO Admin',
      isAdminOrder: true,
      sentByAdmin: true,
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
      productionNotes: formData.productionNotes.trim(),
      financials: {
        totalAmount: Math.round(formData.totalAmount),
        advancePay: Math.round(formData.advancePay),
        balanceAmount: Math.round(formData.totalAmount - formData.advancePay),
        deliveryAmount: Math.round(formData.deliveryAmount || 0),
        itemsTotal: Math.round(formData.sizeBreakdown.reduce((sum, i) => sum + (i.quantity * (i.price || 0)), 0)),
        gstAmount: Math.round(formData.sizeBreakdown.reduce((sum, i) => sum + ((i.quantity * (i.price || 0) * (i.gstRate || 0)) / 100), 0)),
      },
      staffImages: formData.imageAttachments,
      staffPdfs: formData.pdfAttachments,
      marketing_image: formData.imageAttachments[0] || '',
      marketing_notes: formData.notes.trim(),
      voiceNote: formData.voiceNote || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(isDesignDestination ? {
        designDeadline: Date.now() + 120 * 60 * 1000,
        designSlaMinutes: 120,
        sentToDesigner: true,
        sentByAccounts: false,
        designClaimedAt: undefined,
        designCompleted: false
      } : {}),
      ...(isAccountsDestination ? {
        movedToAccountsAt: Date.now(),
        sentToAccounts: true
      } : {})
    };

    if (!isOrderSizeValid(newOrderData)) {
      alert("Error: Total order data limit exceeded (Max 100MB). Please use fewer images or smaller files.");
      return;
    }

    setIsProcessing(true);
    try {
      await addOrder(newOrderData);
      alert(`✓ Order #${(newOrderData as any).id?.slice(-8) || ''} created successfully & sent to ${isDesignDestination ? 'Designs Team (Admin Order Tab)' : isAccountsDestination ? 'Accounts Team' : 'Global Orders'}!`);
      if (onSubmitSuccess) onSubmitSuccess(newOrderData);
      onClose();
    } catch (err: any) {
      console.error("Order creation failed:", err);
      alert("Failed to submit order. Please check all fields. Error: " + (err?.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col"
      >
        {/* Sticky Modal Header */}
        <div className="sticky top-0 bg-white px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 flex items-center justify-between z-20">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-brand-primary text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck size={12} /> Admin Control
              </span>
              <h3 className="text-lg sm:text-xl font-black text-gray-900 uppercase italic tracking-tight">
                Create New Order
              </h3>
            </div>
            <label className="flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-xl cursor-pointer hover:bg-red-100/50 transition-colors select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-red-300 text-red-650 focus:ring-red-500 cursor-pointer"
                checked={formData.isUrgent}
                onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
              />
              <span className="text-[9px] font-black text-red-750 uppercase tracking-widest">Mark as Urgent ⚡</span>
            </label>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 border-none bg-transparent cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-6 sm:space-y-8 text-left flex-1">
          {/* Section 1: Customer Information */}
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
                  placeholder="Full name (e.g. John Doe)"
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
                placeholder="Full delivery address & pin code"
                value={formData.address}
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value });
                  if (fieldErrors.address) setFieldErrors(prev => ({ ...prev, address: '' }));
                }}
              />
            </div>
          </section>

          {/* Section 2: Item Breakdown & Specifications */}
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
                  className="text-[9px] font-black bg-brand-primary text-white px-3.5 py-1.5 rounded-lg hover:opacity-90 transition-all uppercase tracking-wider border-none cursor-pointer flex items-center gap-1 shadow-xs"
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
                    <div
                      key={idx}
                      className={cn(
                        "p-3 sm:p-4 rounded-xl sm:rounded-2xl border shadow-xs relative group flex flex-col gap-3 transition-colors",
                        (!item.price || item.price <= 0) ? "bg-amber-50/30 border-amber-200" : "bg-gray-50/60 border-gray-100"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => removeSizeQuantity(idx)}
                        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors bg-white rounded border border-gray-100 cursor-pointer"
                        title="Remove row"
                      >
                        <X size={12} />
                      </button>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-end">
                        <div className="col-span-2 sm:col-span-1">
                          <EditableSelect
                            label="Category"
                            value={item.category}
                            options={CATEGORIES}
                            placeholder="e.g. Jersey / T-Shirt"
                            onChange={(v) => {
                              updateSizeQuantity(idx, 'category', v);
                              updateSizeQuantity(idx, 'material', '');
                              updateSizeQuantity(idx, 'model', '');
                              updateSizeQuantity(idx, 'colour', '');
                            }}
                          />
                        </div>
                        <div>
                          <EditableSelect
                            label="Size"
                            value={item.size}
                            options={SIZE_OPTIONS}
                            placeholder="e.g. M, L, Free Size"
                            onChange={(v) => updateSizeQuantity(idx, 'size', v)}
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] sm:text-[10px] font-black text-gray-400 sm:text-gray-500 uppercase mb-0.5 sm:mb-1">Qty</label>
                          <select
                            value={item.quantity}
                            onChange={(e) => updateSizeQuantity(idx, 'quantity', parseInt(e.target.value))}
                            className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none cursor-pointer"
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
                              "w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none transition-colors",
                              (!item.price || item.price <= 0) ? "border-amber-400 bg-amber-50/20 focus:border-amber-500" : "border-gray-200"
                            )}
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] sm:text-[10px] font-black text-gray-400 sm:text-gray-500 uppercase mb-0.5 sm:mb-1">GST (%)</label>
                          <select
                            value={item.gstRate ?? 0}
                            onChange={(e) => updateSizeQuantity(idx, 'gstRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:border-brand-primary outline-none cursor-pointer"
                          >
                            <option value={0}>0% (No GST)</option>
                            <option value={5}>5% GST</option>
                            <option value={12}>12% GST</option>
                            <option value={18}>18% GST</option>
                            <option value={28}>28% GST</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                        <div>
                          <EditableSelect
                            label="Material"
                            value={item.material || ''}
                            options={getMaterialsForCategory(item.category)}
                            placeholder="e.g. Cotton / Poly / Fleece"
                            onChange={(v) => {
                              updateSizeQuantity(idx, 'material', v);
                              if (item.category === 'T-Shirt') updateSizeQuantity(idx, 'colour', '');
                            }}
                          />
                        </div>
                        <div>
                          <EditableSelect
                            label="Model"
                            value={item.model || ''}
                            options={getModelsForCategory(item.category)}
                            placeholder="e.g. Regular / Oversized"
                            onChange={(v) => updateSizeQuantity(idx, 'model', v)}
                          />
                        </div>
                        <div>
                          <EditableSelect
                            label="Colour"
                            value={item.colour || ''}
                            options={getColoursForCategory(item.category, item.material)}
                            placeholder="e.g. White / Black / Navy"
                            onChange={(v) => updateSizeQuantity(idx, 'colour', v)}
                          />
                        </div>
                        <div>
                          <EditableSelect
                            label="Print"
                            value={item.printType || ''}
                            options={PRINT_TYPES}
                            placeholder="e.g. DTF / Embroidery"
                            onChange={(v) => updateSizeQuantity(idx, 'printType', v)}
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between border-t border-gray-100 pt-2 text-[10px]">
                        <div className="text-gray-500 font-semibold flex items-center gap-2">
                          <span>Base: ₹{Math.round(item.quantity * (item.price || 0)).toLocaleString()}</span>
                          {(item.gstRate || 0) > 0 && (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                              + GST ({item.gstRate}%: ₹{Math.round((item.quantity * (item.price || 0) * (item.gstRate || 0)) / 100).toLocaleString()})
                            </span>
                          )}
                        </div>
                        <div className="text-brand-primary font-black italic text-xs">
                          Line Total: ₹{Math.round(
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
                  <span>Items Base: ₹{Math.round(formData.sizeBreakdown.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0)).toLocaleString()}</span>
                  {formData.sizeBreakdown.some(i => (i.gstRate || 0) > 0) && (
                    <span className="text-emerald-600">
                      Total GST: ₹{Math.round(formData.sizeBreakdown.reduce((sum, item) => sum + ((item.quantity * (item.price || 0) * (item.gstRate || 0)) / 100), 0)).toLocaleString()}
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
                    placeholder="0"
                    value={formData.deliveryAmount || ''}
                    onChange={(e) => {
                      const del = Math.round(parseFloat(e.target.value) || 0);
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
                    placeholder="0"
                    value={formData.totalAmount ? Math.round(formData.totalAmount) : ''}
                    onChange={(e) => {
                      setFormData({ ...formData, totalAmount: Math.round(parseFloat(e.target.value) || 0) });
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
                    placeholder="0"
                    value={formData.advancePay ? Math.round(formData.advancePay) : ''}
                    onChange={(e) => {
                      setFormData({ ...formData, advancePay: Math.round(parseFloat(e.target.value) || 0) });
                      if (fieldErrors.advancePay) setFieldErrors(prev => ({ ...prev, advancePay: '' }));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 opacity-60">Balance Collected (₹)</label>
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-150 rounded-xl text-xs text-brand-primary font-black flex items-center justify-between">
                    <span>₹{Math.max(0, Math.round(formData.totalAmount) - Math.round(formData.advancePay)).toLocaleString()}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase">Due</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Send Order Destination (Dispatch Routing) */}
          <section className="space-y-3 bg-gradient-to-r from-purple-50/50 via-white to-blue-50/50 p-4 sm:p-5 rounded-2xl border border-purple-100">
            <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-wider border-b border-gray-150 pb-2">
              <Send size={16} className="text-brand-primary" />
              Send Order Directly To *
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  label: 'Pending',
                  status: OrderStatus.PENDING,
                  desc: 'Save in Global Staff List',
                  badge: 'Standard'
                },
                {
                  label: '🎨 Designs Queue',
                  status: OrderStatus.DESIGN,
                  desc: 'Send to Designer Studio (Admin Order Tab)',
                  badge: '2h SLA'
                },
                {
                  label: '💳 Accounts Queue',
                  status: OrderStatus.ACCOUNTS,
                  desc: 'Send directly to Billing & Invoicing',
                  badge: 'Billing'
                }
              ].map((dest) => (
                <label
                  key={dest.status}
                  className={cn(
                    "border-2 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-white select-none relative",
                    formData.sendToDestination === dest.status
                      ? "border-brand-primary bg-white shadow-md ring-2 ring-brand-primary/10 text-brand-primary font-black"
                      : "border-gray-200 bg-white/70 text-gray-600 hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name="adminOrderDestination"
                    value={dest.status}
                    checked={formData.sendToDestination === dest.status}
                    onChange={() => setFormData({ ...formData, sendToDestination: dest.status })}
                    className="hidden"
                  />
                  <span className="text-xs font-black uppercase tracking-wider">{dest.label}</span>
                  <span className="text-[9px] text-gray-500 font-medium mt-1">{dest.desc}</span>
                  <span className={cn(
                    "mt-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                    formData.sendToDestination === dest.status ? "bg-brand-primary text-white" : "bg-gray-100 text-gray-500"
                  )}>
                    {dest.badge}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {/* Section 4: Instructions, Specs & Notes */}
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
                  title="Paste text directly from clipboard"
                  className="flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-brand-primary border border-purple-200 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-2xs"
                >
                  <ClipboardPaste size={12} />
                  <span>Paste (Ctrl+V)</span>
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
                        Speak instructions clearly into your mic...
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
                          Designers can listen to this recording directly in the workspace
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
                        Record spoken instructions for logos, placements, and details
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs border-none"
                  >
                    <Mic size={13} className="animate-pulse" />
                    <span>Record Voice Note</span>
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <textarea
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:border-brand-primary outline-none resize-y font-mono leading-relaxed"
                placeholder="Provide client logo dimensions, embroidery directions, layout specs, or paste records directly..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
              <div className="absolute bottom-2.5 right-3 text-[9px] text-gray-400 font-semibold pointer-events-none bg-white/90 px-1 rounded">
                {formData.notes.length} chars
              </div>
            </div>
          </section>

          {/* Section 5: Production Notes (Factory Floor) */}
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-150 pb-2">
              <div className="flex items-center gap-2">
                <h4 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-wider">
                  <Factory size={16} className="text-indigo-600" />
                  🏭 Production Notes (Factory Floor & Manufacturing)
                </h4>
                {productionNoteFeedback && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md animate-in fade-in duration-200">
                    {productionNoteFeedback}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePasteProductionNoteFromClipboard}
                  title="Paste production notes directly from clipboard"
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-2xs"
                >
                  <ClipboardPaste size={12} />
                  <span>Paste (Ctrl+V)</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyProductionNoteToClipboard}
                  title="Copy production notes to clipboard"
                  className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                >
                  <Copy size={12} />
                  <span>Copy Notes</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={2}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500/20 outline-none resize-y font-mono leading-relaxed"
                placeholder="Enter specific instructions for the production/factory floor (e.g. stitching density, thread colors, tag placements, pressing instructions, packing rules)..."
                value={formData.productionNotes}
                onChange={(e) => setFormData({ ...formData, productionNotes: e.target.value })}
              />
            </div>
          </section>

          {/* Section 6: File Uploads */}
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

          {/* Sticky Action Buttons */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-4 pb-2 flex gap-3 border-t border-gray-150 z-20">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase border-none cursor-pointer text-center transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 px-4 sm:px-6 py-3 sm:py-3.5 bg-brand-primary hover:opacity-95 text-white rounded-xl font-black text-xs uppercase shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 border-none cursor-pointer flex items-center justify-center gap-2 text-center"
            >
              <CheckCircle2 size={16} />
              <span>{isProcessing ? 'Submitting Order...' : 'Submit Order'}</span>
            </button>
          </div>
        </form>
      </motion.div>

      {/* Validation Alert Warning Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white border border-red-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-left"
          >
            <div className="p-5 bg-red-50/90 border-b border-red-100 flex items-start gap-3.5">
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

            <div className="p-5 space-y-3.5 max-h-[50vh] overflow-y-auto custom-scrollbar">
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
        </div>
      )}
    </div>,
    document.body
  );
}
