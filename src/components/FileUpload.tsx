/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2, Sparkles, Archive } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  data: string;
}

interface FileUploadProps {
  key?: string;
  label: string;
  onFilesSelected: (files: string[]) => void;
  onFilesWithMetadataSelected?: (files: FileMetadata[]) => void;
  maxFiles?: number;
  accept?: string;
  initialFiles?: string[];
  preserveOriginalQuality?: boolean;
  helperText?: string;
}

export default function FileUpload({
  label,
  onFilesSelected,
  onFilesWithMetadataSelected,
  maxFiles = 5,
  accept = "image/*,.pdf",
  initialFiles,
  preserveOriginalQuality = false,
  helperText
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileMetadata[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastInitialFilesRef = useRef<string[] | null>(null);

  // Sync initialFiles from parent to local state safely
  useEffect(() => {
    const initialJSON = JSON.stringify(initialFiles || []);
    const lastJSON = JSON.stringify(lastInitialFilesRef.current || []);
    if (initialJSON !== lastJSON) {
      lastInitialFilesRef.current = initialFiles || [];
      const mapped = (initialFiles || []).map((data, idx) => {
        let name = `File ${idx + 1}`;
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
            name = `Image_${idx + 1}`;
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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    const fileList: File[] = Array.from(files);
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const processedFiles: FileMetadata[] = [];

    for (const file of fileList) {
      if (file.size > MAX_SIZE) {
        alert(`File "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed size is 100MB.`);
        continue;
      }
      try {
        let fileToProcess: File | Blob = file;
        const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
        const isZip = file.type.includes('zip') || file.name.toLowerCase().endsWith('.zip') || file.name.toLowerCase().endsWith('.rar') || file.name.toLowerCase().endsWith('.7z');
        const shouldCompress = !preserveOriginalQuality && !isPng && !isZip && file.type.startsWith('image/');

        if (shouldCompress) {
          const options = {
            maxSizeMB: 1.0,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
          };
          try {
            fileToProcess = await imageCompression(file, options);
          } catch (err) {
            console.warn('Image compression fallback to original:', err);
            fileToProcess = file;
          }
        }

        const reader = new FileReader();
        const data = await new Promise<string>((resolve, reject) => {
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(fileToProcess);
        });

        processedFiles.push({
          name: file.name,
          type: file.type || (isZip ? 'application/zip' : isPng ? 'image/png' : 'application/octet-stream'),
          size: file.size,
          data: data
        });
      } catch (error) {
        console.error('Error processing file:', error);
      }
    }

    const updated = [...selectedFiles, ...processedFiles].slice(-maxFiles);
    setSelectedFiles(updated);
    
    const updatedData = updated.map(f => f.data);
    lastInitialFilesRef.current = updatedData;
    onFilesSelected(updatedData);
    if (onFilesWithMetadataSelected) {
      onFilesWithMetadataSelected(updated);
    }
    setIsCompressing(false);

    if (fileInputRef.current) fileInputRef.current.value = '';
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {label && <label className="block text-sm font-bold text-gray-700">{label}</label>}
        {isCompressing && (
          <div className="flex items-center gap-1.5 text-xs text-brand-primary animate-pulse font-bold">
            <Loader2 size={13} className="animate-spin" />
            Reading Original Quality File...
          </div>
        )}
      </div>
      <div
        onClick={() => !isCompressing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 transition-all cursor-pointer text-center group ${
          isCompressing ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-brand-primary hover:bg-purple-50/20'
        }`}
      >
        <div className="w-12 h-12 bg-gray-100 group-hover:bg-purple-100 text-gray-500 group-hover:text-brand-primary rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-all shadow-xs">
          <Upload size={22} />
        </div>
        <p className="text-xs sm:text-sm font-bold text-gray-800">
          Click or drag files here to upload
        </p>
        <p className="text-[11px] text-purple-700 font-extrabold mt-1 flex items-center justify-center gap-1">
          <Sparkles size={12} className="text-amber-500" />
          {preserveOriginalQuality ? '100% Original Lossless Quality (No Compression)' : 'Lossless Original Quality Supported (Up to 100MB)'}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {helperText || `Supports PNG, ZIP, PDF, EMB, DST, CDR (Max ${maxFiles} file${maxFiles > 1 ? 's' : ''})`}
        </p>
        <input
          type="file"
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          multiple={maxFiles > 1}
          disabled={isCompressing}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
          {selectedFiles.map((file, idx) => {
            const isImg = file.type.includes('image') || file.data.startsWith('data:image');
            const isZip = file.type.includes('zip') || file.name.toLowerCase().endsWith('.zip');
            return (
              <div key={idx} className="flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-xl shadow-xs hover:border-purple-200 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-center shrink-0 overflow-hidden">
                  {isImg ? (
                    <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                  ) : isZip ? (
                    <Archive size={18} className="text-indigo-600" />
                  ) : (
                    <FileText size={18} className="text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold text-gray-900 truncate" title={file.name}>{file.name}</p>
                  <p className="text-[10px] text-gray-500 font-semibold">
                    {(file.size / 1024).toFixed(1)} KB • <span className="text-purple-600 font-bold">Original Quality</span>
                  </p>
                </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
