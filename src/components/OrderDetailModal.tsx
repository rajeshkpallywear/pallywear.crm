import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, User, Phone, MapPin, FileText, Globe, Clock, AlertCircle, CheckCircle, Download, ZoomIn, ExternalLink, Sparkles, FolderOpen, Mic, MessageSquare, Factory, Truck, Package, Camera, Palette, RefreshCw, Edit, CreditCard } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import ImageViewer from './ImageViewer';
import WorkflowVisualizer from './WorkflowVisualizer';
import PaymentLinkModal from './PaymentLinkModal';
import { useState, useEffect } from 'react';
import { useLeads } from '../context/LeadContext';
import { cn, shareOrderToWhatsApp, downloadFile } from '../lib/utils';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onUpdateStatus?: (status: OrderStatus) => void;
  onUpdateOrder?: (id: string, updates: Partial<Order>) => Promise<void>;
  isAdmin?: boolean;
  onEdit?: (order: Order) => void;
  onConvertTaskToOrder?: (task: Order) => void;
}

export default function OrderDetailModal({ order: initialOrder, onClose, onUpdateStatus, onUpdateOrder, isAdmin, onEdit, onConvertTaskToOrder }: OrderDetailModalProps) {
  const { loadOrderAttachments, orders, updateOrder: contextUpdateOrder } = useLeads();
  const effectiveUpdateOrder = onUpdateOrder || contextUpdateOrder;
  const order = initialOrder ? (orders.find(o => o.id === initialOrder.id) || initialOrder) : null;

  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Order | null>(order);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [showTaskReworkPrompt, setShowTaskReworkPrompt] = useState(false);
  const [taskReworkReason, setTaskReworkReason] = useState('');
  const [taskReworkError, setTaskReworkError] = useState('');

  // Task Edit State
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskEditName, setTaskEditName] = useState(order?.customerInfo?.name || '');
  const [taskEditPhone, setTaskEditPhone] = useState(order?.customerInfo?.phone || '');
  const [taskEditNotes, setTaskEditNotes] = useState(order?.notes || order?.designNotes || order?.marketing_notes || '');
  const [taskEditUrgent, setTaskEditUrgent] = useState(Boolean(order?.isUrgent));
  const [taskEditUrgentReason, setTaskEditUrgentReason] = useState(order?.urgentReason || order?.details?.urgentReason || '');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (order) {
      setTaskEditName(order.customerInfo?.name || '');
      setTaskEditPhone(order.customerInfo?.phone || '');
      setTaskEditNotes(order.notes || order.designNotes || order.marketing_notes || '');
      setTaskEditUrgent(Boolean(order.isUrgent));
      setTaskEditUrgentReason(order.urgentReason || order.details?.urgentReason || '');
    }
  }, [order]);

  const handleSaveTaskEdit = async () => {
    if (!effectiveUpdateOrder || !order) return;
    setIsSaving(true);
    try {
      const updates: Partial<Order> = {
        customerInfo: {
          ...(order.customerInfo || {}),
          name: taskEditName.trim() || order.customerInfo?.name || 'Customer',
          phone: taskEditPhone.trim() || order.customerInfo?.phone || ''
        },
        notes: taskEditNotes.trim(),
        designNotes: taskEditNotes.trim(),
        marketing_notes: taskEditNotes.trim(),
        isUrgent: taskEditUrgent,
        urgentReason: taskEditUrgent ? (taskEditUrgentReason || 'Urgent priority') : '',
        details: {
          ...(order.details || {}),
          designNotes: taskEditNotes.trim(),
          urgentReason: taskEditUrgent ? (taskEditUrgentReason || 'Urgent priority') : ''
        },
        updatedAt: Date.now()
      };
      await effectiveUpdateOrder(order.id, updates);
      setIsEditingTask(false);
      alert('✓ Task updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update task.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!order) return null;

  const handleTaskReworkSubmit = async () => {
    const trimmed = taskReworkReason.trim();
    if (!trimmed || trimmed.length < 5) {
      setTaskReworkError('Please provide a valid and detailed rework reason (at least 5 characters).');
      return;
    }
    setTaskReworkError('');
    if (!effectiveUpdateOrder) return;
    setIsProcessingAction(true);
    try {
      const timestamp = Date.now();
      const existingNotes = order.notes || '';
      const appendNote = `[TASK REVISION REQUESTED] ${new Date(timestamp).toLocaleString()}: ${trimmed}`;
      const nextNotes = existingNotes ? `${existingNotes}\n\n${appendNote}` : appendNote;

      const existingClaimedAt = Number(order.claimedAt || order.designClaimedAt || order.createdAt || timestamp);
      const existingCompletedAt = Number(order.designCompletedAt || timestamp);
      const initialDuration = Math.max(0, existingCompletedAt - existingClaimedAt);

      const updates: Partial<Order> = {
        status: OrderStatus.DESIGN,
        isRework: true,
        reworkNotes: trimmed,
        reworkRequestedAt: timestamp,
        reworkAccepted: false,
        reworkAcceptedAt: undefined,
        reworkCompletedAt: undefined,
        reworkDurationMs: undefined,
        initialTaskClaimedAt: order.initialTaskClaimedAt || existingClaimedAt,
        initialTaskCompletedAt: order.initialTaskCompletedAt || existingCompletedAt,
        initialTaskDurationMs: order.initialTaskDurationMs || initialDuration,
        designCompleted: false,
        designSentToMarketing: false,
        notes: nextNotes,
        designNotes: trimmed,
        claimedAt: timestamp,
        designClaimedAt: timestamp,
        designDeadline: timestamp + 120 * 60 * 1000,
        designSlaMinutes: 120,
        updatedAt: timestamp,
        sentByAccounts: false,
        details: {
          ...(order.details || {}),
          isRework: true,
          reworkNotes: trimmed,
          reworkRequestedAt: timestamp,
          reworkAccepted: false,
          designCompleted: false,
          designSentToMarketing: false,
          initialTaskDurationMs: order.initialTaskDurationMs || initialDuration,
        }
      };

      if (order.assignedDesigner && order.assignedDesigner !== 'Unassigned') {
        updates.assignedDesigner = order.assignedDesigner;
      }
      if (order.claimedBy) {
        updates.claimedBy = order.claimedBy;
        updates.claimedByName = order.claimedByName;
      }

      await effectiveUpdateOrder(order.id, updates);
      alert('✓ Task sent back to Design Studio for rework!');
      setShowTaskReworkPrompt(false);
      setTaskReworkReason('');
      setTaskReworkError('');
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to send task for rework.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDirectForward = async (target: 'design' | 'accounts') => {
    setIsProcessingAction(true);
    try {
      const updates: Partial<Order> = {
        status: target === 'design' ? OrderStatus.DESIGN : OrderStatus.ACCOUNTS,
        updatedAt: Date.now()
      };
      if (target === 'accounts') {
        updates.movedToAccountsAt = Date.now();
      }
      if (target === 'design') {
        const hadPriorDesign = Boolean(
          order.designCompleted ||
          order.designSentToMarketing ||
          (order.original_design_file && order.original_design_file.length > 0) ||
          (order.designAttachments && order.designAttachments.length > 0) ||
          (order.machineFiles && order.machineFiles.length > 0)
        );
        if (hadPriorDesign) {
          updates.isRework = true;
          updates.reworkNotes = `Correction/update requested by Marketing on ${new Date().toLocaleDateString()}`;
          updates.claimedAt = Date.now();
          updates.designClaimedAt = Date.now();
          updates.designDeadline = Date.now() + 120 * 60 * 1000;
          updates.designSlaMinutes = 120;
          updates.designCompleted = false;
          updates.designCompletedAt = undefined;
        }
        if (isAdmin) {
          updates.isAdminOrder = true;
          updates.sentByAdmin = true;
        }
        // Always ensure sentByAccounts is false when dispatched from Marketing/CRM
        updates.sentByAccounts = false;
        updates.designSentToMarketing = false;
        updates.designCompleted = false;
        updates.designSentToDigitizer = false;
        if (order.assignedDesigner && order.assignedDesigner !== 'Unassigned' && order.assignedDesigner !== 'Designer assigned') {
          updates.assignedDesigner = order.assignedDesigner;
        }
        if (order.claimedBy) {
          updates.claimedBy = order.claimedBy;
        }
        if (order.claimedByName) {
          updates.claimedByName = order.claimedByName;
        }
      }

      if (effectiveUpdateOrder) {
        await effectiveUpdateOrder(order.id, updates);
      } else if (onUpdateStatus) {
        onUpdateStatus(updates.status);
      }

      alert(`✓ Order successfully sent to ${target === 'design' ? 'Designs Team' : 'Accounts Team'} immediately!`);
    } catch (err) {
      alert("Failed to update order.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  useEffect(() => {
    setEditedOrder(order);
  }, [order]);

  useEffect(() => {
    // Always load fresh attachments from server when modal opens
    if (initialOrder?.id) {
      loadOrderAttachments(initialOrder.id);
    }
  }, [initialOrder?.id]);

  const handleSave = async (targetDestination?: 'design' | 'accounts') => {
    if (!effectiveUpdateOrder) return;
    setIsSaving(true);
    try {
      let computedCategory = editedOrder.category;
      if (editedOrder.sizeBreakdown && editedOrder.sizeBreakdown.length > 0) {
        const categories = Array.from(new Set(editedOrder.sizeBreakdown.map(i => i.category)));
        if (categories.length === 1) {
          computedCategory = categories[0];
        } else if (categories.length > 1) {
          computedCategory = 'Mixed Order';
        }
      }
      const updates: Partial<Order> = {
        ...editedOrder,
        category: computedCategory,
        updatedAt: Date.now()
      };

      if (targetDestination === 'design') {
        updates.status = OrderStatus.DESIGN;
        updates.sentByAccounts = false;
        updates.designSentToMarketing = false;
        updates.designCompleted = false;
        updates.designSentToDigitizer = false;
        const hadPriorDesign = Boolean(
          order.designCompleted ||
          order.designSentToMarketing ||
          (order.original_design_file && order.original_design_file.length > 0) ||
          (order.designAttachments && order.designAttachments.length > 0) ||
          (order.machineFiles && order.machineFiles.length > 0)
        );
        if (hadPriorDesign) {
          updates.isRework = true;
          updates.reworkNotes = `Updated & forwarded to Design on ${new Date().toLocaleDateString()}`;
          updates.claimedAt = Date.now();
          updates.designClaimedAt = Date.now();
          updates.designDeadline = Date.now() + 120 * 60 * 1000;
          updates.designSlaMinutes = 120;
          updates.designCompleted = false;
          updates.designCompletedAt = undefined;
        }
      } else if (targetDestination === 'accounts') {
        updates.status = OrderStatus.ACCOUNTS;
        updates.movedToAccountsAt = Date.now();
      }

      await effectiveUpdateOrder(order.id, updates);
      setIsEditing(false);
      if (targetDestination) {
        alert(`✓ Order details updated and sent to ${targetDestination === 'design' ? 'Designs Team' : 'Accounts Team'} immediately!`);
      } else {
        alert("✓ Order details updated successfully.");
      }
      if (editedOrder.id !== order.id) {
        onClose();
      }
    } catch (error) {
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusStyles = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.DRAFT: return 'bg-gray-100 text-gray-600';
      case OrderStatus.PENDING: return 'bg-red-100 text-red-700';
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

  const isRaisedTask = Boolean(
    !(order.isConvertedFromTask || order.details?.isConvertedFromTask) &&
    (order.isRaisedTask ||
     order.details?.isRaisedTask ||
     order.category === 'Design Task' ||
     order.raisedTaskCategory === 'Design Task')
  );

  const marketingImages = [
    ...(order.staffImages || []),
    ...(order.marketing_image ? [order.marketing_image] : []),
    ...(order.staffAttachments || []).filter(f => typeof f === 'string' && (f.startsWith('data:image/') || f.includes('.png') || f.includes('.jpg') || f.includes('.jpeg') || f.includes('.webp')))
  ].filter((v, i, a) => typeof v === 'string' && v.trim() && a.indexOf(v) === i);

  const marketingDocs = [
    ...(order.staffPdfs || []),
    ...(order.staffAttachments || []).filter(f => typeof f === 'string' && !(f.startsWith('data:image/') || f.includes('.png') || f.includes('.jpg') || f.includes('.jpeg') || f.includes('.webp')))
  ].filter((v, i, a) => typeof v === 'string' && v.trim() && a.indexOf(v) === i);

  const designerReturnedImages = [
    ...(order.designAttachments || []),
    ...(order.original_design_file ? [order.original_design_file] : [])
  ].filter((v, i, a) => typeof v === 'string' && v.trim() && a.indexOf(v) === i);

  const designerMasterZip = order.original_design_zip || '';
  const designerMasterZipName = order.original_design_zip_filename || 'Master_Vector_Assets.zip';
  const designerMasterFilename = order.original_design_filename || '';
  const designerMachineFiles = order.machineFiles || [];

  const hasReturnedDesigns = Boolean(
    order.designCompleted ||
    order.designSentToMarketing ||
    designerReturnedImages.length > 0 ||
    designerMasterZip ||
    designerMasterFilename ||
    designerMachineFiles.length > 0
  );

  const downloadAllAssets = () => {
    const allFiles = [
      ...marketingImages.map((src, i) => ({ src, name: `Reference_Artwork_${i + 1}.png` })),
      ...marketingDocs.map((src, i) => ({ src, name: `Reference_Doc_${i + 1}.pdf` })),
      ...designerReturnedImages.map((src, i) => ({ src, name: `Completed_Mockup_${i + 1}.png` })),
      ...(designerMasterZip ? [{ src: designerMasterZip, name: designerMasterZipName }] : []),
      ...designerMachineFiles.map((src, i) => ({ src, name: `Stitch_Garage_File_${i + 1}_Order_${order.id}.zip` }))
    ];
    if (allFiles.length === 0) {
      alert("No attachment files to download.");
      return;
    }
    allFiles.forEach(file => {
      downloadFile(file.src, file.name);
    });
  };

  if (isRaisedTask) {
    return createPortal(
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden max-h-[94vh] flex flex-col border border-gray-150"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-gray-900 text-white">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
                <Palette size={24} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                    {order.customerInfo?.name || 'Design Task'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-purple-200 border border-white/20">
                    🎨 Design Task
                  </span>
                  {hasReturnedDesigns ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                      <CheckCircle size={11} /> Completed & Returned
                    </span>
                  ) : order.status === OrderStatus.DESIGN ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/40 flex items-center gap-1">
                      <Sparkles size={11} /> In Design Studio
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/30 text-amber-200 border border-amber-400/40">
                      ⏳ Pending Marketing
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-200/80 font-mono mt-0.5">
                  ID: #{order.id} • Raised on {new Date(order.createdAt).toLocaleDateString()} by {order.createdByName || order.details?.raisedBy || 'Marketing'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {!isEditingTask ? (
                <button
                  type="button"
                  onClick={() => setIsEditingTask(true)}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all shadow-sm flex items-center gap-1.5 border border-purple-400/40 cursor-pointer"
                  title="Edit Task Details & Instructions"
                >
                  <Edit size={13} /> Edit Task
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveTaskEdit}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all shadow-sm flex items-center gap-1.5 border-none cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle size={13} /> {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTask(false);
                      if (order) {
                        setTaskEditName(order.customerInfo?.name || '');
                        setTaskEditPhone(order.customerInfo?.phone || '');
                        setTaskEditNotes(order.notes || order.designNotes || order.marketing_notes || '');
                        setTaskEditUrgent(Boolean(order.isUrgent));
                        setTaskEditUrgentReason(order.urgentReason || order.details?.urgentReason || '');
                      }
                    }}
                    className="px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all border border-white/20 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
              {hasReturnedDesigns && onConvertTaskToOrder && !isEditingTask && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onConvertTaskToOrder(order);
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:opacity-95 text-white rounded-xl font-black uppercase tracking-wider text-[10px] transition-all shadow-md flex items-center gap-1.5 border-none cursor-pointer active:scale-95"
                  title="Convert this completed task into a full customer order"
                >
                  <Package size={13} />
                  <span>🛒 Convert to Order</span>
                </button>
              )}
              <button
                onClick={() => shareOrderToWhatsApp(order)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all shadow-sm flex items-center gap-1.5 border-none cursor-pointer"
                title="Share Task info to WhatsApp"
              >
                <MessageSquare size={13} /> WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all shadow-sm flex items-center gap-1.5 border-none cursor-pointer"
                title="Generate & Send Razorpay Payment Link (50% or 100%)"
              >
                <CreditCard size={13} /> Payment Link (50% / 100%)
              </button>
              {order.status !== OrderStatus.DESIGN && !isEditingTask && (
                <button
                  disabled={isProcessingAction}
                  onClick={() => {
                    if (hasReturnedDesigns) {
                      setShowTaskReworkPrompt(true);
                    } else {
                      handleDirectForward('design');
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-90 text-white rounded-xl font-black uppercase tracking-wider text-[10px] transition-all shadow-md flex items-center gap-1.5 border-none cursor-pointer disabled:opacity-50"
                  title={hasReturnedDesigns ? "Request changes and send back to Design Studio" : "Forward Task directly to Design Team"}
                >
                  {hasReturnedDesigns ? (
                    <>
                      <RefreshCw size={13} /> 🔁 Request Rework
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} /> 🚀 Send to Designs
                    </>
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors border-none bg-transparent cursor-pointer text-white"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[#f8f9fb]">
            
            {/* Grid layout: Left = Notes & Details, Right = Visual Artworks */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* 1. Design Instructions Card */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 flex items-center gap-1.5">
                      <FileText size={14} /> Design Instructions
                    </span>
                    <div className="flex items-center gap-2">
                      {!isEditingTask && (
                        <button
                          type="button"
                          onClick={() => setIsEditingTask(true)}
                          className="text-[10px] text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 cursor-pointer"
                        >
                          <Edit size={11} /> Edit
                        </button>
                      )}
                      <span className="text-[10px] text-gray-400 font-bold">
                        Marketing Desk
                      </span>
                    </div>
                  </div>
                  {isEditingTask ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                          Customer / Task Title
                        </label>
                        <input
                          type="text"
                          value={taskEditName}
                          onChange={e => setTaskEditName(e.target.value)}
                          placeholder="Customer or task title"
                          className="w-full text-xs font-bold border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">
                          Customer Phone
                        </label>
                        <input
                          type="text"
                          value={taskEditPhone}
                          onChange={e => setTaskEditPhone(e.target.value)}
                          placeholder="Phone number"
                          className="w-full text-xs border border-gray-200 rounded-xl p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-purple-700 tracking-wider mb-1">
                          Design Instructions & Notes
                        </label>
                        <textarea
                          rows={6}
                          value={taskEditNotes}
                          onChange={e => setTaskEditNotes(e.target.value)}
                          placeholder="Write detailed design requirements..."
                          className="w-full text-xs border border-purple-200 rounded-xl p-3 bg-purple-50/30 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="task-urgent-edit"
                          checked={taskEditUrgent}
                          onChange={e => setTaskEditUrgent(e.target.checked)}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="task-urgent-edit" className="text-xs font-bold text-rose-600 cursor-pointer">
                          🔥 Mark as Urgent Priority
                        </label>
                      </div>
                      {taskEditUrgent && (
                        <div>
                          <input
                            type="text"
                            value={taskEditUrgentReason}
                            onChange={e => setTaskEditUrgentReason(e.target.value)}
                            placeholder="Reason for urgency"
                            className="w-full text-xs border border-rose-200 rounded-xl p-2 bg-rose-50/40 focus:bg-white"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={handleSaveTaskEdit}
                          className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-none shadow-sm disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : '✓ Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingTask(false);
                            if (order) {
                              setTaskEditName(order.customerInfo?.name || '');
                              setTaskEditPhone(order.customerInfo?.phone || '');
                              setTaskEditNotes(order.notes || order.designNotes || order.marketing_notes || '');
                              setTaskEditUrgent(Boolean(order.isUrgent));
                              setTaskEditUrgentReason(order.urgentReason || order.details?.urgentReason || '');
                            }
                          }}
                          className="px-4 py-2 bg-gray-150 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer border-none"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-purple-50/40 p-3.5 rounded-xl border border-purple-100 text-xs text-gray-800 font-medium whitespace-pre-wrap leading-relaxed">
                        {order.notes || order.designNotes || order.marketing_notes || 'No written instructions provided.'}
                      </div>

                      {order.voiceNote && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                            <Mic size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800">Voice Instructions Attached</p>
                            <p className="text-[10px] text-gray-500 truncate">{order.voiceNote}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 2. Designer Completion Notes & Returned Specs Card */}
                {hasReturnedDesigns && (
                  <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle size={14} /> Designer Output & Reasons
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold">
                        {order.assignedDesigner || order.claimedByName || 'Design Studio'}
                      </span>
                    </div>
                    <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 text-xs text-emerald-950 font-medium whitespace-pre-wrap leading-relaxed">
                      {order.reworkNotes || order.productionNotes || order.details?.notes || 'Artwork completed and returned to Marketing.'}
                    </div>
                    {order.designCompletedAt && (
                      <p className="text-[10px] text-gray-400 font-medium">
                        Completed at: {new Date(order.designCompletedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* 3. Task Status Card */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Design Studio Status</p>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${hasReturnedDesigns ? 'bg-emerald-500' : order.status === OrderStatus.DESIGN ? 'bg-purple-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="text-xs font-bold text-gray-800">
                      {hasReturnedDesigns
                        ? `Artwork Completed by ${order.assignedDesigner || order.claimedByName || 'Design Team'}`
                        : order.status === OrderStatus.DESIGN
                        ? `Claimed by ${order.assignedDesigner || order.claimedByName || 'Designer'} • 2-Hour SLA Timer Running`
                        : 'Waiting in Marketing Queue • Ready to Send to Design'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Right Column (7 Cols) - Full Quality Visuals */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Section A: Designer Completed Mockups & Returned Artwork (Full Quality) */}
                {hasReturnedDesigns && (
                  <div className="bg-white p-5 rounded-2xl border-2 border-emerald-300/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                          <Sparkles size={15} className="text-emerald-600" />
                          Designer Completed Artworks & Master Files
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                          Full Quality
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-semibold">Click to Zoom & Download</span>
                    </div>

                    {/* Returned Image Previews */}
                    {designerReturnedImages.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                        {designerReturnedImages.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={() => setViewingImage(img)}
                            className="group relative rounded-xl overflow-hidden border border-emerald-200 aspect-square bg-gray-50 cursor-pointer shadow-xs hover:shadow-md transition-all"
                          >
                            <img
                              src={img}
                              alt="Returned Artwork"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              style={{ imageRendering: 'high-quality' }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setViewingImage(img); }}
                                className="p-2 bg-white text-gray-900 rounded-xl hover:bg-purple-50 transition-colors border-none cursor-pointer"
                                title="Zoom Full Screen"
                              >
                                <ZoomIn size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); downloadFile(img, `Completed_Design_${idx + 1}.png`); }}
                                className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors border-none cursor-pointer"
                                title="Download Full Quality"
                              >
                                <Download size={15} />
                              </button>
                            </div>
                            <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              Mockup #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Master ZIP & Vector Files */}
                    {(designerMasterZip || designerMasterFilename) && (
                      <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between gap-3 mt-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <FolderOpen size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-emerald-950 truncate">
                              {designerMasterZipName || designerMasterFilename || 'Vector_Master_Files.zip'}
                            </p>
                            <p className="text-[10px] text-emerald-700 font-medium">CorelDraw / Illustrator / Master ZIP</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadFile(designerMasterZip || designerReturnedImages[0], designerMasterZipName || 'Master_Vector_Design.zip')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border-none cursor-pointer shrink-0"
                        >
                          <Download size={13} /> Download Vector
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Section B: Marketing Reference Images & Artworks (Full Quality) */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                        <Camera size={15} className="text-purple-600" />
                        Marketing Reference Artworks ({marketingImages.length})
                      </span>
                      <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                        Original Quality
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-semibold">Click to Zoom & Download</span>
                  </div>

                  {marketingImages.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                      {marketingImages.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setViewingImage(img)}
                          className="group relative rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-50 cursor-pointer shadow-xs hover:shadow-md transition-all"
                        >
                          <img
                            src={img}
                            alt="Marketing Reference"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            style={{ imageRendering: 'high-quality' }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setViewingImage(img); }}
                              className="p-2 bg-white text-gray-900 rounded-xl hover:bg-purple-50 transition-colors border-none cursor-pointer"
                              title="Zoom Full Screen"
                            >
                              <ZoomIn size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); downloadFile(img, `Reference_Artwork_${idx + 1}.png`); }}
                              className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors border-none cursor-pointer"
                              title="Download Full Quality"
                            >
                              <Download size={15} />
                            </button>
                          </div>
                          <span className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Reference #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-400 text-xs italic bg-gray-50 rounded-xl">
                      No reference images uploaded with this task.
                    </div>
                  )}

                  {/* PDF attachments if any */}
                  {marketingDocs.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Attachments</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {marketingDocs.map((doc, idx) => (
                          <div key={idx} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <FileText size={16} className="text-purple-600 shrink-0" />
                              <span className="text-xs font-bold text-gray-700 truncate">Document #{idx + 1}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadFile(doc, `Task_Document_${idx + 1}.pdf`)}
                              className="p-1 bg-white hover:bg-purple-100 text-purple-700 rounded border border-gray-200 cursor-pointer"
                              title="Download PDF"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 bg-white border-t border-gray-150 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-4 text-gray-500 text-xs">
              <span className="font-bold">Task: #{order.id}</span>
              <span>•</span>
              <span className="font-bold">{order.customerInfo?.name}</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
              {!isEditingTask ? (
                <button
                  type="button"
                  onClick={() => setIsEditingTask(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-xs"
                  title="Edit Task Details & Instructions"
                >
                  <Edit size={14} /> Edit Task
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveTaskEdit}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <CheckCircle size={14} /> {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
              {onEdit && !isEditingTask && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(order);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-xs"
                  title="Open in full form editor"
                >
                  <Edit size={14} /> Edit Form
                </button>
              )}
              {hasReturnedDesigns && onConvertTaskToOrder && !isEditingTask && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onConvertTaskToOrder(order);
                  }}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:opacity-95 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-md active:scale-95"
                  title="Convert this completed task into a full customer order"
                >
                  <Package size={14} />
                  <span>🛒 Convert to Order</span>
                </button>
              )}
              {hasReturnedDesigns && !isEditingTask && (
                <button
                  type="button"
                  onClick={() => setShowTaskReworkPrompt(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-xs"
                  title="Request changes and send back to Design Studio"
                >
                  <RefreshCw size={14} /> Request Changes / Rework
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:opacity-95 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-md active:scale-95"
                title="Generate & Send Razorpay Payment Link (50% or 100%)"
              >
                <CreditCard size={14} /> 💳 Payment Link (50% / 100%)
              </button>
              <button
                type="button"
                onClick={downloadAllAssets}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 border-none cursor-pointer"
              >
                <Download size={14} /> Download All Assets
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors border-none cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>

          {/* Task Rework Prompt */}
          {showTaskReworkPrompt && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[150] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 text-left">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                      <RefreshCw size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Request Design Rework / Changes</h4>
                      <p className="text-[10px] text-gray-500 font-semibold">Specify exact modifications needed by the designer</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowTaskReworkPrompt(false);
                      setTaskReworkError('');
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 border-none bg-transparent cursor-pointer transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block">
                      Mandatory Rework Reason & Corrections:
                    </label>
                    <span className={cn(
                      "text-[10px] font-bold",
                      taskReworkReason.trim().length >= 5 ? "text-emerald-600" : "text-gray-400"
                    )}>
                      {taskReworkReason.trim().length}/5 min chars
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={taskReworkReason}
                    onChange={(e) => {
                      setTaskReworkReason(e.target.value);
                      if (taskReworkError && e.target.value.trim().length >= 5) {
                        setTaskReworkError('');
                      }
                    }}
                    placeholder="Enter clear, actionable rework reasons (e.g., Please change the front pocket embroidery size to 3 inches and adjust the neckline color to dark maroon)..."
                    className={cn(
                      "w-full p-3.5 bg-gray-50 border rounded-2xl text-xs text-gray-800 placeholder:text-gray-400 outline-none transition-all resize-none font-medium leading-relaxed",
                      taskReworkError
                        ? "border-red-400 bg-red-50/30 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-200"
                        : "border-gray-200 focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-200"
                    )}
                    autoFocus
                  />
                  {taskReworkError && (
                    <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-1 animate-in fade-in">
                      <AlertCircle size={13} className="shrink-0" />
                      {taskReworkError}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 font-medium italic">
                    ⚠️ A valid explanation is mandatory to ensure designers have clear instructions to revise this artwork.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTaskReworkPrompt(false);
                      setTaskReworkError('');
                    }}
                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs rounded-xl uppercase tracking-wider border-none cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingAction || taskReworkReason.trim().length < 5}
                    onClick={handleTaskReworkSubmit}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:opacity-95 text-white font-black text-xs rounded-xl uppercase tracking-wider border-none cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
                  >
                    {isProcessingAction ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={13} />
                        <span>Submit Rework Request</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewingImage && (
            <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`DesignTask_${order.id}`} />
          )}
        </motion.div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-t-[2rem] sm:rounded-[40px] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col"
      >
        <div className="p-4 sm:p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex flex-col">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h3 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tighter">Order Details</h3>
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest ${getStatusStyles(order.status)}`}>
                  {String(order.status || '').replace('_', ' ')}
                </span>
                {order.isUrgent && (
                  <span 
                    title={order.urgentReason || order.details?.urgentReason ? `Urgent Reason: ${order.urgentReason || order.details?.urgentReason}` : 'Marked Urgent'}
                    className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-lg animate-pulse uppercase flex items-center gap-1"
                  >
                    ⚡ URGENT
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {order.assignedDesigner && order.assignedDesigner !== 'Unassigned' && order.assignedDesigner !== 'Designer assigned' ? (
                  <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 uppercase tracking-wider">
                    🎨 Designer: {order.assignedDesigner}
                  </span>
                ) : (
                  <span className="bg-gray-50 text-gray-400 border border-gray-200 text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 uppercase tracking-wider">
                    🎨 Designer: Unassigned
                  </span>
                )}
                {(order.urgentReason || order.details?.urgentReason) && (
                  <span className="bg-red-50 text-red-750 border border-red-200 text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 uppercase tracking-wider">
                    ⚡ Urgent: {order.urgentReason || order.details?.urgentReason}
                  </span>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">ID: #</span>
                <input
                  type="text"
                  className="px-2 py-0.5 bg-white border border-gray-300 rounded font-mono text-xs text-gray-800 font-bold outline-none focus:border-purple-500"
                  value={editedOrder.id}
                  onChange={e => setEditedOrder({ ...editedOrder, id: e.target.value })}
                />
              </div>
            ) : (
              <span className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-widest">Access Protocol - ID: #{order.id}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {!isEditing && (
              <>
                <button
                  onClick={() => shareOrderToWhatsApp(order)}
                  className="px-4 sm:px-5 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-md flex items-center gap-1.5 cursor-pointer border-none"
                  title="Share Order to WhatsApp"
                >
                  <MessageSquare size={14} /> WhatsApp
                </button>
                {order.status !== OrderStatus.DESIGN && (
                  <button
                    disabled={isProcessingAction}
                    onClick={() => handleDirectForward('design')}
                    className="px-4 sm:px-5 py-2.5 sm:py-3 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-purple-700 transition-all shadow-md flex items-center gap-1.5 cursor-pointer border-none disabled:opacity-50"
                    title="Send Order directly to Design Studio"
                  >
                    <Sparkles size={13} /> Send to Designs
                  </button>
                )}
                {order.status !== OrderStatus.ACCOUNTS && (
                  <button
                    disabled={isProcessingAction}
                    onClick={() => handleDirectForward('accounts')}
                    className="px-4 sm:px-5 py-2.5 sm:py-3 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-600 transition-all shadow-md flex items-center gap-1.5 cursor-pointer border-none disabled:opacity-50"
                    title="Send Order directly to Accounts Queue"
                  >
                    <CheckCircle size={13} /> Send to Accounts
                  </button>
                )}
                {onUpdateOrder && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-brand-primary/90 transition-all shadow-md cursor-pointer border-none"
                  >
                    Edit Details
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(order);
                    }}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-800 transition-all shadow-md cursor-pointer border-none"
                  >
                    Edit Order Form
                  </button>
                )}
              </>
            )}
            {isEditing && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={isSaving}
                  onClick={() => handleSave()}
                  className="px-4 py-2.5 bg-green-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-green-700 transition-all shadow-md flex items-center gap-1.5 border-none cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : '✓ Save Only'}
                </button>
                <button
                  disabled={isSaving}
                  onClick={() => handleSave('design')}
                  className="px-4 py-2.5 bg-purple-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-purple-700 transition-all shadow-md flex items-center gap-1.5 border-none cursor-pointer disabled:opacity-50"
                  title="Save all changes and immediately forward to Designs Queue"
                >
                  <Sparkles size={13} /> Save & Send to Designs
                </button>
                <button
                  disabled={isSaving}
                  onClick={() => handleSave('accounts')}
                  className="px-4 py-2.5 bg-amber-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-600 transition-all shadow-md flex items-center gap-1.5 border-none cursor-pointer disabled:opacity-50"
                  title="Save all changes and immediately forward to Accounts Queue"
                >
                  <CheckCircle size={13} /> Save & Send to Accounts
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditedOrder(order); }}
                  className="px-3.5 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-300 transition-all border-none cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-3 hover:bg-white rounded-2xl shadow-sm border border-transparent hover:border-gray-100 transition-all text-gray-400 hover:text-gray-900 cursor-pointer"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-8 flex flex-col gap-4 sm:gap-8 overflow-y-auto flex-grow">
          <WorkflowVisualizer order={order} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                <div className="bg-gray-50/50 p-4 sm:p-6 rounded-[20px] sm:rounded-[32px] border border-gray-100/50 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Customer Contact</p>
                  <div className="space-y-3">
                    {isEditing ? (
                      <>
                        <input
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm"
                          value={editedOrder.customerInfo.name}
                          onChange={e => setEditedOrder({ ...editedOrder, customerInfo: { ...editedOrder.customerInfo, name: e.target.value } })}
                          placeholder="Customer Name"
                        />
                        <input
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm"
                          value={editedOrder.customerInfo.phone}
                          onChange={e => setEditedOrder({ ...editedOrder, customerInfo: { ...editedOrder.customerInfo, phone: e.target.value } })}
                          placeholder="Phone"
                        />
                        <textarea
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs"
                          value={editedOrder.customerInfo.address}
                          onChange={e => setEditedOrder({ ...editedOrder, customerInfo: { ...editedOrder.customerInfo, address: e.target.value } })}
                          placeholder="Address"
                          rows={2}
                        />
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 text-gray-900 font-bold">
                          <User size={18} className="text-brand-primary" />
                          {order.customerInfo.name}
                        </div>
                        <div className="flex items-center gap-3 text-gray-500 text-sm font-medium">
                          <Phone size={18} className="text-brand-primary/60" />
                          {order.customerInfo.phone}
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.customerInfo.address || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-3 text-gray-700 hover:text-red-600 text-xs mt-2 font-medium leading-relaxed no-underline cursor-pointer group"
                          title="Click to open location in Google Maps"
                        >
                          <MapPin size={18} className="text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
                          <span className="group-hover:underline">{order.customerInfo.address || 'No address specified'}</span>
                          <ExternalLink size={12} className="text-gray-400 shrink-0 mt-0.5" />
                        </a>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-brand-primary/5 p-6 rounded-[32px] border border-brand-primary/10 shadow-sm flex flex-col justify-between">
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-2">Billing Data</p>
                  <div className="space-y-4">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase">Grand Total (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-black text-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                            value={editedOrder.financials?.totalAmount ? editedOrder.financials.totalAmount : ''}
                            onChange={e => {
                              const total = e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0);
                              const adv = editedOrder.financials?.advancePay || 0;
                              setEditedOrder({
                                ...editedOrder,
                                financials: {
                                  ...editedOrder.financials,
                                  totalAmount: total,
                                  balanceAmount: Math.max(0, total - adv)
                                }
                              });
                            }}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase">Advance Paid (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-sm text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                            value={editedOrder.financials?.advancePay ? editedOrder.financials.advancePay : ''}
                            onChange={e => {
                              const adv = e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0);
                              const total = editedOrder.financials?.totalAmount || 0;
                              setEditedOrder({
                                ...editedOrder,
                                financials: {
                                  ...editedOrder.financials,
                                  advancePay: adv,
                                  balanceAmount: Math.max(0, total - adv)
                                }
                              });
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-end">
                          <div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase block">Grand Total</span>
                            {(order.financials?.totalAmount || 0) === 0 && (
                              <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                                Amount Not Inserted
                              </span>
                            )}
                          </div>
                          <span className="text-2xl font-black text-gray-900">
                            {(order.financials?.totalAmount || 0) > 0 ? `₹${(order.financials?.totalAmount || 0).toLocaleString()}` : '₹0'}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {(order.financials?.deliveryAmount || 0) > 0 && (
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-gray-500">Delivery Charges</span>
                              <span className="font-black text-gray-900">
                                ₹{(order.financials?.deliveryAmount || 0).toLocaleString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-green-600">Paid Amount</span>
                            <span className="font-black text-gray-900">
                              {(order.financials?.advancePay || 0) > 0 ? `₹${(order.financials?.advancePay || 0).toLocaleString()}` : '₹0'}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-red-600">Pending Pay</span>
                            <span className="font-black text-gray-900">
                              {(order.financials?.balanceAmount || 0) > 0 ? `₹${(order.financials?.balanceAmount || 0).toLocaleString()}` : '₹0'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowPaymentModal(true)}
                          className="w-full mt-3 py-2.5 px-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:opacity-95 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md border-none cursor-pointer transition-all active:scale-98"
                        >
                          <CreditCard size={14} /> Send Payment Link (50% / 100%)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-[32px] shadow-sm p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Itemised Breakdown</p>
                  <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {isEditing ? (
                      editedOrder.sizeBreakdown?.reduce((sum, i) => sum + i.quantity, 0) || editedOrder.quantity || 0
                    ) : (
                      order.sizeBreakdown?.reduce((sum, i) => sum + i.quantity, 0) || order.quantity || 0
                    )} Total Units
                  </span>
                </div>
                <div className="space-y-3">
                  {isEditing ? (
                    editedOrder.sizeBreakdown?.length ? (
                      editedOrder.sizeBreakdown.map((item, idx) => (
                        <div key={idx} className="p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-gray-200 space-y-3 shadow-sm">
                          <div className="flex justify-between items-center gap-2">
                            <input
                              type="text"
                              className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-black text-brand-primary uppercase"
                              value={item.category || ''}
                              onChange={e => {
                                const updated = [...editedOrder.sizeBreakdown];
                                updated[idx] = { ...updated[idx], category: e.target.value };
                                setEditedOrder({ ...editedOrder, sizeBreakdown: updated });
                              }}
                              placeholder="Category"
                            />
                            <input
                              type="text"
                              className="w-20 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-center"
                              value={item.size}
                              onChange={e => {
                                const updated = [...editedOrder.sizeBreakdown];
                                updated[idx] = { ...updated[idx], size: e.target.value };
                                setEditedOrder({ ...editedOrder, sizeBreakdown: updated });
                              }}
                              placeholder="Size"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase">Quantity</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                                value={item.quantity || ''}
                                onChange={e => {
                                  const qty = e.target.value === '' ? 0 : (parseInt(e.target.value, 10) || 0);
                                  const updated = [...editedOrder.sizeBreakdown];
                                  updated[idx] = { ...updated[idx], quantity: qty };
                                  const newQty = updated.reduce((sum, i) => sum + i.quantity, 0);
                                  const newTotal = Math.round(updated.reduce((sum, i) => {
                                    const base = i.quantity * (i.price || 0);
                                    const itemIncl = (i as any).gstType === 'inclusive' || (editedOrder.financials as any)?.gstType === 'inclusive';
                                    const gst = itemIncl ? 0 : Math.round((base * (i.gstRate || 0)) / 100);
                                    return sum + base + gst;
                                  }, 0));
                                  setEditedOrder({
                                    ...editedOrder,
                                    sizeBreakdown: updated,
                                    quantity: newQty,
                                    financials: {
                                      ...editedOrder.financials,
                                      totalAmount: newTotal > 0 ? newTotal : editedOrder.financials?.totalAmount || 0,
                                      balanceAmount: Math.max(0, (newTotal > 0 ? newTotal : editedOrder.financials?.totalAmount || 0) - (editedOrder.financials?.advancePay || 0))
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-gray-400 uppercase">Rate (₹)</label>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0"
                                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-brand-primary"
                                value={item.price || ''}
                                onChange={e => {
                                  const rate = e.target.value === '' ? 0 : (parseFloat(e.target.value) || 0);
                                  const updated = [...editedOrder.sizeBreakdown];
                                  updated[idx] = { ...updated[idx], price: rate };
                                  const newTotal = Math.round(updated.reduce((sum, i) => {
                                    const base = i.quantity * (i.price || 0);
                                    const itemIncl = (i as any).gstType === 'inclusive' || (editedOrder.financials as any)?.gstType === 'inclusive';
                                    const gst = itemIncl ? 0 : Math.round((base * (i.gstRate || 0)) / 100);
                                    return sum + base + gst;
                                  }, 0));
                                  setEditedOrder({
                                    ...editedOrder,
                                    sizeBreakdown: updated,
                                    financials: {
                                      ...editedOrder.financials,
                                      totalAmount: newTotal > 0 ? newTotal : editedOrder.financials?.totalAmount || 0,
                                      balanceAmount: Math.max(0, (newTotal > 0 ? newTotal : editedOrder.financials?.totalAmount || 0) - (editedOrder.financials?.advancePay || 0))
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[8px]">
                            <div>
                              <label className="text-[8px] text-gray-400 block mb-0.5">Material</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                                value={item.material || ''}
                                onChange={e => {
                                  const updated = [...editedOrder.sizeBreakdown];
                                  updated[idx] = { ...updated[idx], material: e.target.value };
                                  setEditedOrder({ ...editedOrder, sizeBreakdown: updated });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-[8px] text-gray-400 block mb-0.5">Colour</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                                value={item.colour || ''}
                                onChange={e => {
                                  const updated = [...editedOrder.sizeBreakdown];
                                  updated[idx] = { ...updated[idx], colour: e.target.value };
                                  setEditedOrder({ ...editedOrder, sizeBreakdown: updated });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-[8px] text-gray-400 block mb-0.5">Print</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                                value={item.printType || ''}
                                onChange={e => {
                                  const updated = [...editedOrder.sizeBreakdown];
                                  updated[idx] = { ...updated[idx], printType: e.target.value };
                                  setEditedOrder({ ...editedOrder, sizeBreakdown: updated });
                                }}
                              />
                            </div>
                            <div>
                              <label className="text-[8px] text-gray-400 block mb-0.5">Model</label>
                              <input
                                type="text"
                                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                                value={item.model || ''}
                                onChange={e => {
                                  const updated = [...editedOrder.sizeBreakdown];
                                  updated[idx] = { ...updated[idx], model: e.target.value };
                                  setEditedOrder({ ...editedOrder, sizeBreakdown: updated });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400 italic text-xs bg-gray-50 rounded-[24px]">
                        No specific size breakdown available to edit.
                      </div>
                    )
                  ) : (
                    order.sizeBreakdown?.length ? (
                      order.sizeBreakdown.map((item, idx) => (
                        <div key={idx} className="p-3 sm:p-4 bg-gray-50/50 rounded-xl sm:rounded-2xl border border-gray-100 hover:border-brand-primary/20 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-black text-brand-primary uppercase tracking-tight">{item.category}</span>
                            <span className="text-xs font-black text-gray-900 bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">{item.size}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            {item.material && <div><span className="text-[8px] text-gray-400 block mb-0.5">Material</span>{item.material}</div>}
                            {item.colour && <div><span className="text-[8px] text-gray-400 block mb-0.5">Colour</span>{item.colour}</div>}
                            {item.printType && <div><span className="text-[8px] text-gray-400 block mb-0.5">Print</span>{item.printType}</div>}
                            {item.model && <div><span className="text-[8px] text-gray-400 block mb-0.5">Model</span>{item.model}</div>}
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-end">
                            {(() => {
                              const rawLine = item.quantity * (item.price || 0);
                              const isIncl = (item as any).gstType === 'inclusive' || (order.financials as any)?.gstType === 'inclusive' || (order.details as any)?.gstType === 'inclusive';
                              const lineGst = isIncl
                                ? ((item.gstRate || 0) > 0 ? Math.round((rawLine * (item.gstRate || 0)) / (100 + (item.gstRate || 0))) : 0)
                                : Math.round((rawLine * (item.gstRate || 0)) / 100);
                              const lineTotal = isIncl ? rawLine : (rawLine + lineGst);
                              return (
                                <>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black text-gray-900">Qty: {item.quantity}</span>
                                    <span className="text-[10px] font-black text-brand-primary">Rate: ₹{Math.round(item.price || 0)}</span>
                                    {(item.gstRate || 0) > 0 && (
                                      <span className={cn(
                                        "text-[9px] font-black px-1.5 py-0.5 rounded border",
                                        isIncl ? "text-indigo-700 bg-indigo-50 border-indigo-200" : "text-emerald-700 bg-emerald-50 border-emerald-200"
                                      )}>
                                        GST: {item.gstRate}% ({isIncl ? `₹${lineGst.toLocaleString()} incl.` : `+₹${lineGst.toLocaleString()}`})
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-black text-gray-900">
                                    Total: ₹{lineTotal.toLocaleString()}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400 italic text-xs bg-gray-50 rounded-[24px]">
                        No specific size breakdown available for this record.
                      </div>
                    )
                  )}
                </div>
              </div>

            </div>

            <div className="space-y-6">
              <div className="bg-gray-50/50 p-4 sm:p-6 rounded-[20px] sm:rounded-[32px] border border-gray-100/50 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Visual Evidence</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Pictures</p>
                    <div className="flex flex-wrap gap-2">
                      {order.marketing_image && (
                        <div
                          onClick={() => setViewingImage(order.marketing_image)}
                          className="w-16 h-16 rounded-xl border border-brand-primary/30 shadow-sm overflow-hidden cursor-pointer hover:scale-105 transition-all relative group shrink-0"
                          title="Marketing Reference Image"
                        >
                          <img src={order.marketing_image} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-brand-primary/80 text-[7px] text-white text-center font-black uppercase py-0.5">Marketing</span>
                        </div>
                      )}
                      {order.staffImages?.map((img, i) => {
                        if (img === order.marketing_image) return null;
                        return (
                          <div
                            key={i}
                            onClick={() => setViewingImage(img)}
                            className="w-16 h-16 rounded-xl border border-white shadow-sm overflow-hidden cursor-pointer hover:scale-105 transition-all shrink-0"
                          >
                            <img src={img} className="w-full h-full object-cover" />
                          </div>
                        );
                      })}
                      {!order.staffImages?.length && !order.marketing_image && <span className="text-[10px] text-gray-300 italic">None</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Documents</p>
                    <div className="flex flex-wrap gap-2">
                      {order.staffPdfs?.map((pdf, i) => (
                        <div
                          key={i}
                          onClick={() => setViewingImage(pdf)}
                          className="w-16 h-16 rounded-xl bg-white border border-gray-100 flex items-center justify-center cursor-pointer hover:shadow-md transition-all text-gray-400 hover:text-brand-primary"
                          title="Staff PDF"
                        >
                          <FileText size={24} />
                        </div>
                      ))}
                      {!order.staffPdfs?.length && <span className="text-[10px] text-gray-300 italic">None</span>}
                    </div>
                  </div>

                  {/* Production Finished Goods & QC Photos */}
                  {((order.details?.productionImages && order.details.productionImages.length > 0) ||
                    (order.details?.finishedGarmentImages && order.details.finishedGarmentImages.length > 0)) && (
                    <div className="space-y-3 bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 shadow-xs">
                      <div className="flex items-center justify-between">
                        <p className="text-[10.5px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
                          <Factory size={14} className="text-indigo-600" />
                          🏭 Production Output & Finished Garment Photos
                        </p>
                        <span className="text-[9px] font-black bg-indigo-200/80 text-indigo-900 px-2.5 py-0.5 rounded-full">
                          Manufactured
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {Array.from(new Set([
                          ...(order.details?.productionImages || []),
                          ...(order.details?.finishedGarmentImages || [])
                        ])).map((img, i) => (
                          <div
                            key={i}
                            onClick={() => setViewingImage(img)}
                            className="w-20 h-20 rounded-xl border-2 border-indigo-300 shadow-sm overflow-hidden cursor-pointer hover:scale-105 transition-all relative group shrink-0 bg-white"
                            title="Click to view full finished garment photo"
                          >
                            <img src={img} alt="Finished Garment" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn size={16} />
                            </div>
                            <span className="absolute bottom-0 inset-x-0 bg-indigo-700/90 text-[7.5px] text-white text-center font-bold uppercase py-0.5">
                              QC Finished
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dispatch & Courier Proof Photos (Proof of Delivery / Dispatch) */}
                  {((order.details?.dispatchImages && order.details.dispatchImages.length > 0) ||
                    (order.details?.courierImages && order.details.courierImages.length > 0) ||
                    (order.orderManagementAttachments && order.orderManagementAttachments.length > 0)) && (
                    <div className="space-y-3 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
                      <div className="flex items-center justify-between">
                        <p className="text-[10.5px] font-black text-emerald-900 uppercase tracking-widest flex items-center gap-1.5">
                          <Truck size={14} className="text-emerald-600" />
                          Dispatch & Courier Photos (Proof of Dispatch)
                        </p>
                        <span className="text-[9px] font-black bg-emerald-200/80 text-emerald-900 px-2.5 py-0.5 rounded-full">
                          {order.details?.courierName || 'Dispatched'}
                        </span>
                      </div>

                      {order.details?.trackingNumber && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-100">
                          <span className="text-gray-400 text-[10px] uppercase">Tracking ID:</span>
                          <span className="font-mono text-emerald-800 font-black">{order.details.trackingNumber}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2.5">
                        {Array.from(new Set([
                          ...(order.details?.dispatchImages || []),
                          ...(order.details?.courierImages || []),
                          ...(order.orderManagementAttachments || [])
                        ])).map((img, i) => (
                          <div
                            key={i}
                            onClick={() => setViewingImage(img)}
                            className="w-20 h-20 rounded-xl border-2 border-emerald-300 shadow-sm overflow-hidden cursor-pointer hover:scale-105 transition-all relative group shrink-0 bg-white"
                            title="Click to view full dispatch photo"
                          >
                            <img src={img} alt="Courier Proof" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <ZoomIn size={16} />
                            </div>
                            <span className="absolute bottom-0 inset-x-0 bg-emerald-700/90 text-[7.5px] text-white text-center font-bold uppercase py-0.5">
                              Dispatch Proof
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Original Design Assets (PNG & ZIP) */}
                  {(order.original_design_file || order.original_design_zip || (order.designAttachments && order.designAttachments.length > 0)) && (
                    <div className="space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-150">
                      <div className="flex items-center justify-between">
                        <p className="text-[10.5px] font-black text-purple-900 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles size={13} className="text-purple-600" />
                          Design Deliverables & Original Files
                        </p>
                        <span className="text-[9px] font-black bg-purple-200/60 text-purple-800 px-2 py-0.5 rounded-full">
                          Original Quality
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. Original Quality Design PNG */}
                        {order.original_design_file && (
                          <div className="bg-white p-3 rounded-xl border border-purple-200 flex items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                onClick={() => setViewingImage(order.original_design_file!)}
                                className="w-12 h-12 rounded-lg overflow-hidden border border-purple-100 bg-gray-50 cursor-pointer relative group shrink-0"
                                title="Click to view full original image"
                              >
                                <img src={order.original_design_file} alt="Original PNG" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <ZoomIn size={14} />
                                </div>
                              </div>
                              <div className="text-left min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate" title={order.original_design_filename || 'Original Design Image'}>
                                  {order.original_design_filename || 'Original_Design.png'}
                                </p>
                                <span className="text-[9.5px] text-purple-700 font-extrabold flex items-center gap-1">
                                  ✨ 100% Original PNG
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadFile(order.original_design_file, order.original_design_filename || `Design_Original_${order.id.slice(-6)}.png`)}
                              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 shadow-xs cursor-pointer border-none shrink-0"
                              title="Download Original Quality PNG"
                            >
                              <Download size={11} />
                              Download
                            </button>
                          </div>
                        )}

                        {/* 2. Original Design ZIP Package */}
                        {order.original_design_zip && (
                          <div className="bg-white p-3 rounded-xl border border-indigo-200 flex items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-2.5 min-w-0 text-left">
                              <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                <FolderOpen size={22} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate" title={order.original_design_zip_filename || 'Design_Package.zip'}>
                                  {order.original_design_zip_filename || 'Design_Package.zip'}
                                </p>
                                <span className="text-[9.5px] text-indigo-700 font-extrabold flex items-center gap-1">
                                  📦 Design ZIP Archive
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadFile(order.original_design_zip, order.original_design_zip_filename || `Design_Package_${order.id.slice(-6)}.zip`)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 shadow-xs cursor-pointer border-none shrink-0"
                              title="Download Design ZIP Package"
                            >
                              <Download size={11} />
                              Download
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 3. Additional Vector Deliverables / PDFs */}
                      {order.designAttachments && order.designAttachments.length > 0 && (
                        <div className="pt-2 border-t border-purple-100">
                          <p className="text-[9.5px] font-bold text-purple-700 uppercase tracking-wide mb-2">Additional Tracing / PDF Files ({order.designAttachments.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {order.designAttachments.map((file, i) => {
                              const isImage = file.startsWith('data:image/') || file.includes('image/');
                              return (
                                <div key={i} className="flex items-center gap-2 p-1.5 bg-white rounded-xl border border-purple-150">
                                  <div
                                    onClick={() => setViewingImage(file)}
                                    className="w-8 h-8 rounded-lg overflow-hidden relative bg-gray-50 flex items-center justify-center cursor-pointer border border-purple-100"
                                  >
                                    {isImage ? (
                                      <img src={file} className="w-full h-full object-cover" />
                                    ) : (
                                      <FileText size={16} className="text-purple-600" />
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => downloadFile(file, `Deliverable_${i + 1}_Order_${order.id.slice(-6)}${isImage ? '.png' : '.pdf'}`)}
                                    className="px-2 py-1 bg-gray-100 hover:bg-purple-100 text-purple-700 rounded text-[9.5px] font-bold uppercase transition-all flex items-center gap-1 border-none cursor-pointer"
                                  >
                                    <Download size={10} />
                                    File #{i + 1}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isEditing ? (
                    <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 text-left">
                      <div>
                        <label className="text-[9px] font-black text-purple-700 uppercase tracking-wider block mb-1">
                          Marketing / Design Notes
                        </label>
                        <textarea
                          rows={2}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono"
                          value={editedOrder.notes || ''}
                          onChange={e => setEditedOrder({ ...editedOrder, notes: e.target.value, designNotes: e.target.value })}
                          placeholder="Client / Design Notes..."
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-indigo-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
                          <Factory size={11} /> 🏭 Production Notes (Factory Floor)
                        </label>
                        <textarea
                          rows={2}
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono"
                          value={editedOrder.productionNotes || ''}
                          onChange={e => setEditedOrder({ ...editedOrder, productionNotes: e.target.value })}
                          placeholder="Production floor instructions..."
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {order.productionNotes && (
                        <div className="mt-4 p-4 bg-indigo-50/70 rounded-2xl border border-indigo-150 text-left">
                          <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest block mb-1 flex items-center gap-1.5">
                            <Factory size={12} className="text-indigo-600" />
                            🏭 Production Floor Notes
                          </span>
                          <p className="text-xs font-semibold text-indigo-950 whitespace-pre-line leading-relaxed">
                            "{order.productionNotes}"
                          </p>
                        </div>
                      )}
                      {(order.notes || order.designNotes) && (
                        <div className="mt-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-100 text-left">
                          <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest block mb-1">Marketing / Design Notes</span>
                          <p className="text-xs font-semibold text-purple-900 whitespace-pre-line">"{order.notes || order.designNotes}"</p>
                        </div>
                      )}
                    </>
                  )}
                  {order.voiceNote && (
                    <div className="mt-4 p-4 bg-purple-50/80 rounded-2xl border border-purple-200 text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] font-black text-purple-800 uppercase tracking-widest flex items-center gap-1.5">
                          <Mic size={14} className="text-purple-600 animate-pulse" />
                          🎙️ Client Voice Instructions
                        </span>
                        <span className="text-[8px] font-black bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                          Audio Note
                        </span>
                      </div>
                      <audio controls src={order.voiceNote} className="w-full h-8 rounded-xl bg-white p-0.5 outline-none shadow-2xs" />
                    </div>
                  )}
                  {order.accountsNotes && (
                    <div className="mt-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 text-left">
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block mb-1">Accounts Notes</span>
                      <p className="text-xs font-semibold text-amber-900 italic">"{order.accountsNotes}"</p>
                    </div>
                  )}
                  {order.machineFiles?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase mb-2">Stitch Files (Garage ZIP)</p>
                      <div className="flex flex-wrap gap-2">
                        {order.machineFiles.map((file, i) => (
                          <div
                            key={i}
                            onClick={() => downloadFile(file, `Stitch_Garage_File_${i + 1}_Order_${order.id}.zip`)}
                            className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-150 flex items-center gap-2 cursor-pointer hover:bg-indigo-100 hover:shadow-xs transition-all text-indigo-700"
                            title="Download Stitch Garage ZIP File"
                          >
                            <FolderOpen size={16} className="text-indigo-600" />
                            <span className="text-xs font-mono font-bold">Stitch_Garage_{i + 1}.zip</span>
                            <Download size={14} className="text-indigo-600 ml-1" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {order.accountsAttachments?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-amber-500 uppercase mb-2">Billing Docs</p>
                      <div className="flex flex-wrap gap-2">
                        {order.accountsAttachments.map((file, i) => (
                          <div
                            key={i}
                            onClick={() => setViewingImage(file)}
                            className="w-16 h-16 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center cursor-pointer hover:shadow-md transition-all text-amber-500"
                          >
                            {file.startsWith('data:image/') ? <img src={file} className="w-full h-full object-cover rounded-xl" /> : <FileText size={24} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(onUpdateStatus || onUpdateOrder) && (
                <div className="bg-gray-900 p-6 rounded-[32px] shadow-xl text-white space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Management Actions</p>
                  <div className="grid grid-cols-1 gap-2">
                    {order.status === OrderStatus.HOLD ? (
                      <div className="space-y-3">
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                          <p className="text-[10px] font-black text-red-400 uppercase mb-1">Hold Reason</p>
                          <p className="text-sm font-bold text-red-700">{order.holdReason || 'No reason provided'}</p>
                        </div>
                        <button
                          disabled={isProcessingAction}
                          onClick={async () => {
                            const newStatus = order.previousStatus || OrderStatus.ACCOUNTS;
                            if (window.confirm(`Release order back to ${newStatus.replace('_', ' ')}?`)) {
                              setIsProcessingAction(true);
                              try {
                                if (onUpdateOrder) {
                                  await onUpdateOrder(order.id, {
                                    status: newStatus,
                                    previousStatus: undefined,
                                    updatedAt: Date.now()
                                  });
                                } else if (onUpdateStatus) {
                                  onUpdateStatus(newStatus);
                                }
                                alert("Order released successfully.");
                              } catch (e) {
                                alert("Failed to release order.");
                              } finally {
                                setIsProcessingAction(false);
                              }
                            }
                          }}
                          className="w-full py-3 bg-green-500/20 text-green-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <CheckCircle size={14} /> {isProcessingAction ? 'Processing...' : 'Release Order'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          disabled={isProcessingAction}
                          onClick={async () => {
                            const reason = window.prompt("Enter Mandatory Hold Reason:");
                            if (reason === null) return; // Cancelled
                            if (!reason.trim()) {
                              alert("Hold reason is required.");
                              return;
                            }

                            setIsProcessingAction(true);
                            try {
                              const newNote = `[HOLD] ${new Date().toLocaleString()}: ${reason}`;
                              const updatedNotes = order.notes ? `${order.notes}\n${newNote}` : newNote;

                              const updates = {
                                status: OrderStatus.HOLD,
                                holdReason: reason.trim(),
                                previousStatus: order.status,
                                notes: updatedNotes,
                                updatedAt: Date.now()
                              };

                              if (onUpdateOrder) {
                                await onUpdateOrder(order.id, updates);
                              } else if (onUpdateStatus) {
                                onUpdateStatus(OrderStatus.HOLD);
                              }
                              alert("Order put on HOLD.");
                            } catch (e) {
                              alert("Failed to put order on hold.");
                            } finally {
                              setIsProcessingAction(false);
                            }
                          }}
                          className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <AlertCircle size={14} /> {isProcessingAction ? 'Processing...' : 'Hold Order'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6 text-gray-400">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest">Timestamp</span>
              <span className="text-sm font-black text-gray-900">{new Date(order.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="w-px h-8 bg-gray-200 hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest">Agent</span>
              <span className="text-sm font-black text-gray-900">{(order.customerInfo?.name || 'Order').split(' ')[0]} Hub</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-10 py-4 bg-black text-white rounded-[24px] font-black uppercase tracking-[0.1em] text-xs hover:bg-gray-800 active:scale-95 transition-all shadow-xl"
          >
            Close Report
          </button>
        </div>

        {showPaymentModal && order && (
          <PaymentLinkModal order={order} onClose={() => setShowPaymentModal(false)} />
        )}

        {viewingImage && (
          <ImageViewer src={viewingImage} onClose={() => setViewingImage(null)} fileName={`Order_${order.id}`} />
        )}
      </motion.div>
    </div>,
    document.body
  );
}
