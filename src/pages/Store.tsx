import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import {
  Menu, X, TrendingUp, User, Zap, BarChart3, Layout, Globe, Shield,
  Monitor, Smartphone, MessageSquare, Send, CheckCircle2, AlertCircle, PlusCircle, Sparkles, Settings, ShoppingBag, Tag,
  Package, DollarSign, Users, Flame, Bell, ChevronRight, Activity, ArrowUpRight, Search, Layers, Clock, Lock, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';
import HelpCenterModal from '../components/HelpCenterModal';

export default function Store() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'system' | 'mobile'>('system');
  const [activeMobileTab, setActiveMobileTab] = useState<'store' | 'orders' | 'leads' | 'invoices' | 'chat'>('store');
  const [showSettings, setShowSettings] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [helpTab, setHelpTab] = useState('Shipping & Returns');
  const [tempApiUrl, setTempApiUrl] = useState(localStorage.getItem('pallywear_api_url') || 'https://pallywear.in');

  const saveSettings = () => {
    let url = tempApiUrl.trim();
    if (url) {
      url = url.replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d{4,5})/, '$1:$2');
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
      }
      if (url.includes('118.139.167.81')) {
        url = url.replace('https://', 'http://');
      }
      localStorage.setItem('pallywear_api_url', url);
    } else {
      localStorage.setItem('pallywear_api_url', 'https://pallywear.in');
    }
    setShowSettings(false);
    window.location.reload();
  };

  // Interactive mobile simulation state
  const [leadsList, setLeadsList] = useState([
    { name: 'Jane Cooper', status: 'Warm', val: '₹93,500', time: '5m ago' },
    { name: 'Arlene McCoy', status: 'Hot', val: '₹1,20,000', time: '1h ago' },
    { name: 'Dianne Russell', status: 'Pending', val: '₹17,300', time: '3h ago' }
  ]);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadValue, setNewLeadValue] = useState('');

  const [invoicesList, setInvoicesList] = useState([
    { id: 'INV-420', name: 'Nexon Prints', val: '₹22,400', status: 'Paid' },
    { id: 'INV-421', name: 'Garment Hub', val: '₹18,100', status: 'Pending' },
    { id: 'INV-422', name: 'Apex Apparel', val: '₹34,500', status: 'Overdue' }
  ]);

  const [chatMessages, setChatMessages] = useState([
    { sender: 'Digitizer', role: 'Embroidery Desk', text: 'Vector design is ready. Pls review the stitch density.', time: '10:14 AM' },
    { sender: 'Sales Rep', role: 'You', text: 'Thanks. Customer approved V2. Sending to production.', time: '10:16 AM' }
  ]);
  const [newChatMessage, setNewChatMessage] = useState('');

  // Handle adding lead in mobile preview
  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;
    const valFormatted = newLeadValue ? `₹${Number(newLeadValue).toLocaleString('en-IN')}` : '₹0';
    setLeadsList([
      { name: newLeadName, status: 'Hot', val: valFormatted, time: 'Just now' },
      ...leadsList
    ]);
    setNewLeadName('');
    setNewLeadValue('');
  };

  // Toggle invoice status in mobile preview
  const toggleInvoiceStatus = (id: string) => {
    setInvoicesList(invoicesList.map(inv => {
      if (inv.id === id) {
        const nextStatus = inv.status === 'Paid' ? 'Pending' : inv.status === 'Pending' ? 'Overdue' : 'Paid';
        return { ...inv, status: nextStatus };
      }
      return inv;
    }));
  };

  // Send message in mobile preview chat
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;
    setChatMessages([
      ...chatMessages,
      { sender: 'Sales Rep', role: 'You', text: newChatMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setNewChatMessage('');
  };

  // Auto-detect mobile screen on load to set initial viewMode
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setViewMode('mobile');
    }
  }, []);

  return (
    <div className="min-h-screen bg-white relative selection:bg-brand-primary/10 overflow-x-hidden">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop"
          className="w-full h-full object-cover opacity-10"
          alt="background"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-white via-white/95 to-indigo-50/30" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6 flex items-center justify-between border-b border-gray-100 bg-white/50 backdrop-blur-xl">
        <div className="flex items-center gap-12">
          <Logo />
        </div>

        <div className="flex items-center gap-6">
          <Link to="/login">
            <Button className="bg-gray-900 text-white hover:bg-black rounded-xl px-8 py-2.5 font-bold shadow-xl shadow-gray-200 transition-all hover:scale-105">
              Login
            </Button>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-gray-900"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Hero Content */}
      <main className="relative pt-36 pb-20 px-6 md:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16 min-h-screen">
        <div className="flex-1 text-left z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 mb-6"
          >
            <Zap className="w-3 h-3 text-indigo-600 fill-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600"> now live</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-8xl font-black text-gray-900 mb-8 leading-[0.95] tracking-tight"
          >
            Analytics at <br /> the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">next level</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl text-gray-500 mb-10 max-w-md leading-relaxed font-medium"
          >
            Predict outcomes, automate leads, and scale your business with the world's most powerful sales engine.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-wrap items-center gap-4 mb-8"
          >
            <Link to="/login">
              <Button size="lg" className="bg-[#4F46E5] text-white hover:bg-indigo-700 px-10 py-5 rounded-2xl font-black text-lg shadow-2xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95">
                Join the team
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Visuals & Interactive Models */}
        <div className="flex-1 w-full flex flex-col items-center justify-center relative">
          
          {/* Layout Switcher Toggle */}
          <div className="flex bg-gray-100/90 backdrop-blur-md p-1 rounded-2xl border border-gray-200/50 mb-8 shadow-md z-30">
            <button
              onClick={() => setViewMode('system')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                viewMode === 'system'
                  ? "bg-white text-indigo-600 shadow-md font-black border border-gray-100"
                  : "text-gray-500 hover:text-gray-900 border border-transparent"
              )}
            >
              <Monitor className="w-4 h-4" />
              System Layout
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                viewMode === 'mobile'
                  ? "bg-white text-indigo-600 shadow-md font-black border border-gray-100"
                  : "text-gray-500 hover:text-gray-900 border border-transparent"
              )}
            >
              <Smartphone className="w-4 h-4" />
              Mobile Layout
            </button>
          </div>

          <AnimatePresence mode="wait">
            {viewMode === 'system' ? (
              /* LAPTOP MOCKUP SHOWING PALLYWEAR CRM WEBSITE */
              <motion.div
                key="system-preview"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25 }}
                className="w-full max-w-[660px] flex flex-col items-center select-none"
              >
                {/* ── Laptop Top Lid & Screen ── */}
                <div className="w-full bg-slate-900 rounded-t-2xl sm:rounded-t-[20px] p-2 sm:p-2.5 border-t-2 border-x-2 border-slate-700/80 shadow-2xl relative">
                  {/* Camera Bezel */}
                  <div className="flex items-center justify-center gap-1.5 mb-1 sm:mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center">
                      <span className="w-0.5 h-0.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                  </div>

                  {/* Screen Content Wrapper */}
                  <div className="w-full bg-white rounded-lg overflow-hidden border border-slate-200/50 flex flex-col text-left text-[11px] h-[340px] sm:h-[390px] shadow-inner">
                    {/* Browser & CRM Header */}
                    <div className="px-3 py-1.5 bg-slate-100/90 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
                      {/* Window Controls & CRM Brand */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        </div>
                        <div className="h-3 w-px bg-gray-300 mx-0.5" />
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center text-white text-[8px] font-black">P</div>
                          <span className="text-[10px] font-black text-gray-800 tracking-tight">Pallywear CRM</span>
                        </div>
                      </div>

                      {/* Mock URL Bar */}
                      <div className="flex-1 max-w-[200px] sm:max-w-[240px] bg-white border border-gray-200 rounded-md px-2 py-0.5 flex items-center gap-1.5 text-[9px] text-gray-500 font-mono">
                        <Lock className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                        <span className="truncate text-gray-700 font-medium">crm.pallywear.com/dashboard</span>
                      </div>

                      {/* User & Live Badge */}
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[8px] font-black border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Live
                        </span>
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-black">
                          R
                        </div>
                      </div>
                    </div>

                    {/* CRM Main Workspace Layout */}
                    <div className="flex-1 flex min-h-0 bg-slate-50">
                      {/* Left Mini Sidebar */}
                      <div className="w-28 sm:w-36 bg-slate-900 text-white p-2 flex flex-col justify-between shrink-0">
                        <div className="space-y-1">
                          <div className="px-2 py-1 bg-indigo-600/90 rounded-md flex items-center gap-1.5 text-[9px] font-bold text-white shadow-xs">
                            <Layout className="w-3 h-3 shrink-0" />
                            <span className="truncate">Dashboard</span>
                          </div>
                          <div className="px-2 py-1 rounded-md flex items-center justify-between text-[9px] font-bold text-slate-400 hover:text-white transition-colors">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3 h-3 shrink-0" />
                              <span>Leads</span>
                            </div>
                            <span className="px-1 py-0.5 bg-slate-800 text-[8px] rounded text-slate-300">142</span>
                          </div>
                          <div className="px-2 py-1 rounded-md flex items-center justify-between text-[9px] font-bold text-slate-400 hover:text-white transition-colors">
                            <div className="flex items-center gap-1.5">
                              <Package className="w-3 h-3 shrink-0" />
                              <span>Orders</span>
                            </div>
                            <span className="px-1 py-0.5 bg-slate-800 text-[8px] rounded text-slate-300">28</span>
                          </div>
                          <div className="px-2 py-1 rounded-md flex items-center gap-1.5 text-[9px] font-bold text-slate-400 hover:text-white transition-colors">
                            <Activity className="w-3 h-3 shrink-0" />
                            <span>Invoices</span>
                          </div>
                          <div className="px-2 py-1 rounded-md flex items-center gap-1.5 text-[9px] font-bold text-slate-400 hover:text-white transition-colors">
                            <Sparkles className="w-3 h-3 shrink-0" />
                            <span>Digitizer</span>
                          </div>
                        </div>

                        {/* Sidebar Footer */}
                        <div className="pt-2 border-t border-slate-800/80">
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Pallywear v2.4</p>
                        </div>
                      </div>

                      {/* Main Dashboard Screen View */}
                      <div className="flex-1 p-2.5 sm:p-3 overflow-hidden flex flex-col justify-between space-y-2">
                        {/* Header & Quick Action */}
                        <div className="flex items-center justify-between gap-2 border-b border-gray-200/80 pb-1.5">
                          <div>
                            <p className="text-[11px] font-black text-gray-900">Operations Control Center</p>
                            <p className="text-[8px] text-gray-400 font-medium">Real-time apparel sales & fulfillment telemetry</p>
                          </div>
                          <Link to="/login">
                            <span className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-xs">
                              <PlusCircle className="w-2.5 h-2.5" /> + Order
                            </span>
                          </Link>
                        </div>

                        {/* KPI Cards Grid */}
                        <div className="grid grid-cols-4 gap-1.5">
                          <div className="bg-white p-2 rounded-lg border border-gray-200/70 shadow-xs">
                            <span className="text-[7px] font-black text-gray-400 uppercase tracking-wider block">Revenue</span>
                            <span className="text-[10px] sm:text-xs font-black text-gray-900 block mt-0.5">₹24.85L</span>
                            <span className="text-[7px] font-bold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                              <ArrowUpRight className="w-2 h-2" /> +18.4%
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200/70 shadow-xs">
                            <span className="text-[7px] font-black text-gray-400 uppercase tracking-wider block">Active Leads</span>
                            <span className="text-[10px] sm:text-xs font-black text-indigo-600 block mt-0.5">142</span>
                            <span className="text-[7px] font-bold text-red-500 flex items-center gap-0.5 mt-0.5">
                              <Flame className="w-2 h-2" /> 38 Hot
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200/70 shadow-xs">
                            <span className="text-[7px] font-black text-gray-400 uppercase tracking-wider block">In Production</span>
                            <span className="text-[10px] sm:text-xs font-black text-amber-600 block mt-0.5">34</span>
                            <span className="text-[7px] font-bold text-gray-500 block mt-0.5">128 Delivered</span>
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-gray-200/70 shadow-xs">
                            <span className="text-[7px] font-black text-gray-400 uppercase tracking-wider block">Conv. Rate</span>
                            <span className="text-[10px] sm:text-xs font-black text-emerald-600 block mt-0.5">88.5%</span>
                            <span className="text-[7px] font-bold text-gray-400 block mt-0.5">High Growth</span>
                          </div>
                        </div>

                        {/* Split Row: Mini Chart & Orders Feed */}
                        <div className="grid grid-cols-5 gap-2 flex-1 min-h-0">
                          {/* Mini Revenue Growth Chart Area */}
                          <div className="col-span-2 bg-white p-2 rounded-lg border border-gray-200/70 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[8px] font-black text-gray-800 uppercase tracking-wider">Revenue Growth</span>
                              <span className="text-[7px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">Monthly</span>
                            </div>
                            {/* Stylized CSS Bar / Area Visual */}
                            <div className="h-16 flex items-end gap-1 px-1 pt-1 border-b border-gray-100">
                              {[
                                { h: '35%', label: 'Jan' },
                                { h: '50%', label: 'Feb' },
                                { h: '45%', label: 'Mar' },
                                { h: '70%', label: 'Apr' },
                                { h: '85%', label: 'May' },
                                { h: '100%', label: 'Jun' }
                              ].map((bar, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                                  <div
                                    className={cn(
                                      "w-full rounded-t transition-all",
                                      i === 5 ? "bg-gradient-to-t from-indigo-600 to-purple-600" : "bg-indigo-100 hover:bg-indigo-200"
                                    )}
                                    style={{ height: bar.h }}
                                  />
                                  <span className="text-[6px] text-gray-400 font-bold">{bar.label}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-between text-[7px] font-bold text-gray-500 pt-1">
                              <span>Delivered: ₹18.5L</span>
                              <span className="text-indigo-600">Pipeline: ₹6.3L</span>
                            </div>
                          </div>

                          {/* Live Recent Orders Table */}
                          <div className="col-span-3 bg-white p-2 rounded-lg border border-gray-200/70 shadow-xs flex flex-col justify-between overflow-hidden">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[8px] font-black text-gray-800 uppercase tracking-wider">Live Orders Queue</span>
                              <span className="text-[7px] font-bold text-indigo-600">Auto-sync</span>
                            </div>
                            <div className="space-y-1 overflow-hidden">
                              {[
                                { id: '#ORD-8942', client: 'Godwin (Marketing)', item: 'Sublimation Jersey (500)', amt: '₹1,25,000', status: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                                { id: '#ORD-8943', client: 'Vivek (Marketing)', item: 'Custom Fleece Hoodie (200)', amt: '₹84,000', status: 'Production', color: 'bg-amber-50 text-amber-700 border-amber-200' },
                                { id: '#ORD-8944', client: 'Jimla (Online Team)', item: 'Dry-Fit Uniforms (150)', amt: '₹52,500', status: 'Accounts', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                              ].map((ord, idx) => (
                                <div key={idx} className="flex items-center justify-between p-1 rounded bg-gray-50/70 border border-gray-100 text-[8px]">
                                  <div className="min-w-0 pr-1">
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono font-bold text-gray-800">{ord.id}</span>
                                      <span className="text-gray-400 truncate">• {ord.client}</span>
                                    </div>
                                    <p className="text-[7px] text-gray-500 truncate">{ord.item}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-black text-gray-900 block leading-tight">{ord.amt}</span>
                                    <span className={cn("text-[6px] font-black uppercase px-1 py-0.5 rounded border inline-block", ord.color)}>
                                      {ord.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Laptop Bottom Deck / Base ── */}
                <div className="w-[106%] sm:w-[104%] bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 h-3.5 sm:h-4.5 rounded-b-xl border-t border-slate-600 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative flex items-start justify-center">
                  {/* Laptop Center Opening Lip / Trackpad Notch */}
                  <div className="w-20 sm:w-28 h-1 sm:h-1.5 bg-slate-950 rounded-b-md mx-auto" />
                </div>
                {/* Desk Reflection Shadow */}
                <div className="w-[90%] h-3 bg-indigo-950/20 blur-lg rounded-full mt-1 mx-auto" />
              </motion.div>
            ) : (
              /* MOBILE PREVIEW LAYOUT & SMARTPHONE MODEL */
              <motion.div
                key="mobile-preview"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25 }}
                className="w-full flex justify-center py-2"
              >
                {/* Smartphone Device Mockup Frame */}
                <div className="w-[330px] h-[630px] bg-slate-950 border-8 border-slate-900 rounded-[50px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] relative flex flex-col overflow-hidden ring-4 ring-slate-800">
                  
                  {/* Notch / Dynamic Island */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-900 rounded-full z-50 flex items-center justify-center">
                    <div className="w-3 h-3 bg-slate-950 rounded-full ml-auto mr-3 border border-slate-800" />
                  </div>

                  {/* Simulated Mobile screen wrapper */}
                  <div className="w-full h-full bg-slate-50 flex flex-col relative select-none pt-9 pb-12 overflow-hidden text-left">
                    
                    {/* Status Bar */}
                    <div className="absolute top-0 inset-x-0 h-9 px-6 flex justify-between items-center text-[10px] font-extrabold text-slate-700 bg-white/70 backdrop-blur-md border-b border-gray-100/50 z-40">
                      <span>9:41 AM</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-1.5 bg-slate-800 rounded-sm" />
                        <span className="w-2 h-2 bg-slate-800 rounded-full" />
                      </div>
                    </div>

                    {/* App Header */}
                    <header className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[10px] font-black">P</div>
                        <span className="text-xs font-black text-gray-900 tracking-wider">Pallywear CRM</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                        <span className="text-[8px] bg-green-50 text-green-700 font-extrabold px-1.5 py-0.5 rounded-full border border-green-200 uppercase tracking-widest">Mobile</span>
                      </div>
                    </header>

                    {/* Screen Content Scrollable Area */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                      {activeMobileTab === 'store' && (
                        /* STORE CATALOG TAB */
                        <div className="space-y-4 animate-fade-in text-left">
                          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 rounded-2xl text-white shadow-md">
                            <h4 className="text-sm font-black tracking-tight flex items-center gap-2">
                              <ShoppingBag className="w-5 h-5" /> Sportswear Catalog
                            </h4>
                            <p className="text-[9px] font-bold opacity-75 uppercase tracking-widest mt-1">Direct Custom orders</p>
                          </div>

                          <div className="space-y-2">
                            {[
                              { name: 'Sublimation Jersey', price: '₹450', details: 'Dry-Fit fabric, V-Neck/Collar' },
                              { name: 'Sweatshirt Hoodie', price: '₹850', details: 'Cotton fleece, Premium embroidery' },
                              { name: 'Polo Sportswear', price: '₹550', details: 'Matty cotton, Custom chest logo' }
                            ].map((prod, idx) => (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center hover:border-indigo-100 transition-colors">
                                <div>
                                  <h5 className="text-[11px] font-bold text-gray-900 leading-none mb-1">{prod.name}</h5>
                                  <span className="text-[8px] text-gray-400 font-medium block">{prod.details}</span>
                                </div>
                                <span className="text-xs font-black text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-lg">{prod.price}</span>
                              </div>
                            ))}
                          </div>

                          <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl text-orange-850 text-[10px] leading-relaxed">
                            <span className="font-bold">Apparel Hub:</span> All products are fully custom made to size guidelines and catalog instructions.
                          </div>
                        </div>
                      )}

                      {activeMobileTab === 'leads' && (
                        /* LEADS TAB (WITH LIVE ADD) */
                        <div className="space-y-4 animate-fade-in">
                          {/* Create Lead Form */}
                          <form onSubmit={handleAddLead} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm space-y-2">
                            <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest block mb-1">Add Lead Simulator</span>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                required
                                type="text"
                                placeholder="Lead Name"
                                value={newLeadName}
                                onChange={(e) => setNewLeadName(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <input
                                type="number"
                                placeholder="Value (INR)"
                                value={newLeadValue}
                                onChange={(e) => setNewLeadValue(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5" /> Add Lead
                            </button>
                          </form>

                          {/* Leads List */}
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block px-1">Leads Queue</span>
                            {leadsList.map((lead, idx) => (
                              <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-indigo-100 transition-colors">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-[10px] font-bold">
                                    {lead.name.charAt(0)}
                                  </div>
                                  <div>
                                    <h5 className="text-[11px] font-bold text-gray-800 leading-none mb-1">{lead.name}</h5>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[8px] text-gray-400">{lead.time}</span>
                                      <span className={cn(
                                        "text-[7px] font-bold px-1 py-0.2 rounded uppercase border",
                                        lead.status === 'Hot' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                                      )}>{lead.status}</span>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xs font-black text-gray-900">{lead.val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeMobileTab === 'invoices' && (
                        /* INVOICES TAB */
                        <div className="space-y-4 animate-fade-in">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block px-1">Interactive Invoice Center</span>
                          <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl text-blue-800 text-[9px] leading-relaxed">
                            💡 <span className="font-bold">Tap an invoice</span> card below to toggle its status state live in this preview.
                          </div>
                          
                          <div className="space-y-2">
                            {invoicesList.map((inv, idx) => (
                              <div
                                key={idx}
                                onClick={() => toggleInvoiceStatus(inv.id)}
                                className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-all cursor-pointer hover:shadow-md"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-800">{inv.name}</span>
                                    <span className="text-[8px] font-mono text-gray-400">#{inv.id}</span>
                                  </div>
                                  <span className="text-[10px] font-black text-indigo-600 block mt-1">{inv.val}</span>
                                </div>
                                <span className={cn(
                                  "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all",
                                  inv.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200 shadow-sm shadow-green-50' : inv.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                                )}>
                                  {inv.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeMobileTab === 'chat' && (
                        /* CHAT TAB (WITH LIVE MESSAGES) */
                        <div className="space-y-3 flex flex-col h-[400px] animate-fade-in justify-between">
                          {/* Messages list */}
                          <div className="space-y-2.5 overflow-y-auto max-h-[300px] flex-1 pr-1">
                            {chatMessages.map((msg, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "max-w-[85%] rounded-2xl p-2.5 text-[10px] leading-relaxed shadow-sm",
                                  msg.role === 'You'
                                    ? "bg-indigo-600 text-white ml-auto rounded-tr-none"
                                    : "bg-white text-gray-800 mr-auto rounded-tl-none border border-gray-100"
                                )}
                              >
                                <div className="flex justify-between items-center gap-2 mb-1.5 opacity-80 text-[7px] font-extrabold uppercase tracking-wider">
                                  <span>{msg.sender} ({msg.role})</span>
                                  <span>{msg.time}</span>
                                </div>
                                <p className="font-medium whitespace-pre-wrap">{msg.text}</p>
                              </div>
                            ))}
                          </div>

                          {/* Chat input box */}
                          <form onSubmit={handleSendMessage} className="flex gap-1.5 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
                            <input
                              type="text"
                              placeholder="Type a message..."
                              value={newChatMessage}
                              onChange={(e) => setNewChatMessage(e.target.value)}
                              className="flex-1 bg-gray-50 border-0 outline-none rounded-lg px-2 py-1 text-[10px] focus:ring-0"
                            />
                            <button
                              type="submit"
                              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                            </button>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Simulated Bottom Navigation */}
                    <nav className="absolute bottom-0 inset-x-0 h-12 bg-white border-t border-gray-100/80 px-2 flex justify-around items-center z-40">
                      <button
                        onClick={() => setActiveMobileTab('store')}
                        className={cn(
                          "flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors",
                          activeMobileTab === 'store' ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-[8px] font-bold mt-0.5">Store</span>
                      </button>
                      <button
                        onClick={() => setActiveMobileTab('leads')}
                        className={cn(
                          "flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors",
                          activeMobileTab === 'leads' ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        <User className="w-4 h-4" />
                        <span className="text-[8px] font-bold mt-0.5">Leads</span>
                      </button>
                      <button
                        onClick={() => setActiveMobileTab('invoices')}
                        className={cn(
                          "flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors",
                          activeMobileTab === 'invoices' ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-[8px] font-bold mt-0.5">Billing</span>
                      </button>
                      <button
                        onClick={() => setActiveMobileTab('chat')}
                        className={cn(
                          "flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors",
                          activeMobileTab === 'chat' ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="text-[8px] font-bold mt-0.5">Hub Chat</span>
                      </button>
                    </nav>

                    {/* Home Indicator */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-200 rounded-full z-45" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Decor Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-400/5 blur-[120px] rounded-full pointer-events-none" />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-20 px-6 max-w-7xl mx-auto border-t border-gray-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <Logo />
          <nav className="flex items-center gap-6 flex-wrap justify-center">
            <button
              onClick={() => { setHelpTab('Shipping & Returns'); setShowHelpCenter(true); }}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200"
            >
              🚚 Shipping & Returns
            </button>
            <button
              onClick={() => { setHelpTab('FAQ'); setShowHelpCenter(true); }}
              className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors cursor-pointer"
            >
              Help Center
            </button>
            {['Privacy', 'Contact'].map(item => (
              <button
                key={item}
                onClick={() => { setHelpTab(item === 'Contact' ? 'Contact Us' : 'Shipping & Returns'); setShowHelpCenter(true); }}
                className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors cursor-pointer"
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer">
              <Globe className="w-5 h-5" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-400 font-bold mt-12 uppercase tracking-[0.3em]">© 2024 Pallywear Analytics. All rights reserved.</p>
      </footer>

      {/* Help Center & Policy Modal */}
      <HelpCenterModal
        isOpen={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
        defaultTab={helpTab}
      />

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-2xl w-full max-w-sm border border-gray-100 shadow-2xl relative text-left"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600 animate-spin-slow" />
                Connection Settings
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Configure backend server endpoint.
              </p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                    Backend API Base URL
                  </label>
                  <input
                    type="text"
                    value={tempApiUrl}
                    onChange={(e) => setTempApiUrl(e.target.value)}
                    placeholder="e.g. http://118.139.167.81:3000"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs text-gray-500"
                    onClick={() => setShowSettings(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      localStorage.setItem('pallywear_api_url', 'https://pallywear.in');
                      setTempApiUrl('https://pallywear.in');
                      setShowSettings(false);
                      window.location.reload();
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 text-xs"
                    onClick={saveSettings}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-sm bg-white z-[110] shadow-2xl p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                <Logo />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 hover:bg-gray-100 rounded-2xl transition-colors"
                >
                  <X className="w-8 h-8 text-gray-900" />
                </button>
              </div>

              <div className="space-y-8 flex-1">
              </div>

              <div className="pt-8 border-t border-gray-100">
                <Link to="/login">
                  <Button className="w-full py-5 text-lg font-bold rounded-2xl">Sign In</Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
