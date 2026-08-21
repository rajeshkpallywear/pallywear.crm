import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, Volume2, VolumeX, Maximize2, Sparkles, Shield, Zap,
  CheckCircle2, ArrowRight, ShoppingBag, Layers, Flame, Star, Award,
  ChevronDown, ChevronRight, Share2, Info, HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import HelpCenterModal from '../components/HelpCenterModal';

// Sample video loops for Pallywear Flagship Uppers
const FLAGSHIP_ITEMS = [
  {
    id: 'tactical-upper',
    title: 'Flagship Tactical Zip Upper',
    category: 'Heavyweight Outerwear',
    gsm: '480 GSM',
    price: '₹2,999',
    badge: 'FLAGSHIP #1',
    description: 'Engineered for extreme durability. Features 480 GSM double-knitted fleece, waterproof YKK tactical zippers, and 3D high-density embroidery.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-black-jacket-41544-large.mp4',
    poster: 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=1200&auto=format&fit=crop',
    specs: ['480 GSM Double Fleece', 'Water-repellent Coating', '3D Puff Embroidery', 'Unisex Oversized Cut']
  },
  {
    id: 'heavyweight-hoodie',
    title: 'Flagship Oversized Hoodie',
    category: 'Urban Luxury Upper',
    gsm: '450 GSM',
    price: '₹2,499',
    badge: 'BESTSELLER',
    description: 'Ultra-soft organic cotton blend with double-layered hood structure and reinforced drop-shoulder design.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-man-wearing-a-hoodie-and-sunglasses-42864-large.mp4',
    poster: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1200&auto=format&fit=crop',
    specs: ['100% Ring-Spun Cotton', 'Double Layer Hood', 'Kangaroo Pocket with Secret Zip', 'Pre-Shrunk Fabric']
  },
  {
    id: 'varsity-edition',
    title: 'Flagship Varsity Leather Upper',
    category: 'Heritage Outerwear',
    gsm: '520 GSM',
    price: '₹4,499',
    badge: 'LIMITED EDITION',
    description: 'Premium Melton wool body paired with eco-leather sleeves and hand-stitched chenille varsity patches.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-model-posing-in-a-black-leather-jacket-41543-large.mp4',
    poster: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&auto=format&fit=crop',
    specs: ['Heavy Melton Wool Body', 'Vegan Leather Sleeves', 'Custom Chenille Patches', 'Quilted Satin Lining']
  },
  {
    id: 'tech-windbreaker',
    title: 'Flagship Tech Windbreaker',
    category: 'Performance Upper',
    gsm: '320 GSM',
    price: '₹2,799',
    badge: 'NEW ARRIVAL',
    description: 'Ultralight weather-defying nylon shell with thermal micro-mesh ventilation and 3M reflective branding.',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-man-posing-in-a-fashion-shoot-41545-large.mp4',
    poster: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?q=80&w=1200&auto=format&fit=crop',
    specs: ['3M Reflective Piping', 'Windproof Shell', 'Packable Hood', 'Adjustable Bungee Hem']
  }
];

export default function FlagshipUpper() {
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedSize, setSelectedSize] = useState('L');
  const [selectedColor, setSelectedColor] = useState('Obsidian Black');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const currentItem = FLAGSHIP_ITEMS[selectedItemIndex];

  // Auto play handler
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.log('Autoplay prevented or video loading:', err);
      });
    }
  }, [selectedItemIndex]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInquirySuccess(true);
    setTimeout(() => {
      setInquirySuccess(false);
      setShowOrderModal(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 animate-spin-slow" />
        <span>PALLYWEAR FLAGSHIP UPPER COLLECTION • 2024 AUTOPLAY VIDEO EDITION</span>
        <span className="hidden sm:inline bg-white/20 px-2 py-0.5 rounded text-[10px]">FREE EXPRESS DELIVERY</span>
      </div>

      {/* Main Header */}
      <header className="fixed top-8 left-0 right-0 z-50 px-6 lg:px-12 py-4 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/Pallywear" className="flex items-center gap-3">
            <Logo />
            <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-full text-[10px] font-black uppercase tracking-widest">
              Flagship Upper
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-300">
          <a href="#video-showcase" className="hover:text-cyan-400 transition-colors">Video Showcase</a>
          <a href="#specs" className="hover:text-cyan-400 transition-colors">Specs & GSM</a>
          <a href="#collection" className="hover:text-cyan-400 transition-colors">Lineup</a>
          <button
            onClick={() => setShowHelpCenter(true)}
            className="hover:text-cyan-400 transition-colors flex items-center gap-1 text-slate-400"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Shipping & Return Policy
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowOrderModal(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            Order Flagship
          </button>
        </div>
      </header>

      {/* Hero Video Section with Automatic Video Run */}
      <section id="video-showcase" className="relative pt-28 pb-16 px-6 lg:px-12 max-w-7xl mx-auto min-h-screen flex flex-col justify-center">
        
        {/* Background Video Card with AutoPlay */}
        <div className="relative w-full h-[65vh] lg:h-[75vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-slate-900 group">
          
          {/* HTML5 Autoplay Video Element */}
          <video
            ref={videoRef}
            src={currentItem.videoUrl}
            poster={currentItem.poster}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover transition-opacity duration-700"
          />

          {/* Dark Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

          {/* Top Floating Badge */}
          <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
            <span className="px-3.5 py-1.5 bg-cyan-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-full shadow-lg">
              {currentItem.badge}
            </span>
            <span className="px-3.5 py-1.5 bg-black/60 backdrop-blur-md text-white border border-white/20 text-xs font-bold rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              AUTO PLAYING VIDEO
            </span>
          </div>

          {/* Video Control Buttons Overlay */}
          <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all hover:scale-110 cursor-pointer"
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all hover:scale-110 cursor-pointer"
              title={isPlaying ? "Pause Video" : "Play Video"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 text-cyan-400 fill-cyan-400" />}
            </button>
            <button
              onClick={handleFullscreen}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all hover:scale-110 cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Video Info Overlay */}
          <div className="absolute bottom-8 left-8 right-8 z-20 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-1 flex items-center gap-2">
                <Flame className="w-4 h-4 fill-cyan-400" /> {currentItem.category} • {currentItem.gsm}
              </p>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-3">
                {currentItem.title}
              </h1>
              <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
                {currentItem.description}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowOrderModal(true)}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-6 py-3.5 rounded-2xl text-xs uppercase tracking-wider shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 flex items-center gap-2 cursor-pointer"
              >
                Inquire & Order • {currentItem.price}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Video Reel Selector Bar (Bottom Thumbnail Strip) */}
        <div id="collection" className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {FLAGSHIP_ITEMS.map((item, idx) => {
            const isSelected = selectedItemIndex === idx;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedItemIndex(idx)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-cyan-950/60 border-cyan-500 shadow-xl shadow-cyan-500/10'
                    : 'bg-slate-900/50 border-white/10 hover:border-white/30 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 relative">
                    <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-cyan-500/30 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block truncate">
                      {item.gsm}
                    </span>
                    <p className="text-xs font-bold text-white truncate">{item.title}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>{item.price}</span>
                  <span className="text-cyan-400 font-bold group-hover:translate-x-1 transition-transform">
                    {isSelected ? 'Playing...' : 'Play Video →'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Technical Specifications & GSM Highlights */}
      <section id="specs" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full text-xs font-black uppercase tracking-widest">
            Engineering Precision
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mt-4 mb-4">
            Built Different. Crafted to Perfection.
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Every Pallywear Flagship Upper is designed using custom 450+ GSM heavy-fleece fabrics, vector digitizer embroidery, and high-tensile stitching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Spec Card 1 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-cyan-500/50 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">450+ GSM Heavy Fleece</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Double-combed ring-spun cotton that retains warmth, structure, and premium weight after hundreds of washes.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Anti-Pilling Brushed Interior
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Pre-Shrunk 0% Shrinkage Guaranteed
              </li>
            </ul>
          </div>

          {/* Spec Card 2 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-cyan-500/50 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-6">
              <Zap className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">3D Puff Embroidery</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Digitized by in-house master embroidery engineers with 35,000+ stitches per logo for unparalleled tactile depth.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                Japanese Tajima Thread Technology
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                Colorfast & Fade Resistant
              </li>
            </ul>
          </div>

          {/* Spec Card 3 */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-cyan-500/50 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6">
              <Shield className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Thermal Weather Shield</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Water-resistant outer membrane combined with wind-blocking rib cuffs for maximum comfort in harsh weather.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                Heavy Duty YKK Metal Zippers
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                Reinforced Ribbing at Hem & Wrists
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-12 max-w-7xl mx-auto border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="text-[10px] text-slate-500">© 2024 Pallywear Flagship Division</span>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={() => setShowHelpCenter(true)} className="hover:text-white transition-colors">
            Shipping & Return Policy
          </button>
          <Link to="/Pallywear" className="hover:text-white transition-colors">Store</Link>
          <Link to="/login" className="hover:text-white transition-colors">Staff Login</Link>
        </div>
      </footer>

      {/* Order / Inquiry Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl text-left"
            >
              <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-cyan-400" />
                Order Flagship Upper
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Selected: <span className="text-cyan-300 font-bold">{currentItem.title}</span> ({currentItem.price})
              </p>

              {inquirySuccess ? (
                <div className="p-6 bg-cyan-950/80 border border-cyan-500/40 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-cyan-400 mx-auto animate-bounce" />
                  <h4 className="text-base font-bold text-white">Inquiry Received!</h4>
                  <p className="text-xs text-slate-300">
                    Our sales representative will reach out to you within 15 minutes to confirm sizing and custom embroidery options.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Phone / WhatsApp Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Size</label>
                      <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="S">S (38")</option>
                        <option value="M">M (40")</option>
                        <option value="L">L (42")</option>
                        <option value="XL">XL (44")</option>
                        <option value="XXL">XXL (46")</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Colorway</label>
                      <select
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="Obsidian Black">Obsidian Black</option>
                        <option value="Deep Royal Blue">Deep Royal Blue</option>
                        <option value="Cyber Slate">Cyber Slate</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowOrderModal(false)}
                      className="w-1/3 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20"
                    >
                      Confirm Order
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help Center Policy Modal */}
      <HelpCenterModal
        isOpen={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
        defaultTab="Shipping & Returns"
      />
    </div>
  );
}
