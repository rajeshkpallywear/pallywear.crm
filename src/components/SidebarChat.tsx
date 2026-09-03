/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Send, Image as ImageIcon, Loader2, Phone, Video,
  Search, Paperclip, Smile, CheckCheck, Mic, Play, Pause,
  FileText, ArrowLeft, Download, Sparkles, MoreVertical,
  Users, Check, Circle, Volume2, Plus, MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mockDataService } from '../service/mockDataService';
import { SidebarMessage } from '../types';
import { cn } from '../lib/utils';
import ImageViewer from './ImageViewer';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '🙏', '👏', '💯', '👕', '🎨', '📦', '✨'];

export default function SidebarChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SidebarMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentType, setAttachmentType] = useState<'image' | 'document' | 'audio'>('image');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups' | 'team'>('all');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const lastMessagesLengthRef = useRef(0);
  const timerIntervalRef = useRef<any>(null);

  const [usersList, setUsersList] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<{ id: string; name: string; role?: string; avatar?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = async () => {
    try {
      const data = await mockDataService.getUsers();
      setUsersList(data);
    } catch (e) {
      console.error('Failed to load users for chat:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadMessages = async (silent = false) => {
    if (!user) return;
    try {
      if (!activeChat) return;

      const data = await mockDataService.getMessages(
        activeChat.id === 'global' ? undefined : (user.id || user.uid),
        activeChat.id === 'global' ? undefined : activeChat.id
      );
      setMessages(data);

      if (isOpen) {
        setUnreadCount(0);
      } else if (data.length > lastMessagesLengthRef.current) {
        const newMsgsCount = data.length - lastMessagesLengthRef.current;
        if (lastMessagesLengthRef.current > 0) {
          setUnreadCount(prev => prev + newMsgsCount);
        }
      }
      lastMessagesLengthRef.current = data.length;
    } catch (error) {
      if (!silent) console.error('Failed to load sidebar messages:', error);
    }
  };

  // Poll for new messages
  useEffect(() => {
    if (activeChat) {
      loadMessages();
      const interval = setInterval(() => {
        loadMessages(true);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, user, activeChat]);

  useEffect(() => {
    if (isOpen && activeChat) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen, messages, activeChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Attachment size too large. Max limit is 5MB.");
      return;
    }

    setAttachmentName(file.name);
    setAttachmentType(type);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment(reader.result as string);
      setShowAttachMenu(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || (!inputText.trim() && !attachment && !isRecordingVoice) || !activeChat) return;

    setLoading(true);
    try {
      await mockDataService.saveMessage({
        senderId: user.id || user.uid,
        senderName: user.name,
        senderRole: user.role,
        message: inputText.trim() || (attachmentType === 'image' ? '📷 Photo' : attachmentType === 'audio' ? '🎙️ Voice message' : '📄 Document'),
        attachment: attachment || undefined,
        fileName: attachmentName || undefined,
        fileType: attachment ? attachmentType : undefined,
        recipientId: activeChat.id === 'global' ? 'global' : activeChat.id
      });
      setInputText('');
      setAttachment(null);
      setAttachmentName(null);
      setShowEmojiPicker(false);
      setShowAttachMenu(false);
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  // Voice Note Simulation
  const handleStartVoice = () => {
    setIsRecordingVoice(true);
    setRecordTimer(0);
    timerIntervalRef.current = setInterval(() => {
      setRecordTimer(prev => prev + 1);
    }, 1000);
  };

  const handleSendVoice = async () => {
    clearInterval(timerIntervalRef.current);
    setIsRecordingVoice(false);
    if (!user || !activeChat) return;

    setLoading(true);
    try {
      await mockDataService.saveMessage({
        senderId: user.id || user.uid,
        senderName: user.name,
        senderRole: user.role,
        message: `🎙️ Voice Note (${Math.max(1, recordTimer)}s)`,
        fileType: 'audio',
        voiceNote: `simulated_voice_${Date.now()}`,
        recipientId: activeChat.id === 'global' ? 'global' : activeChat.id
      });
      setRecordTimer(0);
      await loadMessages();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelVoice = () => {
    clearInterval(timerIntervalRef.current);
    setIsRecordingVoice(false);
    setRecordTimer(0);
  };

  const getRoleColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'text-[#007bfc]';
      case 'marketing': return 'text-[#1fa855]';
      case 'design': case 'designer': return 'text-[#9c27b0]';
      case 'accounts': return 'text-[#e91e63]';
      case 'vendor': return 'text-[#ff9800]';
      case 'digitizer': return 'text-[#00bcd4]';
      case 'delivery': return 'text-[#4caf50]';
      default: return 'text-[#128c7e]';
    }
  };

  return (
    <>
      {/* Floating WhatsApp Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[99] w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center border-none cursor-pointer group"
        title="WhatsApp Team Chat"
      >
        <MessageCircle className="w-7 h-7 fill-white text-white drop-shadow-sm" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-md border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* WhatsApp Chat Drawer via Portal */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/25 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div
            className="w-full sm:w-[420px] md:w-[440px] h-full bg-[#f0f2f5] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300 relative border-l border-gray-200"
          >
            {!activeChat ? (
              /* ========================================================================= */
              /* 1. WHATSAPP CHATS LIST / CONTACTS HOME */
              /* ========================================================================= */
              <>
                {/* WhatsApp Top Green Bar */}
                <div className="bg-[#008069] text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-black text-base shadow-xs">
                      💬
                    </div>
                    <div>
                      <h3 className="font-bold text-base tracking-tight leading-tight">WhatsApp</h3>
                      <p className="text-[11px] text-emerald-100 font-medium">Pallywear Team Workspace</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-white">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* WhatsApp Search Input */}
                <div className="p-2.5 bg-white border-b border-gray-150 shrink-0">
                  <div className="bg-[#f0f2f5] rounded-xl flex items-center px-3 py-1.5 gap-2.5">
                    <Search className="w-4 h-4 text-gray-500 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search or start new chat"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-none text-xs font-semibold text-gray-800 placeholder:text-gray-500 outline-none"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer p-0.5">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2 mt-2 px-1">
                    {(['all', 'unread', 'groups', 'team'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setActiveFilter(f)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-colors border-none cursor-pointer",
                          activeFilter === f
                            ? "bg-[#e7fce3] text-[#008069] font-black"
                            : "bg-[#f0f2f5] text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* WhatsApp Chat Items List */}
                <div className="flex-1 overflow-y-auto bg-white divide-y divide-gray-100 custom-scrollbar">
                  {/* Global Group Chat */}
                  {(activeFilter === 'all' || activeFilter === 'groups') && searchQuery === '' && (
                    <div
                      onClick={() => {
                        setActiveChat({ id: 'global', name: '📢 Pallywear Team Group', role: 'Global Team Workspace' });
                        setMessages([]);
                        lastMessagesLengthRef.current = 0;
                      }}
                      className="px-4 py-3 flex items-center gap-3.5 hover:bg-[#f5f6f6] transition-colors cursor-pointer group"
                    >
                      <div className="w-12 h-12 bg-[#00a884] text-white rounded-full flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                        <Users size={22} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-[#111b21] truncate">📢 Pallywear Team Group</h4>
                          <span className="text-[10px] text-[#667781] font-semibold">Live</span>
                        </div>
                        <p className="text-xs text-[#667781] truncate mt-0.5 flex items-center gap-1">
                          <span className="text-[#008069] font-bold">Workspace:</span> Instant broadcasts across all teams
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Direct Team Members */}
                  {usersList
                    .filter(u => u.uid !== (user?.id || user?.uid))
                    .filter(u => !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()) || (u.role || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(u => (
                      <div
                        key={u.uid}
                        onClick={() => {
                          setActiveChat({ id: u.uid, name: u.name, role: u.role });
                          setMessages([]);
                          lastMessagesLengthRef.current = 0;
                        }}
                        className="px-4 py-3 flex items-center gap-3.5 hover:bg-[#f5f6f6] transition-colors cursor-pointer group"
                      >
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 bg-[#e9edef] text-[#54656f] rounded-full flex items-center justify-center font-black text-base uppercase border border-gray-200 shadow-xs">
                            {u.name.charAt(0)}
                          </div>
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#25d366] border-2 border-white rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-sm text-[#111b21] truncate">{u.name}</h4>
                            <span className="text-[10px] text-[#667781] font-semibold font-mono">
                              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-[#667781] truncate flex items-center gap-1">
                              <CheckCheck size={14} className="text-[#53bdeb] shrink-0" />
                              <span>Online & Available</span>
                            </p>
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider",
                              getRoleColor(u.role),
                              "bg-gray-100"
                            )}>
                              {u.role?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              /* ========================================================================= */
              /* 2. WHATSAPP ACTIVE CHAT ROOM */
              /* ========================================================================= */
              <>
                {/* Chat Top Header */}
                <div className="bg-[#008069] text-white px-3 py-2.5 flex items-center justify-between shrink-0 shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => setActiveChat(null)}
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white flex items-center justify-center"
                      title="Back to chats"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 bg-white/20 text-white rounded-full flex items-center justify-center font-bold text-sm uppercase shadow-xs">
                        {activeChat.name.charAt(0)}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#25d366] border-2 border-[#008069] rounded-full" />
                    </div>
                    <div className="text-left min-w-0">
                      <h3 className="font-bold text-sm tracking-tight truncate leading-tight">{activeChat.name}</h3>
                      <p className="text-[10px] text-emerald-100 font-medium truncate">
                        {activeChat.id === 'global' ? 'You, Admin, Marketing, Designers...' : 'Online'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert(`Calling ${activeChat.name}...`)}
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white"
                      title="Audio Call"
                    >
                      <Phone size={18} />
                    </button>
                    <button
                      onClick={() => alert(`Starting video meeting with ${activeChat.name}...`)}
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white"
                      title="Video Call"
                    >
                      <Video size={18} />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors border-none bg-transparent cursor-pointer text-white"
                      title="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* WhatsApp Chat Wallpaper & Messages */}
                <div
                  className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 relative custom-scrollbar"
                  style={{
                    backgroundColor: '#efeae2',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d1c7b7' fill-opacity='0.25' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`
                  }}
                >
                  {/* Today Date Divider */}
                  <div className="flex justify-center my-2">
                    <span className="bg-white/90 shadow-xs text-[#54656f] text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider">
                      Today
                    </span>
                  </div>

                  {messages.length === 0 ? (
                    <div className="p-6 text-center text-[#54656f] text-xs bg-white/70 rounded-2xl max-w-xs mx-auto shadow-xs">
                      🔒 Messages are end-to-end encrypted in your Pallywear workspace. Say hello to start collaborating!
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.senderId === (user?.id || user?.uid);
                      return (
                        <div
                          key={msg.id || idx}
                          className={cn(
                            "flex flex-col max-w-[82%] sm:max-w-[75%] rounded-2xl px-3.5 py-2 text-left relative shadow-xs group transition-all",
                            isMe
                              ? "bg-[#d9fdd3] text-[#111b21] ml-auto rounded-tr-xs border border-[#c6ebbf]"
                              : "bg-white text-[#111b21] mr-auto rounded-tl-xs border border-gray-150"
                          )}
                        >
                          {/* Sender Name in Group Chat */}
                          {!isMe && activeChat.id === 'global' && (
                            <div className="flex items-center gap-1.5 mb-1 shrink-0">
                              <span className={cn("text-[11px] font-black", getRoleColor(msg.senderRole))}>
                                {msg.senderName}
                              </span>
                              <span className="text-[8px] font-bold bg-gray-100 text-gray-600 rounded px-1 uppercase tracking-wider">
                                {msg.senderRole?.replace('_', ' ')}
                              </span>
                            </div>
                          )}

                          {/* Image Attachment */}
                          {msg.attachment && (
                            <div
                              onClick={() => msg.attachment && setViewingImage(msg.attachment)}
                              className="rounded-xl overflow-hidden max-h-[220px] mb-1.5 border border-black/5 bg-black/5 flex items-center justify-center cursor-pointer relative group/img"
                            >
                              <img src={msg.attachment} className="w-full h-full object-cover max-w-full" alt="Attachment" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                🔍 Tap to view
                              </div>
                            </div>
                          )}

                          {/* Voice Note Simulation */}
                          {msg.voiceNote && (
                            <div className="flex items-center gap-2.5 py-1 px-2 bg-black/5 rounded-xl mb-1">
                              <button
                                onClick={() => setPlayingVoiceId(playingVoiceId === msg.id ? null : msg.id)}
                                className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center border-none cursor-pointer"
                              >
                                {playingVoiceId === msg.id ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                              </button>
                              <div className="flex-1 flex items-center gap-0.5">
                                {[40, 70, 30, 90, 60, 80, 45, 100, 50, 75, 35, 85].map((h, i) => (
                                  <div
                                    key={i}
                                    style={{ height: `${h}%` }}
                                    className={cn(
                                      "w-1 rounded-full transition-all duration-300",
                                      playingVoiceId === msg.id ? "bg-[#00a884] animate-pulse" : "bg-gray-400"
                                    )}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] font-mono text-gray-500 font-bold">0:15</span>
                            </div>
                          )}

                          {/* Message Text */}
                          <p className="text-[13px] font-normal leading-relaxed break-words">
                            {msg.message}
                          </p>

                          {/* Timestamp + Blue Double Checks */}
                          <div className="flex items-center justify-end gap-1 mt-1 shrink-0">
                            <span className="text-[9px] text-[#667781] font-mono">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && (
                              <CheckCheck size={14} className="text-[#53bdeb]" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Emoji Bar (Popup) */}
                {showEmojiPicker && (
                  <div className="bg-white p-2.5 border-t border-gray-200 flex flex-wrap gap-2 shrink-0 animate-in slide-in-from-bottom-2">
                    {QUICK_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setInputText(prev => prev + emoji);
                        }}
                        className="text-xl p-1.5 hover:bg-gray-100 rounded-lg transition-transform hover:scale-125 border-none bg-transparent cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Attachment Menu Popup */}
                {showAttachMenu && (
                  <div className="bg-white p-3 border-t border-gray-200 flex items-center gap-4 shrink-0 shadow-lg animate-in slide-in-from-bottom-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-1 border-none bg-transparent cursor-pointer group"
                    >
                      <div className="w-11 h-11 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <ImageIcon size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-700">Photos</span>
                    </button>
                    <button
                      onClick={() => docInputRef.current?.click()}
                      className="flex flex-col items-center gap-1 border-none bg-transparent cursor-pointer group"
                    >
                      <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <FileText size={20} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-700">Document</span>
                    </button>
                  </div>
                )}

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'image')}
                  className="hidden"
                />
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.zip"
                  onChange={(e) => handleFileChange(e, 'document')}
                  className="hidden"
                />

                {/* Attachment Preview Chip */}
                {attachment && (
                  <div className="bg-white px-3 py-2 border-t border-gray-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 truncate">
                      {attachmentType === 'image' ? (
                        <img src={attachment} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <FileText className="w-6 h-6 text-blue-600 shrink-0" />
                      )}
                      <span className="text-xs font-semibold text-gray-800 truncate">{attachmentName || 'Attachment attached'}</span>
                    </div>
                    <button
                      onClick={() => { setAttachment(null); setAttachmentName(null); }}
                      className="text-red-500 hover:text-red-700 p-1 border-none bg-transparent cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* WhatsApp Bottom Input Bar */}
                <div className="bg-[#f0f2f5] px-3 py-2.5 flex items-center gap-2 shrink-0 border-t border-gray-200">
                  {isRecordingVoice ? (
                    /* Recording State */
                    <div className="flex-1 flex items-center justify-between bg-white rounded-full px-4 py-2 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                        <span className="text-xs font-mono font-bold text-red-600">Recording... {recordTimer}s</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCancelVoice}
                          className="text-xs font-bold text-gray-500 hover:text-red-500 border-none bg-transparent cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSendVoice}
                          className="p-1.5 bg-[#00a884] text-white rounded-full border-none cursor-pointer"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Regular Input Bar */
                    <>
                      <button
                        type="button"
                        onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); }}
                        className={cn(
                          "p-2 rounded-full transition-colors border-none bg-transparent cursor-pointer shrink-0",
                          showEmojiPicker ? "text-[#00a884]" : "text-[#54656f] hover:text-[#111b21]"
                        )}
                        title="Emojis"
                      >
                        <Smile size={22} />
                      </button>

                      <button
                        type="button"
                        onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); }}
                        className={cn(
                          "p-2 rounded-full transition-colors border-none bg-transparent cursor-pointer shrink-0",
                          showAttachMenu ? "text-[#00a884]" : "text-[#54656f] hover:text-[#111b21]"
                        )}
                        title="Attach"
                      >
                        <Paperclip size={20} />
                      </button>

                      <input
                        type="text"
                        placeholder="Type a message"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        className="flex-1 bg-white rounded-full px-4 py-2.5 text-sm text-[#111b21] placeholder:text-[#8696a0] outline-none shadow-xs border border-transparent focus:border-[#00a884]"
                      />

                      {inputText.trim() || attachment ? (
                        <button
                          type="button"
                          onClick={() => handleSend()}
                          disabled={loading}
                          className="w-10 h-10 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full flex items-center justify-center shrink-0 shadow-md border-none cursor-pointer active:scale-95 transition-transform disabled:opacity-50"
                          title="Send message"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStartVoice}
                          className="w-10 h-10 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-full flex items-center justify-center shrink-0 shadow-md border-none cursor-pointer active:scale-95 transition-transform"
                          title="Hold/Click to record voice note"
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Global Image Zoom Viewer */}
      {viewingImage && (
        <ImageViewer
          src={viewingImage}
          onClose={() => setViewingImage(null)}
          fileName="WhatsApp_Attachment"
        />
      )}
    </>
  );
}
