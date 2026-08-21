import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Truck, RotateCcw, Package, Zap, HelpCircle, 
  Ruler, Mail, BookOpen, Leaf, Briefcase, ShieldCheck, 
  ChevronRight, ArrowRight, CheckCircle2, Phone, MapPin
} from 'lucide-react';

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
}

export const HelpCenterModal: React.FC<HelpCenterModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'Shipping & Returns'
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const tabs = [
    { id: 'FAQ', label: 'FAQ', icon: HelpCircle },
    { id: 'Shipping & Returns', label: 'Shipping & Returns', icon: Truck },
    { id: 'Size Guide', label: 'Size Guide', icon: Ruler },
    { id: 'Contact Us', label: 'Contact Us', icon: Mail },
    { id: 'Our Story', label: 'Our Story', icon: BookOpen },
    { id: 'Sustainability', label: 'Sustainability', icon: Leaf },
    { id: 'Careers', label: 'Careers', icon: Briefcase },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-4xl bg-slate-300 rounded-3xl shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="bg-slate-300/90 px-6 py-4 flex items-center justify-between border-b border-slate-400/30">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚚</span>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                {activeTab === 'Shipping & Returns' ? 'Shipping & Return Policy' : activeTab}
              </h2>
              <span className="px-3 py-1 bg-cyan-100/90 text-cyan-800 text-xs font-bold rounded-full border border-cyan-300/50 shadow-xs">
                PallyWear Help Center
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/50 hover:bg-white/90 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all cursor-pointer shadow-xs"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Tabs Row */}
          <div className="bg-slate-300 px-6 py-3 border-b border-slate-400/30 overflow-x-auto scrollbar-none flex gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-md scale-105'
                      : 'bg-slate-200/80 text-slate-600 hover:bg-white/60 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* MAIN CONTENT AREA - BLUE BACKGROUND */}
          <div className="flex-1 bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 overflow-y-auto relative min-h-[420px]">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* 4 Floating Corner Feature Cards / Icons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 relative z-10">
              {/* Card 1: Fast Shipping (🚚 Top-Left) */}
              <div className="bg-blue-800/40 backdrop-blur-md border border-blue-400/30 rounded-2xl p-5 hover:border-blue-400/60 transition-all hover:bg-blue-800/60 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    🚚
                  </div>
                  <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-400/30">
                    2-4 Days
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">Express Nationwide Shipping</h3>
                <p className="text-xs text-blue-200/80 leading-relaxed">
                  All standard & custom apparel orders are dispatched with priority tracking across India.
                </p>
              </div>

              {/* Card 2: Easy Returns (🔄 Top-Right) */}
              <div className="bg-indigo-800/40 backdrop-blur-md border border-indigo-400/30 rounded-2xl p-5 hover:border-indigo-400/60 transition-all hover:bg-indigo-800/60 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    🔄
                  </div>
                  <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-400/30">
                    7 Days Guarantee
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">Hassle-Free Returns</h3>
                <p className="text-xs text-indigo-200/80 leading-relaxed">
                  Easy return and exchange request process within 7 days of order delivery.
                </p>
              </div>

              {/* Card 3: Inspected Packaging (📦 Bottom-Left) */}
              <div className="bg-sky-800/40 backdrop-blur-md border border-sky-400/30 rounded-2xl p-5 hover:border-sky-400/60 transition-all hover:bg-sky-800/60 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    📦
                  </div>
                  <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 bg-sky-500/20 text-sky-300 rounded-full border border-sky-400/30">
                    Quality Checked
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">Inspected Packaging</h3>
                <p className="text-xs text-sky-200/80 leading-relaxed">
                  Every product undergoes rigorous 5-point quality inspection before sealing.
                </p>
              </div>

              {/* Card 4: Express Support (⚡ Bottom-Right) */}
              <div className="bg-blue-900/50 backdrop-blur-md border border-blue-400/30 rounded-2xl p-5 hover:border-blue-400/60 transition-all hover:bg-blue-900/70 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    ⚡
                  </div>
                  <span className="text-[10px] font-black tracking-wider uppercase px-2.5 py-1 bg-cyan-500/20 text-cyan-300 rounded-full border border-cyan-400/30">
                    24/7 Desk
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">Instant Support Desk</h3>
                <p className="text-xs text-cyan-200/80 leading-relaxed">
                  Dedicated customer assistance for custom embroidery, sizing, and order tracking.
                </p>
              </div>
            </div>

            {/* Tab Specific Content */}
            <div className="bg-blue-950/60 backdrop-blur-xl border border-blue-400/20 rounded-2xl p-6 relative z-10">
              {activeTab === 'Shipping & Returns' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-blue-300 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    PallyWear Detailed Policy Breakdown
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-100/90">
                    <div className="p-4 bg-blue-900/30 rounded-xl border border-blue-500/20">
                      <p className="font-bold text-white mb-1">Dispatch Timelines</p>
                      <p className="text-blue-200/70 leading-relaxed">
                        Standard catalog orders ship within 24-48 hours. Custom embroidery and batch orders dispatch within 3-5 business days.
                      </p>
                    </div>
                    <div className="p-4 bg-blue-900/30 rounded-xl border border-blue-500/20">
                      <p className="font-bold text-white mb-1">Return Eligibility</p>
                      <p className="text-blue-200/70 leading-relaxed">
                        Items must be unworn, in original packaging with tags intact. Customized items are eligible for replacement if defect is verified.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'FAQ' && (
                <div className="space-y-3 text-xs text-blue-100/90">
                  <h4 className="text-sm font-black text-blue-300 uppercase tracking-widest">Frequently Asked Questions</h4>
                  <div className="p-3 bg-blue-900/30 rounded-xl border border-blue-500/20">
                    <p className="font-bold text-white mb-1">Q: How do I track my order?</p>
                    <p className="text-blue-200/70">A: Use your AWB tracking number sent via SMS/WhatsApp or view real-time status in your dashboard.</p>
                  </div>
                  <div className="p-3 bg-blue-900/30 rounded-xl border border-blue-500/20">
                    <p className="font-bold text-white mb-1">Q: Can I modify my custom embroidery design after ordering?</p>
                    <p className="text-blue-200/70">A: Modifications are accepted within 4 hours of placing the order before digitizer production starts.</p>
                  </div>
                </div>
              )}

              {activeTab === 'Size Guide' && (
                <div className="space-y-3 text-xs text-blue-100/90">
                  <h4 className="text-sm font-black text-blue-300 uppercase tracking-widest">Apparel Size Specifications</h4>
                  <p className="text-blue-200/80">All measurements are in inches. Regular fit conforms to standard Indian sizing guidelines.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-blue-400/30 text-blue-300">
                          <th className="py-2 px-3">Size</th>
                          <th className="py-2 px-3">Chest (in)</th>
                          <th className="py-2 px-3">Length (in)</th>
                          <th className="py-2 px-3">Shoulder (in)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-500/20">
                        <tr><td className="py-2 px-3 font-bold text-white">S</td><td className="py-2 px-3">38</td><td className="py-2 px-3">26</td><td className="py-2 px-3">16.5</td></tr>
                        <tr><td className="py-2 px-3 font-bold text-white">M</td><td className="py-2 px-3">40</td><td className="py-2 px-3">27</td><td className="py-2 px-3">17.5</td></tr>
                        <tr><td className="py-2 px-3 font-bold text-white">L</td><td className="py-2 px-3">42</td><td className="py-2 px-3">28</td><td className="py-2 px-3">18.5</td></tr>
                        <tr><td className="py-2 px-3 font-bold text-white">XL</td><td className="py-2 px-3">44</td><td className="py-2 px-3">29</td><td className="py-2 px-3">19.5</td></tr>
                        <tr><td className="py-2 px-3 font-bold text-white">XXL</td><td className="py-2 px-3">46</td><td className="py-2 px-3">30</td><td className="py-2 px-3">20.5</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'Contact Us' && (
                <div className="space-y-4 text-xs text-blue-100/90">
                  <h4 className="text-sm font-black text-blue-300 uppercase tracking-widest">Get in Touch with PallyWear</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-blue-900/30 rounded-xl border border-blue-500/20">
                      <Mail className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="font-bold text-white">Email Support</p>
                        <p className="text-blue-200/70">support@pallywear.in</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-900/30 rounded-xl border border-blue-500/20">
                      <Phone className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="font-bold text-white">Helpline</p>
                        <p className="text-blue-200/70">+91 (800) 425-7255</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(activeTab === 'Our Story' || activeTab === 'Sustainability' || activeTab === 'Careers') && (
                <div className="space-y-3 text-xs text-blue-100/90">
                  <h4 className="text-sm font-black text-blue-300 uppercase tracking-widest">{activeTab}</h4>
                  <p className="text-blue-200/80 leading-relaxed">
                    PallyWear is committed to crafting high-performance custom apparel and digital workflow solutions with eco-friendly fabrics, ethical manufacturing, and cutting-edge embroidery technology.
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default HelpCenterModal;
