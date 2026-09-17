/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, RefreshCw, ShieldCheck } from 'lucide-react';
import { soundEffects } from '../lib/soundUtils';

interface WhatsAppCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  contactRole?: string;
  callType: 'audio' | 'video';
}

export default function WhatsAppCallModal({
  isOpen,
  onClose,
  contactName,
  contactRole,
  callType
}: WhatsAppCallModalProps) {
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected'>('calling');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const timerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setCallStatus('calling');
    setCallDuration(0);

    const stopRingtone = soundEffects.startRingtone();

    const ringingTimeout = setTimeout(() => {
      setCallStatus('ringing');
    }, 1500);

    const connectedTimeout = setTimeout(() => {
      setCallStatus('connected');
      stopRingtone();

      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }, 4000);

    // Request camera for video call if possible
    if (callType === 'video' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          localStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          // Camera permission denied or not available, fallback to video simulation
        });
    }

    return () => {
      clearTimeout(ringingTimeout);
      clearTimeout(connectedTimeout);
      clearInterval(timerRef.current);
      stopRingtone();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen, callType]);

  if (!isOpen) return null;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200 p-4">
      <div className="relative w-full max-w-md h-[560px] bg-gradient-to-b from-[#111b21] via-[#0b141a] to-[#0a1014] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-white/10 text-white">
        
        {/* Top Header */}
        <div className="p-6 text-center z-10">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 mb-2">
            <ShieldCheck size={14} />
            <span>End-to-End Encrypted</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{contactName}</h2>
          <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider font-semibold">
            {contactRole?.replace('_', ' ') || 'Team Member'}
          </p>
          <div className="mt-2 text-sm font-mono text-emerald-300 font-bold">
            {callStatus === 'calling' && <span className="animate-pulse">Calling...</span>}
            {callStatus === 'ringing' && <span className="animate-pulse">Ringing...</span>}
            {callStatus === 'connected' && formatDuration(callDuration)}
          </div>
        </div>

        {/* Center Area */}
        <div className="flex-1 flex items-center justify-center relative p-4">
          {callType === 'video' && !isVideoOff ? (
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
              />
              {/* Remote simulation overlay if no camera */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/60 to-transparent">
                <div className="w-20 h-20 bg-emerald-700/80 rounded-full flex items-center justify-center text-3xl font-black shadow-lg">
                  {contactName.charAt(0)}
                </div>
                <p className="text-xs font-semibold text-white/80 mt-3">Pallywear Secure Video Stream</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-28 h-28 bg-[#1f2c34] text-white rounded-full flex items-center justify-center text-4xl font-black shadow-2xl border-4 border-emerald-500/30">
                  {contactName.charAt(0)}
                </div>
                {callStatus === 'connected' && (
                  <span className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
                )}
              </div>
              <div className="flex items-center gap-1 mt-6">
                {[20, 50, 80, 40, 90, 60, 100, 70, 30].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${callStatus === 'connected' ? h : 10}%` }}
                    className="w-1.5 bg-emerald-500 rounded-full transition-all duration-200"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Call Controls */}
        <div className="p-6 bg-black/40 backdrop-blur-md rounded-t-3xl border-t border-white/5 z-10">
          <div className="flex items-center justify-around">
            {/* Speaker Toggle */}
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-none cursor-pointer ${
                isSpeakerOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-gray-900'
              }`}
              title={isSpeakerOn ? "Speaker On" : "Speaker Off"}
            >
              {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>

            {/* Video Toggle (if video call) */}
            {callType === 'video' ? (
              <button
                onClick={() => setIsVideoOff(!isVideoOff)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-none cursor-pointer ${
                  !isVideoOff ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-gray-900'
                }`}
                title={!isVideoOff ? "Turn camera off" : "Turn camera on"}
              >
                {!isVideoOff ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
            ) : (
              <button
                onClick={() => setIsFrontCamera(!isFrontCamera)}
                className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 border-none cursor-pointer"
                title="Switch mode"
              >
                <RefreshCw size={20} />
              </button>
            )}

            {/* Mute Mic */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-none cursor-pointer ${
                !isMuted ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-gray-900'
              }`}
              title={!isMuted ? "Mute Microphone" : "Unmute Microphone"}
            >
              {!isMuted ? <Mic size={20} /> : <MicOff size={20} />}
            </button>

            {/* End Call Button (Red) */}
            <button
              onClick={onClose}
              className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-110 active:scale-90 border-none cursor-pointer"
              title="End Call"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
