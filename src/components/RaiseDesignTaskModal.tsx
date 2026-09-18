/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Upload, Image as ImageIcon, FileText, Send, Sparkles,
  Loader2, Mic, CheckCircle2, AlertCircle, Trash2, Eye,
  Palette
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import ImageViewer from './ImageViewer';

interface RaiseDesignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: {
    title: string;
    notes: string;
    images: string[];
    pdfs: string[];
    voiceNote?: string;
    sendDirectlyToDesign: boolean;
  }) => Promise<void>;
  user?: any;
}

export default function RaiseDesignTaskModal({
  isOpen,
  onClose,
  onSubmit,
  user
}: RaiseDesignTaskModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [pdfs, setPdfs] = useState<string[]>([]);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  
  const [titleError, setTitleError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Voice simulation
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);
  const timerRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);

  const processImageFiles = async (files: File[]) => {
    if (files.length === 0) return;

    setNotesError(null);
    setIsCompressing(true);
    try {
      const compressedResults: string[] = [];
      for (const file of files) {
        let processed: File | Blob = file;
        try {
          processed = (await imageCompression(file as File, {
            maxSizeMB: 2.5,
            maxWidthOrHeight: 4000,
            initialQuality: 0.95,
            useWebWorker: true,
          })) as File | Blob;
        } catch {
          // fallback to original file if compression fails
        }
        const reader = new FileReader();
        await new Promise<void>((resolve) => {
          reader.onloadend = () => {
            if (reader.result) {
              compressedResults.push(reader.result as string);
            }
            resolve();
          };
          reader.readAsDataURL(processed as Blob);
        });
      }
      setImages(prev => [...prev, ...compressedResults]);
      setPasteFeedback(`✓ Attached ${compressedResults.length} image(s)!`);
      setTimeout(() => setPasteFeedback(null), 2500);
    } catch (err) {
      console.error('Error processing image:', err);
      setSubmitError('Failed to process image. Please try again.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    await processImageFiles(files);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files: File[] = Array.from(e.dataTransfer.files || []) as File[];
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const docFiles = files.filter(f => !f.type.startsWith('image/'));

    if (imageFiles.length > 0) {
      await processImageFiles(imageFiles);
    }
    if (docFiles.length > 0) {
      docFiles.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setPdfs(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file as Blob);
      });
      setPasteFeedback(`✓ Attached ${docFiles.length} document(s)!`);
      setTimeout(() => setPasteFeedback(null), 2500);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  // Clipboard paste listener (Ctrl+V)
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const pastedImageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) pastedImageFiles.push(file);
        }
      }

      if (pastedImageFiles.length > 0) {
        await processImageFiles(pastedImageFiles);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isOpen]);

  const handlePasteFromClipboardClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        const imageFiles: File[] = [];
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              imageFiles.push(new File([blob], 'pasted_artwork.png', { type }));
            }
          }
        }
        if (imageFiles.length > 0) {
          await processImageFiles(imageFiles);
          return;
        }
      }
      setPasteFeedback("💡 Press Ctrl+V anywhere in this window to paste your screenshot!");
      setTimeout(() => setPasteFeedback(null), 3000);
    } catch {
      setPasteFeedback("💡 Press Ctrl+V anywhere in this window to paste your screenshot!");
      setTimeout(() => setPasteFeedback(null), 3000);
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setPdfs(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file as Blob);
    });
    if (docInputRef.current) docInputRef.current.value = '';
    setPasteFeedback(`✓ Attached ${files.length} document(s)!`);
    setTimeout(() => setPasteFeedback(null), 2500);
  };

  const handleStartVoice = () => {
    setIsRecording(true);
    setRecordTimer(0);
    timerRef.current = setInterval(() => {
      setRecordTimer(prev => prev + 1);
    }, 1000);
  };

  const handleStopVoice = () => {
    clearInterval(timerRef.current);
    setIsRecording(false);
    setVoiceNote(`voice_instruction_${Date.now()}_${Math.max(1, recordTimer)}s`);
  };

  const handleSubmit = async (sendDirectlyToDesign: boolean) => {
    setTitleError(null);
    setNotesError(null);
    setSubmitError(null);

    let hasError = false;

    if (!title.trim()) {
      setTitleError('Task Title is required.');
      hasError = true;
    }
    if (!notes.trim() && images.length === 0) {
      setNotesError('Please enter design instructions or attach reference images.');
      hasError = true;
    }

    if (hasError) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        notes: notes.trim(),
        images,
        pdfs,
        voiceNote: voiceNote || undefined,
        sendDirectlyToDesign
      });
      onClose();
    } catch (error: any) {
      console.error('Failed to submit design task:', error);
      setSubmitError(error?.message || 'Failed to submit design task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-150 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-brand-primary text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-white shadow-xs">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight leading-tight flex items-center gap-2">
                <span>Raise Design Task</span>
                <span className="bg-white/20 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                  Design Hub
                </span>
              </h3>
              <p className="text-[11px] text-purple-100 font-medium">
                Upload sample artworks, fill design instructions, and forward to Design Team
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
          
          {/* Submit Error Alert if any */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 font-semibold animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{submitError}</span>
            </div>
          )}

          {/* 1. Task Title */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Royal Club Jersey Design, Custom Polo Logo Mockup"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              className={`w-full bg-[#f8f9fb] border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 placeholder:text-gray-400 outline-none transition-all shadow-xs ${
                titleError ? 'border-red-500 bg-red-50/20 focus:border-red-600' : 'border-gray-200 focus:border-purple-600 focus:bg-white'
              }`}
              autoFocus
            />
            {titleError && (
              <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle size={12} /> {titleError}
              </p>
            )}
          </div>

          {/* 2. Reference Image Uploads */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <span>Sample Images & Logo References</span>
                {pasteFeedback && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md animate-in fade-in">
                    {pasteFeedback}
                  </span>
                )}
              </label>
              <span className="text-[10px] text-gray-400 font-normal">Supports JPEG, PNG, WEBP, PDF</span>
            </div>

            {/* Drop Zone with Drag-and-Drop + Paste Support */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all group ${
                isDraggingOver
                  ? 'border-purple-600 bg-purple-100/80 scale-[1.01] shadow-md'
                  : 'border-purple-200 hover:border-purple-500 bg-purple-50/30 hover:bg-purple-50/70'
              }`}
            >
              <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition-transform">
                {isCompressing ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
              </div>
              <p className="text-xs font-bold text-purple-900">
                {isCompressing
                  ? 'Compressing images...'
                  : isDraggingOver
                  ? '📥 Drop images or documents here!'
                  : 'Click to Browse, Drag & Drop files, or Paste (Ctrl+V)'}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Screenshots pasted with <kbd className="px-1.5 py-0.5 bg-gray-200 text-gray-800 rounded font-mono text-[9px]">Ctrl + V</kbd> attach automatically
              </p>
            </div>

            {/* Quick Action Buttons for Upload / Paste */}
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
              >
                <Upload size={13} />
                <span>Browse Files</span>
              </button>
              <button
                type="button"
                onClick={handlePasteFromClipboardClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
                title="Paste screenshot or copied image from clipboard"
              >
                <ImageIcon size={13} />
                <span>📋 Paste (Ctrl+V)</span>
              </button>
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
              >
                <FileText size={13} />
                <span>+ Add PDF / Doc</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <input
              ref={docInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx"
              onChange={handleDocUpload}
              className="hidden"
            />

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 pt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-gray-200 aspect-square group/preview shadow-xs bg-gray-50">
                    <img src={img} alt="Reference" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewingImage(img); }}
                        className="p-1.5 bg-white/80 hover:bg-white text-gray-900 rounded-lg border-none cursor-pointer"
                        title="Zoom Image"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImages(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg border-none cursor-pointer"
                        title="Delete Image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Notes / Design Instructions */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>Detailed Instructions for Designers <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-purple-700 font-semibold">Be specific with placements & colors</span>
            </label>
            <textarea
              rows={4}
              placeholder="e.g. 
- Left Chest: Embroidered logo (height 3 inches)
- Back: 'PALLYWEAR 10' in Bold Golden Yellow
- Neck Style: Round neck with white ribbed trim
- Fabric: Sublimation Dry-Fit 180 GSM
- Color Theme: Royal Navy Blue & Neon Orange"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (notesError) setNotesError(null);
              }}
              className={`w-full bg-[#f8f9fb] border rounded-2xl p-3.5 text-xs text-gray-900 outline-none transition-all shadow-xs resize-none leading-relaxed ${
                notesError ? 'border-red-500 bg-red-50/20 focus:border-red-600' : 'border-gray-200 focus:border-purple-600 focus:bg-white'
              }`}
            />
            {notesError && (
              <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1 mt-1">
                <AlertCircle size={12} /> {notesError}
              </p>
            )}
          </div>

          {/* 5. Voice Instructions Recorder (Optional) */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Mic size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">Voice Instructions (Optional)</p>
                <p className="text-[10px] text-gray-500">
                  {isRecording ? `Recording audio... ${recordTimer}s` : voiceNote ? '✓ Voice note attached' : 'Record quick voice notes for designer'}
                </p>
              </div>
            </div>

            {isRecording ? (
              <button
                type="button"
                onClick={handleStopVoice}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer animate-pulse"
              >
                Stop & Save ({recordTimer}s)
              </button>
            ) : voiceNote ? (
              <button
                type="button"
                onClick={() => setVoiceNote(null)}
                className="text-xs text-red-600 hover:underline font-bold border-none bg-transparent cursor-pointer"
              >
                Remove Voice Note
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartVoice}
                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Start Recording
              </button>
            )}
          </div>

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-gray-600 hover:text-gray-900 font-bold text-xs rounded-xl transition-colors border-none bg-transparent cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Option 1: Save as Raised Task (Draft) */}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || isCompressing}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              Save as Raised Task
            </button>

            {/* Option 2: Send Directly to Design Team */}
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || isCompressing}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-purple-700 to-brand-primary hover:opacity-90 text-white font-black text-xs rounded-xl transition-all shadow-md active:scale-95 border-none cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              <span>🚀 Submit & Send to Design</span>
            </button>
          </div>
        </div>

      </div>

      {/* Lightbox Viewer */}
      {viewingImage && (
        <ImageViewer
          src={viewingImage}
          onClose={() => setViewingImage(null)}
          fileName="Reference_Artwork"
        />
      )}
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
