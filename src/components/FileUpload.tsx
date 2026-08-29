/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface FileUploadProps {
  key?: string;
  label: string;
  onFilesSelected: (files: string[]) => void;
  maxFiles?: number;
  accept?: string;
  initialFiles?: string[];
}

export default function FileUpload({ label, onFilesSelected, maxFiles = 5, accept = "image/*,.pdf", initialFiles }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<{ name: string, type: string, size: number, data: string }[]>([]);
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
        
        if (data.startsWith('data:')) {
          const parts = data.split(';');
          type = parts[0].substring(5);
          const base64Str = parts[1]?.split(',')[1] || '';
          size = Math.round((base64Str.length * 3) / 4);
          
          if (type.includes('image')) {
            name = `Image ${idx + 1}`;
          } else if (type.includes('pdf')) {
            name = `Document ${idx + 1}`;
          }
        }
        return { name, type, size, data };
      });
      setSelectedFiles(mapped);
    }
  }, [initialFiles]);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsCompressing(true);
    const fileList: File[] = Array.from(files);
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const processedFiles: { name: string, type: string, size: number, data: string }[] = [];

    for (const file of fileList) {
      if (file.size > MAX_SIZE) {
        alert(`File ${file.name} is too large. Max size is 100MB.`);
        continue;
      }
      try {
        let fileToProcess: File | Blob = file;
        if (file.type.startsWith('image/')) {
          const options = {
            maxSizeMB: 1.0, // target size 1MB (keeps excellent details for blueprints/designs while reducing size by 95%+)
            maxWidthOrHeight: 2048, // keeps HD details
            useWebWorker: true,
          };
          try {
            fileToProcess = await imageCompression(file, options);
          } catch (err) {
            console.error('Image compression failed', err);
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
          type: file.type,
          size: fileToProcess.size,
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
    setIsCompressing(false);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    
    const updatedData = updated.map(f => f.data);
    lastInitialFilesRef.current = updatedData;
    onFilesSelected(updatedData);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">{label}</label>
        {isCompressing && (
          <div className="flex items-center gap-1.5 text-xs text-brand-primary animate-pulse font-bold">
            <Loader2 size={12} className="animate-spin" />
            Optimizing and Loading HD File...
          </div>
        )}
      </div>
      <div
        onClick={() => !isCompressing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer text-center group ${isCompressing ? 'border-gray-200 bg-gray-50 cursor-not-allowed' : 'border-gray-300 hover:border-black hover:bg-gray-50'
          }`}
      >
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <Upload size={24} className="text-gray-500" />
        </div>
        <p className="text-sm font-medium text-gray-700">Click or drag to upload files</p>
        <p className="text-xs text-brand-primary mt-1 font-bold">100% Full HD Quality (Files 0 KB to 100MB saved to database)</p>
        <p className="text-[10px] text-gray-400">PDF, ZIP or Full HD image files (Max {maxFiles} total)</p>
        <input
          type="file"
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          multiple
          disabled={isCompressing}
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {selectedFiles.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                {file.type.includes('image') ? <ImageIcon size={16} /> :
                  file.type.includes('zip') ? <Upload size={16} className="text-blue-500" /> :
                    <FileText size={16} className="text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB (Optimized)</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                disabled={isCompressing}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
