import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mockDataService } from '../service/mockDataService';
import { SidebarMessage } from '../types';
import { cn } from '../lib/utils';

export default function SidebarChat() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SidebarMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessagesLengthRef = useRef(0);

  const loadMessages = async (silent = false) => {
    if (!user) return;
    try {
      const data = await mockDataService.getMessages();
      setMessages(data);

      if (isOpen) {
        setUnreadCount(0);
      } else if (data.length > lastMessagesLengthRef.current) {
        // If not open, increment unread messages count
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

  // Poll for new messages every 3 seconds
  useEffect(() => {
    loadMessages();
    const interval = setInterval(() => {
      loadMessages(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Attachment size too large. Max limit is 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAttachment(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!inputText.trim() && !attachment)) return;

    setLoading(true);
    try {
      await mockDataService.saveMessage({
        senderId: user.id || user.uid,
        senderName: user.name,
        senderRole: user.role,
        message: inputText.trim(),
        attachment: attachment || undefined
      });
      setInputText('');
      setAttachment(null);
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl hover:scale-105 transition-all flex items-center justify-center border-none cursor-pointer group"
        title="WhatsApp Team Chat"
      >
        <MessageSquare className="w-6 h-6 animate-pulse group-hover:scale-110" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Drawer Container */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[380px] max-w-full bg-slate-50 border-l border-gray-200 z-50 flex flex-col shadow-2xl transition-transform duration-350 ease-out transform",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* WhatsApp-themed Header */}
        <div className="bg-emerald-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-700 text-white rounded-full flex items-center justify-center font-bold text-sm border-2 border-emerald-500/20">
              P
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Pallywear Team Room</h3>
              <p className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
                Active Communication Portal
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-emerald-700/50 rounded-full transition-colors border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5 text-emerald-100" />
          </button>
        </div>

        {/* WhatsApp Background Chat Pane */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-3 relative"
          style={{
            backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
            backgroundBlendMode: 'overlay',
            backgroundColor: '#efeae2'
          }}
        >
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === (user?.id || user?.uid);
            return (
              <div
                key={msg.id || idx}
                className={cn(
                  "flex flex-col max-w-[80%] rounded-2xl p-2.5 shadow-sm text-left relative",
                  isMe 
                    ? "bg-[#d9fdd3] text-gray-800 ml-auto rounded-tr-none border border-[#c6ebbf]"
                    : "bg-white text-gray-800 mr-auto rounded-tl-none border border-gray-200"
                )}
              >
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-1 shrink-0">
                    <span className="text-[10px] font-black text-emerald-800">{msg.senderName}</span>
                    <span className="text-[8px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/50 rounded px-1 uppercase tracking-wider">{msg.senderRole?.replace('_', ' ')}</span>
                  </div>
                )}
                {msg.attachment && (
                  <div className="rounded-lg overflow-hidden max-h-[160px] mb-1.5 border border-black/5 bg-black/5 flex items-center justify-center">
                    <img src={msg.attachment} className="w-full h-full object-cover max-w-full" alt="Attachment" referrerPolicy="no-referrer" />
                  </div>
                )}
                <p className="text-[12px] font-medium leading-relaxed break-words">{msg.message}</p>
                <span className="text-[8px] font-bold text-gray-400 text-right mt-1 block">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="bg-[#f0f2f5] p-3 border-t border-gray-200 shrink-0 space-y-2">
          {attachment && (
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-500">
              <div className="flex items-center gap-2 truncate">
                <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Image Attached (Max 2MB)</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="text-red-500 hover:text-red-700 bg-transparent border-none cursor-pointer"
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer shrink-0">
              <ImageIcon className="w-5 h-5 text-gray-600" />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <input
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-white border border-gray-100 rounded-full px-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-gray-800"
            />

            <button
              type="submit"
              disabled={loading || (!inputText.trim() && !attachment)}
              className="p-2.5 bg-emerald-700 text-white rounded-full hover:bg-emerald-800 disabled:opacity-50 border-none flex items-center justify-center shrink-0 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
