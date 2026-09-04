/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, ChangeEvent, DragEvent, ClipboardEvent, useEffect } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2, Sparkles, Archive, ClipboardPaste, Eye, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  data: string;
}

interface FileUploadProps {
  key?: string;
  label?: string;
  onFilesSelected: (files: string[]) => void;
  onFilesWithMetadataSelected?: (files: FileMetadata[]) => void;
  maxFiles?: number;
  accept?: string;
  initialFiles?: string[];
  preserveOriginalQuality?: boolean;
  helperText?: string;
  enableGlobalPaste?: boolean;
}

export default function FileUpload({
  label,
  onFilesSelected,
  onFilesWithMetadataSelected,
  maxFiles = 10,
  accept = "image/*,.pdf,.zip,.emb,.dst,.cdr",
  initialFiles,
  preserveOriginalQuality = false,
  helperText,
  enableGlobalPaste = true
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileMetadata[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef<number>(0);
  const lastInitialFilesRef = useRef<string[] | null>(null);

  // Sync initialFiles from parent to local state safely
  useEffect(() => {
    const initialJSON = JSON.stringify(initialFiles || []);
    const lastJSON = JSON.stringify(lastInitialFilesRef.current || []);
    if (initialJSON !== lastJSON) {
      lastInitialFilesRef.current = initialFiles || [];
      const mapped = (initialFiles || []).map((data, idx) => {
        let name = `Blueprint_${idx + 1}`;
        let type = 'image/jpeg';
        let size = 0;
        
        if (data && data.startsWith('data:')) {
          const parts = data.split(';');
          type = parts[0].substring(5);
          const base64Str = parts[1]?.split(',')[1] || '';
          size = Math.round((base64Str.length * 3) / 4);
          
          if (type.includes('png')) {
            name = `Design_Output_${idx + 1}.png`;
          } else if (type.includes('image')) {
            name = `Image_${idx + 1}.jpg`;
          } else if (type.includes('pdf')) {
            name = `Document_${idx + 1}.pdf`;
          } else if (type.includes('zip') || type.includes('compressed')) {
            name = `Design_Package_${idx + 1}.zip`;
          }
        }
        return { name, type, size, data };
      });
      setSelectedFiles(mapped);
    }
  }, [initialFiles]);

  const showNotice = (msg: string) => {
    setPasteNotice(msg);
    setTimeout(() => {
      setPasteNotice(null);
    }, 3500);
  };

  // Helper to process a list of File/Blob objects
  const processFileList = async (filesToProcess: (File | Blob)[], customPrefix = 'Upload') => {
    if (!filesToProcess || filesToProcess.length === 0) return;

    setIsCompressing(true);
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB max per file
    const processedFiles: FileMetadata[] = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const item = filesToProcess[i];
      let file: File;
      
      if (item instanceof File) {
        file = item;
      } else {
        const ext = item.type.includes('png') ? 'png' : item.type.includes('pdf') ? 'pdf' : item.type.includes('zip') ? 'zip' : 'jpg';
        file = new File([item], `${customPrefix}_${Date.now()}_${i + 1}.${ext}`, { type: item.type || 'image/png' });
      }

      if (file.size > MAX_SIZE) {
        alert(`File "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed size is 100MB.`);
        continue;
      }

      try {
        let fileObj: File | Blob = file;
        const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
        const isZip = file.type.includes('zip') || file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.rar') || file.name.toLowerCase().endsWith('.7z');
        const shouldCompress = !preserveOriginalQuality && !isPng && !isZip && file.type.startsWith('image/');

        if (shouldCompress) {
          const options = {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 2560,
            useWebWorker: true,
          };
          try {
            fileObj = await imageCompression(file, options);
          } catch (err) {
            console.warn('Image compression fallback to original:', err);
            fileObj = file;
          }
        }

        const reader = new FileReader();
        const data = await new Promise<string>((resolve, reject) => {
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(fileObj);
        });

        processedFiles.push({
          name: file.name,
          type: file.type || (isZip ? 'application/zip' : isPng ? 'image/png' : 'application/octet-stream'),
          size: fileObj.size || file.size,
          data: data
        });
      } catch (error) {
        console.error('Error processing file:', error);
      }
    }

    if (processedFiles.length > 0) {
      const updated = [...selectedFiles, ...processedFiles].slice(-maxFiles);
      setSelectedFiles(updated);
      
      const updatedData = updated.map(f => f.data);
      lastInitialFilesRef.current = updatedData;
      onFilesSelected(updatedData);
      if (onFilesWithMetadataSelected) {
        onFilesWithMetadataSelected(updated);
      }
      showNotice(`✓ Successfully added ${processedFiles.length} file(s)`);
    }

    setIsCompressing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFileList(Array.from(files));
  };

  // Drag & Drop handlers
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    if (isCompressing) return;

    const files: File[] = [];
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      files.push(...Array.from(e.dataTransfer.files));
    }
    
    if (files.length > 0) {
      await processFileList(files, 'Dropped_File');
    }
  };

  // Clipboard Paste handler (for dropzone or component)
  const handlePasteEvent = async (e: ClipboardEvent<HTMLDivElement>) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    const filesToUpload: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          filesToUpload.push(file);
        }
      }
    }

    if (filesToUpload.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      await processFileList(filesToUpload, 'Pasted_Image');
    }
  };

  // Button-triggered Paste from Clipboard (calls modern clipboard API)
  const handlePasteButtonClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCompressing) return;

    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        const filesToUpload: File[] = [];

        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith('image/') || type.includes('pdf')) {
              const blob = await item.getType(type);
              const ext = type.includes('png') ? 'png' : type.includes('jpeg') ? 'jpg' : type.includes('webp') ? 'webp' : 'png';
              const file = new File([blob], `Clipboard_Image_${Date.now()}.${ext}`, { type });
              filesToUpload.push(file);
            }
          }
        }

        if (filesToUpload.length > 0) {
          await processFileList(filesToUpload, 'Clipboard_Image');
          return;
        }
      }

      // If clipboard has text or browser blocked read API, prompt shortcut
      showNotice("💡 Press Ctrl+V anywhere to paste copied images directly!");
    } catch (err) {
      console.warn("Clipboard read not permitted or empty:", err);
      showNotice("💡 Use Ctrl+V on your keyboard to paste copied screenshots!");
    }
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    
    const updatedData = updated.map(f => f.data);
    lastInitialFilesRef.current = updatedData;
    onFilesSelected(updatedData);
    if (onFilesWithMetadataSelected) {
      onFilesWithMetadataSelected(updated);
    }
  };

  const clearAllFiles = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles([]);
    lastInitialFilesRef.current = [];
    onFilesSelected([]);
    if (onFilesWithMetadataSelected) {
      onFilesWithMetadataSelected([]);
    }
  };

  return (
    <div className="space-y-3" onPaste={handlePasteEvent}>
      {/* Label and Header Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {label && <label className="block text-xs sm:text-sm font-black text-gray-800 tracking-tight">{label}</label>}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-brand-primary border border-purple-200">
            {selectedFiles.length}/{maxFiles}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Paste Button */}
          <button
            type="button"
            onClick={handlePasteButtonClick}
            title="Click or press Ctrl+V to paste copied images directly"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-brand-primary border border-purple-200 hover:border-purple-300 rounded-lg text-[11px] font-black transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
          >
            <ClipboardPaste size={13} className="text-brand-primary" />
            <span>Paste (Ctrl+V)</span>
          </button>

          {selectedFiles.length > 0 && (
            <button
              type="button"
              onClick={clearAllFiles}
              className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
            >
              <Trash2 size={12} />
              <span>Clear All</span>
            </button>
          )}

          {isCompressing && (
            <div className="flex items-center gap-1.5 text-xs text-brand-primary animate-pulse font-bold">
              <Loader2 size={13} className="animate-spin" />
              Processing File...
            </div>
          )}
        </div>
      </div>

      {/* Notice Banner */}
      {pasteNotice && (
        <div className="p-2.5 bg-brand-primary/10 border border-brand-primary/30 rounded-xl text-xs font-bold text-brand-primary flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{pasteNotice}</span>
        </div>
      )}

      {/* Dropzone Container */}
      <div
        ref={dropzoneRef}
        onClick={() => !isCompressing && fileInputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={0}
        role="button"
        aria-label="Upload files by clicking, dragging, or pasting"
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 transition-all cursor-pointer text-center relative group outline-none ${
          isDragging
            ? 'border-brand-primary bg-purple-100/50 ring-4 ring-purple-200/60 scale-[1.01] shadow-lg'
            : isCompressing
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-brand-primary hover:bg-purple-50/25 hover:shadow-md'
        }`}
      >
        <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5 transition-all shadow-xs ${
            isDragging
              ? 'bg-brand-primary text-white scale-110 rotate-6 shadow-md'
              : 'bg-gray-100 group-hover:bg-purple-100 text-gray-500 group-hover:text-brand-primary group-hover:scale-110'
          }`}>
            <Upload size={22} className={isDragging ? 'animate-bounce' : ''} />
          </div>

          <p className="text-xs sm:text-sm font-black text-gray-900 tracking-tight">
            {isDragging ? 'Release files here to drop & upload immediately' : 'Click, Drag & Drop, or Paste (Ctrl+V) files here'}
          </p>

          <p className="text-[11px] text-purple-700 font-extrabold mt-1 flex items-center justify-center gap-1.5">
            <Sparkles size={12} className="text-amber-500 shrink-0" />
            {preserveOriginalQuality ? '100% Lossless Original Quality Preserved' : 'Lossless Quality Supported (Up to 100MB)'}
          </p>

          <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
            {helperText || `Supports PNG, JPG, WEBP, ZIP, PDF, EMB, DST, CDR (Max ${maxFiles} files)`}
          </p>
        </div>

        <input
          type="file"
          hidden
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept={accept}
          multiple={maxFiles > 1}
          disabled={isCompressing}
        />
      </div>

      {/* Selected Files Grid */}
      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
          {selectedFiles.map((file, idx) => {
            const isImg = file.type.includes('image') || file.data.startsWith('data:image');
            const isZip = file.type.includes('zip') || file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.rar');
            const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
            
            return (
              <div 
                key={idx} 
                className="flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-xl shadow-2xs hover:border-purple-300 hover:shadow-xs transition-all group"
              >
                {/* Thumbnail / Icon with click-to-preview */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isImg) setPreviewFile(file);
                  }}
                  className={`w-11 h-11 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden relative ${
                    isImg ? 'cursor-pointer hover:opacity-90' : ''
                  }`}
                  title={isImg ? "Click to preview full size" : file.name}
                >
                  {isImg ? (
                    <>
                      <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Eye size={14} />
                      </div>
                    </>
                  ) : isZip ? (
                    <Archive size={20} className="text-indigo-600" />
                  ) : isPdf ? (
                    <FileText size={20} className="text-red-500" />
                  ) : (
                    <FileText size={20} className="text-gray-500" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold text-gray-900 truncate" title={file.name}>{file.name}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-semibold mt-0.5">
                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span className="text-brand-primary font-bold uppercase text-[9px] bg-purple-50 px-1 py-0.2 rounded border border-purple-150">
                      {isImg ? (file.name.split('.').pop() || 'IMG').toUpperCase() : isZip ? 'ZIP' : isPdf ? 'PDF' : 'FILE'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {isImg && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                      className="p-1.5 text-gray-400 hover:text-brand-primary hover:bg-purple-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                      title="Preview full image"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                    disabled={isCompressing}
                    title="Remove file"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Image Preview Modal */}
      {previewFile && (
        <div 
          onClick={() => setPreviewFile(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[200] flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 bg-gray-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold truncate max-w-xs sm:max-w-md">{previewFile.name}</span>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-1 hover:bg-white/20 rounded-lg text-white transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 bg-gray-950 flex items-center justify-center max-h-[80vh] overflow-auto">
              <img src={previewFile.data} alt={previewFile.name} className="max-w-full max-h-[75vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

