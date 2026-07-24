import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import {
  Menu, X, TrendingUp, User, Zap, BarChart3, Layout, Globe, Shield,
  Monitor, Smartphone, MessageSquare, Send, CheckCircle2, AlertCircle, PlusCircle, Sparkles, Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';

export default function Store() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'system' | 'mobile'>('system');
  const [activeMobileTab, setActiveMobileTab] = useState<'dashboard' | 'orders' | 'leads' | 'invoices' | 'chat'>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
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
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100/50 rounded-xl text-gray-400 hover:text-brand-primary transition-all cursor-pointer"
            title="Connection Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
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
              /* SYSTEM / DESKTOP LAYOUT MODEL */
              <motion.div
                key="system-preview"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25 }}
                className="w-full relative h-[500px] flex items-center justify-center perspective-[2000px]"
              >
                {/* Desktop layout elements shown only on wider screens */}
                <div className="hidden lg:block w-full h-full relative">
                  {/* Primary Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 40, rotateX: 45, rotateZ: -10 }}
                    animate={{ opacity: 1, y: 0, rotateX: 25, rotateZ: -15, rotateY: 5 }}
                    whileHover={{ y: -20, rotateX: 15, rotateY: 10 }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="absolute top-0 right-0 w-[500px] h-80 bg-white/90 backdrop-blur-2xl border border-white rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.1)] p-8 z-20"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="flex justify-between items-start mb-12">
                      <div>
                        <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Live Revenue Stream</h3>
                        <p className="text-5xl font-black text-gray-900 tracking-tighter">₹14,05,862.00</p>
                      </div>
                      <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="h-24 w-full flex items-end gap-1.5 px-2">
                      {[40, 20, 60, 45, 80, 50, 90, 70, 85, 45, 65, 55].map((h, i) => (
                        <div key={i} className="flex-1 bg-indigo-600/10 rounded-t-xl relative overflow-hidden h-full">
                          <div className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-full" style={{ height: `${h}%` }} />
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* User List Card */}
                  <motion.div
                    initial={{ opacity: 0, x: -40, rotateX: 45, rotateZ: -10 }}
                    animate={{ opacity: 1, x: 0, rotateX: 25, rotateZ: -15, rotateY: 5 }}
                    whileHover={{ x: -20, rotateY: 0 }}
                    className="absolute -bottom-5 left-0 w-[380px] bg-white/90 backdrop-blur-2xl border border-white rounded-[32px] shadow-[0_40px_80px_rgba(0,0,0,0.1)] p-8 z-30"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Active Leads</h4>
                    </div>
                    <div className="space-y-4">
                      {[
                        { name: 'Jane Cooper', status: 'Completed', val: '₹93,500', color: 'bg-green-100 text-green-600' },
                        { name: 'Arlene McCoy', status: 'Completed', val: '₹12,099', color: 'bg-green-100 text-green-600' }
                      ].map((u, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/20 hover:bg-indigo-50/50 transition-all border border-transparent hover:border-indigo-100 group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 p-2 text-indigo-500">
                              <User className="w-full h-full" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900">{u.name}</p>
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{u.status}</span>
                            </div>
                          </div>
                          <p className="text-xs font-black text-gray-900 tracking-tighter">{u.val}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Flat System layout mockup fallback on smaller screens (<1024px) */}
                <div className="lg:hidden w-full max-w-sm flex flex-col gap-6 px-4">
                  <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-xl">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Live Revenue Stream</h3>
                        <p className="text-3xl font-black text-gray-900 tracking-tighter">₹14,05,862.00</p>
                      </div>
                      <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="h-16 w-full flex items-end gap-1 px-1">
                      {[30, 20, 50, 45, 75, 40, 80, 60, 70, 45, 55, 50].map((h, i) => (
                        <div key={i} className="flex-1 bg-indigo-100 rounded-t-lg h-full relative">
                          <div className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-lg" style={{ height: `${h}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-xl">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">Active Leads</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Jane Cooper', status: 'Completed', val: '₹93,500' },
                        { name: 'Arlene McCoy', status: 'Completed', val: '₹12,099' }
                      ].map((u, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                              <User className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-black text-gray-900">{u.name}</span>
                          </div>
                          <span className="text-xs font-black text-gray-900">{u.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
                      {activeMobileTab === 'dashboard' && (
                        /* DASHBOARD TAB */
                        <div className="space-y-4 animate-fade-in">
                          {/* Welcome Profile */}
                          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 rounded-2xl text-white shadow-md shadow-indigo-100">
                            <div>
                              <p className="text-[9px] font-bold opacity-75 uppercase tracking-widest">Logged In</p>
                              <h4 className="text-sm font-black tracking-tight">Arun Kumar</h4>
                              <p className="text-[9px] font-medium bg-white/20 inline-block px-1.5 py-0.5 rounded-md mt-1">Role: Sales Rep</p>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center font-black">A</div>
                          </div>

                          {/* Quick Stats Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Leads</p>
                              <p className="text-lg font-black text-gray-900 mt-1">{leadsList.length}</p>
                              <span className="text-[8px] text-green-500 font-bold">↑ 14% this month</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Forecast Value</p>
                              <p className="text-lg font-black text-gray-900 mt-1">₹4.5L</p>
                              <span className="text-[8px] text-indigo-500 font-bold">🎯 Target hit: 90%</span>
                            </div>
                          </div>

                          {/* Performance Mini Chart */}
                          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">Leads Pipeline</span>
                              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                            </div>
                            <div className="h-20 w-full flex items-end gap-2.5 pt-2">
                              {[35, 65, 40, 85, 55, 95].map((val, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                                  <div className="w-full bg-indigo-50 rounded-t-md relative h-16">
                                    <div className="absolute bottom-0 left-0 right-0 bg-indigo-600 rounded-t-md transition-all duration-500" style={{ height: `${val}%` }} />
                                  </div>
                                  <span className="text-[8px] font-bold text-gray-400">M{idx+1}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Demo Interactive Hint */}
                          <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl text-orange-800 text-[10px] leading-relaxed">
                            <span className="font-bold">Pro-tip:</span> Try adding a lead in the <span className="font-bold underline cursor-pointer" onClick={() => setActiveMobileTab('leads')}>Leads Tab</span> or toggle status in the <span className="font-bold underline cursor-pointer" onClick={() => setActiveMobileTab('invoices')}>Invoices Tab</span>!
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
                        onClick={() => setActiveMobileTab('dashboard')}
                        className={cn(
                          "flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors",
                          activeMobileTab === 'dashboard' ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        <Layout className="w-4 h-4" />
                        <span className="text-[8px] font-bold mt-0.5">Overview</span>
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
          <nav className="flex items-center gap-8">
            {['Privacy', 'Contact'].map(item => (
              <button key={item} className="text-xs font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors cursor-pointer">{item}</button>
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
