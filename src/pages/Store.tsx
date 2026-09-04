import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import {
  Menu, X, TrendingUp, User, Zap, BarChart3, Layout, Globe, Shield,
  Monitor, Smartphone, MessageSquare, Send, CheckCircle2, AlertCircle, PlusCircle, Sparkles, Settings, ShoppingBag, Tag,
  Package, DollarSign, Users, Flame, Bell, ChevronRight, Activity, ArrowUpRight, Search, Layers, Clock, Lock, Check,
  Phone, FileText, CheckCheck, RefreshCw, Scissors, ChevronDown, Download, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';
import HelpCenterModal from '../components/HelpCenterModal';

export default function Store() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'system' | 'mobile'>('system');
  const [activeMobileTab, setActiveMobileTab] = useState<'orders' | 'leads' | 'invoices' | 'digitizer' | 'chat'>('orders');
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

  // Interactive mobile simulation state: Live Orders
  const [ordersList, setOrdersList] = useState([
    { id: '#ORD-8942', client: 'Godwin (Marketing)', item: 'Sublimation Jersey (500 pcs)', amt: '₹1,25,000', stage: 'Delivered', progress: 100 },
    { id: '#ORD-8943', client: 'Vivek (Marketing)', item: 'Custom Fleece Hoodie (200 pcs)', amt: '₹84,000', stage: 'Production', progress: 65 },
    { id: '#ORD-8944', client: 'Jimla (Online Team)', item: 'Dry-Fit Uniforms (150 pcs)', amt: '₹52,500', stage: 'Accounts', progress: 40 },
    { id: '#ORD-8945', client: 'Rajan (Direct Sales)', item: 'Matty Polo Sportswear (300 pcs)', amt: '₹1,65,000', stage: 'Digitizing', progress: 25 }
  ]);
  const [orderFilter, setOrderFilter] = useState<'all' | 'Delivered' | 'Production' | 'Accounts' | 'Digitizing'>('all');

  // Interactive mobile simulation state: Leads
  const [leadsList, setLeadsList] = useState([
    { id: '1', name: 'Jane Cooper', company: 'Apex Sports Club', status: 'Warm', val: '₹93,500', time: '5m ago' },
    { id: '2', name: 'Arlene McCoy', company: 'Titan Marathon Hub', status: 'Hot', val: '₹1,20,000', time: '1h ago' },
    { id: '3', name: 'Dianne Russell', company: 'Nexon Fitness', status: 'Pending', val: '₹17,300', time: '3h ago' },
    { id: '4', name: 'Godwin Team', company: 'Chennai Super Track', status: 'Hot', val: '₹1,45,000', time: '1d ago' }
  ]);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadValue, setNewLeadValue] = useState('');

  // Interactive mobile simulation state: Invoices
  const [invoicesList, setInvoicesList] = useState([
    { id: 'INV-420', name: 'Nexon Prints', val: '₹22,400', date: '04 Sep', gst: '₹3,416', status: 'Paid' },
    { id: 'INV-421', name: 'Garment Hub', val: '₹18,100', date: '02 Sep', gst: '₹2,761', status: 'Pending' },
    { id: 'INV-422', name: 'Apex Apparel', val: '₹34,500', date: '28 Aug', gst: '₹5,262', status: 'Overdue' },
    { id: 'INV-423', name: 'Titan Sports', val: '₹68,000', date: '03 Sep', gst: '₹10,372', status: 'Paid' }
  ]);

  // Digitizer state
  const [digitizerApproved, setDigitizerApproved] = useState(false);

  // Chat simulation state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'Digitizer', role: 'Embroidery Desk', text: 'Vector proof is ready (14,250 stitches). Pls check chest logo density.', time: '10:14 AM' },
    { sender: 'Sales Rep', role: 'You', text: 'Thanks. Customer approved V2. Sending batch to production.', time: '10:16 AM' },
    { sender: 'Production', role: 'Cutting Desk', text: 'Fabric cutting completed for 500 pcs. Setting up embroidery machine.', time: '10:19 AM' }
  ]);
  const [newChatMessage, setNewChatMessage] = useState('');

  // Handle adding lead in mobile preview
  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim()) return;
    const valFormatted = newLeadValue ? `₹${Number(newLeadValue).toLocaleString('en-IN')}` : '₹45,000';
    setLeadsList([
      { id: String(Date.now()), name: newLeadName, company: 'New Custom Club', status: 'Hot', val: valFormatted, time: 'Just now' },
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
    const sentMsg = newChatMessage;
    setChatMessages(prev => [
      ...prev,
      { sender: 'Sales Rep', role: 'You', text: sentMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setNewChatMessage('');

    // Trigger realistic CRM desk auto-response
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'Digitizer',
          role: 'Embroidery Desk',
          text: `Acknowledged: "${sentMsg.slice(0, 24)}..." - Updated in production telemetry queue.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 900);
  };

  // Auto-detect mobile screen on load to set initial viewMode
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setViewMode('mobile');
    }
  }, []);

  const filteredOrders = orderFilter === 'all'
    ? ordersList
    : ordersList.filter(o => o.stage === orderFilter);

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
              /* MOBILE COMPACT MODEL & SMARTPHONE APP MOCKUP */
              <motion.div
                key="mobile-preview"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25 }}
                className="w-full flex justify-center py-2 px-1"
              >
                {/* Smartphone Device Mockup Frame - Ultra Compact & Responsive */}
                <div className="w-full max-w-[340px] sm:max-w-[355px] h-[610px] sm:h-[640px] bg-slate-950 border-[7px] sm:border-8 border-slate-900 rounded-[44px] sm:rounded-[50px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] relative flex flex-col overflow-hidden ring-4 ring-slate-800">
                  
                  {/* Notch / Dynamic Island */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 sm:h-6 bg-slate-900 rounded-full z-50 flex items-center justify-between px-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
                    <div className="w-2.5 h-2.5 bg-slate-950 rounded-full border border-slate-800" />
                  </div>

                  {/* Simulated Mobile screen wrapper */}
                  <div className="w-full h-full bg-slate-50 flex flex-col relative select-none pt-8 sm:pt-9 pb-12 overflow-hidden text-left">
                    
                    {/* Status Bar */}
                    <div className="absolute top-0 inset-x-0 h-8 sm:h-9 px-5 flex justify-between items-center text-[10px] font-extrabold text-slate-700 bg-white/80 backdrop-blur-md border-b border-gray-100/50 z-40">
                      <span>9:41 AM</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-slate-500">5G</span>
                        <span className="w-2.5 h-1.5 bg-slate-800 rounded-sm" />
                        <span className="w-2 h-2 bg-slate-800 rounded-full" />
                      </div>
                    </div>

                    {/* App Header */}
                    <header className="px-3.5 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between shadow-xs shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[10px] font-black shadow-xs">P</div>
                        <div>
                          <span className="text-xs font-black text-gray-900 tracking-tight block leading-none">Pallywear CRM</span>
                          <span className="text-[8px] text-gray-400 font-semibold">Mobile Operations</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        <span className="text-[8px] bg-emerald-50 text-emerald-700 font-black px-1.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">Live</span>
                      </div>
                    </header>

                    {/* Screen Content Scrollable Area */}
                    <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3">
                      
                      {/* TAB 1: ORDERS & WORKFLOW PIPELINE */}
                      {activeMobileTab === 'orders' && (
                        <div className="space-y-3 animate-fade-in text-left">
                          {/* Live Telemetry Summary Banner */}
                          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-3 rounded-xl text-white shadow-md">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black uppercase tracking-widest text-indigo-200">Active Pipeline</span>
                              <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded font-bold">4 Live Batches</span>
                            </div>
                            <div className="flex items-baseline justify-between mt-1.5">
                              <span className="text-lg font-black tracking-tight">₹4,26,500</span>
                              <span className="text-[9px] font-bold text-emerald-300 flex items-center gap-0.5">
                                <ArrowUpRight className="w-2.5 h-2.5" /> 78 Delivered
                              </span>
                            </div>
                          </div>

                          {/* Quick Filter Chips */}
                          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar text-[9px]">
                            {(['all', 'Delivered', 'Production', 'Accounts', 'Digitizing'] as const).map(f => (
                              <button
                                key={f}
                                onClick={() => setOrderFilter(f)}
                                className={cn(
                                  "px-2 py-0.5 rounded-full font-bold whitespace-nowrap transition-colors cursor-pointer border",
                                  orderFilter === f
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
                                )}
                              >
                                {f === 'all' ? 'All Orders' : f}
                              </button>
                            ))}
                          </div>

                          {/* Orders List */}
                          <div className="space-y-2">
                            {filteredOrders.map((ord, idx) => (
                              <div key={idx} className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs hover:border-indigo-200 transition-all">
                                <div className="flex justify-between items-start mb-1.5">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-black text-gray-900 text-[10px]">{ord.id}</span>
                                      <span className="text-[8px] text-gray-400 font-medium truncate">• {ord.client}</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-gray-700 mt-0.5">{ord.item}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-[11px] font-black text-gray-900 block leading-none">{ord.amt}</span>
                                    <span className={cn(
                                      "text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md border inline-block mt-1",
                                      ord.stage === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      ord.stage === 'Production' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                      ord.stage === 'Accounts' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                      'bg-blue-50 text-blue-700 border-blue-200'
                                    )}>
                                      {ord.stage}
                                    </span>
                                  </div>
                                </div>

                                {/* Mini Progress bar */}
                                <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden mt-2">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      ord.stage === 'Delivered' ? 'bg-emerald-500' :
                                      ord.stage === 'Production' ? 'bg-amber-500' :
                                      ord.stage === 'Accounts' ? 'bg-purple-500' : 'bg-blue-500'
                                    )}
                                    style={{ width: `${ord.progress}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TAB 2: LEADS & CRM PIPELINE */}
                      {activeMobileTab === 'leads' && (
                        <div className="space-y-3 animate-fade-in text-left">
                          {/* Create Lead Form */}
                          <form onSubmit={handleAddLead} className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] font-black text-gray-900 uppercase tracking-widest block">Add Lead Simulator</span>
                              <span className="text-[7px] text-indigo-600 font-bold bg-indigo-50 px-1 py-0.2 rounded">Instant Test</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              <input
                                required
                                type="text"
                                placeholder="Client / Club Name"
                                value={newLeadName}
                                onChange={(e) => setNewLeadName(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[9px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <input
                                type="number"
                                placeholder="Value (INR)"
                                value={newLeadValue}
                                onChange={(e) => setNewLeadValue(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[9px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <PlusCircle className="w-3 h-3" /> Add to Pipeline
                            </button>
                          </form>

                          {/* Leads List */}
                          <div className="space-y-1.5">
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block px-0.5">Leads Pipeline ({leadsList.length})</span>
                            {leadsList.map((lead) => (
                              <div key={lead.id} className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between hover:border-indigo-100 transition-colors">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-[10px] font-bold shrink-0">
                                    {lead.name.charAt(0)}
                                  </div>
                                  <div>
                                    <h5 className="text-[10px] font-bold text-gray-800 leading-none mb-0.5">{lead.name}</h5>
                                    <span className="text-[8px] text-gray-400 block">{lead.company}</span>
                                    <div className="flex items-center gap-1 mt-1">
                                      <span className="text-[7px] text-gray-400">{lead.time}</span>
                                      <span className={cn(
                                        "text-[6px] font-black px-1 py-0.2 rounded uppercase border",
                                        lead.status === 'Hot' ? 'bg-red-50 text-red-600 border-red-100' :
                                        lead.status === 'Warm' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        'bg-blue-50 text-blue-600 border-blue-100'
                                      )}>{lead.status}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] font-black text-gray-900 block">{lead.val}</span>
                                  <div className="flex gap-1 justify-end mt-1">
                                    <span className="p-1 bg-emerald-50 text-emerald-600 rounded-md text-[7px] font-bold inline-flex items-center gap-0.5">
                                      <Phone className="w-2 h-2" /> Call
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TAB 3: INVOICES & BILLING */}
                      {activeMobileTab === 'invoices' && (
                        <div className="space-y-3 animate-fade-in text-left">
                          <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl text-blue-900 text-[9px] leading-relaxed">
                            💡 <span className="font-bold">Tap any invoice</span> card below to toggle status between <b>Paid</b>, <b>Pending</b>, and <b>Overdue</b> live!
                          </div>
                          
                          <div className="space-y-1.5">
                            {invoicesList.map((inv) => (
                              <div
                                key={inv.id}
                                onClick={() => toggleInvoiceStatus(inv.id)}
                                className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs flex items-center justify-between hover:border-indigo-200 transition-all cursor-pointer hover:shadow-xs active:scale-[0.99]"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-gray-800">{inv.name}</span>
                                    <span className="text-[8px] font-mono text-gray-400">#{inv.id}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black text-indigo-600">{inv.val}</span>
                                    <span className="text-[7px] text-gray-400 font-medium">GST: {inv.gst}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className={cn(
                                    "text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all inline-block",
                                    inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    inv.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-red-50 text-red-700 border-red-200'
                                  )}>
                                    {inv.status}
                                  </span>
                                  <span className="text-[7px] text-gray-400 block mt-0.5">{inv.date}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-[9px]">
                            <span className="font-bold text-gray-600">Total Billed Pipeline:</span>
                            <span className="font-black text-gray-900 text-[10px]">₹1,43,000</span>
                          </div>
                        </div>
                      )}

                      {/* TAB 4: DIGITIZING & VECTOR PROOFING */}
                      {activeMobileTab === 'digitizer' && (
                        <div className="space-y-3 animate-fade-in text-left">
                          <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-xs space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-indigo-600" /> Vector Embroidery Proof
                              </span>
                              <span className="text-[8px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">PW_CREST_V2.DST</span>
                            </div>

                            {/* Simulated Vector Canvas Card */}
                            <div className="h-28 bg-slate-900 rounded-lg p-2.5 relative overflow-hidden flex flex-col justify-between text-white border border-slate-800">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-[10px] font-bold text-indigo-300">Pallywear Athletic Crest</p>
                                  <p className="text-[7px] text-slate-400">Left Chest Monogram (90mm x 75mm)</p>
                                </div>
                                <span className={cn(
                                  "text-[7px] font-black uppercase px-1.5 py-0.5 rounded border",
                                  digitizerApproved ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                )}>
                                  {digitizerApproved ? "✓ Approved" : "Pending Proof"}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-1 text-[7px] bg-slate-800/80 p-1.5 rounded border border-slate-700">
                                <div>
                                  <span className="text-slate-400 block">Stitches</span>
                                  <span className="font-mono font-bold text-white">14,250</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Colors</span>
                                  <span className="font-bold text-amber-300">4 Threads</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Density</span>
                                  <span className="font-bold text-emerald-300">0.40mm</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => setDigitizerApproved(!digitizerApproved)}
                              className={cn(
                                "w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer",
                                digitizerApproved
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                              )}
                            >
                              <CheckCheck className="w-3 h-3" />
                              {digitizerApproved ? "Vector Proof Approved (Click to Reset)" : "Approve Vector Proof"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TAB 5: TEAM HUB CHAT */}
                      {activeMobileTab === 'chat' && (
                        <div className="space-y-2.5 flex flex-col h-[380px] sm:h-[410px] animate-fade-in justify-between">
                          {/* Messages list */}
                          <div className="space-y-2 overflow-y-auto max-h-[300px] flex-1 pr-1 text-left">
                            {chatMessages.map((msg, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "max-w-[88%] rounded-2xl p-2 text-[9px] leading-relaxed shadow-xs",
                                  msg.role === 'You'
                                    ? "bg-indigo-600 text-white ml-auto rounded-tr-none"
                                    : "bg-white text-gray-800 mr-auto rounded-tl-none border border-gray-100"
                                )}
                              >
                                <div className="flex justify-between items-center gap-2 mb-1 opacity-80 text-[6px] font-black uppercase tracking-wider">
                                  <span>{msg.sender} ({msg.role})</span>
                                  <span>{msg.time}</span>
                                </div>
                                <p className="font-medium whitespace-pre-wrap">{msg.text}</p>
                              </div>
                            ))}
                          </div>

                          {/* Chat input box */}
                          <form onSubmit={handleSendMessage} className="flex gap-1 bg-white p-1 rounded-xl border border-gray-100 shadow-xs shrink-0">
                            <input
                              type="text"
                              placeholder="Type message to team..."
                              value={newChatMessage}
                              onChange={(e) => setNewChatMessage(e.target.value)}
                              className="flex-1 bg-gray-50 border-0 outline-none rounded-lg px-2 py-1 text-[9px] focus:ring-0"
                            />
                            <button
                              type="submit"
                              className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                            >
                              <Send className="w-2.5 h-2.5" />
                            </button>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Simulated Bottom Navigation Bar - 5 CRM Core Tabs */}
                    <nav className="absolute bottom-0 inset-x-0 h-11 bg-white border-t border-gray-100/80 px-1 flex justify-around items-center z-40">
                      <button
                        onClick={() => setActiveMobileTab('orders')}
                        className={cn(
                          "flex flex-col items-center justify-center flex-1 py-0.5 cursor-pointer transition-colors",
                          activeMobileTab === 'orders' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span className="text-[7px] mt-0.5">Orders</span>
                      </button>
                      <button
                        onClick={() => setActiveMobileTab('leads')}
                        className={cn(
                          "flex flex-col items-center justify-center flex-1 py-0.5 cursor-pointer transition-colors",
                          activeMobileTab === 'leads' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span className="text-[7px] mt-0.5">Leads</span>
                      </button>
                      <button
                        onClick={() => setActiveMobileTab('invoices')}
                        className={cn(
                          "flex flex-col items-center justify-center flex-1 py-0.5 cursor-pointer transition-colors",
                          activeMobileTab === 'invoices' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span className="text-[7px] mt-0.5">Billing</span>
                      </button>
                      <button
                        onClick={() => setActiveMobileTab('digitizer')}
                        className={cn(
                          "flex flex-col items-center justify-center flex-1 py-0.5 cursor-pointer transition-colors",
                          activeMobileTab === 'digitizer' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-[7px] mt-0.5">Digitizer</span>
                      </button>
                      <button
                        onClick={() => setActiveMobileTab('chat')}
                        className={cn(
                          "flex flex-col items-center justify-center flex-1 py-0.5 cursor-pointer transition-colors",
                          activeMobileTab === 'chat' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="text-[7px] mt-0.5">Hub Chat</span>
                      </button>
                    </nav>

                    {/* Home Indicator */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-20 h-1 bg-gray-300 rounded-full z-45" />
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
