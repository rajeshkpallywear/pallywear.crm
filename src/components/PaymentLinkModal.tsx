import React, { useState } from 'react';
import {
  X,
  CreditCard,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Building,
  RefreshCw,
  QrCode,
  Share2
} from 'lucide-react';
import { Order } from '../types';

interface PaymentLinkModalProps {
  order: Order | any;
  onClose: () => void;
}

export default function PaymentLinkModal({ order, onClose }: PaymentLinkModalProps) {
  const [selectedPct, setSelectedPct] = useState<'50' | '100'>('50');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isGeneratingRzpLink, setIsGeneratingRzpLink] = useState(false);
  const [rzpDirectLink, setRzpDirectLink] = useState<string | null>(null);

  const cleanId = String(order.id || '').replace(/#/g, '');
  const displayId = order.id ? (String(order.id).startsWith('#') ? order.id : `#${cleanId.slice(-8)}`) : '#ORD';
  const customerName = order.customerInfo?.name || order.customerName || 'Valued Client';
  const rawPhone = order.customerInfo?.phone || order.customerPhone || '';
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

  const totalAmount = Number(order.financials?.totalAmount || order.totalAmount || 0);
  const advancePay = Number(order.financials?.advancePay || order.advancePay || 0);
  const balanceAmount = Number(order.financials?.balanceAmount || order.balanceAmount || Math.max(0, totalAmount - advancePay));

  const amount50 = Math.round(totalAmount * 0.5);
  const amount100 = balanceAmount > 0 ? balanceAmount : totalAmount;
  const currentPayable = selectedPct === '50' ? (amount50 > 0 ? amount50 : Math.round(totalAmount * 0.5)) : (amount100 > 0 ? amount100 : totalAmount);

  const websiteLink = `${window.location.origin}/pay/${encodeURIComponent(cleanId)}?pct=${selectedPct}`;
  const websiteLink50 = `${window.location.origin}/pay/${encodeURIComponent(cleanId)}?pct=50`;
  const websiteLink100 = `${window.location.origin}/pay/${encodeURIComponent(cleanId)}?pct=100`;

  const merchantUpi = 'vyapar.174560971939@hdfcbank';

  const generateWhatsAppMessage = (pct: '50' | '100') => {
    const amt = pct === '50' ? amount50 : amount100;
    const link = pct === '50' ? websiteLink50 : websiteLink100;
    const label = pct === '50' ? '50% Advance Payment' : '100% Full Payment';

    return `Hello ${customerName}! 👋\n` +
      `Thank you for choosing *Pallywear*! 👕✨\n\n` +
      `Here are the payment details for your Order *${displayId}*:\n` +
      `📦 Items: ${order.category || 'Apparel'} (${order.quantity || 1} pcs)\n` +
      `💰 Total Order Value: ₹${totalAmount.toLocaleString('en-IN')}\n` +
      `💳 *${label}: ₹${amt.toLocaleString('en-IN')}*\n\n` +
      `🔗 *Click here to Pay securely online via Razorpay (UPI / GPay / PhonePe / Card / NetBanking):*\n` +
      `${link}\n\n` +
      `Please let us know once the payment is completed. Thank you! 🙏`;
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleSendWhatsApp = (pct: '50' | '100') => {
    const message = generateWhatsAppMessage(pct);
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const waUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleCreateDirectRazorpayLink = async () => {
    setIsGeneratingRzpLink(true);
    try {
      const res = await fetch('/api/payments/razorpay/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: cleanId,
          amount: currentPayable,
          paymentType: selectedPct,
          customerName,
          customerPhone: cleanPhone,
          description: `Pallywear Order ${displayId} (${selectedPct === '50' ? '50% Advance' : 'Full Payment'})`
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.paymentLink) {
        setRzpDirectLink(data.paymentLink);
      } else {
        alert(data.message || 'Could not generate Razorpay short link. You can use your website payment link.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error generating Razorpay link.');
    } finally {
      setIsGeneratingRzpLink(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl text-slate-100 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Share Razorpay Payment Link
              </h3>
              <p className="text-xs text-slate-400">Order {displayId} • {customerName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Order Snapshot */}
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Order Value</span>
              <span className="text-2xl font-black text-white">₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
            {advancePay > 0 && (
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">Already Paid</span>
                <span className="text-sm font-bold text-emerald-300">₹{advancePay.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Amount Selection: 50% vs 100% */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2.5">
              1. Choose Payment Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setSelectedPct('50'); setRzpDirectLink(null); }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  selectedPct === '50'
                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-lg shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-800/30 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase text-indigo-400">50% Advance</span>
                  {selectedPct === '50' && <div className="w-2 h-2 rounded-full bg-indigo-400" />}
                </div>
                <div className="text-xl font-black text-white">₹{amount50.toLocaleString('en-IN')}</div>
                <span className="text-[10px] text-slate-400">Start design & production</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedPct('100'); setRzpDirectLink(null); }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  selectedPct === '100'
                    ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-lg shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-800/30 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase text-emerald-400">100% Full Payment</span>
                  {selectedPct === '100' && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                </div>
                <div className="text-xl font-black text-white">₹{amount100.toLocaleString('en-IN')}</div>
                <span className="text-[10px] text-slate-400">Full order clearance</span>
              </button>
            </div>
          </div>

          {/* Website Payment Link Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                2. Website Razorpay Payment Link
              </label>
              <a
                href={websiteLink}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
              >
                <ExternalLink size={12} /> Open Preview
              </a>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-300 font-mono truncate select-all">
                {websiteLink}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(websiteLink, 'website')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 border-none cursor-pointer"
              >
                {copiedType === 'website' ? (
                  <>
                    <Check size={14} className="text-emerald-300" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              3. Send to Customer
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* WhatsApp Button */}
              <button
                type="button"
                onClick={() => handleSendWhatsApp(selectedPct)}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all border-none cursor-pointer active:scale-98"
              >
                <MessageSquare size={16} /> Send via WhatsApp
              </button>

              {/* Copy Full WhatsApp Text */}
              <button
                type="button"
                onClick={() => handleCopy(generateWhatsAppMessage(selectedPct), 'waText')}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                {copiedType === 'waText' ? (
                  <>
                    <Check size={16} className="text-emerald-400" /> Message Copied!
                  </>
                ) : (
                  <>
                    <Share2 size={16} /> Copy WhatsApp Text
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Razorpay Short Link Generator (Optional Direct rzp.io link) */}
          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-400" />
                Direct Razorpay Short Link (rzp.io)
              </span>
              <button
                type="button"
                onClick={handleCreateDirectRazorpayLink}
                disabled={isGeneratingRzpLink}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-700 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingRzpLink ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> Generating...
                  </>
                ) : (
                  'Generate rzp.io Link'
                )}
              </button>
            </div>
            {rzpDirectLink && (
              <div className="bg-slate-900 p-2.5 rounded-xl border border-indigo-500/40 flex items-center justify-between text-xs font-mono">
                <span className="text-indigo-300 truncate">{rzpDirectLink}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(rzpDirectLink, 'rzpDirect')}
                  className="text-xs text-white hover:text-indigo-200 flex items-center gap-1 ml-2 font-sans font-bold border-none bg-transparent cursor-pointer"
                >
                  {copiedType === 'rzpDirect' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            )}
          </div>


        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck size={14} /> Razorpay Live Active
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all border border-slate-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
