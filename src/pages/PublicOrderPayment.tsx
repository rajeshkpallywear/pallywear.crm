import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Phone,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PublicOrderData {
  id: string;
  customerName: string;
  customerCompany: string;
  customerPhone: string;
  category: string;
  quantity: number;
  totalAmount: number;
  advancePay: number;
  balanceAmount: number;
  halfAmount: number;
  fullAmount: number;
  status: string;
  createdAt: number;
}

interface MerchantInfo {
  bankName: string;
  branch: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
}

export default function PublicOrderPayment() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialPct = searchParams.get('pct') === '100' ? '100' : '50';

  const [order, setOrder] = useState<PublicOrderData | null>(null);
  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('rzp_live_TZuzF0u3WoDpEh');
  const [paymentType, setPaymentType] = useState<'50' | '100'>(initialPct);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isProcessingRazorpay, setIsProcessingRazorpay] = useState<boolean>(false);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [txnDetails, setTxnDetails] = useState<any>(null);

  // Load Razorpay Script
  useEffect(() => {
    if (!document.getElementById('razorpay-checkout-js')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch order data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/public/orders/${encodeURIComponent(id)}`)
      .then(res => {
        if (!res.ok) throw new Error('Order details not found or expired.');
        return res.json();
      })
      .then(data => {
        if (data.success && data.order) {
          setOrder(data.order);
          setMerchant(data.merchant);
          if (data.razorpayKeyId) setRazorpayKeyId(data.razorpayKeyId);

          // If already has advance or total equals zero
          if (data.order.balanceAmount <= 0 && data.order.advancePay > 0) {
            setPaymentSuccess(true);
          }
        } else {
          setError(data.message || 'Unable to load order details');
        }
      })
      .catch(err => {
        setError(err.message || 'Failed to connect to server');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const getPayableAmount = () => {
    if (!order) return 0;
    if (paymentType === '50') {
      return order.halfAmount > 0 ? order.halfAmount : Math.round(order.totalAmount * 0.5);
    }
    return order.fullAmount > 0 ? order.fullAmount : order.totalAmount;
  };

  const currentAmount = getPayableAmount();

  const handlePayViaRazorpay = async () => {
    if (!order || currentAmount <= 0) return;

    if (!window.Razorpay) {
      alert('Razorpay gateway script is still loading. Please wait 2 seconds and try again.');
      return;
    }

    setIsProcessingRazorpay(true);
    try {
      // 1. Create order on server
      const createRes = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amount: currentAmount,
          paymentType,
          customerName: order.customerName,
          customerPhone: order.customerPhone
        })
      });

      const orderData = await createRes.json();
      if (!createRes.ok || !orderData.success) {
        throw new Error(orderData.message || 'Could not initiate Razorpay transaction');
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.keyId || razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Pallywear',
        description: `Order #${order.id} (${paymentType === '50' ? '50% Advance' : 'Full Payment'})`,
        image: 'https://pallywear.com/wp-content/uploads/2023/10/pallywear-logo.png',
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: order.customerName,
          contact: order.customerPhone || ''
        },
        theme: {
          color: '#1A0B91'
        },
        handler: async function (response: any) {
          try {
            // 3. Verify on server
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: order.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                amountPaid: currentAmount,
                paymentType
              })
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              setTxnDetails({
                paymentId: response.razorpay_payment_id,
                orderId: order.id,
                amount: currentAmount,
                date: new Date().toLocaleString()
              });
              setPaymentSuccess(true);
            } else {
              alert('Payment succeeded but verification failed. Our team will verify it manually.');
            }
          } catch (e: any) {
            console.error('Verification error:', e);
            alert('Payment succeeded. Please note your payment ID: ' + response.razorpay_payment_id);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingRazorpay(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert(`Payment failed: ${response.error.description || 'Transaction declined'}`);
        setIsProcessingRazorpay(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Razorpay Error:', err);
      alert(err.message || 'Failed to open payment gateway. Please try again.');
      setIsProcessingRazorpay(false);
    }
  };

  const cleanOrderDisplay = order?.id ? (order.id.startsWith('#') ? order.id : `#${order.id}`) : '#ORD';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-300 font-semibold text-sm tracking-wide">Loading Secure Payment Gateway...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-100 font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-400">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Order Not Found</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            {error || 'The payment link you visited is invalid or has expired. Please contact your Pallywear representative.'}
          </p>
          <a
            href="tel:+919840000000"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg"
          >
            <Phone size={16} /> Contact Support
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 font-sans antialiased py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Brand Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between pb-6 mb-8 border-b border-white/10 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 font-black text-white text-lg">
              PW
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                PALLYWEAR
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Verified Merchant
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Official Payment Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl">
            <ShieldCheck size={16} /> 256-Bit SSL Encrypted
          </div>
        </header>

        {paymentSuccess ? (
          /* Payment Confirmation Screen */
          <div className="bg-slate-900/90 border border-emerald-500/30 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30 text-white animate-bounce">
              <CheckCircle size={44} />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3 inline-block">
              Payment Successful
            </span>
            <h2 className="text-3xl font-black text-white mb-2">Thank You, {order.customerName}!</h2>
            <p className="text-slate-300 text-sm max-w-md mx-auto mb-6">
              Your payment has been received and confirmed. Our production and design team is actively processing your order.
            </p>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5 max-w-md mx-auto mb-8 text-left space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Order ID:</span>
                <span className="font-bold text-white">{cleanOrderDisplay}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Amount Received:</span>
                <span className="font-black text-emerald-400 text-base">₹{currentAmount.toLocaleString()}</span>
              </div>
              {txnDetails?.paymentId && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Razorpay Payment ID:</span>
                  <span className="font-mono text-indigo-300 text-[11px]">{txnDetails.paymentId}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Items:</span>
                <span className="font-semibold text-slate-200">{order.category} ({order.quantity} pcs)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider border border-slate-700 transition-all cursor-pointer"
              >
                Print / Save Receipt
              </button>
              <a
                href="https://pallywear.com"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 text-center"
              >
                Visit Pallywear.com
              </a>
            </div>
          </div>
        ) : (
          /* Payment Selection & Checkout */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
            {/* Left Column: Order Summary */}
            <div className="space-y-6">
              {/* Order Info Card */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Invoice For</span>
                    <h3 className="text-lg font-black text-white">{order.customerName}</h3>
                    {order.customerCompany && (
                      <p className="text-xs text-slate-400 font-medium">{order.customerCompany}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Order No.</span>
                    <p className="text-base font-black text-white font-mono">{cleanOrderDisplay}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                    <span className="font-bold text-slate-200">{order.category}</span>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Quantity</span>
                    <span className="font-bold text-slate-200">{order.quantity} pcs</span>
                  </div>
                </div>

                {/* Financial Overview */}
                <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Order Value:</span>
                    <span className="font-bold text-white">₹{order.totalAmount.toLocaleString()}</span>
                  </div>
                  {order.advancePay > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Advance Already Paid:</span>
                      <span className="font-bold">₹{order.advancePay.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-300 font-bold pt-2 border-t border-slate-800">
                    <span>Remaining Balance:</span>
                    <span className="text-indigo-400 text-sm">₹{order.balanceAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Selected Payment Tag */}
                <div className="mt-4 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider block">
                      {paymentType === '50' ? '50% Advance Payment' : '100% Full Payment'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {paymentType === '50' ? 'To begin design & start production' : 'Clear entire order value upfront'}
                    </span>
                  </div>
                  <span className="text-lg font-black text-emerald-400">
                    ₹{currentAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Instant Razorpay Online Checkout */}
            <div className="space-y-6">
              <div className="bg-gradient-to-b from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-7 backdrop-blur-xl shadow-xl relative overflow-hidden">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                    <CreditCard size={22} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Instant Online Payment</h4>
                    <p className="text-xs text-slate-400">Cards, UPI, NetBanking, Wallets</p>
                  </div>
                </div>

                <div className="bg-slate-950/70 rounded-2xl p-4 mb-5 border border-slate-800 text-xs flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Paying Now:</span>
                  <span className="text-2xl font-black text-emerald-400">₹{currentAmount.toLocaleString()}</span>
                </div>

                <button
                  type="button"
                  onClick={handlePayViaRazorpay}
                  disabled={isProcessingRazorpay || currentAmount <= 0}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:opacity-95 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isProcessingRazorpay ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Opening Razorpay...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Pay ₹{currentAmount.toLocaleString()} with Razorpay
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-slate-400">
                  <span>Google Pay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>Credit/Debit Cards</span>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-emerald-400/90 font-medium">
                  <ShieldCheck size={14} /> 100% Secure 256-Bit SSL Encrypted Payment powered by Razorpay
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-500 border-t border-white/5 pt-6">
          <p>© {new Date().getFullYear()} Pallywear Gifting Solutions Private Limited. All rights reserved.</p>
          <p className="mt-1 text-[11px] text-slate-600">Need help? Email support@pallywear.com or call your account manager.</p>
        </footer>
      </div>
    </div>
  );
}
