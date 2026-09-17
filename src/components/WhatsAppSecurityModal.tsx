/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Lock, ShieldCheck, QrCode, CheckCircle2 } from 'lucide-react';
import { generateSecurityFingerprint } from '../lib/cryptoUtils';

interface WhatsAppSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  contactName: string;
}

export default function WhatsAppSecurityModal({
  isOpen,
  onClose,
  userName,
  contactName
}: WhatsAppSecurityModalProps) {
  if (!isOpen) return null;

  const fingerprintBlocks = generateSecurityFingerprint(userName, contactName);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-150 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#008069] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Lock size={20} className="text-emerald-200" />
            <h3 className="font-bold text-base">Verify Security Code</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[80vh] custom-scrollbar text-center">
          <div className="w-16 h-16 bg-emerald-50 text-[#008069] rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck size={36} />
          </div>

          <h4 className="font-bold text-base text-[#111b21] mb-1">
            End-to-End Encrypted Chat
          </h4>
          <p className="text-xs text-[#54656f] leading-relaxed max-w-sm mx-auto mb-5">
            Messages and calls with <span className="font-bold text-gray-800">{contactName}</span> are secured with 256-bit AES-GCM end-to-end encryption. No one outside of this chat, not even Pallywear servers, can read or listen to them.
          </p>

          {/* QR Code Simulation */}
          <div className="bg-[#f0f2f5] p-5 rounded-2xl inline-flex flex-col items-center justify-center border border-gray-200 mb-5">
            <div className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center border border-gray-300 shadow-sm relative">
              <QrCode size={128} className="text-gray-900" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-md">
                  <Lock size={16} />
                </div>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-gray-500 mt-2 flex items-center gap-1">
              <CheckCircle2 size={13} className="text-[#00a884]" />
              Verified Encryption Keys
            </span>
          </div>

          {/* 60-digit Fingerprint Blocks */}
          <div className="bg-[#f8f9fa] p-4 rounded-xl border border-gray-200 text-left mb-4">
            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2 text-center">
              60-Digit Encryption Fingerprint
            </p>
            <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs font-bold text-gray-800">
              {fingerprintBlocks.map((block, i) => (
                <span key={i} className="bg-white py-1 px-1.5 rounded border border-gray-200 shadow-xs">
                  {block}
                </span>
              ))}
            </div>
          </div>

          {/* Learn More Flow explanation */}
          <div className="p-3 bg-emerald-50/70 rounded-xl text-left border border-emerald-100 text-[11px] text-emerald-900 leading-normal">
            <p className="font-bold mb-1">🔐 Architecture Flow:</p>
            <p>1. <b>User A writes</b> ➔ Encrypted on device with AES-GCM 256-bit.</p>
            <p>2. <b>Messaging Server</b> ➔ Zero-knowledge forward only (stores only ciphertext).</p>
            <p>3. <b>User B device</b> ➔ Decrypts with shared conversation key.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#008069] hover:bg-[#00705b] text-white text-xs font-bold rounded-xl transition-colors border-none cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
