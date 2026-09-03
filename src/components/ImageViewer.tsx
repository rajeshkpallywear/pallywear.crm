/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, ZoomIn, ZoomOut, Download, Sparkles, RotateCcw } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  onClose: () => void;
  fileName?: string;
}

export default function ImageViewer({ src, onClose, fileName = 'design_original' }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);

  const getCleanFileName = (): string => {
    let base = fileName.replace(/[<>:"/\\|?*]+/g, '_').trim();
    if (!base) base = 'design_asset';

    // If extension is already present, return as is
    if (/\.(png|jpg|jpeg|webp|pdf|zip|dst|emb|cdr|ai|psd)$/i.test(base)) {
      return base;
    }

    // Infer extension from data URL
    if (src.startsWith('data:image/png')) {
      return `${base}.png`;
    } else if (src.startsWith('data:image/jpeg') || src.startsWith('data:image/jpg')) {
      return `${base}.jpg`;
    } else if (src.startsWith('data:image/webp')) {
      return `${base}.webp`;
    } else if (src.startsWith('data:application/pdf')) {
      return `${base}.pdf`;
    } else if (src.startsWith('data:application/zip') || src.includes('zip')) {
      return `${base}.zip`;
    }
    return `${base}.png`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = getCleanFileName();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = src.startsWith('data:image') || src.includes('.png') || src.includes('.jpg') || src.includes('.jpeg') || src.includes('.webp');

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 flex flex-wrap items-center gap-2 sm:gap-4 z-50">
        {isImage && (
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-lg rounded-full p-1 border border-white/20">
            <button
              onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
              className="p-2 hover:bg-white/20 rounded-full text-white transition-colors border-none bg-transparent cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-white text-xs font-bold w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(5, zoom + 0.25))}
              className="p-2 hover:bg-white/20 rounded-full text-white transition-colors border-none bg-transparent cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-2 hover:bg-white/20 rounded-full text-white transition-colors border-none bg-transparent cursor-pointer"
              title="Reset Zoom (100%)"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        )}

        <button
          onClick={handleDownload}
          className="px-4 py-2.5 bg-white text-black rounded-full hover:bg-gray-100 transition-all font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl border-none cursor-pointer scale-100 hover:scale-[1.03]"
        >
          <Download size={16} />
          <span>Download Original Quality</span>
        </button>

        <button
          onClick={onClose}
          className="p-2.5 bg-white/10 hover:bg-red-500 rounded-full text-white transition-all border border-white/20 cursor-pointer"
          title="Close Viewer"
        >
          <X size={20} />
        </button>
      </div>

      <div className="w-full h-full flex items-center justify-center overflow-auto cursor-grab active:cursor-grabbing p-8">
        <motion.div
          animate={{ scale: zoom }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex items-center justify-center max-w-full max-h-full"
        >
          {isImage ? (
            <div className="relative group flex flex-col items-center">
              <img
                src={src}
                className="max-h-[82vh] max-w-[88vw] object-contain shadow-2xl rounded-2xl select-none bg-transparent"
                style={{ imageRendering: 'high-quality' }}
                draggable={false}
                alt="Design Asset"
              />
              <div className="mt-3 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] text-purple-200 font-bold flex items-center gap-1 border border-white/10">
                <Sparkles size={11} className="text-amber-400" />
                <span>Original Quality Preview ({getCleanFileName()})</span>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 sm:p-12 rounded-3xl text-center max-w-md shadow-2xl">
              <div className="w-20 h-20 bg-purple-50 text-brand-primary rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
                <Download size={36} />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                {src.includes('zip') ? 'Design ZIP Archive' : 'Production File Document'}
              </h3>
              <p className="text-xs text-gray-600 font-semibold mt-2 leading-relaxed">
                {src.includes('zip')
                  ? 'ZIP archive contains raw vector graphics, machine embroidery files, and design assets.'
                  : 'Document specification ready for production.'}
              </p>
              <button
                onClick={handleDownload}
                className="mt-6 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 mx-auto shadow-lg border-none cursor-pointer"
              >
                <Download size={16} />
                Download Original File
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>,
    document.body
  );
}

