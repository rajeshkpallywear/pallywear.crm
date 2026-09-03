import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import {
  Layout, Bell, Settings, BarChart3, Package, Warehouse,
  Users, LogOut, TrendingUp, DollarSign, Activity, Download, Shield,
  ChevronLeft, ChevronRight, Menu, MoreVertical, Plus, MessageSquare, Calendar as CalendarIcon,
  ClipboardCheck, Store, Building2, Truck, IndianRupee, ChevronDown, Monitor, Smartphone, CreditCard, Briefcase
} from 'lucide-react';
import {
  ResponsiveContainer, FunnelChart, Funnel, LabelList,
  Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import LeadManager from '../components/LeadManager';
import InvoiceManager from '../components/InvoiceManager';
import ProfileSettings from '../components/ProfileSettings';
import InventoryManagement from '../components/InventoryManagement';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';
import { UserRole, Order } from '../types';
import { mockDataService } from '../service/mockDataService';
import { getApiUrl } from '../lib/apiConfig';

// Import New Role Dashboards
import AccountsDashboard from '../components/AccountsDashboard';
import OrderManagementDashboard from '../components/OrderManagementDashboard';
import ProductionDashboard from '../components/ProductionDashboard';
import DeliveryDashboard from '../components/DeliveryDashboard';
import MarketingDashboard from '../components/MarketingDashboard';
import DesignDashboard from '../components/DesignDashboard';
import DigitizingDashboard from '../components/DigitizingDashboard';
import DigitizerCommunication from '../components/DigitizerCommunication';
import CalendarView from '../components/CalendarView';
import OnlineTeamDashboard from '../components/OnlineTeamDashboard';
import VendorDashboard from '../components/VendorDashboard';
import OrdersChart from '../components/OrdersChart';
import SidebarChat from '../components/SidebarChat';
import { RoleBreakdown } from './AdminDashboard';
import { OrderStatus } from '../types';

export default function Dashboard() {
  const { user, logout, registeredUsers } = useAuth();
  const { leads, orders, inventory, addOrder, updateOrder, deleteOrder, addLead, deleteLead } = useLeads();
  const navigate = useNavigate();

  const filteredOrders = React.useMemo(() => {
    if (!user) return [];
    
    // Admin and operational/processing roles must see all orders to do their jobs
    const viewAllRoles = [
      'admin',
      'accounts',
      'designer',
      'order_management',
      'production',
      'digitizer',
      'delivery'
    ];
    
    if (viewAllRoles.includes(user.role)) {
      return orders;
    }
    
    return orders.filter(o => o.createdBy === user.id || o.createdBy === (user as any).uid);
  }, [orders, user]);

  // Hold orders — only shown in the dedicated hold section
  const holdOrders = React.useMemo(() => filteredOrders.filter(o => o.status === 'hold'), [filteredOrders]);

  // Active (non-hold) orders — passed to all role dashboards so held orders don't appear there
  const activeOrders = React.useMemo(() => filteredOrders.filter(o => o.status !== 'hold'), [filteredOrders]);

  const [showProfileModal, setShowProfileModal] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'reports' | 'clients' | 'invoices' | 'inventory' | 'history' | 'digitizer_comm' | 'marketing_orders' | 'calendar' | 'online_leads'>(() => {
    const saved = localStorage.getItem('pallywear_active_tab');
    if (saved && ['dashboard', 'reports', 'clients', 'invoices', 'inventory', 'history', 'digitizer_comm', 'marketing_orders', 'calendar', 'online_leads'].includes(saved)) {
      return saved as any;
    }
    return 'dashboard';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [tempApiUrl, setTempApiUrl] = React.useState(localStorage.getItem('pallywear_api_url') || 'https://pallywear.in');

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

  const [accountsSidebarView, setAccountsSidebarView] = React.useState<'orders' | 'vendor-expense' | 'office-expense' | 'salary' | 'delivery-expense'>('orders');
  const [expenseExpanded, setExpenseExpanded] = React.useState(true);

  const [layoutMode, setLayoutMode] = React.useState<'mobile' | 'system'>(
    window.innerWidth < 768 ? 'mobile' : 'system'
  );

  React.useEffect(() => {
    const handleResize = () => {
      setLayoutMode(window.innerWidth < 768 ? 'mobile' : 'system');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    if (user && (user.role === 'marketing' || user.role === 'staff' || user.role === UserRole.MARKETING || user.role === UserRole.STAFF)) {
      if (user.email === 'daniel.smpallywear@gmail.com' && activeTab === 'dashboard') {
        setActiveTab('marketing_orders');
        localStorage.setItem('pallywear_active_tab', 'marketing_orders');
      } else if (!localStorage.getItem('pallywear_active_tab')) {
        setActiveTab('marketing_orders');
      }
    }
  }, [user, activeTab]);

  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    localStorage.setItem('pallywear_active_tab', tab);
    setIsMobileOpen(false);
  };

  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const notificationsRef = React.useRef(notifications);
  notificationsRef.current = notifications;

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);

      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.15); // E5
      gain2.gain.setValueAtTime(0.15, audioContext.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
      osc2.start(audioContext.currentTime + 0.15);
      osc2.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.warn('AudioContext failed:', e);
    }
  };

  React.useEffect(() => {
    if (!user) return;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const fetchNotifications = async (isInitial = false) => {
      try {
        const res = await fetch(getApiUrl(`/api/notifications?role=${user.role}`));
        const data = await res.json();
        if (data.success) {
          const newNotifs = data.notifications || [];
          const currentList = notificationsRef.current;
          if (!isInitial) {
            const hasNew = newNotifs.some((n: any) => n.isRead === 0 && !currentList.some(existing => existing.id === n.id));
            if (hasNew) {
              playNotificationSound();
              const firstNew = newNotifs.find((n: any) => n.isRead === 0 && !currentList.some(existing => existing.id === n.id));
              if (firstNew && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(firstNew.title, { body: firstNew.message });
              }
            }
          }
          setNotifications(newNotifs);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(false), 12000);
    return () => clearInterval(interval);
  }, [user?.role]);

  const handleToggleNotifications = async () => {
    const nextShow = !showNotifications;
    setShowNotifications(nextShow);
    if (nextShow) {
      try {
        await fetch(getApiUrl('/api/notifications/read'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: user?.role })
        });
        setNotifications(prev => prev.map(n => ({ ...n, isRead: 1 })));
      } catch (e) {
        console.error('Failed to mark notifications as read:', e);
      }
    }
  };

  const handleUpdateOrder = async (id: string, updates: Partial<Order>) => {
    try {
      await updateOrder(id, updates);
    } catch (error: any) {
      console.error("Failed to update order:", error);
      const msg = error?.message || '';
      if (msg.toLowerCase().includes('too large') || msg.toLowerCase().includes('payload') || msg.toLowerCase().includes('size')) {
        alert("Sync failed: Data might be too large (Max 100MB per order in current setup). Try using smaller images.");
      } else {
        alert(`An error occurred while sending the order: ${msg || 'Unknown error'}`);
      }
      throw error;
    }
  };

  const handleCreateOrder = async (orderData: Partial<Order>) => {
    try {
      await addOrder(orderData);
    } catch (error) {
      console.error("Failed to create order:", error);
      alert("Creation failed: Data might be too large.");
      throw error;
    }
  };

  const handleDeleteOrder = async (id: string) => {
    try {
      await deleteOrder(id);
    } catch (error) {
      console.error("Failed to delete order:", error);
      alert("Delete failed.");
    }
  };

  const filteredLeads = user?.role === 'admin'
    ? leads
    : leads.filter(l => l.createdBy === user?.id);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const funnelData = [
    { value: filteredLeads.length * 10 || 0, name: 'Lead', fill: '#1A0B91' },
    { value: filteredLeads.filter(l => l.leadType === 'Warm' || l.leadType === 'Hot').length * 8 || 0, name: 'Contact', fill: '#4D109E' },
    { value: filteredLeads.filter(l => l.leadType === 'Hot').length * 5 || 0, name: 'Quote', fill: '#7F14AB' },
    { value: filteredLeads.filter(l => l.convertedValue > 0).length * 2 || 0, name: 'Deal', fill: '#B117B1' },
  ];

  const totalForecast = filteredLeads.reduce((sum, l) => sum + l.forecastedValue, 0);
  const totalConverted = filteredLeads.reduce((sum, l) => sum + l.convertedValue, 0);

  const userRoleDisplay = React.useMemo(() => {
    if (!user?.role) return 'User';
    if (user.role === 'admin' || user.role === UserRole.ADMIN) return 'Pallywear';
    if (user.role === 'onlineteam' || user.role === UserRole.ONLINETEAM) return 'Online Team';
    return String(user.role).replace('_', ' ');
  }, [user?.role]);

  return (
    <div className="flex dashboard-page-bg min-h-screen">
      {/* Mobile Sidebar Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in backdrop-blur-xs"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      {(layoutMode === 'system' || isMobileOpen) && (
        <aside className={cn(
          "bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 h-full overflow-hidden shadow-xl z-50 transition-all duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isSidebarCollapsed ? "md:w-20" : "md:w-64",
          "w-64"
        )}>
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          {(!isSidebarCollapsed || isMobileOpen) && <Logo />}
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsMobileOpen(false);
              } else {
                setIsSidebarCollapsed(!isSidebarCollapsed);
              }
            }}
            className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-brand-primary transition-all flex-shrink-0"
          >
            {isSidebarCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {/* Admin Lead Management Tabs */}
          {(user?.role === UserRole.ADMIN || user?.role === 'admin') && (
            <div className="space-y-1">
              <p className={cn(
                "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-3",
                isSidebarCollapsed && "md:hidden"
              )}>Lead Management</p>
              <button
                onClick={() => selectTab('dashboard')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'dashboard' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Dashboard" : ""}
              >
                <Layout className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Dashboard</span>}
              </button>
              <button
                onClick={() => selectTab('reports')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'reports' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Reports" : ""}
              >
                <BarChart3 className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Reports</span>}
              </button>
              <button
                onClick={() => selectTab('clients')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'clients' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Clients" : ""}
              >
                <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Clients</span>}
              </button>
              <button
                onClick={() => selectTab('invoices')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'invoices' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Invoices" : ""}
              >
                <Activity className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Invoices</span>}
              </button>
              <button
                onClick={() => selectTab('marketing_orders')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'marketing_orders' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Create Order" : ""}
              >
                <Plus className="w-4 h-4 flex-shrink-0 text-brand-primary" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Create Order</span>}
              </button>
            </div>
          )}

          {/* Marketing/Staff Lead Management Tabs (No Dashboard/Reports) */}
          {(user?.role === UserRole.MARKETING || user?.role === 'marketing' || user?.role === UserRole.STAFF || user?.role === 'staff' || user?.role === 'user') && (
            <div className="space-y-1">
              <p className={cn(
                "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-3",
                isSidebarCollapsed && "md:hidden"
              )}>Lead Management</p>
              {(user?.role === UserRole.MARKETING || user?.role === 'marketing' || user?.role === UserRole.STAFF || user?.role === 'staff' || user?.email === 'daniel.smpallywear@gmail.com') && (
                <button
                  onClick={() => navigate('/lead-dashboard')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all bg-brand-primary/5 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/10 mb-2 cursor-pointer",
                    isSidebarCollapsed && "md:justify-center md:px-0"
                  )}
                  title={isSidebarCollapsed ? "Lead Dashboard" : ""}
                >
                  <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Lead Dashboard</span>}
                </button>
              )}
              <button
                onClick={() => selectTab('clients')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'clients' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Clients" : ""}
              >
                <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Clients</span>}
              </button>
              <button
                onClick={() => selectTab('invoices')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'invoices' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Invoices" : ""}
              >
                <Activity className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Invoices</span>}
              </button>
              <button
                onClick={() => selectTab('marketing_orders')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'marketing_orders' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Create Order" : ""}
              >
                <Plus className="w-4 h-4 flex-shrink-0 text-brand-primary" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Create Order</span>}
              </button>

              <button
                onClick={() => selectTab('online_leads')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'online_leads' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Assign Leads" : ""}
              >
                <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Assign Leads</span>}
              </button>
            </div>
          )}

          {/* Online Team Portal Sidebar Navigation */}
          {(user?.role === UserRole.ONLINETEAM || user?.role === 'onlineteam') && (
            <div className="space-y-1">
              <p className={cn(
                "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-3",
                isSidebarCollapsed && "md:hidden"
              )}>Online Team Portal</p>
              
              <button
                onClick={() => selectTab('dashboard')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'dashboard' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Dashboard" : ""}
              >
                <Layout className="w-4 h-4 flex-shrink-0 animate-pulse text-brand-primary" /> {(!isSidebarCollapsed || isMobileOpen) && <span className="font-bold text-gray-900">Dashboard</span>}
              </button>

              <button
                onClick={() => selectTab('marketing_orders')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'marketing_orders' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Orders" : ""}
              >
                <Package className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Orders</span>}
              </button>

              <button
                onClick={() => selectTab('clients')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'clients' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Clients" : ""}
              >
                <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Clients</span>}
              </button>

              <button
                onClick={() => selectTab('invoices')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'invoices' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Invoices" : ""}
              >
                <Activity className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Invoices</span>}
              </button>

              <button
                onClick={() => selectTab('online_leads')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'online_leads' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Online Leads" : ""}
              >
                <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Online Leads</span>}
              </button>

              <button
                onClick={() => navigate('/lead-dashboard')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all bg-brand-primary/5 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/10 mt-1 cursor-pointer",
                  isSidebarCollapsed && "md:justify-center md:px-0"
                )}
                title={isSidebarCollapsed ? "Lead Dashboard" : ""}
              >
                <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Lead Dashboard</span>}
              </button>
            </div>
          )}

          {/* Digitizing Portal link in sidebar if applicable */}
          {user?.role === UserRole.DIGITIZER && (
            <div className="bg-brand-primary/5 p-3 rounded-2xl border border-brand-primary/10 mb-2">
              <p className={cn(
                "text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-2 px-1",
                isSidebarCollapsed && "md:hidden"
              )}>Digitizing & Embroidery</p>
              <button
                onClick={() => selectTab('dashboard')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl shadow-sm border transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'dashboard' ? "border-brand-primary/40 shadow-md" : "border-brand-primary/20 opacity-80 hover:opacity-100"
                )}
              >
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                {(!isSidebarCollapsed || isMobileOpen) && <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest text-left">Digitizing Hub</span>}
              </button>
            </div>
          )}

          {/* Department Portals */}
          {user?.role && ![UserRole.ADMIN, UserRole.MARKETING, UserRole.DIGITIZER, UserRole.ACCOUNTS, 'accounts', 'user', 'admin', UserRole.ONLINETEAM, 'onlineteam'].includes(user.role as any) && (
            <div className="bg-brand-primary/5 p-3 rounded-2xl border border-brand-primary/10 mb-2">
              <p className={cn(
                "text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-2 px-1",
                isSidebarCollapsed && "md:hidden"
              )}>Active Portal</p>
              <button
                onClick={() => selectTab('dashboard')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl shadow-sm border transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'dashboard' ? "border-brand-primary/40 shadow-md" : "border-brand-primary/20 opacity-80 hover:opacity-100"
                )}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {(!isSidebarCollapsed || isMobileOpen) && <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{String(user.role).replace('_', ' ')} Portal</span>}
              </button>
            </div>
          )}

          {/* Accounts Portal Sidebar Navigation (Orders Only) */}
          {(user?.role === UserRole.ACCOUNTS || user?.role === 'accounts') && (
            <div className="bg-brand-primary/5 p-3 rounded-2xl border border-brand-primary/10 mb-2">
              <p className={cn(
                "text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-2 px-1",
                isSidebarCollapsed && "md:hidden"
              )}>Accounts Portal</p>
              
              <div className="space-y-1">
                {/* Orders */}
                <button
                  onClick={() => {
                    selectTab('dashboard');
                    setAccountsSidebarView('orders');
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 bg-white rounded-xl shadow-sm border transition-all",
                    isSidebarCollapsed && "md:justify-center md:px-0",
                    activeTab === 'dashboard' && accountsSidebarView === 'orders' ? "border-brand-primary/40 shadow-md" : "border-brand-primary/20 opacity-80 hover:opacity-100"
                  )}
                  title={isSidebarCollapsed ? "Orders" : ""}
                >
                  <ClipboardCheck className="w-4 h-4 flex-shrink-0 text-brand-primary" />
                  {(!isSidebarCollapsed || isMobileOpen) && <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Orders</span>}
                </button>

                {/* Expenses Hub */}
                <button
                  onClick={() => {
                    selectTab('dashboard');
                    setAccountsSidebarView('expenses-hub' as any);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 bg-white rounded-xl shadow-sm border transition-all mt-1",
                    isSidebarCollapsed && "md:justify-center md:px-0",
                    activeTab === 'dashboard' && accountsSidebarView === 'expenses-hub' ? "border-brand-primary/40 shadow-md" : "border-brand-primary/20 opacity-80 hover:opacity-100"
                  )}
                  title={isSidebarCollapsed ? "Expenses Hub" : ""}
                >
                  <CreditCard className="w-4 h-4 flex-shrink-0 text-brand-primary" />
                  {(!isSidebarCollapsed || isMobileOpen) && <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest font-black">Expenses Hub</span>}
                </button>
              </div>
            </div>
          )}


          {/* Logistics & Inventory Section (Admin Only) */}
          {(user?.role === UserRole.ADMIN || user?.role === 'admin') && (
            <div className="pt-2 space-y-1">
              <p className={cn(
                "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-3",
                isSidebarCollapsed && "md:hidden"
              )}>Operations</p>
              <button
                onClick={() => selectTab('inventory')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'inventory' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Inventory Stack" : ""}
              >
                <Package className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Inventory Stack</span>}
              </button>
              <button
                onClick={() => selectTab('history')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'history' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Order History" : ""}
              >
                <Activity className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Order History</span>}
              </button>
              <button
                onClick={() => selectTab('digitizer_comm')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'digitizer_comm' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Digitizer Comm" : ""}
              >
                <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span className="truncate">Digitizer Comm</span>}
              </button>
            </div>
          )}

          {/* Calendar Section (Visible to all team roles) */}
          {(user?.role && [
            UserRole.ADMIN,
            UserRole.ONLINETEAM,
            UserRole.MARKETING,
            UserRole.STAFF,
            UserRole.DESIGNER,
            UserRole.DIGITIZER,
            UserRole.PRODUCTION,
            UserRole.ACCOUNTS,
            UserRole.INVENTORY_MANAGEMENT,
            UserRole.ORDER_MANAGEMENT,
            UserRole.DELIVERY,
            'admin',
            'onlineteam',
            'marketing',
            'staff',
            'designer',
            'digitizer',
            'production',
            'accounts',
            'inventory_management',
            'order_management',
            'delivery'
          ].includes(user.role as any)) && (
            <div className="pt-2 space-y-1 border-t border-gray-100 mt-2">
              <p className={cn(
                "text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-3",
                isSidebarCollapsed && "md:hidden"
              )}>Leave Calendar</p>
              <button
                onClick={() => selectTab('calendar')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                  isSidebarCollapsed && "md:justify-center md:px-0",
                  activeTab === 'calendar' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
                )}
                title={isSidebarCollapsed ? "Calendar" : ""}
              >
                <CalendarIcon className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Calendar</span>}
              </button>
            </div>
          )}
        </nav>

        <div className="mt-auto p-4 border-t border-gray-50">
          <div className={cn(
            "flex items-center gap-3 p-2 bg-gray-50 rounded-2xl transition-all",
            isSidebarCollapsed ? "flex-col py-3 px-1" : ""
          )}>
            <button onClick={() => setShowProfileModal(true)} className="relative group">
              <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=1A0B91&color=fff`} className="w-8 h-8 rounded-full border border-gray-200 shadow-sm flex-shrink-0" alt="Me" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Settings className="w-3 h-3 text-brand-primary" />
              </div>
            </button>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{user?.name}</p>
                <p className="text-[10px] text-gray-400 capitalize">{String(user?.role || '')}</p>
              </div>
            )}
            <button onClick={handleLogout} className={cn(
              "text-gray-400 hover:text-red-500 transition-colors px-1",
              isSidebarCollapsed && "mt-1"
            )} title={isSidebarCollapsed ? "Logout" : ""}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      )}

      <main className={cn(
        "flex-1 min-h-screen transition-all duration-300 pb-20 md:pb-8",
        isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
      )}>
        <header className="h-13 sm:h-16 bg-white/95 backdrop-blur-md border-b border-gray-200 px-3 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs pt-safe">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="p-1.5 -ml-1 hover:bg-gray-100 rounded-xl text-gray-700 flex md:hidden items-center justify-center border border-gray-200 shadow-xs cursor-pointer active:scale-95 transition-all flex-shrink-0"
              aria-label="Toggle sidebar menu"
              title="Toggle sidebar menu"
            >
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
            </button>
            <div className="text-[11px] sm:text-sm font-medium text-gray-500 flex items-center gap-1.5 min-w-0 truncate">
              <span className="truncate max-w-[85px] sm:max-w-none text-gray-500 font-medium">{userRoleDisplay}</span>
              <span className="text-gray-900 font-bold flex-shrink-0">Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
            {user?.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
                className="text-[8px] sm:text-[10px] h-6 sm:h-8 px-1.5 sm:px-3 font-bold uppercase tracking-wider flex-shrink-0"
              >
                Admin Panel
              </Button>
            )}
            <div className="relative">
              <button
                onClick={handleToggleNotifications}
                className="p-1.5 sm:p-2 hover:bg-gray-50 rounded-lg text-gray-500 relative cursor-pointer flex items-center justify-center"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {notifications.some(n => n.isRead === 0) && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden text-left">
                  <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Notifications</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} className={cn("p-4 transition-colors", n.isRead === 0 ? "bg-purple-50/10" : "")}>
                          <p className="text-xs font-bold text-gray-900">{n.title}</p>
                          <p className="text-[10px] text-gray-500 font-semibold mt-1 leading-relaxed">{n.message}</p>
                          <span className="text-[9px] text-gray-400 font-bold block mt-2">{new Date(n.createdAt).toLocaleTimeString()}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-gray-400">No notifications yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="p-1.5 sm:p-2 hover:bg-gray-50 rounded-lg text-gray-500 cursor-pointer" onClick={() => setShowProfileModal(true)}><Settings className="w-4 h-4 sm:w-5 sm:h-5" /></button>
          </div>
        </header>

        <div className="p-3 sm:p-6 md:p-8">
          {activeTab === 'online_leads' ? (
            <OnlineTeamDashboard user={user} defaultTab="all_online_leads" hideHeaderAndTabs={true} />
          ) : activeTab === 'inventory' ? (
            <InventoryManagement userRole={user?.role as any} />
          ) : activeTab === 'history' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order History</h2>
                  <p className="text-gray-500 text-sm">Full list of orders across all departments</p>
                </div>
              </div>

              {layoutMode === 'mobile' ? (
                <div className="space-y-4">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => (
                      <div key={order.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs text-indigo-600 font-bold">#{order.id.slice(-8)}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                            order.status === 'HOLD' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                          )}>{order.status}</span>
                        </div>
                        <div className="flex justify-between items-end border-t border-gray-50 pt-2.5">
                          <div>
                            <p className="text-xs font-black text-gray-900">{order.customerInfo.name}</p>
                            <span className="text-[9px] text-gray-400 font-bold uppercase">{order.category}</span>
                          </div>
                          <span className="text-[9px] text-gray-400">{new Date(order.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 italic text-xs">
                      No history found.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 font-bold text-[10px] text-gray-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Order ID</th>
                        <th className="px-6 py-4">Customer</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Last Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                          <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs">#{order.id.slice(-8)}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">{order.customerInfo.name}</td>
                            <td className="px-6 py-4 text-xs font-semibold">{order.category}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                order.status === 'HOLD' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                              )}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-400 text-xs">
                              {new Date(order.updatedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No history found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'marketing_orders' ? (
            <MarketingDashboard orders={filteredOrders} inventory={inventory} onCreateOrder={handleCreateOrder} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} user={user} leadManagerComponent={<LeadManager />} />
          ) : activeTab === 'reports' ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Personal Reports</h2>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" /> Download All
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6">Monthly Conversions</h3>
                  <div className="h-64 flex items-end gap-3">
                    {[40, 70, 45, 90, 65, 80].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full bg-brand-secondary rounded-lg transition-all hover:bg-brand-primary" style={{ height: `${h}%` }} />
                        <span className="text-[10px] text-gray-400 font-bold uppercase">M{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-6">Performance Matrix</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Follow-up Rate', pct: 92 },
                      { label: 'Closing Speed', pct: 75 },
                      { label: 'Client Satisfaction', pct: 88 }
                    ].map((m, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                          <span>{m.label}</span>
                          <span>{m.pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-primary rounded-full" style={{ width: `${m.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'clients' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">My Clients</h2>
                <span className="px-3 py-1 bg-brand-secondary text-brand-primary rounded-full text-[10px] font-bold uppercase">Active Portfolios</span>
              </div>
              {layoutMode === 'mobile' ? (
                <div className="space-y-3">
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((l, i) => (
                      <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-brand-primary/20">
                            {l.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-800">{l.name}</p>
                            <span className="text-[10px] text-gray-400">{l.companyName}</span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-xs font-black text-brand-primary">₹{l.totalOrderValue.toLocaleString()}</span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 text-[8px] font-black uppercase rounded border border-green-100 mt-1">
                            Active
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 italic text-xs">
                      No clients assigned yet.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                      <tr>
                        <th className="px-6 py-4 border-b border-gray-100">Client Info</th>
                        <th className="px-6 py-4 border-b border-gray-100">Company</th>
                        <th className="px-6 py-4 border-b border-gray-100">Total Value</th>
                        <th className="px-6 py-4 border-b border-gray-100">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLeads.map((l, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-brand-primary/20">
                                {l.name.charAt(0)}
                              </div>
                              <span className="font-bold text-gray-800">{l.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-500">{l.companyName}</td>
                          <td className="px-6 py-4 font-bold text-brand-primary">₹{l.totalOrderValue.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold uppercase rounded-full border border-green-100">
                              <div className="w-1 h-1 bg-green-500 rounded-full" />
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                      {filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No clients assigned yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'invoices' ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Invoice Center</h2>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">Manage your professional billing and payment records</p>
                </div>
                <span className="self-start sm:self-auto px-3 py-1 bg-brand-secondary/10 text-brand-primary rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border border-brand-secondary/20">Billing & Payments</span>
              </div>
              <InvoiceManager />
            </div>
          ) : activeTab === 'online_leads' ? (
            <OnlineTeamDashboard user={user} defaultTab="assign_leads" />
          ) : activeTab === 'calendar' ? (
            <CalendarView user={user} />
          ) : activeTab === 'digitizer_comm' ? (
            <DigitizerCommunication orders={filteredOrders} onUpdateOrder={handleUpdateOrder} />
          ) : activeTab === 'dashboard' ? (
            <div className="space-y-8 animate-fadeIn">
              {/* Show Role Revenue Breakdown Panel for specific user */}
              {user?.email === 'daniel.smpallywear@gmail.com' && (() => {
                const userRoleMap: Record<string, string> = {};
                const userNameMap: Record<string, string> = {};
                registeredUsers.forEach((u: any) => {
                  userRoleMap[u.id] = u.role;
                  userNameMap[u.id] = u.name;
                });

                const isOnlineTeam = (createdBy: string) => {
                  const role = userRoleMap[createdBy];
                  return role === 'onlineteam' || role === 'UserRole.ONLINETEAM';
                };
                const isMarketing = (createdBy: string) => {
                  return !isOnlineTeam(createdBy);
                };

                const deliveredOrders = orders.filter(o => o.status === OrderStatus.DELIVERY);
                const mktDeliveredOrders = deliveredOrders.filter(o => isMarketing(o.createdBy || ''));
                const otDeliveredOrders = deliveredOrders.filter(o => isOnlineTeam(o.createdBy || ''));
                const mktOrdersRevenue = mktDeliveredOrders.reduce((sum, o) => sum + (Number(o.financials?.totalAmount) || 0), 0);
                const otOrdersRevenue = otDeliveredOrders.reduce((sum, o) => sum + (Number(o.financials?.totalAmount) || 0), 0);

                const mktLeadsForecast = leads.filter(l => isMarketing(l.createdBy))
                  .reduce((sum, l) => sum + (Number(l.forecastedValue) || 0), 0);
                const otLeadsForecast = leads.filter(l => isOnlineTeam(l.createdBy))
                  .reduce((sum, l) => sum + (Number(l.forecastedValue) || 0), 0);

                const mktConvertedLeads = leads.filter(l => isMarketing(l.createdBy) && (Number(l.totalOrderValue) || 0) > 0);
                const otConvertedLeads = leads.filter(l => isOnlineTeam(l.createdBy) && (Number(l.totalOrderValue) || 0) > 0);
                const mktLeadsConverted = mktConvertedLeads.reduce((sum, l) => sum + (Number(l.totalOrderValue) || 0), 0);
                const otLeadsConverted = otConvertedLeads.reduce((sum, l) => sum + (Number(l.totalOrderValue) || 0), 0);

                const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

                return (
                  <RoleBreakdown
                    mktOrdersRevenue={mktOrdersRevenue}
                    otOrdersRevenue={otOrdersRevenue}
                    mktDeliveredOrders={mktDeliveredOrders}
                    otDeliveredOrders={otDeliveredOrders}
                    mktLeadsForecast={mktLeadsForecast}
                    otLeadsForecast={otLeadsForecast}
                    mktLeadsConverted={mktLeadsConverted}
                    otLeadsConverted={otLeadsConverted}
                    mktConvertedLeads={mktConvertedLeads}
                    otConvertedLeads={otConvertedLeads}
                    mktLeadsCount={leads.filter(l => isMarketing(l.createdBy)).length}
                    otLeadsCount={leads.filter(l => isOnlineTeam(l.createdBy)).length}
                    fmt={fmt}
                    userNameMap={userNameMap}
                    addOrder={addOrder}
                    deleteOrder={deleteOrder}
                    addLead={addLead}
                    deleteLead={deleteLead}
                  />
                );
              })()}

              {[UserRole.STAFF, 'staff', UserRole.MARKETING, 'marketing'].includes(user?.role as any) ? (
                user?.email === 'daniel.smpallywear@gmail.com' ? (
                  <OnlineTeamDashboard user={user} />
                ) : (
                  <MarketingDashboard orders={filteredOrders} inventory={inventory} onCreateOrder={handleCreateOrder} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} user={user} leadManagerComponent={<LeadManager />} />
                )
              ) : user?.role === UserRole.ACCOUNTS || user?.role === 'accounts' ? (
                <AccountsDashboard orders={filteredOrders} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} user={user} sidebarView={accountsSidebarView} />
              ) : user?.role === UserRole.DESIGNER || user?.role === 'designer' ? (
                <DesignDashboard orders={filteredOrders} onUpdateOrder={handleUpdateOrder} user={user} />
              ) : user?.role === UserRole.ORDER_MANAGEMENT || user?.role === 'order_management' ? (
                <OrderManagementDashboard orders={filteredOrders} inventory={inventory} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} />
              ) : user?.role === UserRole.PRODUCTION || user?.role === 'production' ? (
                <ProductionDashboard orders={filteredOrders} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} />
              ) : user?.role === UserRole.DIGITIZER || user?.role === 'digitizer' ? (
                <DigitizingDashboard orders={filteredOrders} onUpdateOrder={handleUpdateOrder} isAdmin={user?.role === 'admin'} />
              ) : user?.role === UserRole.DELIVERY || user?.role === 'delivery' ? (
                <DeliveryDashboard orders={filteredOrders} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} isAdmin={user?.role === 'admin'} />
              ) : user?.role === UserRole.ONLINETEAM || user?.role === 'onlineteam' ? (
                <OnlineTeamDashboard user={user} />
              ) : user?.role === UserRole.VENDOR || user?.role === 'vendor' ? (
                <VendorDashboard user={user} />
              ) : user?.role === UserRole.INVENTORY_MANAGEMENT || user?.role === 'inventory_management' ? (
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-left">
                  <InventoryManagement userRole={user?.role} />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                      { label: 'Total Leads', val: filteredLeads.length, icon: TrendingUp, color: 'text-white', bg: 'bg-brand-primary' },
                      { label: 'Total Forecast', val: `₹${totalForecast.toLocaleString()}`, icon: DollarSign, color: 'text-white', bg: 'bg-brand-secondary' },
                      { label: 'Conversion', val: `${filteredLeads.length > 0 ? Math.round((totalConverted / totalForecast || 0) * 100) : 0}%`, icon: Activity, color: 'text-white', bg: 'bg-brand-dark' }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 ${stat.bg} rounded-full flex items-center justify-center ${stat.color} shadow-lg shadow-brand-primary/10`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
                          <p className="text-2xl font-bold text-gray-900">{stat.val}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="font-bold text-sm text-gray-800 mb-6">Value Overview</h3>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <BarChart data={filteredLeads.slice(0, 7).map(l => ({ ...l, displayValue: l.netTotal || l.totalOrderValue }))}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" hide />
                            <YAxis hide />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="displayValue" fill="#1A0B91" radius={[6, 6, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="font-bold text-sm text-gray-800 mb-6">Funnel</h3>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <FunnelChart>
                            <Funnel dataKey="value" data={funnelData} isAnimationActive>
                              <LabelList position="right" fill="#888" stroke="none" dataKey="name" />
                            </Funnel>
                          </FunnelChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-brand-primary rounded-full" />
                      Marketing Dashboard
                    </h2>
                    <LeadManager />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-gray-500">Page not found.</div>
          )}
        </div>
      </main>
      
      {layoutMode === 'mobile' && (
        <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 px-1 py-1 flex items-center justify-around shadow-lg pb-safe">
          {['admin', 'marketing', 'staff', 'user', 'onlineteam', UserRole.ADMIN, UserRole.MARKETING, UserRole.STAFF, UserRole.ONLINETEAM].includes(user?.role || '') ? (
            <>
              <button
                onClick={() => selectTab('marketing_orders')}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
                  activeTab === 'marketing_orders'
                    ? "text-brand-primary font-black"
                    : "text-gray-400 hover:text-gray-600 font-medium"
                )}
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Orders</span>
              </button>
              <button
                onClick={() => selectTab('clients')}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
                  activeTab === 'clients'
                    ? "text-brand-primary font-black"
                    : "text-gray-400 hover:text-gray-600 font-medium"
                )}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Clients</span>
              </button>
              <button
                onClick={() => selectTab('invoices')}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
                  activeTab === 'invoices'
                    ? "text-brand-primary font-black"
                    : "text-gray-400 hover:text-gray-600 font-medium"
                )}
              >
                <BarChart3 className="w-4 h-4 flex-shrink-0" />
                <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Invoices</span>
              </button>
              {['admin', 'marketing', 'staff', 'user', 'onlineteam', UserRole.ADMIN, UserRole.MARKETING, UserRole.STAFF, UserRole.ONLINETEAM].includes(user?.role || '') && (
                <button
                  onClick={() => selectTab('online_leads')}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
                    activeTab === 'online_leads'
                      ? "text-brand-primary font-black"
                      : "text-gray-400 hover:text-gray-600 font-medium"
                  )}
                >
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Leads</span>
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => selectTab('dashboard')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
                activeTab === 'dashboard'
                  ? "text-brand-primary font-black"
                  : "text-gray-400 hover:text-gray-600 font-medium"
              )}
            >
              <Layout className="w-4 h-4 flex-shrink-0" />
              <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Portal</span>
            </button>
          )}
          {user?.role && [
            UserRole.ADMIN,
            UserRole.ONLINETEAM,
            UserRole.MARKETING,
            UserRole.STAFF,
            UserRole.DESIGNER,
            UserRole.DIGITIZER,
            UserRole.PRODUCTION,
            UserRole.ACCOUNTS,
            UserRole.INVENTORY_MANAGEMENT,
            UserRole.ORDER_MANAGEMENT,
            UserRole.DELIVERY,
            'admin',
            'onlineteam',
            'marketing',
            'staff',
            'designer',
            'digitizer',
            'production',
            'accounts',
            'inventory_management',
            'order_management',
            'delivery'
          ].includes(user.role as any) && (
            <button
              onClick={() => selectTab('calendar')}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
                activeTab === 'calendar'
                  ? "text-brand-primary font-black"
                  : "text-gray-400 hover:text-gray-600 font-medium"
              )}
            >
              <CalendarIcon className="w-4 h-4 flex-shrink-0" />
              <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Calendar</span>
            </button>
          )}
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 text-gray-400 hover:text-gray-600 font-medium transition-colors cursor-pointer border-none bg-transparent select-none"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Profile</span>
          </button>
        </nav>
      )}

      <ProfileSettings isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* Connection Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
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
      </AnimatePresence>

      <SidebarChat />
    </div>
  );
}
