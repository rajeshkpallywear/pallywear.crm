import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLeads } from '../context/LeadContext';
import {
  Layout, Bell, Settings, BarChart3,
  Users, User, Shield, Globe, TrendingUp, DollarSign,
  UserPlus, X, Clock, FileText, CheckCircle2, Mail,
  LogOut, Trash2, Download, ChevronLeft, Menu, Zap, Monitor, Smartphone,
  Edit, Plus, Phone, Flame, Search, CalendarDays, LogIn, LogOut as LogOutIcon, ScanFace, Briefcase,
  Palette, Truck, Package, ArrowRight, Layers, Scissors,
  RefreshCw, AlertTriangle, Eye, LayoutGrid, List, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import InvoiceFormModal from '../components/InvoiceFormModal';
import AdminCreateOrderModal from '../components/AdminCreateOrderModal';
import FileUpload from '../components/FileUpload';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import LeadManager from '../components/LeadManager';
import ProfileSettings from '../components/ProfileSettings';
import Logo from '../components/Logo';
import InvoiceModal from '../components/InvoiceModal';
import OrderDetailModal from '../components/OrderDetailModal';
import CalendarView from '../components/CalendarView';
import { Order, OrderStatus, Invoice, Lead } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { mockDataService } from '../service/mockDataService';
import SidebarChat from '../components/SidebarChat';
import DesignTaskTimer from '../components/DesignTaskTimer';
import { getApiUrl } from '../lib/apiConfig';

const COLORS = ['#3291B6', '#5CBFD4', '#EAF4F7', '#1F2937'];

const MOCK_LOGS = [
  { id: 1, action: 'User added lead', user: 'Mike L.', time: '2 mins ago', details: 'Added lead #TX-882' },
  { id: 2, action: 'Lead status changed', user: 'Sarah K.', time: '15 mins ago', details: 'Lead #TX-882 moved to Hot' },
  { id: 3, action: 'New user joined', user: 'System', time: '1 hour ago', details: 'Jonathan V. registered' },
  { id: 4, action: 'Exported leads', user: 'Mike L.', time: '3 hours ago', details: 'Exported Leads_Report.xlsx' },
];
// ─── Top-level Order Status & Completion Helpers ─────────────────────────────
const isDeliveredStatus = (status?: string) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'delivery' || s === 'delivered' || s === OrderStatus.DELIVERY || s === OrderStatus.DELIVERED;
};

const getEffectiveStatus = (o: Order) => {
  return o.status === OrderStatus.HOLD ? (o.previousStatus || OrderStatus.PENDING) : o.status;
};

const isOrderDesignCompleted = (o: Order) => {
  const eff = getEffectiveStatus(o);
  return (
    [OrderStatus.ORDER_MANAGEMENT, OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(eff as any) ||
    Boolean((o as any).designCompleted) ||
    Boolean((o as any).details?.designCompleted) ||
    Boolean((o as any).designSentToDigitizer) ||
    Boolean((o as any).details?.designSentToDigitizer) ||
    Boolean(o.designAttachments && o.designAttachments.length > 0) ||
    Boolean(o.machineFiles && o.machineFiles.length > 0) ||
    Boolean((o as any).original_design_file)
  );
};

const isOrderAccountsCompleted = (o: Order) => {
  const eff = getEffectiveStatus(o);
  return (
    [OrderStatus.DESIGN, OrderStatus.ORDER_MANAGEMENT, OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(eff as any) ||
    Boolean(o.sentByAccounts) ||
    Boolean(o.accountsAttachments && o.accountsAttachments.length > 0)
  );
};

const isOrderOmCompleted = (o: Order) => {
  const eff = getEffectiveStatus(o);
  return [OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(eff as any);
};

const isOrderProductionCompleted = (o: Order) => {
  const eff = getEffectiveStatus(o);
  return [OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(eff as any);
};

const isOrderDeliveryCompleted = (o: Order) => {
  return o.status === OrderStatus.DELIVERED;
};

const isOrderForDigitizer = (o: Order) => {
  return Boolean(
    o.designSentToDigitizer === true ||
    o.details?.designSentToDigitizer === true ||
    o.details?.designSentToDigitizer === 'true'
  );
};

const isOrderDigitizerCompleted = (o: Order) => {
  const eff = getEffectiveStatus(o);
  if (o.digitizerCompleted === true || o.details?.digitizerCompleted === true || o.details?.digitizerCompleted === 'true') {
    return true;
  }
  if (o.digitizerSentToOM === true || o.details?.digitizerSentToOM === true || o.details?.digitizerSentToOM === 'true') {
    return true;
  }
  if (o.details?.hasMachineFiles === true || o.details?.hasMachineFiles === 'true') {
    return true;
  }
  const hasMachineFiles = Boolean(o.machineFiles && o.machineFiles.length > 0);
  const hasDigitizerFile = Boolean((o as any).digitizer_file || o.details?.digitizer_file);
  const hasDstEmb = Boolean(
    o.designAttachments && o.designAttachments.some(file => {
      const name = typeof file === 'string' ? file.toLowerCase() : '';
      return name.includes('.dst') || name.includes('.emb');
    })
  );
  const isPastDigitizer = [OrderStatus.ORDER_MANAGEMENT, OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(eff as any);
  return hasMachineFiles || hasDigitizerFile || hasDstEmb || isPastDigitizer;
};

const isOrderForInventory = (o: Order) => {
  const eff = getEffectiveStatus(o);
  return [OrderStatus.PRODUCTION, OrderStatus.DELIVERY, OrderStatus.DELIVERED].includes(eff as any) ||
    Boolean(o.details?.dispatchType) ||
    Boolean(o.details?.sentToDeliveryDashboard) ||
    Boolean(o.details?.inventoryDispatched);
};

const isOrderInventoryCompleted = (o: Order) => {
  return (
    o.status === OrderStatus.DELIVERED ||
    o.details?.sentToDeliveryDashboard === true ||
    o.details?.dispatchType === 'in_house' ||
    o.details?.dispatchType === 'courier' ||
    o.details?.inventoryDispatched === true ||
    Boolean(o.details?.courierName)
  );
};


export default function AdminDashboard() {
  const { user, logout, registeredUsers, deleteUser, updateUserRole, loading: authLoading, adminOnlyRegistration, setAdminOnlyRegistration } = useAuth();
  const { leads, invoices, orders, addLead, addOrder, updateOrder, deleteOrder, deleteLead, deleteInvoice, updateInvoice } = useLeads();
  const navigate = useNavigate();
  const [showAddLeadConvert, setShowAddLeadConvert] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'sla-tasks' | 'users' | 'orders' | 'invoices' | 'logs' | 'security' | 'user-logs' | 'online-leads' | 'attendance' | 'calendar'>('overview');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskDesignerFilter, setTaskDesignerFilter] = useState('all');
  const [taskCreatorFilter, setTaskCreatorFilter] = useState('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'overdue' | 'rework'>('all');
  const [taskViewMode, setTaskViewMode] = useState<'table' | 'cards'>('table');
  const [slaTaskSearch, setSlaTaskSearch] = useState('');
  const [slaDesignerFilter, setSlaDesignerFilter] = useState('all');
  const [slaStatusFilter, setSlaStatusFilter] = useState<'all' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [userLoginCounts, setUserLoginCounts] = useState<any[]>([]);
  const [userSummaries, setUserSummaries] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('');
  const [editingAttendance, setEditingAttendance] = useState<any | null>(null);
  const [attendanceEditForm, setAttendanceEditForm] = useState({ loginTime: '', logoutTime: '', notes: '' });
  const [savingAttendance, setSavingAttendance] = useState(false);

  const userRoleMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    registeredUsers.forEach((u: any) => {
      map[u.id] = u.role;
    });
    return map;
  }, [registeredUsers]);

  const isOnlineTeam = React.useCallback((createdBy: string) => {
    const role = userRoleMap[createdBy];
    return role === 'onlineteam' || role === 'UserRole.ONLINETEAM';
  }, [userRoleMap]);

  const [adminLeadSearch, setAdminLeadSearch] = useState('');
  const [showAdminLogsModal, setShowAdminLogsModal] = useState(false);
  const [selectedAdminLeadForLogs, setSelectedAdminLeadForLogs] = useState<Lead | null>(null);
  const [userLogsLoading, setUserLogsLoading] = useState(false);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<any | null>(null);
  const [showUserActivityModal, setShowUserActivityModal] = useState(false);
  const [selectedActivityMonth, setSelectedActivityMonth] = useState<string>('all');

  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);

  const fetchUserLogs = async () => {
    setUserLogsLoading(true);
    try {
      const data = await mockDataService.getActivityLogs();
      if (data && data.success) {
        setUserLogs(data.logs || []);
        setUserLoginCounts(data.counts || []);
        setUserSummaries(data.userSummaries || []);
      }
    } catch (e) {
      console.error('Failed to fetch activity logs:', e);
    } finally {
      setUserLogsLoading(false);
    }
  };

  const calculatedSummaries = React.useMemo(() => {
    if (userSummaries && userSummaries.length > 0) return userSummaries;
    const map: Record<string, { userId: string; userName: string; userEmail: string; firstLogin: number; lastLogout: number | null; loginCount: number }> = {};
    userLogs.forEach(log => {
      const key = log.userId || log.userEmail;
      if (!key) return;
      if (!map[key]) {
        map[key] = {
          userId: log.userId,
          userName: log.userName,
          userEmail: log.userEmail,
          firstLogin: Number(log.loginTime),
          lastLogout: log.logoutTime ? Number(log.logoutTime) : null,
          loginCount: 1
        };
      } else {
        map[key].loginCount += 1;
        if (Number(log.loginTime) < map[key].firstLogin) map[key].firstLogin = Number(log.loginTime);
        if (log.logoutTime && (!map[key].lastLogout || Number(log.logoutTime) > map[key].lastLogout)) {
          map[key].lastLogout = Number(log.logoutTime);
        }
      }
    });
    return Object.values(map);
  }, [userSummaries, userLogs]);

  React.useEffect(() => {
    if (activeTab === 'user-logs' || activeTab === 'attendance') {
      fetchUserLogs();
    }
  }, [activeTab]);

  const fetchAttendanceLogs = async () => {
    setAttendanceLoading(true);
    try {
      const data = await mockDataService.getActivityLogs();
      if (data && data.success) {
        setAttendanceLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Failed to fetch attendance logs:', e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleToggleBlockUser = async (targetUser: any) => {
    try {
      const isCurrentlyBlocked = Boolean(targetUser.isBlocked || targetUser.status === 'Blocked');
      const newStatus = isCurrentlyBlocked ? 'Active' : 'Blocked';
      const newBlockedState = !isCurrentlyBlocked;

      await mockDataService.updateUser({
        ...targetUser,
        uid: targetUser.id || targetUser.uid,
        status: newStatus,
        isBlocked: newBlockedState
      });

      alert(`User ${targetUser.name} has been ${newBlockedState ? 'Blocked 🚫' : 'Unblocked 🟢'}`);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to update user block status');
    }
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    try {
      await mockDataService.updateUser({
        ...userToEdit,
        uid: userToEdit.id || userToEdit.uid,
        status: userToEdit.status || (userToEdit.isBlocked ? 'Blocked' : 'Active'),
        isBlocked: Boolean(userToEdit.isBlocked || userToEdit.status === 'Blocked'),
        faceRegistered: Boolean(userToEdit.faceRegistered || userToEdit.faceData),
        faceData: userToEdit.faceData || ''
      });

      alert(`User ${userToEdit.name} updated successfully!`);
      setShowEditUserModal(false);
      setUserToEdit(null);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  };

  const handleSaveAttendanceEdit = async () => {
    if (!editingAttendance) return;
    setSavingAttendance(true);
    try {
      await fetch(getApiUrl(`/api/auth/activity-logs/${editingAttendance.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginTime: attendanceEditForm.loginTime,
          logoutTime: attendanceEditForm.logoutTime,
          notes: attendanceEditForm.notes
        })
      });
      setEditingAttendance(null);
      fetchAttendanceLogs();
    } catch (e) {
      console.error('Failed to save attendance edit:', e);
      // Update locally if API fails
      setAttendanceLogs(prev => prev.map(log =>
        log.id === editingAttendance.id
          ? { ...log, loginTime: attendanceEditForm.loginTime, logoutTime: attendanceEditForm.logoutTime, notes: attendanceEditForm.notes }
          : log
      ));
      setEditingAttendance(null);
    } finally {
      setSavingAttendance(false);
    }
  };

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isInvoiceFormModalOpen, setIsInvoiceFormModalOpen] = useState(false);

  // Admin Create Order Modal State
  const [isAdminOrderModalOpen, setIsAdminOrderModalOpen] = useState(false);

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsInvoiceFormModalOpen(true);
  };

  const handleEditInvoiceSubmit = async (invoiceData: any) => {
    if (editingInvoice) {
      try {
        await updateInvoice(editingInvoice.id, invoiceData);
        alert("Invoice updated successfully!");
        setIsInvoiceFormModalOpen(false);
        setEditingInvoice(null);
      } catch (err: any) {
        console.error("Failed to update invoice:", err);
        alert("Failed to update invoice.");
      }
    }
  };
  const [selectedDept, setSelectedDept] = useState<'all' | 'staff' | 'accounts' | 'order_management' | 'production' | 'delivery' | 'designers' | 'digitizer' | 'inventory'>('all');
  const [selectedSection, setSelectedSection] = useState<'total' | 'queue' | 'hold' | 'completed'>('total');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'orders' | 'tasks'>('all');
  const [orderClassificationFilter, setOrderClassificationFilter] = useState<'all' | 'bulk' | 'mixed' | 'gift' | 'standard'>('all');
  const [orderStaffSearch, setOrderStaffSearch] = useState('');
  const [orderStaffFilter, setOrderStaffFilter] = useState('all');
  const [orderDateRangeFilter, setOrderDateRangeFilter] = useState<'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom'>('all');
  const [orderCustomDate, setOrderCustomDate] = useState('');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('marketing');
  const [inviteGeneratedLink, setInviteGeneratedLink] = useState('');
  const [invitesLoading, setInvitesLoading] = useState(false);

  const fetchInvitations = async () => {
    try {
      const data = await mockDataService.getInvitations();
      setInvitations(data);
    } catch (e) {
      console.error('Failed to load invitations:', e);
    }
  };

  React.useEffect(() => {
    fetchInvitations();
  }, []);

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
            const unreadNew = newNotifs.filter((n: any) => n.isRead === 0 && !currentList.some((existing: any) => existing.id === n.id));
            if (unreadNew.length > 0) {
              playNotificationSound();
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                unreadNew.slice(0, 3).forEach((notif: any) => {
                  try {
                    const n = new Notification(notif.title, {
                      body: notif.message,
                      icon: '/icon.png'
                    });
                    n.onclick = () => {
                      window.focus();
                    };
                  } catch (err) {
                    console.warn(err);
                  }
                });
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

  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [cleaningUp, setCleaningUp] = useState(false);

  const handleToggleRegistration = () => {
    setAdminOnlyRegistration(!adminOnlyRegistration);
  };

  const isStaff = user?.role === 'staff';

  const handleRemoveUser = async (id: string) => {
    if (isStaff) {
      alert('Only administrators can remove users.');
      return;
    }
    if (confirm('Are you sure you want to remove this user? Their profile data will be deleted.')) {
      await deleteUser(id);
    }
  };

  const handleToggleUserRole = async (userId: string, currentRole: string) => {
    if (isStaff) {
      alert('Only administrators can change roles.');
      return;
    }
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      try {
        await updateUserRole(userId, newRole as any);
      } catch (error) {
        console.error('Error updating user role:', error);
        alert('Failed to update user role.');
      }
    }
  };

  const handleClearAllLeads = async () => {
    if (isStaff) {
      alert('Only administrators can clear all leads.');
      return;
    }
    if (confirm('Are you sure you want to PERMANENTLY DELETE ALL LEADS? This cannot be undone.')) {
      setCleaningUp(true);
      try {
        await mockDataService.clearLeads();
        alert('All leads have been cleared successfully.');
      } catch (error) {
        console.error('Error clearing leads: ', error);
        alert('Failed to clear leads. Check console for details.');
      } finally {
        setCleaningUp(false);
      }
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (user?.role !== 'admin') {
      alert('Only administrators can delete orders.');
      return;
    }
    if (confirm('Are you sure you want to delete this order? This action is irreversible.')) {
      try {
        await deleteOrder(id);
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order.');
      }
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (user?.role !== 'admin') {
      alert('Only administrators can delete invoices.');
      return;
    }
    if (confirm('Are you sure you want to delete this invoice? This action is irreversible.')) {
      try {
        await deleteInvoice(id);
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('Failed to delete invoice.');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Redirect if not admin or staff (after loading)
  React.useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'staff'))) {
      navigate('/dashboard');
    }
  }, [user, authLoading]);

  const totalDeliveredOrdersRevenue = useMemo(() => {
    return orders
      .filter(o => isDeliveredStatus(o.status))
      .reduce((sum, o) => {
        const amt = Number(o.financials?.totalAmount ?? o.financials?.balanceAmount ?? (o as any).totalAmount ?? 0);
        return sum + (isNaN(amt) ? 0 : amt);
      }, 0);
  }, [orders]);

  const totalAllOrdersValue = useMemo(() => {
    return orders.reduce((sum, o) => {
      const amt = Number(o.financials?.totalAmount ?? o.financials?.balanceAmount ?? (o as any).totalAmount ?? 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
  }, [orders]);

  const totalConvertedLeadsValue = useMemo(() => {
    return leads.reduce((sum, l) => {
      const val = Number(l.convertedValue ?? l.totalOrderValue ?? 0);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
  }, [leads]);

  const aggregateTotal = useMemo(() => {
    if (totalDeliveredOrdersRevenue > 0) return totalDeliveredOrdersRevenue;
    return totalAllOrdersValue + totalConvertedLeadsValue;
  }, [totalDeliveredOrdersRevenue, totalAllOrdersValue, totalConvertedLeadsValue]);

  const globalDeliveredOrdersChartData = useMemo(() => {
    if (!orders || orders.length === 0) {
      return [{ name: 'No Orders', deliveredRevenue: 0, totalOrders: 0 }];
    }

    const sorted = [...orders].sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));

    let cumDeliveredRevenue = 0;
    let cumTotalOrders = 0;

    const chartPoints = sorted.reduce((acc: any[], o, idx) => {
      cumTotalOrders += 1;
      const isDelivered = isDeliveredStatus(o.status);
      const amt = Number(o.financials?.totalAmount ?? o.financials?.balanceAmount ?? (o as any).totalAmount ?? 0);
      const validAmt = isNaN(amt) ? 0 : amt;

      if (isDelivered) {
        cumDeliveredRevenue += validAmt;
      }

      const dateStr = o.createdAt
        ? new Date(o.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
        : `Ord #${idx + 1}`;

      acc.push({
        name: dateStr,
        deliveredRevenue: cumDeliveredRevenue > 0 ? cumDeliveredRevenue : (cumTotalOrders * 1000),
        totalOrders: cumTotalOrders,
        orderId: `#${o.id.slice(-6)}`,
        client: o.customerInfo?.name || (o as any).clientName || 'Client',
        amount: validAmt,
        status: o.status
      });
      return acc;
    }, []);

    return chartPoints;
  }, [orders]);

  // Today & Staff Upload Analytics
  const staffUploadStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 86400000;
    const yesterdayStart = todayStart - 86400000;

    const userMap: Record<string, string> = {};
    registeredUsers.forEach((u: any) => {
      if (u.id) userMap[u.id] = u.name || u.email;
      if (u.email) userMap[u.email] = u.name || u.email;
    });

    const staffMap: Record<string, {
      name: string;
      todayOrdersCount: number;
      todayTotalValue: number;
      yesterdayOrdersCount: number;
      allOrdersCount: number;
      allTotalValue: number;
    }> = {};

    orders.forEach(o => {
      const creatorName = (o.createdByName || userMap[o.createdBy] || o.createdBy || 'Unknown Staff').trim();
      if (!staffMap[creatorName]) {
        staffMap[creatorName] = {
          name: creatorName,
          todayOrdersCount: 0,
          todayTotalValue: 0,
          yesterdayOrdersCount: 0,
          allOrdersCount: 0,
          allTotalValue: 0,
        };
      }

      const orderTime = Number(o.createdAt || 0);
      const amount = Number(o.financials?.totalAmount || 0);

      staffMap[creatorName].allOrdersCount += 1;
      staffMap[creatorName].allTotalValue += amount;

      if (orderTime >= todayStart && orderTime < todayEnd) {
        staffMap[creatorName].todayOrdersCount += 1;
        staffMap[creatorName].todayTotalValue += amount;
      } else if (orderTime >= yesterdayStart && orderTime < todayStart) {
        staffMap[creatorName].yesterdayOrdersCount += 1;
      }
    });

    return Object.values(staffMap).sort((a, b) => b.todayOrdersCount - a.todayOrdersCount || b.allOrdersCount - a.allOrdersCount);
  }, [orders, registeredUsers]);

  const totalTodayUploadedOrders = useMemo(() => {
    return staffUploadStats.reduce((sum, s) => sum + s.todayOrdersCount, 0);
  }, [staffUploadStats]);

  const totalTodayUploadedValue = useMemo(() => {
    return staffUploadStats.reduce((sum, s) => sum + s.todayTotalValue, 0);
  }, [staffUploadStats]);

  // Active claimed design studio tasks with 2-hour SLA
  const activeAdminDesignOrders = useMemo(() => {
    return orders.filter(o =>
      (o.assignedDesigner && o.assignedDesigner !== 'Unassigned' && !isOrderDesignCompleted(o)) ||
      Boolean((o.claimedAt || o.designClaimedAt) && !isOrderDesignCompleted(o))
    );
  }, [orders]);

  const allDesignStudioOrders = useMemo(() => {
    return orders.filter(o =>
      Boolean(o.assignedDesigner && o.assignedDesigner !== 'Unassigned') ||
      Boolean(o.claimedAt || o.designClaimedAt)
    );
  }, [orders]);

  const uniqueDesignersList = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.assignedDesigner && o.assignedDesigner !== 'Unassigned') {
        set.add(o.assignedDesigner);
      }
    });
    return Array.from(set);
  }, [orders]);

  const isRaisedTaskOrder = (o: Order) => {
    if (o.isConvertedFromTask || o.details?.isConvertedFromTask) return false;
    return Boolean(o.isRaisedTask || o.details?.isRaisedTask || o.category === 'Design Task' || o.raisedTaskCategory === 'Design Task');
  };

  // 10+ quantity classified as Bulk Order
  const isBulkOrder = (o: Order) => {
    const qty = Number(o.quantity || (o.sizeBreakdown ? o.sizeBreakdown.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0) : 0));
    return qty >= 10;
  };

  // 3 or more distinct product categories classified as Mixed Order
  const isMixedOrder = (o: Order) => {
    if (o.category === 'Mixed Order' || (o.category && o.category.toLowerCase().includes('mixed'))) return true;
    if (o.sizeBreakdown && o.sizeBreakdown.length > 0) {
      const distinctCats = new Set(o.sizeBreakdown.map(i => (i.category || '').trim().toLowerCase()).filter(Boolean));
      return distinctCats.size >= 3;
    }
    return false;
  };

  // Gift item or other specialized merchandise categories
  const isGiftOrOtherOrder = (o: Order) => {
    const giftKeywords = ['gift', 'memento', 'trophy', 'mug', 'cap', 'bag', 'bottle', 'keychain', 'merch', 'other'];
    const cat = (o.category || '').toLowerCase();
    if (giftKeywords.some(k => cat.includes(k))) return true;
    if (o.sizeBreakdown && o.sizeBreakdown.length > 0) {
      return o.sizeBreakdown.some(i => {
        const icat = (i.category || '').toLowerCase();
        return giftKeywords.some(k => icat.includes(k));
      });
    }
    return false;
  };

  const uniqueMarketingStaff = useMemo(() => {
    const staffSet = new Set<string>();
    orders.forEach(o => {
      const name = (o.createdByName || o.createdBy || '').trim();
      if (name && name !== 'Unknown' && name !== 'System' && name !== 'admin' && name !== 'CEO Admin') staffSet.add(name);
    });
    registeredUsers.filter(u => u.role === 'marketing' || u.role === 'staff' || u.role === 'sales_head').forEach(u => {
      if (u.name) staffSet.add(u.name.trim());
    });
    return Array.from(staffSet);
  }, [orders, registeredUsers]);

  const allMarketingTasks = useMemo(() => {
    return orders.filter(isRaisedTaskOrder);
  }, [orders]);

  const uniqueTaskMarketingCreators = useMemo(() => {
    const set = new Set<string>();
    allMarketingTasks.forEach(t => {
      const name = t.createdByName || t.createdBy || 'Marketing Desk';
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [allMarketingTasks]);

  const uniqueTaskDesigners = useMemo(() => {
    const set = new Set<string>();
    allMarketingTasks.forEach(t => {
      const des = t.assignedDesigner && t.assignedDesigner !== 'Unassigned' && t.assignedDesigner !== 'Designer assigned'
        ? t.assignedDesigner
        : t.claimedByName;
      if (des) set.add(des);
    });
    return Array.from(set);
  }, [allMarketingTasks]);

  const formatDurationReadable = (ms: number) => {
    if (!ms || ms <= 0) return '0 min';
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Turnaround time and overdue calculation for a task
  const getTaskMetrics = (task: Order) => {
    const isCompleted = isOrderDesignCompleted(task) || Boolean(task.designCompleted || task.designSentToMarketing);
    const isRework = Boolean(task.isRework || task.details?.isRework);
    const createdAt = Number(task.createdAt || Date.now());
    const claimedAt = Number(task.claimedAt || task.designClaimedAt || 0);
    const completedAt = Number(task.designCompletedAt || (isCompleted ? task.updatedAt : 0));
    
    // SLA is 120 minutes (2 hours) from claim time (or creation time if unassigned for > 2 hours)
    const baselineStart = claimedAt > 0 ? claimedAt : createdAt;
    const slaLimitMs = 120 * 60 * 1000;
    const deadline = baselineStart + slaLimitMs;
    
    let isOverdue = false;
    let overdueDurationMs = 0;
    let overdueReason = '';

    if (isCompleted) {
      const totalTat = Math.max(0, completedAt - createdAt);
      const designTat = claimedAt > 0 ? Math.max(0, completedAt - claimedAt) : totalTat;
      if (completedAt > deadline) {
        isOverdue = true;
        overdueDurationMs = completedAt - deadline;
        overdueReason = `Completed in ${formatDurationReadable(designTat)}, exceeded 120m SLA by ${formatDurationReadable(overdueDurationMs)}`;
      }
      return {
        isCompleted: true,
        isRework,
        tatMs: totalTat,
        designTatMs: designTat,
        tatDisplay: formatDurationReadable(designTat),
        isOverdue,
        overdueDurationMs,
        overdueReason: overdueReason || 'Delivered On-Time within SLA'
      };
    } else {
      const now = Date.now();
      const elapsedSinceClaim = claimedAt > 0 ? now - claimedAt : 0;
      const elapsedSinceCreate = now - createdAt;
      
      if (claimedAt > 0 && now > deadline) {
        isOverdue = true;
        overdueDurationMs = now - deadline;
        overdueReason = `Exceeded 2-Hour Design Studio SLA by ${formatDurationReadable(overdueDurationMs)}`;
      } else if (!claimedAt && elapsedSinceCreate > 4 * 60 * 60 * 1000) {
        isOverdue = true;
        overdueDurationMs = elapsedSinceCreate - 4 * 60 * 60 * 1000;
        overdueReason = `Unclaimed in Design Queue for ${formatDurationReadable(elapsedSinceCreate)}`;
      } else if (isRework) {
        overdueReason = `In Revision: "${task.reworkNotes || 'Changes requested by Marketing'}"`;
      }

      return {
        isCompleted: false,
        isRework,
        tatMs: elapsedSinceCreate,
        designTatMs: elapsedSinceClaim,
        tatDisplay: claimedAt > 0 ? `${formatDurationReadable(elapsedSinceClaim)} running` : 'Pending claim',
        isOverdue,
        overdueDurationMs,
        overdueReason: overdueReason || (claimedAt > 0 ? 'Within SLA Timer (In Progress)' : 'In Design Queue (Open to Claim)')
      };
    }
  };

  const marketingCreatorsStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; inProgress: number; rework: number; totalTatMs: number; avgTatMs: number }> = {};
    allMarketingTasks.forEach(task => {
      const creator = task.createdByName || task.createdBy || 'Marketing Desk';
      if (!stats[creator]) {
        stats[creator] = { total: 0, completed: 0, inProgress: 0, rework: 0, totalTatMs: 0, avgTatMs: 0 };
      }
      stats[creator].total++;
      const metrics = getTaskMetrics(task);
      if (metrics.isCompleted && !metrics.isRework) {
        stats[creator].completed++;
        stats[creator].totalTatMs += metrics.tatMs;
      } else if (metrics.isRework) {
        stats[creator].rework++;
      } else {
        stats[creator].inProgress++;
      }
    });

    Object.keys(stats).forEach(k => {
      if (stats[k].completed > 0) {
        stats[k].avgTatMs = Math.round(stats[k].totalTatMs / stats[k].completed);
      }
    });

    return stats;
  }, [allMarketingTasks]);

  const designersTaskStats = useMemo(() => {
    const stats: Record<string, { claimed: number; completed: number; inProgress: number; overdue: number; totalTatMs: number; avgTatMs: number }> = {};
    allMarketingTasks.forEach(task => {
      const designer = task.assignedDesigner && task.assignedDesigner !== 'Unassigned' && task.assignedDesigner !== 'Designer assigned'
        ? task.assignedDesigner
        : (task.claimedByName || 'Unassigned');
      
      if (!stats[designer]) {
        stats[designer] = { claimed: 0, completed: 0, inProgress: 0, overdue: 0, totalTatMs: 0, avgTatMs: 0 };
      }
      if (designer !== 'Unassigned') stats[designer].claimed++;
      
      const metrics = getTaskMetrics(task);

      if (metrics.isCompleted && !metrics.isRework) {
        stats[designer].completed++;
        stats[designer].totalTatMs += metrics.designTatMs;
      } else if (!metrics.isCompleted) {
        stats[designer].inProgress++;
      }
      if (metrics.isOverdue) {
        stats[designer].overdue++;
      }
    });

    Object.keys(stats).forEach(k => {
      if (stats[k].completed > 0) {
        stats[k].avgTatMs = Math.round(stats[k].totalTatMs / stats[k].completed);
      }
    });

    return stats;
  }, [allMarketingTasks]);

  const filteredMarketingTasks = useMemo(() => {
    return allMarketingTasks.filter(task => {
      const metrics = getTaskMetrics(task);
      
      if (taskStatusFilter === 'in_progress' && (metrics.isCompleted || metrics.isRework)) return false;
      if (taskStatusFilter === 'completed' && !metrics.isCompleted) return false;
      if (taskStatusFilter === 'overdue' && !metrics.isOverdue) return false;
      if (taskStatusFilter === 'rework' && !metrics.isRework) return false;

      if (taskCreatorFilter !== 'all') {
        const creator = task.createdByName || task.createdBy || 'Marketing Desk';
        if (creator !== taskCreatorFilter) return false;
      }

      if (taskDesignerFilter !== 'all') {
        const des = task.assignedDesigner && task.assignedDesigner !== 'Unassigned' && task.assignedDesigner !== 'Designer assigned'
          ? task.assignedDesigner
          : task.claimedByName;
        if (des !== taskDesignerFilter) return false;
      }

      if (taskSearchQuery.trim()) {
        const q = taskSearchQuery.toLowerCase().trim();
        const id = String(task.id || '').toLowerCase();
        const title = String(task.customerInfo?.name || '').toLowerCase();
        const creator = String(task.createdByName || task.createdBy || '').toLowerCase();
        const designer = String(task.assignedDesigner || task.claimedByName || '').toLowerCase();
        const notes = String(task.notes || task.designNotes || task.reworkNotes || '').toLowerCase();
        if (!id.includes(q) && !title.includes(q) && !creator.includes(q) && !designer.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [allMarketingTasks, taskStatusFilter, taskCreatorFilter, taskDesignerFilter, taskSearchQuery]);

  const filteredSlaTasks = useMemo(() => {
    return allDesignStudioOrders.filter(o => {
      const isCompleted = isOrderDesignCompleted(o);
      const claimedTime = Number(o.claimedAt || o.designClaimedAt || 0);
      const deadline = claimedTime + 120 * 60 * 1000;
      const isOverdue = !isCompleted && claimedTime > 0 && (deadline < Date.now());

      if (slaStatusFilter === 'in_progress' && isCompleted) return false;
      if (slaStatusFilter === 'completed' && !isCompleted) return false;
      if (slaStatusFilter === 'overdue' && (!isOverdue || isCompleted)) return false;

      if (slaDesignerFilter !== 'all' && o.assignedDesigner !== slaDesignerFilter) {
        return false;
      }

      if (slaTaskSearch.trim()) {
        const q = slaTaskSearch.toLowerCase().trim();
        const id = String(o.id || '').toLowerCase();
        const num = String(o.orderNumber || '').toLowerCase();
        const cust = String(o.customerInfo?.name || (o as any).clientName || '').toLowerCase();
        const des = String(o.assignedDesigner || '').toLowerCase();
        const cat = String(o.category || '').toLowerCase();
        if (!id.includes(q) && !num.includes(q) && !cust.includes(q) && !des.includes(q) && !cat.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [allDesignStudioOrders, slaStatusFilter, slaDesignerFilter, slaTaskSearch]);

  const currentOrdersList = useMemo(() => {
    let list = orders;
    if (orderTypeFilter === 'orders') list = list.filter(o => !isRaisedTaskOrder(o));
    if (orderTypeFilter === 'tasks') list = list.filter(isRaisedTaskOrder);

    if (orderClassificationFilter === 'bulk') {
      list = list.filter(isBulkOrder);
    } else if (orderClassificationFilter === 'mixed') {
      list = list.filter(isMixedOrder);
    } else if (orderClassificationFilter === 'gift') {
      list = list.filter(isGiftOrOtherOrder);
    } else if (orderClassificationFilter === 'standard') {
      list = list.filter(o => !isBulkOrder(o) && !isMixedOrder(o) && !isGiftOrOtherOrder(o));
    }

    return list;
  }, [orders, orderTypeFilter, orderClassificationFilter]);

  const handleExportOrdersToExcel = () => {
    const listToExport = getFilteredDeptOrders();
    if (listToExport.length === 0) {
      alert("No orders available to export with the currently selected filters.");
      return;
    }

    const exportRows = listToExport.map(o => {
      const isTask = isRaisedTaskOrder(o);
      const isBulk = isBulkOrder(o);
      const isMixed = isMixedOrder(o);
      const isGift = isGiftOrOtherOrder(o);

      let classification = 'Standard';
      if (isBulk && isMixed) classification = 'Bulk & Mixed (10+ Qty & 3+ Cats)';
      else if (isBulk) classification = 'Bulk Order (10+ Qty)';
      else if (isMixed) classification = 'Mixed Order (3+ Cats)';
      else if (isGift) classification = 'Gift Item / Other';

      const itemsSummary = (o.sizeBreakdown || [])
        .map(b => `${b.category || 'Item'} (${b.size || '-'}): ${b.quantity}pcs @ ₹${b.price || 0}`)
        .join('; ');

      return {
        'Order ID': `#${o.id.slice(-8)}`,
        'Full ID': o.id,
        'Created Date': o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '-',
        'Created Time': o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
        'Item Type': isTask ? 'Design Task' : (o.isConvertedFromTask || o.details?.isConvertedFromTask) ? 'Converted Task Order' : 'Customer Order',
        'Classification': classification,
        'Customer Name': o.customerInfo?.name || '-',
        'Customer Phone': o.customerInfo?.phone || '-',
        'Shipping Address': o.customerInfo?.address || '-',
        'Marketing Staff': o.createdByName || o.createdBy || 'Unknown',
        'Assigned Designer': o.assignedDesigner && o.assignedDesigner !== 'Unassigned' ? o.assignedDesigner : (o.claimedByName || 'Unassigned'),
        'Category': o.category || '-',
        'Total Quantity': o.quantity || 1,
        'Status': String(o.status || '').replace('_', ' ').toUpperCase(),
        'Total Amount (₹)': o.financials?.totalAmount || 0,
        'Advance Paid (₹)': o.financials?.advancePay || 0,
        'Balance Due (₹)': o.financials?.balanceAmount || 0,
        'Delivery Amount (₹)': o.financials?.deliveryAmount || 0,
        'Is Urgent': o.isUrgent ? 'YES' : 'NO',
        'Urgent Reason': o.urgentReason || o.details?.urgentReason || '',
        'Size & Items Breakdown': itemsSummary || '-',
        'Notes & Specifications': o.notes || o.productionNotes || o.designNotes || '',
        'Hold Reason': o.holdReason || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Global_Orders');
    
    // Auto-width column configuration
    const maxCols = Object.keys(exportRows[0] || {}).length;
    worksheet['!cols'] = Array(maxCols).fill({ wch: 20 });

    const fileName = `Global_Orders_Report_${orderTypeFilter}_${orderClassificationFilter}_${new Date().toISOString().split('T')[0]}`;
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const getDeptStats = (dept: 'all' | 'staff' | 'accounts' | 'order_management' | 'production' | 'delivery' | 'designers' | 'digitizer' | 'inventory') => {
    let totalCount = 0;
    let queueCount = 0;
    let holdCount = 0;
    let completedCount = 0;

    switch (dept) {
      case 'all':
        totalCount = currentOrdersList.length;
        completedCount = currentOrdersList.filter(o => o.status === OrderStatus.DELIVERED).length;
        holdCount = currentOrdersList.filter(o => o.status === OrderStatus.HOLD).length;
        queueCount = Math.max(0, totalCount - completedCount - holdCount);
        break;

      case 'staff':
        totalCount = currentOrdersList.length;
        holdCount = currentOrdersList.filter(o => o.status === OrderStatus.HOLD && (!o.previousStatus || o.previousStatus === OrderStatus.PENDING || o.previousStatus === OrderStatus.DRAFT)).length;
        queueCount = currentOrdersList.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.DRAFT).length;
        completedCount = currentOrdersList.filter(o => {
          const eff = getEffectiveStatus(o);
          return eff !== OrderStatus.PENDING && eff !== OrderStatus.DRAFT;
        }).length;
        break;

      case 'accounts':
        queueCount = currentOrdersList.filter(o => o.status === OrderStatus.ACCOUNTS).length;
        holdCount = currentOrdersList.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS).length;
        completedCount = currentOrdersList.filter(o => isOrderAccountsCompleted(o)).length;
        totalCount = queueCount + holdCount + completedCount;
        break;

      case 'designers':
        queueCount = currentOrdersList.filter(o => o.status === OrderStatus.DESIGN && !isOrderDesignCompleted(o)).length;
        holdCount = currentOrdersList.filter(o => o.status === OrderStatus.HOLD && (o.previousStatus === OrderStatus.DESIGN || (!o.previousStatus && o.assignedDesigner && o.assignedDesigner !== 'Unassigned'))).length;
        completedCount = currentOrdersList.filter(o => isOrderDesignCompleted(o)).length;
        totalCount = queueCount + holdCount + completedCount;
        break;

      case 'digitizer':
        queueCount = currentOrdersList.filter(o => isOrderForDigitizer(o) && !isOrderDigitizerCompleted(o) && o.status !== OrderStatus.HOLD).length;
        holdCount = currentOrdersList.filter(o => isOrderForDigitizer(o) && o.status === OrderStatus.HOLD).length;
        completedCount = currentOrdersList.filter(o => isOrderForDigitizer(o) && isOrderDigitizerCompleted(o)).length;
        totalCount = queueCount + holdCount + completedCount;
        break;

      case 'order_management':
        queueCount = currentOrdersList.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT).length;
        holdCount = currentOrdersList.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT).length;
        completedCount = currentOrdersList.filter(o => isOrderOmCompleted(o)).length;
        totalCount = queueCount + holdCount + completedCount;
        break;

      case 'production':
        queueCount = currentOrdersList.filter(o => o.status === OrderStatus.PRODUCTION).length;
        holdCount = currentOrdersList.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION).length;
        completedCount = currentOrdersList.filter(o => isOrderProductionCompleted(o)).length;
        totalCount = queueCount + holdCount + completedCount;
        break;

      case 'inventory':
        queueCount = currentOrdersList.filter(o => {
          if (o.status === OrderStatus.HOLD || o.status === OrderStatus.DELIVERED) return false;
          if (o.details?.sentToDeliveryDashboard === true || o.details?.dispatchType === 'in_house' || o.details?.inventoryDispatched === true || o.details?.dispatchType === 'courier' || o.details?.courierName) return false;
          return o.status === OrderStatus.PRODUCTION || o.status === OrderStatus.DELIVERY;
        }).length;
        holdCount = currentOrdersList.filter(o => o.status === OrderStatus.HOLD && (o.previousStatus === OrderStatus.PRODUCTION || o.previousStatus === OrderStatus.DELIVERY)).length;
        completedCount = currentOrdersList.filter(o => isOrderInventoryCompleted(o)).length;
        totalCount = queueCount + holdCount + completedCount;
        break;

      case 'delivery':
        queueCount = currentOrdersList.filter(o => o.status === OrderStatus.DELIVERY).length;
        holdCount = currentOrdersList.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY).length;
        completedCount = currentOrdersList.filter(o => isOrderDeliveryCompleted(o)).length;
        totalCount = queueCount + holdCount + completedCount;
        break;
    }

    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return { totalCount, queueCount, holdCount, completedCount, completionRate };
  };

  const getFilteredDeptOrders = () => {
    let baseList = currentOrdersList;

    // Filter by selected department & section
    if (selectedDept !== 'all') {
      switch (selectedDept) {
        case 'staff':
          if (selectedSection === 'completed') {
            baseList = baseList.filter(o => {
              const eff = getEffectiveStatus(o);
              return eff !== OrderStatus.PENDING && eff !== OrderStatus.DRAFT;
            });
          } else if (selectedSection === 'hold') {
            baseList = baseList.filter(o => o.status === OrderStatus.HOLD && (!o.previousStatus || o.previousStatus === OrderStatus.PENDING || o.previousStatus === OrderStatus.DRAFT));
          } else if (selectedSection === 'queue') {
            baseList = baseList.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.DRAFT);
          }
          break;

        case 'accounts':
          if (selectedSection === 'completed') {
            baseList = baseList.filter(o => isOrderAccountsCompleted(o));
          } else if (selectedSection === 'hold') {
            baseList = baseList.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS);
          } else if (selectedSection === 'queue') {
            baseList = baseList.filter(o => o.status === OrderStatus.ACCOUNTS);
          } else {
            baseList = baseList.filter(o => o.status === OrderStatus.ACCOUNTS || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ACCOUNTS) || isOrderAccountsCompleted(o));
          }
          break;

        case 'designers':
          if (selectedSection === 'completed') {
            baseList = baseList.filter(o => isOrderDesignCompleted(o));
          } else if (selectedSection === 'hold') {
            baseList = baseList.filter(o => o.status === OrderStatus.HOLD && (o.previousStatus === OrderStatus.DESIGN || (!o.previousStatus && o.assignedDesigner && o.assignedDesigner !== 'Unassigned')));
          } else if (selectedSection === 'queue') {
            baseList = baseList.filter(o => o.status === OrderStatus.DESIGN && !isOrderDesignCompleted(o));
          } else {
            baseList = baseList.filter(o => o.status === OrderStatus.DESIGN || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DESIGN) || isOrderDesignCompleted(o));
          }
          break;

        case 'digitizer':
          if (selectedSection === 'completed') {
            baseList = baseList.filter(o => isOrderForDigitizer(o) && isOrderDigitizerCompleted(o));
          } else if (selectedSection === 'hold') {
            baseList = baseList.filter(o => isOrderForDigitizer(o) && o.status === OrderStatus.HOLD);
          } else if (selectedSection === 'queue') {
            baseList = baseList.filter(o => isOrderForDigitizer(o) && !isOrderDigitizerCompleted(o) && o.status !== OrderStatus.HOLD);
          } else {
            baseList = baseList.filter(o => isOrderForDigitizer(o));
          }
          break;

        case 'order_management':
          if (selectedSection === 'completed') {
            baseList = baseList.filter(o => isOrderOmCompleted(o));
          } else if (selectedSection === 'hold') {
            baseList = baseList.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT);
          } else if (selectedSection === 'queue') {
            baseList = baseList.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT);
          } else {
            baseList = baseList.filter(o => o.status === OrderStatus.ORDER_MANAGEMENT || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.ORDER_MANAGEMENT) || isOrderOmCompleted(o));
          }
          break;

        case 'production':
          if (selectedSection === 'completed') {
            baseList = baseList.filter(o => isOrderProductionCompleted(o));
          } else if (selectedSection === 'hold') {
            baseList = baseList.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION);
          } else if (selectedSection === 'queue') {
            baseList = baseList.filter(o => o.status === OrderStatus.PRODUCTION);
          } else {
            baseList = baseList.filter(o => o.status === OrderStatus.PRODUCTION || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.PRODUCTION) || isOrderProductionCompleted(o));
          }
          break;

        case 'inventory':
          if (selectedSection === 'completed') {
            baseList = baseList.filter(o => isOrderInventoryCompleted(o));
          } else if (selectedSection === 'hold') {
            baseList = baseList.filter(o => o.status === OrderStatus.HOLD && (o.previousStatus === OrderStatus.PRODUCTION || o.previousStatus === OrderStatus.DELIVERY));
          } else if (selectedSection === 'queue') {
            baseList = baseList.filter(o => {
              if (o.status === OrderStatus.HOLD || o.status === OrderStatus.DELIVERED) return false;
              if (o.details?.sentToDeliveryDashboard === true || o.details?.dispatchType === 'in_house' || o.details?.inventoryDispatched === true || o.details?.dispatchType === 'courier' || o.details?.courierName) return false;
              return o.status === OrderStatus.PRODUCTION || o.status === OrderStatus.DELIVERY;
            });
          } else {
            baseList = baseList.filter(o => isOrderForInventory(o));
          }
          break;

        case 'delivery':
          if (selectedSection === 'completed') {
            baseList = baseList.filter(o => isOrderDeliveryCompleted(o));
          } else if (selectedSection === 'hold') {
            baseList = baseList.filter(o => o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY);
          } else if (selectedSection === 'queue') {
            baseList = baseList.filter(o => o.status === OrderStatus.DELIVERY);
          } else {
            baseList = baseList.filter(o => o.status === OrderStatus.DELIVERY || (o.status === OrderStatus.HOLD && o.previousStatus === OrderStatus.DELIVERY) || isOrderDeliveryCompleted(o));
          }
          break;
      }
    } else {
      if (selectedSection === 'completed') {
        baseList = baseList.filter(o => o.status === OrderStatus.DELIVERED);
      } else if (selectedSection === 'hold') {
        baseList = baseList.filter(o => o.status === OrderStatus.HOLD);
      } else if (selectedSection === 'queue') {
        baseList = baseList.filter(o => o.status !== OrderStatus.DELIVERED && o.status !== OrderStatus.HOLD);
      }
    }

    // Filter by Staff Name / Search Query
    if (orderStaffSearch.trim()) {
      const q = orderStaffSearch.toLowerCase().trim();
      baseList = baseList.filter(o => {
        const creator = (o.createdByName || '').toLowerCase();
        const cust = (o.customerInfo?.name || '').toLowerCase();
        const phone = (o.customerInfo?.phone || '').toLowerCase();
        const id = (o.id || '').toLowerCase();
        const designer = (o.assignedDesigner || '').toLowerCase();
        const cat = (o.category || '').toLowerCase();
        return creator.includes(q) || cust.includes(q) || phone.includes(q) || id.includes(q) || designer.includes(q) || cat.includes(q);
      });
    }

    // Filter by Specific Staff Filter
    if (orderStaffFilter && orderStaffFilter !== 'all') {
      baseList = baseList.filter(o => {
        const creator = (o.createdByName || '').trim().toLowerCase();
        return creator === orderStaffFilter.trim().toLowerCase();
      });
    }

    // Filter by Date Range (Today, Yesterday, This Week, This Month, Custom)
    if (orderDateRangeFilter !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = todayStart + 86400000;
      const yesterdayStart = todayStart - 86400000;
      const weekStart = todayStart - (now.getDay() * 86400000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      baseList = baseList.filter(o => {
        const t = Number(o.createdAt || 0);
        if (!t) return false;
        if (orderDateRangeFilter === 'today') return t >= todayStart && t < todayEnd;
        if (orderDateRangeFilter === 'yesterday') return t >= yesterdayStart && t < todayStart;
        if (orderDateRangeFilter === 'this_week') return t >= weekStart && t < todayEnd;
        if (orderDateRangeFilter === 'this_month') return t >= monthStart && t < todayEnd;
        if (orderDateRangeFilter === 'custom' && orderCustomDate) {
          const cDate = new Date(orderCustomDate);
          const cStart = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate()).getTime();
          const cEnd = cStart + 86400000;
          return t >= cStart && t < cEnd;
        }
        return true;
      });
    }

    return baseList;
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center dashboard-page-bg">Loading security context...</div>;

  return (
    <div className="flex dashboard-page-bg h-screen overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {layoutMode === 'system' && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      {layoutMode === 'system' && (
        <aside className={cn(
          "bg-white/75 backdrop-blur-2xl border border-white/60 flex flex-col fixed top-3 bottom-3 left-3 md:left-4 z-40 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl transition-all duration-300 overflow-hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isSidebarCollapsed ? "md:w-20" : "md:w-64",
          "w-64"
        )}>
          <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
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

          <nav className="p-4 space-y-1 overflow-y-auto custom-scrollbar flex-1">
            <button
              onClick={() => selectTab('overview')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                isSidebarCollapsed && "md:justify-center md:px-0",
                activeTab === 'overview' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
              )}
              title={isSidebarCollapsed ? "Overview" : ""}
            >
              <TrendingUp className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Overview</span>}
            </button>
            <button
              onClick={() => selectTab('users')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                isSidebarCollapsed && "md:justify-center md:px-0",
                activeTab === 'users' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
              )}
              title={isSidebarCollapsed ? "Users" : ""}
            >
              <Users className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Users</span>}
            </button>
            <button
              onClick={() => selectTab('orders')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                isSidebarCollapsed && "md:justify-center md:px-0",
                activeTab === 'orders' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
              )}
              title={isSidebarCollapsed ? "Global Orders" : ""}
            >
              <Zap className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Global Orders</span>}
            </button>
            <button
              onClick={() => selectTab('tasks')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                isSidebarCollapsed && "md:justify-center md:px-0",
                (activeTab === 'tasks' || activeTab === 'sla-tasks') ? "bg-white text-purple-700 border-2 border-purple-300 shadow-lg shadow-purple-500/10" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-purple-600"
              )}
              title={isSidebarCollapsed ? "Tasks" : ""}
            >
              <Palette className="w-4 h-4 flex-shrink-0 text-purple-600" />
              {(!isSidebarCollapsed || isMobileOpen) && (
                <div className="flex items-center justify-between w-full">
                  <span>Tasks</span>
                  {allMarketingTasks.length > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] font-black bg-purple-100 text-purple-700 rounded-full">
                      {allMarketingTasks.length}
                    </span>
                  )}
                </div>
              )}
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
              <BarChart3 className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Invoices</span>}
            </button>
            <button
              onClick={() => selectTab('logs')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                isSidebarCollapsed && "md:justify-center md:px-0",
                activeTab === 'logs' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
              )}
              title={isSidebarCollapsed ? "Audit Logs" : ""}
            >
              <FileText className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Audit Logs</span>}
            </button>

            <button
              onClick={() => selectTab('calendar')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                isSidebarCollapsed && "md:justify-center md:px-0",
                activeTab === 'calendar' ? "bg-white text-brand-primary border-2 border-brand-primary/20 shadow-lg shadow-brand-primary/5" : "bg-white text-gray-400 border border-transparent hover:border-gray-100 hover:text-gray-600"
              )}
              title={isSidebarCollapsed ? "Leave Calendar" : ""}
            >
              <CalendarDays className="w-4 h-4 flex-shrink-0 text-brand-primary" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Leave Calendar</span>}
            </button>

            <button
              onClick={() => selectTab('security')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl font-bold text-sm transition-all",
                isSidebarCollapsed && "md:justify-center md:px-0",
                activeTab === 'security' ? "bg-white text-brand-primary border border-brand-primary/10 shadow-sm" : "text-gray-500 hover:text-brand-primary hover:bg-gray-50"
              )}
              title={isSidebarCollapsed ? "Security" : ""}
            >
              <Shield className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Security</span>}
            </button>

            <div className="pt-4 mt-2 border-t border-gray-100 space-y-2">
              <button
                onClick={() => setIsAdminOrderModalOpen(true)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-brand-primary text-white hover:bg-brand-primary/95 transition-all shadow-md shadow-brand-primary/15 border-none cursor-pointer",
                  isSidebarCollapsed && "md:justify-center md:px-0"
                )}
                title={isSidebarCollapsed ? "Create Order" : ""}
              >
                <Plus className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Create Order</span>}
              </button>
              <button
                onClick={() => {
                  setEditingInvoice(null);
                  setIsInvoiceFormModalOpen(true);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-650 transition-all shadow-md shadow-emerald-500/15 border-none cursor-pointer",
                  isSidebarCollapsed && "md:justify-center md:px-0"
                )}
                title={isSidebarCollapsed ? "Create Invoice" : ""}
              >
                <Plus className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Create Invoice</span>}
              </button>
            </div>

          </nav>

          <div className="mt-auto p-4 border-t border-gray-100 shrink-0">
            <button onClick={handleLogout} className={cn(
              "text-gray-500 hover:text-red-400 font-bold w-full px-3 py-2 flex items-center gap-3 rounded-xl hover:bg-gray-50 transition-all text-sm",
              isSidebarCollapsed && "md:justify-center md:px-0"
            )} title={isSidebarCollapsed ? "Logout" : ""}>
              <LogOut className="w-4 h-4 flex-shrink-0" /> {(!isSidebarCollapsed || isMobileOpen) && <span>Logout</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 h-screen flex flex-col min-w-0 overflow-hidden pb-2 md:pb-4 transition-all duration-300",
        isSidebarCollapsed ? "md:ml-28" : "md:ml-72"
      )}>
        {/* Top Header */}
        <header className="h-16 shrink-0 bg-white/70 backdrop-blur-2xl border border-white/60 mx-3 sm:mx-6 md:mx-8 mt-3 sm:mt-4 rounded-2xl md:rounded-[1.75rem] flex items-center justify-between px-4 md:px-8 shadow-lg z-30">
          <div className="flex items-center gap-3 text-gray-400">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 -ml-1 hover:bg-gray-50 rounded-xl text-gray-500 hidden flex-shrink-0"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-700 flex items-center gap-2">
              Admin Control Panel
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsAdminOrderModalOpen(true)}
              className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-brand-primary/20 flex items-center gap-1.5 border-none cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Create Order</span>
            </button>
            <button
              onClick={() => {
                setEditingInvoice(null);
                setIsInvoiceFormModalOpen(true);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 border-none cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Create Invoice</span>
            </button>
            <button
              onClick={() => selectTab('calendar')}
              className={cn(
                "px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer",
                activeTab === 'calendar'
                  ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                  : "border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700"
              )}
              title="Team Leave Calendar & Approvals"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Leave Calendar</span>
            </button>
            <button
              onClick={() => navigate('/hr-dashboard')}
              className="px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="HR & Payroll Dashboard"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span className="hidden md:inline">HR & Payroll</span>
            </button>
            <div className="relative">
              <button
                onClick={handleToggleNotifications}
                className="p-2 hover:bg-gray-50 rounded-lg text-gray-500 relative cursor-pointer flex items-center justify-center"
              >
                <Bell className="w-5 h-5" />
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
            <button
              className="p-2 hover:bg-gray-50 rounded-lg text-gray-500"
              onClick={() => setShowProfileModal(true)}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Action Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight capitalize">
                  {activeTab === 'overview' ? 'System Performance' : activeTab.replace(/([A-Z])/g, ' $1')}
                </h1>
                <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Managing administrative controls for {user?.name}</p>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <Button variant="outline" size="sm" className="bg-white text-xs whitespace-nowrap shadow-xs" onClick={() => setShowLogsModal(true)}>
                  <FileText className="w-3.5 h-3.5 mr-1" /> Audit Logs
                </Button>
                <Button variant="outline" size="sm" className="bg-white gap-1.5 text-xs whitespace-nowrap shadow-xs" onClick={() => {
                  setInviteEmail('');
                  setInviteRole('marketing');
                  setInviteGeneratedLink('');
                  setShowInviteModal(true);
                }}>
                  <Mail className="w-3.5 h-3.5" /> Invite User
                </Button>
                <Button variant="secondary" size="sm" className="shadow-xs text-xs whitespace-nowrap" onClick={() => navigate('/register')}>
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Register User
                </Button>
              </div>
            </div>

            {activeTab === 'overview' ? (
              <>
                {/* Overview Stats - Ultra-Compact Mobile Responsive Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
                  {[
                    { label: 'Aggregate Value', val: `₹${Math.round(Number(aggregateTotal) || 0).toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-white', bg: 'bg-green-500', fullRowOnMobile: true },
                    { label: 'Global Orders', val: orders.length, icon: Zap, color: 'text-white', bg: 'bg-orange-500' },
                    { label: 'Registered Team', val: registeredUsers.length, icon: Shield, color: 'text-white', bg: 'bg-brand-dark' },
                    { label: 'Invoices', val: invoices.length, icon: BarChart3, color: 'text-white', bg: 'bg-brand-primary' },
                  ].map((stat, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      key={i}
                      className={cn(
                        "bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-gray-100 shadow-xs flex flex-row sm:flex-col items-center sm:items-start justify-start sm:justify-between gap-3 sm:gap-0 hover:shadow-md transition-all",
                        stat.fullRowOnMobile ? "col-span-2 sm:col-span-1" : ""
                      )}
                    >
                      <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-full flex items-center justify-center flex-shrink-0 sm:mb-4 shadow-sm", stat.bg, stat.color)}>
                        <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider truncate">{stat.label}</p>
                        <p className="text-sm sm:text-xl font-black text-gray-900 mt-0.5 truncate">{stat.val}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* ─── Department Order Completion & Pipeline Analytics ─────────── */}
                <div className="bg-white/80 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm mb-6 sm:mb-8 text-left space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Layers className="w-5 h-5 text-brand-primary" />
                        Department Order Completion & Pipeline Progress
                      </h3>
                      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                        Live breakdown of completed orders across Designs, Accounts, Order Management, Production & Delivery
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDept('all');
                        setSelectedSection('total');
                        selectTab('orders');
                      }}
                      className="px-3.5 py-1.5 bg-brand-primary/10 hover:bg-brand-primary hover:text-white text-brand-primary text-xs font-black rounded-xl transition-all flex items-center gap-1.5 w-fit cursor-pointer border border-brand-primary/20"
                    >
                      <span>View Full Workflow Pipeline</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                    {/* 1. Designs */}
                    {(() => {
                      const stats = getDeptStats('designers');
                      return (
                        <div className="bg-purple-50/40 hover:bg-purple-50/70 border border-purple-100/80 p-4 rounded-2xl transition-all shadow-xs flex flex-col justify-between space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                <Palette size={16} />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">Designs</h4>
                                <span className="text-[10px] text-purple-600 font-bold">Artwork & Proofs</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-purple-200/60 text-purple-800">
                              {stats.completionRate}%
                            </span>
                          </div>

                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-black text-purple-950">{stats.completedCount}</span>
                              <span className="text-[11px] font-bold text-purple-700">Completed</span>
                            </div>
                            <div className="w-full bg-purple-200/50 h-1.5 rounded-full overflow-hidden mt-1.5 mb-2">
                              <div
                                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(4, Math.min(100, stats.completionRate))}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                              <span className="text-amber-700">⚡ In Queue: {stats.queueCount}</span>
                              <span className="text-rose-600">⏸ Hold: {stats.holdCount}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedDept('designers');
                              setSelectedSection('total');
                              selectTab('orders');
                            }}
                            className="w-full py-1.5 px-2 bg-white hover:bg-purple-600 hover:text-white text-purple-700 border border-purple-200 text-[10px] font-black rounded-xl transition-all cursor-pointer text-center"
                          >
                            View Designs ({stats.totalCount}) →
                          </button>
                        </div>
                      );
                    })()}

                    {/* 2. Accounts */}
                    {(() => {
                      const stats = getDeptStats('accounts');
                      return (
                        <div className="bg-amber-50/40 hover:bg-amber-50/70 border border-amber-100/80 p-4 rounded-2xl transition-all shadow-xs flex flex-col justify-between space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                                <DollarSign size={16} />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">Accounts</h4>
                                <span className="text-[10px] text-amber-700 font-bold">Billing & Advance</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-200/60 text-amber-900">
                              {stats.completionRate}%
                            </span>
                          </div>

                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-black text-amber-950">{stats.completedCount}</span>
                              <span className="text-[11px] font-bold text-amber-800">Completed</span>
                            </div>
                            <div className="w-full bg-amber-200/50 h-1.5 rounded-full overflow-hidden mt-1.5 mb-2">
                              <div
                                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(4, Math.min(100, stats.completionRate))}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                              <span className="text-amber-700">⚡ In Queue: {stats.queueCount}</span>
                              <span className="text-rose-600">⏸ Hold: {stats.holdCount}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedDept('accounts');
                              setSelectedSection('total');
                              selectTab('orders');
                            }}
                            className="w-full py-1.5 px-2 bg-white hover:bg-amber-500 hover:text-white text-amber-800 border border-amber-200 text-[10px] font-black rounded-xl transition-all cursor-pointer text-center"
                          >
                            View Accounts ({stats.totalCount}) →
                          </button>
                        </div>
                      );
                    })()}

                    {/* 3. Order Management */}
                    {(() => {
                      const stats = getDeptStats('order_management');
                      return (
                        <div className="bg-blue-50/40 hover:bg-blue-50/70 border border-blue-100/80 p-4 rounded-2xl transition-all shadow-xs flex flex-col justify-between space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                <Package size={16} />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider">Order Mgmt</h4>
                                <span className="text-[10px] text-blue-600 font-bold">Verification & Dispatch</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-200/60 text-blue-900">
                              {stats.completionRate}%
                            </span>
                          </div>

                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-black text-blue-950">{stats.completedCount}</span>
                              <span className="text-[11px] font-bold text-blue-700">Completed</span>
                            </div>
                            <div className="w-full bg-blue-200/50 h-1.5 rounded-full overflow-hidden mt-1.5 mb-2">
                              <div
                                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(4, Math.min(100, stats.completionRate))}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                              <span className="text-amber-700">⚡ In Queue: {stats.queueCount}</span>
                              <span className="text-rose-600">⏸ Hold: {stats.holdCount}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedDept('order_management');
                              setSelectedSection('total');
                              selectTab('orders');
                            }}
                            className="w-full py-1.5 px-2 bg-white hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 text-[10px] font-black rounded-xl transition-all cursor-pointer text-center"
                          >
                            View Order Mgmt ({stats.totalCount}) →
                          </button>
                        </div>
                      );
                    })()}

                    {/* 4. Production */}
                    {(() => {
                      const stats = getDeptStats('production');
                      return (
                        <div className="bg-indigo-50/40 hover:bg-indigo-50/70 border border-indigo-100/80 p-4 rounded-2xl transition-all shadow-xs flex flex-col justify-between space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                <Zap size={16} />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wider">Production</h4>
                                <span className="text-[10px] text-indigo-600 font-bold">Manufacturing</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-200/60 text-indigo-900">
                              {stats.completionRate}%
                            </span>
                          </div>

                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-black text-indigo-950">{stats.completedCount}</span>
                              <span className="text-[11px] font-bold text-indigo-700">Completed</span>
                            </div>
                            <div className="w-full bg-indigo-200/50 h-1.5 rounded-full overflow-hidden mt-1.5 mb-2">
                              <div
                                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(4, Math.min(100, stats.completionRate))}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                              <span className="text-amber-700">⚡ In Queue: {stats.queueCount}</span>
                              <span className="text-rose-600">⏸ Hold: {stats.holdCount}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedDept('production');
                              setSelectedSection('total');
                              selectTab('orders');
                            }}
                            className="w-full py-1.5 px-2 bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 text-[10px] font-black rounded-xl transition-all cursor-pointer text-center"
                          >
                            View Production ({stats.totalCount}) →
                          </button>
                        </div>
                      );
                    })()}

                    {/* 5. Delivery */}
                    {(() => {
                      const stats = getDeptStats('delivery');
                      return (
                        <div className="bg-emerald-50/40 hover:bg-emerald-50/70 border border-emerald-100/80 p-4 rounded-2xl transition-all shadow-xs flex flex-col justify-between space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                <Truck size={16} />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">Delivery</h4>
                                <span className="text-[10px] text-emerald-600 font-bold">Dispatch & Delivered</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-200/60 text-emerald-900">
                              {stats.completionRate}%
                            </span>
                          </div>

                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-black text-emerald-950">{stats.completedCount}</span>
                              <span className="text-[11px] font-bold text-emerald-700">Delivered</span>
                            </div>
                            <div className="w-full bg-emerald-200/50 h-1.5 rounded-full overflow-hidden mt-1.5 mb-2">
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(4, Math.min(100, stats.completionRate))}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                              <span className="text-amber-700">⚡ In Transit: {stats.queueCount}</span>
                              <span className="text-rose-600">⏸ Hold: {stats.holdCount}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedDept('delivery');
                              setSelectedSection('total');
                              selectTab('orders');
                            }}
                            className="w-full py-1.5 px-2 bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 text-[10px] font-black rounded-xl transition-all cursor-pointer text-center"
                          >
                            View Delivery ({stats.totalCount}) →
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Design Studio Active Tasks — 2-Hour SLA Monitor */}
                <div className="w-full bg-white p-6 sm:p-7 rounded-3xl border border-gray-100 shadow-sm text-left mb-8 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black shadow-xs">
                        <Palette size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 text-base tracking-tight flex items-center gap-2">
                          Designs Task Monitor
                          <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black rounded-full">
                            {activeAdminDesignOrders.length} In Progress
                          </span>
                        </h3>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                          Real-time countdown tracking for active claimed design tasks across all designers
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-gray-400">
                        Standard SLA: 120 mins / task
                      </span>
                      <button
                        onClick={() => selectTab('sla-tasks')}
                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-sm shadow-purple-500/20 border-none cursor-pointer"
                      >
                        <span>Open Designs Task Monitor</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>

                  {activeAdminDesignOrders.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 italic text-xs font-medium bg-gray-50/50 rounded-2xl border border-gray-100">
                      No active claimed design tasks currently in the design studio queue.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activeAdminDesignOrders.slice(0, 6).map(order => {
                        const isCompleted = isOrderDesignCompleted(order);
                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrderDetail(order)}
                            className="p-4 bg-gray-50/80 hover:bg-purple-50/20 rounded-2xl border border-gray-150 space-y-2.5 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-xs text-brand-primary group-hover:text-purple-700 transition-colors">
                                #{order.id.slice(-8)}
                              </span>
                              <span className="text-[10px] font-bold text-gray-500 uppercase">
                                {order.category}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-gray-900 truncate max-w-[140px]">
                                {order.customerInfo?.name || (order as any).clientName || 'Customer'}
                              </span>
                              <span className="text-[10px] font-black px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md">
                                🎨 {order.assignedDesigner || 'Designer'}
                              </span>
                            </div>
                            <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400 font-medium">2-Hour SLA:</span>
                              <DesignTaskTimer
                                claimedAt={order.claimedAt || order.designClaimedAt}
                                completedAt={order.designCompletedAt}
                                isCompleted={isCompleted}
                                designerName={order.assignedDesigner}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {activeAdminDesignOrders.length > 6 && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => selectTab('sla-tasks')}
                        className="text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline bg-transparent border-none cursor-pointer"
                      >
                        View all {activeAdminDesignOrders.length} active design tasks →
                      </button>
                    </div>
                  )}
                </div>

                {/* Charts - Full Width Global Delivered Orders Revenue */}
                <div className="w-full bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm text-left mb-12">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div>
                      <h3 className="font-black text-gray-900 text-lg sm:text-xl tracking-tight">Global Delivered Orders Revenue</h3>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                        Cumulative revenue trend from delivered global orders over time
                      </p>
                    </div>
                    <span className="text-xs font-black text-brand-primary bg-brand-primary/10 px-3 py-1.5 rounded-xl">
                      Total Delivered: ₹{Math.round(totalDeliveredOrdersRevenue).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={globalDeliveredOrdersChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorDeliveredOrdersRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3291B6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3291B6" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis stroke="#9ca3af" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={val => `₹${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} />
                        <Tooltip
                          formatter={(val: any, name: any) => [
                            `₹${Number(val || 0).toLocaleString('en-IN')}`,
                            name === 'deliveredRevenue' ? 'Cumulative Delivered Revenue' : 'Amount'
                          ]}
                          contentStyle={{ borderRadius: '16px', border: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '700', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                          cursor={{ stroke: '#3291B6', strokeWidth: 2, strokeDasharray: '4 4' }}
                        />
                        <Area type="monotone" dataKey="deliveredRevenue" stroke="#3291B6" strokeWidth={3.5} fillOpacity={1} fill="url(#colorDeliveredOrdersRev)" name="deliveredRevenue" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (activeTab === 'tasks' || activeTab === 'sla-tasks') ? (
              <div className="space-y-6 text-left">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-purple-600 rounded-full" />
                      🎨 Marketing Tasks & Design Turnaround Analytics
                    </h2>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      Real-time monitor of marketing task creation, designer claiming, turnaround time (TAT), and overdue analysis.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                      <button
                        type="button"
                        onClick={() => setTaskViewMode('table')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5",
                          taskViewMode === 'table' ? "bg-white text-purple-700 shadow-2xs font-black" : "text-gray-500 hover:text-gray-800"
                        )}
                      >
                        <List size={13} /> Table
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskViewMode('cards')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5",
                          taskViewMode === 'cards' ? "bg-white text-purple-700 shadow-2xs font-black" : "text-gray-500 hover:text-gray-800"
                        )}
                      >
                        <LayoutGrid size={13} /> Cards
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5 Summary KPI Cards */}
                {(() => {
                  const totalCount = allMarketingTasks.length;
                  const completedList = allMarketingTasks.filter(t => (isOrderDesignCompleted(t) || t.designCompleted || t.designSentToMarketing) && !t.isRework);
                  const inProgressCount = allMarketingTasks.filter(t => !(isOrderDesignCompleted(t) || t.designCompleted || t.designSentToMarketing) && !t.isRework).length;
                  const overdueCount = allMarketingTasks.filter(t => getTaskMetrics(t).isOverdue).length;
                  const reworkCount = allMarketingTasks.filter(t => t.isRework || t.details?.isRework).length;
                  const totalTat = completedList.reduce((acc, t) => acc + getTaskMetrics(t).tatMs, 0);
                  const avgTatMs = completedList.length > 0 ? Math.round(totalTat / completedList.length) : 0;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Created</span>
                          <Palette size={15} className="text-purple-600" />
                        </div>
                        <p className="text-2xl font-black text-gray-900">{totalCount}</p>
                        <p className="text-[10px] text-gray-500 font-medium">By Marketing Desk</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">In Design Queue</span>
                          <Clock size={15} className="text-purple-600" />
                        </div>
                        <p className="text-2xl font-black text-purple-900">{inProgressCount}</p>
                        <p className="text-[10px] text-purple-600 font-medium">Active Studio Work</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Completed</span>
                          <CheckCircle2 size={15} className="text-emerald-600" />
                        </div>
                        <p className="text-2xl font-black text-emerald-900">{completedList.length}</p>
                        <p className="text-[10px] text-emerald-600 font-medium">Art Ready & Delivered</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-red-150 shadow-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-700">Overdue (SLA)</span>
                          <AlertTriangle size={15} className="text-red-600" />
                        </div>
                        <p className="text-2xl font-black text-red-900">{overdueCount}</p>
                        <p className="text-[10px] text-red-600 font-medium">&gt; 120m Turnaround SLA</p>
                      </div>

                      <div className="bg-white p-4 rounded-2xl border border-blue-150 shadow-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Avg. Turnaround</span>
                          <Sparkles size={15} className="text-blue-600" />
                        </div>
                        <p className="text-2xl font-black text-blue-900">{formatDurationReadable(avgTatMs)}</p>
                        <p className="text-[10px] text-blue-600 font-medium">Creation to Delivery</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Filter & Search Bar */}
                <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {[
                      { id: 'all', label: `All Tasks (${allMarketingTasks.length})` },
                      { id: 'in_progress', label: `⚡ In Progress (${allMarketingTasks.filter(t => !(isOrderDesignCompleted(t) || t.designCompleted) && !t.isRework).length})` },
                      { id: 'completed', label: `✓ Completed (${allMarketingTasks.filter(t => (isOrderDesignCompleted(t) || t.designCompleted) && !t.isRework).length})` },
                      { id: 'overdue', label: `🚨 Overdue (${allMarketingTasks.filter(t => getTaskMetrics(t).isOverdue).length})` },
                      { id: 'rework', label: `🔁 In Rework (${allMarketingTasks.filter(t => t.isRework || t.details?.isRework).length})` },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setTaskStatusFilter(f.id as any)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-black transition-all border-none cursor-pointer",
                          taskStatusFilter === f.id
                            ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* Marketing Staff dropdown */}
                    <select
                      value={taskCreatorFilter}
                      onChange={(e) => setTaskCreatorFilter(e.target.value)}
                      className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none cursor-pointer text-gray-700"
                    >
                      <option value="all">All Marketing Staff</option>
                      {uniqueTaskMarketingCreators.map(c => (
                        <option key={c} value={c}>👤 {c}</option>
                      ))}
                    </select>

                    {/* Designer dropdown */}
                    <select
                      value={taskDesignerFilter}
                      onChange={(e) => setTaskDesignerFilter(e.target.value)}
                      className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none cursor-pointer text-gray-700"
                    >
                      <option value="all">All Designers</option>
                      {uniqueTaskDesigners.map(d => (
                        <option key={d} value={d}>🎨 {d}</option>
                      ))}
                    </select>

                    {/* Search box */}
                    <div className="relative w-full sm:w-60">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search task #, specs, designer..."
                        value={taskSearchQuery}
                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Table View */}
                {taskViewMode === 'table' ? (
                  <div className="bg-white rounded-3xl border border-gray-150 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                        <thead>
                          <tr className="bg-gray-50/80 text-[9.5px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                            <th className="px-5 py-4">Task ID & Date</th>
                            <th className="px-5 py-4">Task Title & Requirements</th>
                            <th className="px-5 py-4">Marketing Creator</th>
                            <th className="px-5 py-4">Assigned Designer</th>
                            <th className="px-5 py-4 text-center">Turnaround Time (TAT)</th>
                            <th className="px-5 py-4">SLA & Overdue Status</th>
                            <th className="px-5 py-4 text-center">Current Status</th>
                            <th className="px-5 py-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          {filteredMarketingTasks.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                                No marketing tasks found matching the selected filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredMarketingTasks.map(task => {
                              const metrics = getTaskMetrics(task);
                              const creator = task.createdByName || task.createdBy || 'Marketing Desk';
                              const designer = task.assignedDesigner && task.assignedDesigner !== 'Unassigned' && task.assignedDesigner !== 'Designer assigned'
                                ? task.assignedDesigner
                                : (task.claimedByName || 'Unassigned');

                              return (
                                <tr key={task.id} className="hover:bg-purple-50/20 transition-colors">
                                  {/* 1. Task ID & Date */}
                                  <td className="px-5 py-4">
                                    <div className="flex flex-col">
                                      <span className="font-mono font-black text-brand-primary">
                                        #{task.id.slice(-8)}
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-mono">
                                        {new Date(task.createdAt).toLocaleDateString()} {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </td>

                                  {/* 2. Title & Specs */}
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-2.5 max-w-[280px]">
                                      {((task.staffImages && task.staffImages[0]) || task.marketing_image || task.original_design_file) && (
                                        <img
                                          src={task.original_design_file || task.staffImages?.[0] || task.marketing_image}
                                          alt="thumb"
                                          className="w-9 h-9 rounded-xl object-cover border border-gray-200 shrink-0"
                                        />
                                      )}
                                      <div className="truncate">
                                        <p className="font-black text-gray-900 text-xs truncate">
                                          {task.customerInfo?.name || 'Design Task'}
                                        </p>
                                        <p className="text-[10px] text-gray-500 italic truncate" title={task.notes || task.designNotes}>
                                          {task.notes || task.designNotes || 'No notes'}
                                        </p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* 3. Marketing Creator */}
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black flex items-center justify-center">
                                        {creator.charAt(0).toUpperCase()}
                                      </span>
                                      <span className="text-xs font-bold text-gray-800">{creator}</span>
                                    </div>
                                  </td>

                                  {/* 4. Assigned Designer */}
                                  <td className="px-5 py-4">
                                    {designer !== 'Unassigned' ? (
                                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px] flex items-center gap-1 w-fit">
                                        🎨 {designer}
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 font-medium rounded text-[10px]">
                                        Unassigned
                                      </span>
                                    )}
                                  </td>

                                  {/* 5. Turnaround Time (TAT) */}
                                  <td className="px-5 py-4 text-center">
                                    {metrics.isCompleted ? (
                                      <div className="flex flex-col items-center">
                                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-mono font-black">
                                          ⏱️ {metrics.tatDisplay}
                                        </span>
                                        <span className="text-[9px] text-gray-400 font-medium mt-0.5">
                                          Total: {formatDurationReadable(metrics.tatMs)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-[11px] font-mono font-black">
                                        ⏳ {metrics.tatDisplay}
                                      </span>
                                    )}
                                  </td>

                                  {/* 6. SLA & Overdue Reason */}
                                  <td className="px-5 py-4">
                                    {metrics.isOverdue ? (
                                      <div className="flex flex-col max-w-[240px]">
                                        <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 rounded-md text-[10px] font-black w-fit flex items-center gap-1">
                                          <AlertTriangle size={11} className="text-red-600" /> Overdue by {formatDurationReadable(metrics.overdueDurationMs)}
                                        </span>
                                        <span className="text-[9.5px] text-red-900 font-medium mt-0.5 italic truncate" title={metrics.overdueReason}>
                                          {metrics.overdueReason}
                                        </span>
                                      </div>
                                    ) : metrics.isRework ? (
                                      <div className="flex flex-col max-w-[240px]">
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[10px] font-black w-fit flex items-center gap-1">
                                          <RefreshCw size={10} className="text-amber-700" /> In Rework / Revision
                                        </span>
                                        <span className="text-[9.5px] text-amber-900 italic mt-0.5 truncate" title={task.reworkNotes}>
                                          "{task.reworkNotes || 'Changes requested'}"
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-md text-[10px] font-bold">
                                        ✓ On Time (Within SLA)
                                      </span>
                                    )}
                                  </td>

                                  {/* 7. Status */}
                                  <td className="px-5 py-4 text-center">
                                    {metrics.isCompleted ? (
                                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-lg text-[10px] font-black uppercase">
                                        ✓ Art Ready
                                      </span>
                                    ) : metrics.isRework ? (
                                      <span className="px-2.5 py-1 bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[10px] font-black uppercase">
                                        🔁 Revision
                                      </span>
                                    ) : (
                                      <span className="px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-[10px] font-black uppercase">
                                        ⏳ In Studio
                                      </span>
                                    )}
                                  </td>

                                  {/* 8. Action */}
                                  <td className="px-5 py-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedOrderDetail(task)}
                                      className="px-3 py-1.5 bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-800 font-bold text-xs rounded-xl transition-all border-none cursor-pointer flex items-center gap-1 ml-auto"
                                    >
                                      <Eye size={13} /> View
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Cards View */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMarketingTasks.length === 0 ? (
                      <div className="col-span-full bg-white p-12 rounded-3xl border border-gray-150 text-center text-gray-400 font-medium text-xs">
                        No marketing tasks found matching your filter criteria.
                      </div>
                    ) : (
                      filteredMarketingTasks.map(task => {
                        const metrics = getTaskMetrics(task);
                        const creator = task.createdByName || task.createdBy || 'Marketing Desk';
                        const designer = task.assignedDesigner && task.assignedDesigner !== 'Unassigned' && task.assignedDesigner !== 'Designer assigned'
                          ? task.assignedDesigner
                          : (task.claimedByName || 'Unassigned');

                        return (
                          <div
                            key={task.id}
                            onClick={() => setSelectedOrderDetail(task)}
                            className="bg-white p-5 rounded-3xl border border-gray-150 hover:border-purple-300 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-sm text-brand-primary group-hover:text-purple-700 transition-colors">
                                #{task.id.slice(-8)}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                                🎨 Design Task
                              </span>
                            </div>

                            <div className="space-y-1">
                              <p className="text-sm font-black text-gray-900 truncate">
                                {task.customerInfo?.name || 'Design Task'}
                              </p>
                              <p className="text-[11px] text-gray-500 font-medium truncate">
                                Created by: <span className="font-bold text-gray-700">{creator}</span> • {new Date(task.createdAt).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                              <span className="text-[10px] font-black px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg flex items-center gap-1">
                                🎨 {designer}
                              </span>
                              <span className="font-mono font-black text-gray-900">
                                TAT: {metrics.tatDisplay}
                              </span>
                            </div>

                            {/* Overdue alert / reason */}
                            {metrics.isOverdue && (
                              <div className="p-2 bg-red-50 rounded-xl border border-red-200 text-[10px] text-red-900 font-bold flex items-center gap-1">
                                <AlertTriangle size={12} className="text-red-600 shrink-0" />
                                <span className="truncate">{metrics.overdueReason}</span>
                              </div>
                            )}

                            {metrics.isRework && (
                              <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-[10px] text-amber-900 font-bold flex items-center gap-1">
                                <RefreshCw size={12} className="text-amber-700 shrink-0" />
                                <span className="truncate">Revision: {task.reworkNotes || 'Changes required'}</span>
                              </div>
                            )}

                            <div className="pt-2 border-t border-gray-100">
                              <DesignTaskTimer
                                claimedAt={task.claimedAt || task.designClaimedAt}
                                completedAt={task.designCompletedAt}
                                isCompleted={metrics.isCompleted}
                                variant="bar"
                                designerName={designer}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : activeTab === 'invoices' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-brand-primary rounded-full" />
                      Global Invoice Management
                    </h2>
                    <p className="text-xs text-gray-500 font-medium">Monitoring all generated invoices across the platform</p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="bg-white gap-2" onClick={() => {
                      const exportData = invoices.map(inv => ({
                        'Invoice #': inv.invoiceNumber,
                        'Date': inv.date,
                        'Customer': inv.billToName,
                        'Total': inv.total,
                        'Staff': inv.createdByName
                      }));
                      alert('Exporting ' + invoices.length + ' invoices...');
                    }}>
                      <Download className="w-4 h-4" /> Export All
                    </Button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/80 text-gray-400 font-black uppercase tracking-widest text-[10px] border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-5">System Creator</th>
                        <th className="px-6 py-5">Invoice Reference</th>
                        <th className="px-6 py-5">Customer Entity</th>
                        <th className="px-6 py-5">Generation Date</th>
                        <th className="px-6 py-5 text-right">Financial Value</th>
                        <th className="px-6 py-5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-5 text-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-xs font-bold text-white shadow-sm shadow-brand-primary/20">
                                {invoice.createdByName?.charAt(0) || 'U'}
                              </div>
                              <span className="text-xs text-gray-700 font-bold">{invoice.createdByName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-nowrap">
                            <span className="font-mono font-bold text-brand-primary bg-brand-secondary/50 px-2 py-1 rounded-lg">#{invoice.invoiceNumber}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div>
                              <p className="font-bold text-gray-900">{invoice.billToName}</p>
                              <p className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{invoice.billToEmail}</p>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-nowrap text-gray-500 font-medium">
                            {new Date(invoice.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-5 text-right text-nowrap">
                            <span className="font-black text-gray-900">₹{invoice.total.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-brand-primary hover:bg-brand-secondary font-bold"
                                onClick={() => setSelectedInvoice(invoice)}
                              >
                                <FileText className="w-4 h-4 mr-2" /> View PDF
                              </Button>
                              {(user?.role === 'admin' || user?.role === 'marketing' || user?.role === 'staff') && (
                                <button
                                  onClick={() => handleEditInvoice(invoice)}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border-none bg-transparent cursor-pointer"
                                  title="Edit Invoice"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {user?.role === 'admin' && (
                                <button
                                  onClick={() => handleDeleteInvoice(invoice.id)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border-none bg-transparent cursor-pointer"
                                  title="Delete Permanently"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {invoices.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-32 text-center">
                            <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
                              <div className="p-6 bg-brand-secondary rounded-full">
                                <FileText className="w-10 h-10 text-brand-primary opacity-50" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-gray-900 font-black text-lg">System Repository Empty</p>
                                <p className="text-gray-400 text-sm italic">No invoices have been recorded in the global context yet.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'users' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">Platform Registered Users</h3>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-brand-secondary text-brand-primary rounded-full text-[10px] font-bold uppercase">Total Users: {registeredUsers.length}</span>
                    </div>
                  </div>
                  {layoutMode === 'mobile' ? (
                    <div className="p-4 space-y-4">
                      {registeredUsers.length > 0 ? (
                        registeredUsers.map((u, i) => (
                          <div key={u.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-xs uppercase overflow-hidden shadow-md shadow-brand-primary/20">
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{u.name.charAt(0)}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800 text-sm leading-none mb-1">{u.name}</p>
                                <p className="text-[10px] text-gray-400">{u.email}</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center border-t border-gray-50 pt-2.5">
                              <span
                                className={cn(
                                  "text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-sm",
                                  u.role === 'admin' ? "text-purple-700 border-purple-100 bg-purple-50" :
                                    u.role === 'marketing' ? "text-blue-600 border-blue-100 bg-blue-50" :
                                      u.role === 'staff' ? "text-green-600 border-green-100 bg-green-50" :
                                        u.role === 'accounts' ? "text-amber-600 border-amber-100 bg-amber-50" :
                                          u.role === 'production' ? "text-orange-600 border-orange-100 bg-orange-50" :
                                            u.role === 'delivery' ? "text-indigo-600 border-indigo-100 bg-indigo-50" :
                                              u.role === 'order_management' ? "text-cyan-600 border-cyan-100 bg-cyan-50" :
                                                u.role === 'designer' ? "text-purple-600 border-purple-100 bg-purple-50" :
                                                  "text-gray-600 border-gray-100 bg-gray-50"
                                )}
                              >
                                {u.role?.replace('_', ' ')}
                              </span>
                              <div className="flex items-center gap-2">
                                {u.id !== user?.id && (
                                  <button
                                    onClick={() => handleRemoveUser(u.id)}
                                    className="p-1 hover:bg-red-50 text-red-500 rounded border border-transparent hover:border-red-100 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-400 italic text-xs p-8">
                          No team members registered yet.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                          <tr>
                            <th className="px-3.5 py-2.5">User Details</th>
                            <th className="px-3 py-2.5">System Role</th>
                            <th className="px-3 py-2.5">Join Date</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3.5 py-2.5 text-right">Settings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {registeredUsers.map((u, i) => (
                            <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                              <td className="px-3.5 py-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-[10px] uppercase overflow-hidden shrink-0 shadow-xs">
                                    {u.avatar ? (
                                      <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <span>{u.name?.charAt(0) || 'U'}</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-gray-800 text-xs truncate leading-snug">{u.name}</p>
                                    <p className="text-[10px] text-gray-400 truncate leading-tight">{u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={cn(
                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shadow-2xs whitespace-nowrap",
                                    u.role === 'admin' ? "text-purple-700 border-purple-100 bg-purple-50" :
                                      u.role === 'marketing' ? "text-blue-600 border-blue-100 bg-blue-50" :
                                        u.role === 'staff' ? "text-green-600 border-green-100 bg-green-50" :
                                          u.role === 'accounts' ? "text-amber-600 border-amber-100 bg-amber-50" :
                                            u.role === 'production' ? "text-orange-600 border-orange-100 bg-orange-50" :
                                              u.role === 'delivery' ? "text-indigo-600 border-indigo-100 bg-indigo-50" :
                                                u.role === 'order_management' ? "text-cyan-600 border-cyan-100 bg-cyan-50" :
                                                  u.role === 'designer' ? "text-purple-600 border-purple-100 bg-purple-50" :
                                                    "text-gray-600 border-gray-100 bg-gray-50"
                                  )}
                                >
                                  {u.role?.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-500 text-[11px] whitespace-nowrap font-mono">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                  {u.isBlocked || u.status === 'Blocked' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 text-[9px] font-black uppercase rounded-full border border-red-200 w-fit">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Blocked
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded-full border border-emerald-200 w-fit">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                    </span>
                                  )}
                                  {u.faceRegistered && (
                                    <span className="inline-flex items-center gap-1 text-[8px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-1 py-0.2 rounded w-fit">
                                      <ScanFace className="w-2.5 h-2.5 text-emerald-600" /> Face ID
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3.5 py-2 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUserToEdit({ ...u });
                                      setShowEditUserModal(true);
                                    }}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                  >
                                    <Edit className="w-3 h-3" /> Edit
                                  </button>
                                  {u.id !== user?.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleBlockUser(u)}
                                      className={cn(
                                        "px-2 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 shrink-0",
                                        u.isBlocked || u.status === 'Blocked'
                                          ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                          : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                                      )}
                                    >
                                      {u.isBlocked || u.status === 'Blocked' ? '🟢 Unblock' : '🚫 Block'}
                                    </button>
                                  )}
                                  {u.id !== user?.id && (
                                    <button onClick={() => handleRemoveUser(u.id)} className="p-1 hover:bg-red-50 rounded-md text-red-500 transition-colors border-none cursor-pointer shrink-0">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {registeredUsers.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic text-xs">
                                No team members registered yet or sync in progress.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit text-left">
                  <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Pending Workspace Invites</h3>
                  {invitations.filter(inv => inv.status === 'pending').length > 0 ? (
                    <div className="space-y-4">
                      {invitations.filter(inv => inv.status === 'pending').map((inv) => (
                        <div key={inv.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200/60 flex flex-col gap-2 relative group transition-all hover:border-brand-primary/25">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-gray-900 truncate max-w-[170px]" title={inv.email}>{inv.email}</p>
                              <span className="inline-block text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 mt-1.5 tracking-wider">
                                {inv.role}
                              </span>
                            </div>
                            <button
                              onClick={async () => {
                                if (window.confirm("Cancel this invitation?")) {
                                  try {
                                    await mockDataService.deleteInvitation(inv.id);
                                    await fetchInvitations();
                                    alert("Invitation cancelled.");
                                  } catch (e) {
                                    alert("Failed to cancel invitation.");
                                  }
                                }
                              }}
                              className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                              title="Revoke Invitation"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2.5 border-t border-dashed border-gray-200 pt-2.5">
                            <span className="font-semibold text-[8px]">Token: <span className="font-mono font-bold text-gray-700">{inv.id}</span></span>
                            <button
                              onClick={() => {
                                const registerUrl = `${window.location.origin}/register?invite=${inv.id}`;
                                navigator.clipboard.writeText(registerUrl);
                                alert("Invitation link copied!");
                              }}
                              className="text-brand-primary font-black hover:underline cursor-pointer border-none bg-transparent text-[8px] uppercase tracking-widest"
                            >
                              Copy Link
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic text-center py-6">No pending invitations.</p>
                  )}
                </div>
              </div>
            ) : activeTab === 'orders' ? (
              <div className="space-y-8 animate-fadeIn">
                {/* Header section with Refresh */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-brand-primary rounded-full mt-0.5" />
                      Global Workflow Auditing
                    </h2>
                    <p className="text-gray-500 text-xs mt-0.5 font-semibold uppercase tracking-wider">
                      Full visibility and direct administrative overrides for all production pipelines
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Refresh App Data
                  </Button>
                </div>

                {/* Order vs Task Separation & Classification Filter Bar */}
                <div className="bg-white/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm text-left space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider mr-1">View Type:</span>
                      <div className="flex items-center bg-gray-100/90 p-1 rounded-xl gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setOrderTypeFilter('all');
                            setSelectedSection('total');
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-1.5",
                            orderTypeFilter === 'all'
                              ? "bg-black text-white shadow-xs"
                              : "text-gray-500 hover:text-gray-900 bg-transparent"
                          )}
                        >
                          <Globe size={13} />
                          <span>All ({orders.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOrderTypeFilter('orders');
                            setSelectedSection('total');
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-1.5",
                            orderTypeFilter === 'orders'
                              ? "bg-brand-primary text-white shadow-xs"
                              : "text-gray-600 hover:text-brand-primary bg-transparent"
                          )}
                        >
                          <Package size={13} />
                          <span>📦 Orders ({orders.filter(o => !isRaisedTaskOrder(o)).length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOrderTypeFilter('tasks');
                            setSelectedSection('total');
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center gap-1.5",
                            orderTypeFilter === 'tasks'
                              ? "bg-purple-600 text-white shadow-xs"
                              : "text-gray-600 hover:text-purple-700 bg-transparent"
                          )}
                        >
                          <Palette size={13} />
                          <span>🎨 Tasks ({orders.filter(isRaisedTaskOrder).length})</span>
                        </button>
                      </div>
                    </div>

                    {/* Export to Excel Action */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportOrdersToExcel}
                        className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border-none"
                        title="Export currently filtered orders to Excel spreadsheet (.xlsx)"
                      >
                        <Download size={14} />
                        <span>📥 Export to Excel (.xlsx)</span>
                      </button>
                    </div>
                  </div>

                  {/* Order Classification Row (Bulk 10+, Mixed 3+ Cats, Gift / Other) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dashed border-gray-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider mr-1">Classification:</span>
                      {[
                        { id: 'all', label: `All Items (${(orderTypeFilter === 'orders' ? orders.filter(o => !isRaisedTaskOrder(o)) : orderTypeFilter === 'tasks' ? orders.filter(isRaisedTaskOrder) : orders).length})`, activeCls: 'bg-black text-white' },
                        { id: 'bulk', label: `📦 Bulk Orders (10+ Qty) (${(orderTypeFilter === 'orders' ? orders.filter(o => !isRaisedTaskOrder(o)) : orderTypeFilter === 'tasks' ? orders.filter(isRaisedTaskOrder) : orders).filter(isBulkOrder).length})`, activeCls: 'bg-amber-600 text-white' },
                        { id: 'mixed', label: `🔀 Mixed Orders (3+ Cats) (${(orderTypeFilter === 'orders' ? orders.filter(o => !isRaisedTaskOrder(o)) : orderTypeFilter === 'tasks' ? orders.filter(isRaisedTaskOrder) : orders).filter(isMixedOrder).length})`, activeCls: 'bg-indigo-600 text-white' },
                        { id: 'gift', label: `🎁 Gift Items / Other (${(orderTypeFilter === 'orders' ? orders.filter(o => !isRaisedTaskOrder(o)) : orderTypeFilter === 'tasks' ? orders.filter(isRaisedTaskOrder) : orders).filter(isGiftOrOtherOrder).length})`, activeCls: 'bg-pink-600 text-white' },
                        { id: 'standard', label: `Standard Orders (${(orderTypeFilter === 'orders' ? orders.filter(o => !isRaisedTaskOrder(o)) : orderTypeFilter === 'tasks' ? orders.filter(isRaisedTaskOrder) : orders).filter(o => !isBulkOrder(o) && !isMixedOrder(o) && !isGiftOrOtherOrder(o)).length})`, activeCls: 'bg-slate-700 text-white' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setOrderClassificationFilter(tab.id as any);
                            setSelectedSection('total');
                          }}
                          className={cn(
                            "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                            orderClassificationFilter === tab.id
                              ? cn(tab.activeCls, "border-transparent shadow-xs")
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          )}
                        >
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] font-bold text-gray-500">
                      Showing <span className="font-black text-gray-900">{getFilteredDeptOrders().length}</span> {orderTypeFilter === 'orders' ? 'Customer Orders' : orderTypeFilter === 'tasks' ? 'Design Tasks' : 'Items'}
                    </div>
                  </div>
                </div>

                {/* Department Pipeline Selector Tabs */}
                <div className="bg-white/90 backdrop-blur-md p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm space-y-3 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider mr-1">Department Pipeline:</span>
                    {(
                      [
                        { id: 'all', label: 'All Orders', icon: Globe, stats: getDeptStats('all'), color: 'text-gray-700', activeBg: 'bg-black text-white' },
                        { id: 'designers', label: 'Designs', icon: Palette, stats: getDeptStats('designers'), color: 'text-purple-700', activeBg: 'bg-purple-600 text-white' },
                        { id: 'digitizer', label: 'Digitizing', icon: Scissors, stats: getDeptStats('digitizer'), color: 'text-pink-700', activeBg: 'bg-pink-600 text-white' },
                        { id: 'accounts', label: 'Accounts', icon: DollarSign, stats: getDeptStats('accounts'), color: 'text-amber-700', activeBg: 'bg-amber-600 text-white' },
                        { id: 'order_management', label: 'Order Mgmt', icon: Package, stats: getDeptStats('order_management'), color: 'text-blue-700', activeBg: 'bg-blue-600 text-white' },
                        { id: 'production', label: 'Production', icon: Zap, stats: getDeptStats('production'), color: 'text-indigo-700', activeBg: 'bg-indigo-600 text-white' },
                        { id: 'inventory', label: 'Inventory', icon: Layers, stats: getDeptStats('inventory'), color: 'text-teal-700', activeBg: 'bg-teal-700 text-white' },
                        { id: 'delivery', label: 'Delivery', icon: Truck, stats: getDeptStats('delivery'), color: 'text-emerald-700', activeBg: 'bg-emerald-600 text-white' },
                      ] as const
                    ).map(d => {
                      const isSelected = selectedDept === d.id;
                      const Icon = d.icon;
                      return (
                        <button
                          key={d.id}
                          onClick={() => {
                            setSelectedDept(d.id);
                            setSelectedSection('total');
                          }}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border",
                            isSelected
                              ? cn(d.activeBg, "border-transparent shadow-sm")
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                          )}
                        >
                          <Icon size={14} className={isSelected ? 'text-white' : d.color} />
                          <span>{d.label}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-md text-[9px] font-black flex items-center gap-1",
                            isSelected ? "bg-white/20 text-white" : "bg-gray-200/80 text-gray-700"
                          )}>
                            <span className={isSelected ? "text-emerald-200" : "text-emerald-600"}>✓{d.stats.completedCount}</span>
                            <span>/</span>
                            <span>{d.stats.queueCount} Q</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Stage Sub-filters for Selected Department */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-dashed border-gray-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider mr-1">Stage Filter:</span>
                      {(() => {
                        const currentStats = getDeptStats(selectedDept);
                        return (
                          [
                            { id: 'total', label: `All (${currentStats.totalCount})` },
                            { id: 'queue', label: `⚡ In Queue (${currentStats.queueCount})` },
                            { id: 'completed', label: `✓ Completed (${currentStats.completedCount})` },
                            { id: 'hold', label: `⏸ On Hold (${currentStats.holdCount})` },
                          ] as const
                        ).map(sec => (
                          <button
                            key={sec.id}
                            onClick={() => setSelectedSection(sec.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer border",
                              selectedSection === sec.id
                                ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            )}
                          >
                            {sec.label}
                          </button>
                        ));
                      })()}
                    </div>

                    <div className="text-[10px] font-bold text-gray-500">
                      Viewing <span className="font-black text-gray-900">{getFilteredDeptOrders().length}</span> orders
                    </div>
                  </div>
                </div>

                {/* Today's Staff Uploads Analytics Bar */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-sm">
                        ⚡
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                          Today's Staff Uploads
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                            {totalTodayUploadedOrders} Orders Today (₹{totalTodayUploadedValue.toLocaleString('en-IN')})
                          </span>
                        </h4>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                          Live tracking of orders uploaded by each staff member today
                        </p>
                      </div>
                    </div>

                    {/* Date Range Selector */}
                    <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-150">
                      {(
                        [
                          { id: 'all', label: 'All Time' },
                          { id: 'today', label: `Today (${totalTodayUploadedOrders})` },
                          { id: 'yesterday', label: 'Yesterday' },
                          { id: 'this_week', label: 'This Week' },
                          { id: 'this_month', label: 'This Month' },
                          { id: 'custom', label: 'Custom' },
                        ] as const
                      ).map(dr => (
                        <button
                          key={dr.id}
                          onClick={() => setOrderDateRangeFilter(dr.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer border-none",
                            orderDateRangeFilter === dr.id
                              ? "bg-black text-white shadow-xs"
                              : "text-gray-500 hover:text-gray-900 bg-transparent hover:bg-gray-200/50"
                          )}
                        >
                          {dr.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {orderDateRangeFilter === 'custom' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Select Date:</span>
                      <input
                        type="date"
                        value={orderCustomDate}
                        onChange={e => setOrderCustomDate(e.target.value)}
                        className="text-xs border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-1 text-gray-700 font-bold focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Staff Badges Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-dashed border-gray-100">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider mr-1">Staff Breakdown:</span>
                    <button
                      onClick={() => setOrderStaffFilter('all')}
                      className={cn(
                        "px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                        orderStaffFilter === 'all'
                          ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      <span>All Staff</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-black/15 text-[9px] font-black">{orders.length}</span>
                    </button>

                    {staffUploadStats.map(s => {
                      const isSelected = orderStaffFilter.toLowerCase() === s.name.toLowerCase();
                      return (
                        <button
                          key={s.name}
                          onClick={() => setOrderStaffFilter(isSelected ? 'all' : s.name)}
                          className={cn(
                            "px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                            isSelected
                              ? "bg-black text-white border-black shadow-xs"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                          )}
                        >
                          <span>{s.name}</span>
                          {s.todayOrdersCount > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-white text-[9px] font-black shadow-xs">
                              +{s.todayOrdersCount} today
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded-md bg-gray-200 text-gray-600 text-[9px] font-black">
                              0 today
                            </span>
                          )}
                          <span className="text-[9px] text-gray-400 font-medium">({s.allOrdersCount} total)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search & Staff Filter Toolbar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orderStaffSearch}
                      onChange={e => setOrderStaffSearch(e.target.value)}
                      placeholder="Search customer, order #, staff, category, designer..."
                      className="w-full text-xs pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                    {orderStaffSearch && (
                      <button
                        onClick={() => setOrderStaffSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 border-none bg-transparent cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Dedicated Marketing Staff Dropdown Filter */}
                  <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 w-full md:w-auto">
                    <User size={13} className="text-gray-400 shrink-0" />
                    <select
                      value={orderStaffFilter}
                      onChange={e => setOrderStaffFilter(e.target.value)}
                      className="text-xs font-bold text-gray-700 bg-transparent border-none outline-none cursor-pointer pr-1 w-full"
                    >
                      <option value="all">👤 All Staff & Marketing Creators ({orders.length})</option>
                      {uniqueMarketingStaff.map(s => {
                        const count = orders.filter(o => (o.createdByName || o.createdBy || '').trim().toLowerCase() === s.toLowerCase()).length;
                        return (
                          <option key={s} value={s}>
                            👤 {s} ({count})
                          </option>
                        );
                      })}
                    </select>
                    {orderStaffFilter !== 'all' && (
                      <button
                        onClick={() => setOrderStaffFilter('all')}
                        className="text-gray-400 hover:text-gray-600 p-0.5 border-none bg-transparent cursor-pointer"
                        title="Clear staff filter"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <span className="text-xs font-black text-gray-500 px-2">
                      {getFilteredDeptOrders().length} Orders Found
                    </span>
                    {(orderStaffSearch || orderStaffFilter !== 'all' || orderDateRangeFilter !== 'all' || selectedDept !== 'all' || selectedSection !== 'total' || orderTypeFilter !== 'all' || orderClassificationFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setOrderStaffSearch('');
                          setOrderStaffFilter('all');
                          setOrderDateRangeFilter('all');
                          setOrderCustomDate('');
                          setSelectedDept('all');
                          setSelectedSection('total');
                          setOrderTypeFilter('all');
                          setOrderClassificationFilter('all');
                        }}
                        className="px-3.5 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl hover:bg-red-100 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider text-[11px] border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">Order ID</th>
                        <th className="px-6 py-4">Customer & Creator</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Quantity</th>
                        <th className="px-6 py-4">Status & Step</th>
                        <th className="px-6 py-4 text-right">Value</th>
                        <th className="px-6 py-4 text-right">Actions Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getFilteredDeptOrders().map((o) => {
                        const isOrderCreatedToday = (() => {
                          if (!o.createdAt) return false;
                          const d = new Date(o.createdAt);
                          const now = new Date();
                          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                        })();

                        return (
                          <tr key={o.id} className="hover:bg-gray-50/50 group transition-colors">
                            <td className="px-6 py-4 font-mono font-black text-brand-primary text-xs">
                              <div className="flex flex-col gap-1">
                                <span>#{o.id.slice(-8)}</span>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  {isRaisedTaskOrder(o) ? (
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                      🎨 TASK
                                    </span>
                                  ) : (o.isConvertedFromTask || o.details?.isConvertedFromTask) ? (
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      ✨ CONVERTED
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                      📦 ORDER
                                    </span>
                                  )}
                                  {isBulkOrder(o) && (
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                      📦 BULK ({o.quantity})
                                    </span>
                                  )}
                                  {isMixedOrder(o) && (
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
                                      🔀 MIXED
                                    </span>
                                  )}
                                  {isGiftOrOtherOrder(o) && (
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-pink-100 text-pink-900 border border-pink-300">
                                      🎁 GIFT
                                    </span>
                                  )}
                                  {isOrderCreatedToday && (
                                    <span className="text-[8px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                      ⚡ Today
                                    </span>
                                  )}
                                  {o.isUrgent && (
                                    <span 
                                      title={o.urgentReason || o.details?.urgentReason || 'Urgent'}
                                      className="text-[8px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse"
                                    >
                                      URGENT
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {((o.staffImages && o.staffImages[0]) || o.marketing_image) && (
                                  <div className="w-10 h-10 rounded-xl border border-gray-200 overflow-hidden shrink-0 bg-gray-50">
                                    <img src={o.staffImages?.[0] || o.marketing_image} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-gray-800">{o.customerInfo.name}</p>
                                  <p className="text-[10px] text-gray-400 font-medium">{o.customerInfo.phone || 'No phone'}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <p className="text-[9px] text-brand-primary font-black uppercase tracking-wider">
                                      Created by: {o.createdByName || 'System'}
                                    </p>
                                    {isOrderCreatedToday && (
                                      <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-500 text-white">
                                        Today
                                      </span>
                                    )}
                                  </div>
                                  {o.createdAt && (
                                    <p className="text-[8px] text-gray-400 font-mono mt-0.5">
                                      {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium text-gray-700 capitalize">
                                {o.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-gray-600">{o.quantity}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest w-fit border",
                                  o.status === OrderStatus.HOLD ? "bg-red-50 text-red-700 border-red-200" :
                                    o.status === OrderStatus.DELIVERED ? "bg-green-50 text-green-700 border-green-200" :
                                      "bg-brand-secondary text-brand-primary border-brand-primary/10"
                                )}>
                                  {o.status.replace('_', ' ')}
                                </span>
                                {o.assignedDesigner && o.assignedDesigner !== 'Unassigned' && o.assignedDesigner !== 'Designer assigned' ? (
                                  <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                                    🎨 {o.assignedDesigner}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-medium block mt-0.5">
                                    🎨 Unassigned
                                  </span>
                                )}
                                {o.status === OrderStatus.HOLD && o.holdReason && (
                                  <span className="text-[10px] text-red-500 italic block font-semibold">
                                    Reason: {o.holdReason}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-gray-900">₹{(o.financials?.totalAmount || 0).toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedOrderDetail(o)}
                                  className="px-3 py-1.5 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer border-none"
                                >
                                  Edit / Update
                                </button>
                                <button
                                  onClick={() => handleDeleteOrder(o.id)}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-none"
                                  title="Delete Order"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {getFilteredDeptOrders().length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-24 text-center">
                            <div className="max-w-md mx-auto text-center space-y-3">
                              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto border border-dashed border-slate-300">
                                ✔
                              </div>
                              <div>
                                <p className="font-bold text-gray-800">Clear Slate</p>
                                <p className="text-xs text-gray-400 italic">No orders found matching the filter specs.</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'security' ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 mb-6">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">System Cleanup</h3>
                    <p className="text-gray-500 text-sm mb-6">
                      Remove all leads from the system. This action is irreversible and should only be used for clearing mock data or starting fresh.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      disabled={cleaningUp}
                      onClick={handleClearAllLeads}
                    >
                      {cleaningUp ? 'Processing...' : 'Clear All Leads'}
                    </Button>
                  </div>

                  <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 mb-6">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Access Control</h3>
                    <p className="text-gray-500 text-sm mb-6">
                      Current system is in High-Integrity mode. Registration is restricted to internal team members.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-700">Admin-only Registration</span>
                        <button
                          onClick={handleToggleRegistration}
                          className={cn(
                            "w-10 h-5 rounded-full transition-colors relative",
                            adminOnlyRegistration ? "bg-brand-primary" : "bg-gray-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                            adminOnlyRegistration ? "left-5" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'logs' ? (
              <div className="space-y-6">
                {MOCK_LOGS.map(log => (
                  <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 flex gap-4">
                    <div className="w-10 h-10 bg-white border border-brand-secondary/30 rounded-full flex items-center justify-center text-brand-primary shadow-sm">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="font-bold text-sm text-gray-800">{log.action}</p>
                        <span className="text-[10px] text-gray-400 font-medium">{log.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
                      <p className="text-[10px] text-brand-primary font-bold mt-2 uppercase tracking-tight">System Operator: {log.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (activeTab === 'user-logs' || activeTab === 'user-activity') ? (
              <div className="space-y-8 animate-fadeIn text-left">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                      <Clock className="w-5 h-5 text-brand-primary" />
                      User Activity & Login Monitoring
                    </h2>
                    <p className="text-gray-500 text-xs mt-1 font-medium">
                      Real-time morning first login, last login date & time, logout timestamps, and session history per user
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={selectedActivityMonth}
                      onChange={(e) => setSelectedActivityMonth(e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none cursor-pointer focus:border-brand-primary"
                    >
                      <option value="all">📅 All Time (All Months)</option>
                      <option value="current">🗓️ Current Month (Aug 2026)</option>
                      <option value="2026-08">August 2026</option>
                      <option value="2026-07">July 2026</option>
                      <option value="2026-06">June 2026</option>
                    </select>
                    <button
                      onClick={() => fetchUserLogs()}
                      className="px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border-none flex items-center gap-2"
                    >
                      Refresh Activity Logs
                    </button>
                  </div>
                </div>

                {/* Main User Activity Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">Team User Activity Summary</h3>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                        Click on any user row to view their individual morning first login, last login & session history
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      {registeredUsers.length} Users Registered
                    </span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 font-black uppercase tracking-wider text-[9px] border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">🌅 Morning First Login</th>
                        <th className="px-6 py-4">🕒 Last Login Date & Time</th>
                        <th className="px-6 py-4">🚪 Last Logout Date & Time</th>
                        <th className="px-6 py-4">⏱️ Working Hours (Daily & Monthly)</th>
                        <th className="px-6 py-4 text-center">Logins</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {userLogsLoading ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-xs text-gray-400 italic">
                            Loading team user activity...
                          </td>
                        </tr>
                      ) : registeredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-xs text-gray-400 italic">
                            No registered users found.
                          </td>
                        </tr>
                      ) : (
                        registeredUsers.map((uItem: any) => {
                          const userRawLogs = userLogs.filter((log: any) =>
                            log.userId === uItem.id ||
                            log.userId === uItem.uid ||
                            (log.userEmail && uItem.email && log.userEmail.toLowerCase().trim() === uItem.email.toLowerCase().trim()) ||
                            (log.userName && uItem.name && log.userName.toLowerCase().trim() === uItem.name.toLowerCase().trim())
                          );

                          // Filter logs by selected month
                          const uLogs = userRawLogs.filter((l: any) => {
                            if (!selectedActivityMonth || selectedActivityMonth === 'all') return true;
                            const d = new Date(Number(l.loginTime));
                            if (selectedActivityMonth === 'current') {
                              const now = new Date();
                              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                            }
                            const [yearStr, monthStr] = selectedActivityMonth.split('-');
                            return d.getFullYear() === Number(yearStr) && (d.getMonth() + 1) === Number(monthStr);
                          });

                          // Helper for Days Format
                          const getDaysAgoInfo = (timestamp: number | null | undefined) => {
                            if (!timestamp) return null;
                            const date = new Date(timestamp);
                            const now = new Date();

                            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                            const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

                            const diffMs = todayStart - targetStart;
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                            const timeStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
                            const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                            const fullDateTime = `${dateStr}, ${timeStr}`;

                            let daysTag = 'Today';
                            let colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                            if (diffDays === 1) {
                              daysTag = '1 day ago';
                              colorClass = 'bg-amber-50 text-amber-800 border-amber-200';
                            } else if (diffDays > 1) {
                              daysTag = `${diffDays} days ago`;
                              colorClass = 'bg-purple-50 text-purple-700 border-purple-200';
                            }

                            return { daysTag, fullDateTime, timeStr, dateStr, diffDays, colorClass };
                          };

                          // Filter AM Logins (Hour < 12 AM) vs PM Logins (Hour >= 12 PM)
                          const amLogs = uLogs.filter((l: any) => new Date(Number(l.loginTime)).getHours() < 12);
                          const pmLogs = uLogs.filter((l: any) => new Date(Number(l.loginTime)).getHours() >= 12);

                          // Morning First Login (Earliest AM login overall)
                          const morningFirstLogin = amLogs.length > 0
                            ? Math.min(...amLogs.map((l: any) => Number(l.loginTime)))
                            : (uLogs.length > 0 ? Math.min(...uLogs.map((l: any) => Number(l.loginTime))) : null);

                          // Evening Last Login (Latest PM login, or overall latest login)
                          const eveningLastLogin = pmLogs.length > 0
                            ? Math.max(...pmLogs.map((l: any) => Number(l.loginTime)))
                            : (uLogs.length > 0 ? Math.max(...uLogs.map((l: any) => Number(l.loginTime))) : null);

                          const logoutLogs = uLogs.filter((l: any) => l.logoutTime);
                          const lastLogout = logoutLogs.length > 0 ? Math.max(...logoutLogs.map((l: any) => Number(l.logoutTime))) : null;

                          const isActiveNow = uLogs.some((l: any) => !l.logoutTime || Number(l.loginTime) > Number(l.logoutTime || 0));

                          const morningInfo = getDaysAgoInfo(morningFirstLogin);
                          const eveningInfo = getDaysAgoInfo(eveningLastLogin);
                          const logoutInfo = getDaysAgoInfo(lastLogout);

                          // --- Office Working Hours: 9:00 AM to 6:00 PM (9 Hours) ---
                          // Check Morning Login Punctuality (Target 9:00 AM, grace up to 9:15 AM)
                          let isMorningLate = false;
                          let morningLateTimeStr = '';
                          if (morningFirstLogin) {
                            const mObj = new Date(morningFirstLogin);
                            const mHr = mObj.getHours();
                            const mMin = mObj.getMinutes();
                            if (mHr > 9 || (mHr === 9 && mMin > 15)) {
                              isMorningLate = true;
                              morningLateTimeStr = mObj.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
                            }
                          }

                          // Check Evening Logout Punctuality (Target 6:00 PM / 18:00)
                          let isLogoutEarly = false;
                          let logoutEarlyTimeStr = '';
                          if (lastLogout && !isActiveNow) {
                            const lObj = new Date(lastLogout);
                            const lHr = lObj.getHours();
                            if (lHr < 18) {
                              isLogoutEarly = true;
                              logoutEarlyTimeStr = lObj.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
                            }
                          }

                          // --- Group logs by Calendar Day (YYYY-MM-DD) to calculate Daily & Monthly hours accurately ---
                          const dailyMap: Record<string, { logins: any[]; dayStart: number; dayEnd: number; dayWorkedMs: number }> = {};

                          uLogs.forEach((l: any) => {
                            const d = new Date(Number(l.loginTime));
                            const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                            if (!dailyMap[dayKey]) {
                              dailyMap[dayKey] = { logins: [], dayStart: Number(l.loginTime), dayEnd: Number(l.logoutTime || l.loginTime), dayWorkedMs: 0 };
                            }

                            dailyMap[dayKey].logins.push(l);

                            const loginT = Number(l.loginTime);
                            const logoutT = l.logoutTime ? Number(l.logoutTime) : (loginT + (8 * 3600 * 1000));
                            const sessionDur = Math.min(Math.max(0, logoutT - loginT), 10 * 3600 * 1000);

                            dailyMap[dayKey].dayWorkedMs += sessionDur;
                            if (loginT < dailyMap[dayKey].dayStart) dailyMap[dayKey].dayStart = loginT;
                            if (logoutT > dailyMap[dayKey].dayEnd) dailyMap[dayKey].dayEnd = logoutT;
                          });

                          // Compute Monthly Totals
                          const daysWorkedInMonth = Object.keys(dailyMap).length;
                          let totalMonthlyMs = 0;
                          Object.values(dailyMap).forEach((dayData) => {
                            totalMonthlyMs += Math.min(dayData.dayWorkedMs, 12 * 3600 * 1000);
                          });

                          const monthlyHoursNum = Math.floor(totalMonthlyMs / 3600000);
                          const monthlyMinsNum = Math.round((totalMonthlyMs % 3600000) / 60000);
                          const monthlyHoursText = `${monthlyHoursNum}h ${monthlyMinsNum}m`;

                          // Latest Day Details
                          const sortedDayKeys = Object.keys(dailyMap).sort().reverse();
                          const latestDayKey = sortedDayKeys[0];
                          const latestDayData = latestDayKey ? dailyMap[latestDayKey] : null;

                          let dailyHoursText = '—';
                          let latestDayLabel = '';
                          let shiftBadgeText = 'No Activity';
                          let shiftBadgeStyle = 'bg-gray-50 text-gray-400 border-gray-200';
                          let punctualitySubtext = 'Shift: 9:00 AM – 6:00 PM';

                          if (latestDayData) {
                            const dayMs = Math.min(latestDayData.dayWorkedMs, 12 * 3600 * 1000);
                            const hrs = Math.floor(dayMs / 3600000);
                            const mins = Math.round((dayMs % 3600000) / 60000);
                            dailyHoursText = `${hrs}h ${mins}m`;

                            const dObj = new Date(latestDayData.dayStart);
                            latestDayLabel = `${dObj.getDate()}/${dObj.getMonth() + 1}`;

                            const workHrsDec = dayMs / 3600000;
                            if (isActiveNow) {
                              shiftBadgeText = `Active (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
                            } else if (isMorningLate && isLogoutEarly) {
                              shiftBadgeText = `LOP: Late & Early Exit (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                            } else if (isMorningLate) {
                              shiftBadgeText = `LOP: Late Entry (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                            } else if (isLogoutEarly) {
                              shiftBadgeText = `LOP: Early Exit (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                            } else if (workHrsDec >= 8.5) {
                              shiftBadgeText = `Full Shift (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                            } else if (workHrsDec >= 4) {
                              shiftBadgeText = `Partial Shift (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                            } else {
                              shiftBadgeText = `Short Shift LOP (${dailyHoursText})`;
                              shiftBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                            }

                            const entryDetail = isMorningLate ? `Late Entry (${morningLateTimeStr})` : 'On Time (9 AM Start)';
                            const exitDetail = lastLogout ? (isLogoutEarly ? `Early Exit (${logoutEarlyTimeStr})` : 'On Time Exit (6 PM)') : 'No Logout';
                            punctualitySubtext = `${entryDetail} • ${exitDetail}`;
                          }

                          return (
                            <tr
                              key={uItem.id || uItem.uid}
                              onClick={() => {
                                setSelectedUserForActivity(uItem);
                                setShowUserActivityModal(true);
                              }}
                              className="hover:bg-brand-primary/5 transition-colors cursor-pointer group"
                            >
                              {/* User Info */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-black text-xs uppercase shadow-sm">
                                    {uItem.name?.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-800 text-xs group-hover:text-brand-primary transition-colors">{uItem.name}</p>
                                    <p className="text-[10px] text-gray-400">{uItem.email}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Role */}
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-gray-100 text-gray-600 border border-gray-200">
                                  {uItem.role?.replace('_', ' ')}
                                </span>
                              </td>

                              {/* Morning First Login */}
                              <td className="px-6 py-4">
                                {morningInfo ? (
                                  <div>
                                    <div className="flex items-center gap-1 mb-1">
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200 inline-block">
                                        AM Login
                                      </span>
                                      {isMorningLate ? (
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 inline-block">
                                          🔴 Late (LOP)
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                                          🟢 On Time
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-mono text-xs font-bold text-amber-900">{morningInfo.fullDateTime}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 font-mono text-xs">—</span>
                                )}
                              </td>

                              {/* Evening / Last Login in Days Format & Login Method */}
                              <td className="px-6 py-4">
                                {eveningInfo ? (
                                  <div>
                                    <div className="flex flex-wrap items-center gap-1 mb-1">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border inline-block ${eveningInfo.colorClass}`}>
                                        {eveningInfo.daysTag}
                                      </span>
                                      {(() => {
                                        const lt = (uLogs[0]?.loginType || 'PASSWORD').toUpperCase();
                                        if (lt === 'FACE_ID') {
                                          return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">👤 Face ID</span>;
                                        }
                                        if (lt === 'FINGERPRINT') {
                                          return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">👆 Touch ID</span>;
                                        }
                                        if (lt === 'GOOGLE') {
                                          return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-50 text-red-700 border border-red-200">🌐 Google</span>;
                                        }
                                        return <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-gray-100 text-gray-700 border border-gray-200">🔑 Password</span>;
                                      })()}
                                    </div>
                                    <p className="font-mono text-xs font-bold text-blue-700">{eveningInfo.fullDateTime}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 font-mono text-xs">—</span>
                                )}
                              </td>

                              {/* Last Logout / Status */}
                              <td className="px-6 py-4">
                                {isActiveNow ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-full border border-emerald-200 shadow-xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Now
                                  </span>
                                ) : logoutInfo ? (
                                  <div>
                                    <div className="flex flex-wrap items-center gap-1 mb-1">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border inline-block ${logoutInfo.colorClass}`}>
                                        {logoutInfo.daysTag}
                                      </span>
                                      {isLogoutEarly ? (
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 inline-block">
                                          🔴 Early Exit (LOP)
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                                          🟢 On Time
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-mono text-xs font-semibold text-gray-600">{logoutInfo.fullDateTime}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 font-mono text-xs">—</span>
                                )}
                              </td>

                              {/* Working Hours Monitoring (Daily & Monthly) */}
                              <td className="px-6 py-4">
                                {latestDayData ? (
                                  <div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border inline-block mb-1 ${shiftBadgeStyle}`}>
                                      {shiftBadgeText}
                                    </span>
                                    <p className="font-mono text-xs font-black text-gray-900">
                                      Daily: {dailyHoursText} <span className="text-[10px] text-gray-400 font-bold">({latestDayLabel})</span>
                                    </p>
                                    <div className="mt-1">
                                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded inline-block">
                                        Monthly: {monthlyHoursText} ({daysWorkedInMonth} days)
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">{punctualitySubtext}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-300 font-mono text-xs">—</span>
                                )}
                              </td>

                              {/* Logins Count */}
                              <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full border border-indigo-100">
                                  {uLogs.length}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUserForActivity(uItem);
                                    setShowUserActivityModal(true);
                                  }}
                                  className="px-3 py-1 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-[10px] font-black uppercase tracking-wider rounded-lg border-none cursor-pointer transition-all"
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Single User Activity Details Modal */}
                {showUserActivityModal && selectedUserForActivity && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
                    <div className="bg-white border border-gray-100 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fadeIn">
                      {/* Modal Header */}
                      <div className="bg-brand-primary px-6 py-5 flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-sm uppercase">
                            {selectedUserForActivity.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black">{selectedUserForActivity.name}</h3>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-white/20 text-white">
                                {selectedUserForActivity.role?.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-white/80">{selectedUserForActivity.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowUserActivityModal(false);
                            setSelectedUserForActivity(null);
                          }}
                          className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all border-none cursor-pointer text-white"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Modal Body */}
                      <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-left">
                        {/* KPI Cards for User */}
                        {(() => {
                          const uLogs = userLogs.filter((log: any) =>
                            log.userId === selectedUserForActivity.id ||
                            log.userId === selectedUserForActivity.uid ||
                            (log.userEmail && selectedUserForActivity.email && log.userEmail.toLowerCase().trim() === selectedUserForActivity.email.toLowerCase().trim()) ||
                            (log.userName && selectedUserForActivity.name && log.userName.toLowerCase().trim() === selectedUserForActivity.name.toLowerCase().trim())
                          );

                          const getDaysAgoInfo = (timestamp: number | null | undefined) => {
                            if (!timestamp) return null;
                            const date = new Date(timestamp);
                            const now = new Date();

                            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                            const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

                            const diffMs = todayStart - targetStart;
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                            const timeStr = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
                            const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
                            const fullDateTime = `${dateStr}, ${timeStr}`;

                            let daysTag = 'Today';
                            if (diffDays === 1) daysTag = '1 day ago';
                            else if (diffDays > 1) daysTag = `${diffDays} days ago`;

                            return { daysTag, fullDateTime, timeStr, dateStr, diffDays };
                          };

                          const amLogs = uLogs.filter((l: any) => new Date(Number(l.loginTime)).getHours() < 12);
                          const pmLogs = uLogs.filter((l: any) => new Date(Number(l.loginTime)).getHours() >= 12);

                          const morningFirstLogin = amLogs.length > 0
                            ? Math.min(...amLogs.map((l: any) => Number(l.loginTime)))
                            : null;

                          const eveningLastLogin = pmLogs.length > 0
                            ? Math.max(...pmLogs.map((l: any) => Number(l.loginTime)))
                            : (uLogs.length > 0 ? Math.max(...uLogs.map((l: any) => Number(l.loginTime))) : null);

                          const logoutLogs = uLogs.filter((l: any) => l.logoutTime);
                          const lastLogout = logoutLogs.length > 0 ? Math.max(...logoutLogs.map((l: any) => Number(l.logoutTime))) : null;

                          const isActiveNow = uLogs.some((l: any) => !l.logoutTime || Number(l.loginTime) > Number(l.logoutTime || 0));

                          const morningInfo = getDaysAgoInfo(morningFirstLogin);
                          const eveningInfo = getDaysAgoInfo(eveningLastLogin);
                          const logoutInfo = getDaysAgoInfo(lastLogout);

                          const dailyMap: Record<string, { logins: any[]; dayStart: number; dayEnd: number; dayWorkedMs: number }> = {};

                          uLogs.forEach((l: any) => {
                            const d = new Date(Number(l.loginTime));
                            const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

                            if (!dailyMap[dayKey]) {
                              dailyMap[dayKey] = { logins: [], dayStart: Number(l.loginTime), dayEnd: Number(l.logoutTime || l.loginTime), dayWorkedMs: 0 };
                            }

                            dailyMap[dayKey].logins.push(l);

                            const loginT = Number(l.loginTime);
                            const logoutT = l.logoutTime ? Number(l.logoutTime) : (loginT + (8 * 3600 * 1000));
                            const sessionDur = Math.min(Math.max(0, logoutT - loginT), 10 * 3600 * 1000);

                            dailyMap[dayKey].dayWorkedMs += sessionDur;
                          });

                          const daysWorkedInMonth = Object.keys(dailyMap).length;
                          let totalMonthlyMs = 0;
                          Object.values(dailyMap).forEach((dayData) => {
                            totalMonthlyMs += Math.min(dayData.dayWorkedMs, 12 * 3600 * 1000);
                          });

                          const monthlyHoursText = `${Math.floor(totalMonthlyMs / 3600000)}h ${Math.round((totalMonthlyMs % 3600000) / 60000)}m`;

                          let isMorningLate = false;
                          if (morningFirstLogin) {
                            const mObj = new Date(morningFirstLogin);
                            const mHr = mObj.getHours();
                            const mMin = mObj.getMinutes();
                            if (mHr > 9 || (mHr === 9 && mMin > 15)) isMorningLate = true;
                          }

                          let isLogoutEarly = false;
                          if (lastLogout && !isActiveNow) {
                            const lObj = new Date(lastLogout);
                            const lHr = lObj.getHours();
                            if (lHr < 18) isLogoutEarly = true;
                          }

                          const sortedDayKeys = Object.keys(dailyMap).sort().reverse();
                          const latestDayKey = sortedDayKeys[0];
                          const latestDayData = latestDayKey ? dailyMap[latestDayKey] : null;

                          let workingHoursText = '—';
                          let shiftBadgeText = 'No Activity';
                          let shiftBadgeStyle = 'bg-gray-50 text-gray-400 border-gray-200';

                          if (latestDayData) {
                            const dayMs = Math.min(latestDayData.dayWorkedMs, 12 * 3600 * 1000);
                            const hrs = Math.floor(dayMs / 3600000);
                            const mins = Math.round((dayMs % 3600000) / 60000);
                            workingHoursText = `${hrs}h ${mins}m`;

                            const workHrsDec = dayMs / 3600000;
                            if (isActiveNow) {
                              shiftBadgeText = 'Active Working';
                              shiftBadgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
                            } else if (isMorningLate && isLogoutEarly) {
                              shiftBadgeText = 'LOP: Late & Early Exit';
                              shiftBadgeStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                            } else if (isMorningLate) {
                              shiftBadgeText = 'LOP: Late Entry';
                              shiftBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                            } else if (isLogoutEarly) {
                              shiftBadgeText = 'LOP: Early Exit';
                              shiftBadgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                            } else if (workHrsDec >= 8.5) {
                              shiftBadgeText = 'Full Shift (9 hrs)';
                              shiftBadgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
                            } else if (workHrsDec >= 4) {
                              shiftBadgeText = 'Partial Shift';
                              shiftBadgeStyle = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
                            } else {
                              shiftBadgeText = 'Short Shift (LOP)';
                              shiftBadgeStyle = 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
                            }
                          }

                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {/* Morning First Login Card */}
                              <div className="p-4 bg-amber-50/70 border border-amber-200/70 rounded-2xl shadow-xs">
                                <div className="flex items-center justify-between gap-1.5 text-amber-800 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-amber-600" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Morning First Login</span>
                                  </div>
                                  {morningInfo && (
                                    isMorningLate ? (
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                        🔴 Late Entry (LOP)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        🟢 On Time
                                      </span>
                                    )
                                  )}
                                </div>
                                <p className="text-xs font-black text-amber-950 font-mono mt-1">
                                  {morningInfo ? morningInfo.fullDateTime : 'No AM Login Recorded'}
                                </p>
                                <p className="text-[9px] text-gray-400 font-bold mt-1">Standard Start: 9:00 AM</p>
                              </div>

                              {/* Evening Last Login Card (Days Format) */}
                              <div className="p-4 bg-blue-50/70 border border-blue-200/70 rounded-2xl shadow-xs">
                                <div className="flex items-center justify-between gap-1.5 text-blue-800 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <LogIn className="w-4 h-4 text-blue-600" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Evening Last Login</span>
                                  </div>
                                  {eveningInfo && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                      {eveningInfo.daysTag}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-black text-blue-950 font-mono mt-1">
                                  {eveningInfo ? eveningInfo.fullDateTime : 'No Login Recorded'}
                                </p>
                              </div>

                              {/* Last Logout Card */}
                              <div className="p-4 bg-purple-50/70 border border-purple-200/70 rounded-2xl shadow-xs">
                                <div className="flex items-center justify-between gap-1.5 text-purple-800 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <LogOutIcon className="w-4 h-4 text-purple-600" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Last Logout</span>
                                  </div>
                                  {logoutInfo && !isActiveNow && (
                                    isLogoutEarly ? (
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                        🔴 Early Exit (LOP)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        🟢 On Time
                                      </span>
                                    )
                                  )}
                                </div>
                                <p className="text-xs font-black text-purple-950 font-mono mt-1">
                                  {isActiveNow ? (
                                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Now
                                    </span>
                                  ) : logoutInfo ? (
                                    logoutInfo.fullDateTime
                                  ) : (
                                    '—'
                                  )}
                                </p>
                                <p className="text-[9px] text-gray-400 font-bold mt-1">Standard Logout: 6:00 PM</p>
                              </div>

                              {/* Working Hours Card (9:00 AM - 6:00 PM) */}
                              <div className="p-4 bg-indigo-50/70 border border-indigo-200/70 rounded-2xl shadow-xs">
                                <div className="flex items-center justify-between gap-1.5 text-indigo-800 mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-indigo-600" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Working Hours</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${shiftBadgeStyle}`}>
                                    {shiftBadgeText}
                                  </span>
                                </div>
                                <p className="text-sm font-black text-indigo-950 font-mono mt-1">
                                  {workingHoursText}
                                </p>
                                <p className="text-[9px] text-gray-400 font-bold mt-0.5">Target: 9 AM – 6 PM (9 hrs)</p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Individual Session History Table */}
                        <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-xs">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
                              {selectedUserForActivity.name}'s Complete Session Logs
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
                                <tr>
                                  <th className="px-4 py-2.5">Login Date & Time</th>
                                  <th className="px-4 py-2.5">Auth Method</th>
                                  <th className="px-4 py-2.5">Logout Date & Time</th>
                                  <th className="px-4 py-2.5 text-right">Duration</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {(() => {
                                  const uLogs = userLogs.filter((log: any) =>
                                    log.userId === selectedUserForActivity.id ||
                                    log.userId === selectedUserForActivity.uid ||
                                    (log.userEmail && selectedUserForActivity.email && log.userEmail.toLowerCase().trim() === selectedUserForActivity.email.toLowerCase().trim()) ||
                                    (log.userName && selectedUserForActivity.name && log.userName.toLowerCase().trim() === selectedUserForActivity.name.toLowerCase().trim())
                                  );

                                  if (uLogs.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={4} className="py-6 text-center text-gray-400 italic">
                                          No session logs recorded for {selectedUserForActivity.name}.
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return uLogs.map((log: any) => {
                                    let dur = 'Active Now';
                                    if (log.logoutTime) {
                                      const diffMins = Math.round((log.logoutTime - log.loginTime) / 60000);
                                      if (diffMins < 1) dur = '< 1 min';
                                      else if (diffMins < 60) dur = `${diffMins} mins`;
                                      else dur = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
                                    }

                                    const lt = (log.loginType || 'PASSWORD').toUpperCase();

                                    return (
                                      <tr key={log.id || log.loginTime} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-4 py-2.5 font-mono text-gray-800">
                                          {new Date(log.loginTime).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          {lt === 'FACE_ID' ? (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">👤 Face ID</span>
                                          ) : lt === 'FINGERPRINT' ? (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">👆 Touch ID</span>
                                          ) : lt === 'GOOGLE' ? (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-50 text-red-700 border border-red-200">🌐 Google</span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-gray-100 text-gray-700 border border-gray-200">🔑 Password</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2.5 font-mono text-gray-600">
                                          {log.logoutTime ? new Date(log.logoutTime).toLocaleString('en-IN') : <span className="text-emerald-600 font-bold">● Active Now</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-bold text-gray-700">{dur}</td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'attendance' ? (
              <div className="space-y-6 animate-fadeIn">
                {/* Edit Modal */}
                {editingAttendance && (
                  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md space-y-5 border border-gray-100 animate-fadeIn">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-black text-gray-900">Edit Attendance Record</h3>
                          <p className="text-xs text-gray-400 mt-0.5 font-semibold uppercase tracking-widest">{editingAttendance.name} · {editingAttendance.date ? new Date(editingAttendance.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
                        </div>
                        <button onClick={() => setEditingAttendance(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-all border-none cursor-pointer"><X size={14} /></button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Login Time</label>
                          <input
                            type="datetime-local"
                            value={attendanceEditForm.loginTime}
                            onChange={e => setAttendanceEditForm(f => ({ ...f, loginTime: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Logout Time</label>
                          <input
                            type="datetime-local"
                            value={attendanceEditForm.logoutTime}
                            onChange={e => setAttendanceEditForm(f => ({ ...f, logoutTime: e.target.value }))}
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Notes</label>
                          <textarea
                            value={attendanceEditForm.notes}
                            onChange={e => setAttendanceEditForm(f => ({ ...f, notes: e.target.value }))}
                            rows={2}
                            placeholder="Optional notes for salary record..."
                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 bg-gray-50 resize-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setEditingAttendance(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 cursor-pointer transition-all">Cancel</button>
                        <button
                          onClick={handleSaveAttendanceEdit}
                          disabled={savingAttendance}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest hover:bg-brand-primary/90 cursor-pointer transition-all disabled:opacity-60 border-none shadow-md"
                        >
                          {savingAttendance ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Attendance & Work Hours</h2>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mt-0.5">Login · Logout · Duration — For Salary Calculation</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={attendanceDateFilter}
                      onChange={e => setAttendanceDateFilter(e.target.value)}
                      className="border border-gray-200 rounded-xl px-4 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                    {attendanceDateFilter && (
                      <button onClick={() => setAttendanceDateFilter('')} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-black text-gray-400 hover:text-gray-700 cursor-pointer bg-white transition-all">Clear</button>
                    )}
                    <button onClick={fetchAttendanceLogs} className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest hover:bg-brand-primary/90 cursor-pointer border-none shadow-md transition-all">Refresh</button>
                  </div>
                </div>

                {/* Attendance Table */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  {attendanceLoading ? (
                    <div className="py-20 text-center text-gray-400 text-sm italic animate-pulse">Loading attendance records...</div>
                  ) : (() => {
                    const filtered = attendanceLogs.filter(log => {
                      if (!attendanceDateFilter) return true;
                      const logDate = log.loginTime ? new Date(log.loginTime).toISOString().split('T')[0] : (log.date || '');
                      return logDate === attendanceDateFilter;
                    });

                    const calcDuration = (login: string, logout: string) => {
                      if (!login || !logout) return null;
                      const diff = new Date(logout).getTime() - new Date(login).getTime();
                      if (diff <= 0) return null;
                      const h = Math.floor(diff / 3600000);
                      const m = Math.floor((diff % 3600000) / 60000);
                      return { label: `${h}h ${m}m`, ms: diff };
                    };

                    const fmtTime = (iso: string) => {
                      if (!iso) return '—';
                      return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                    };

                    const fmtDate = (iso: string) => {
                      if (!iso) return '—';
                      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                    };

                    return filtered.length === 0 ? (
                      <div className="py-20 text-center text-gray-400 italic text-sm">No attendance records found{attendanceDateFilter ? ` for ${attendanceDateFilter}` : ''}.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1"><LogIn size={10} /> Login</span>
                              </th>
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                <span className="flex items-center gap-1"><LogOutIcon size={10} /> Logout</span>
                              </th>
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes</th>
                              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {filtered.map((log: any, idx: number) => {
                              const loginIso = log.loginTime || log.login_time || '';
                              const logoutIso = log.logoutTime || log.logout_time || '';
                              const dur = calcDuration(loginIso, logoutIso);
                              return (
                                <tr key={log.id || idx} className="hover:bg-gray-50/60 transition-colors">
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-black flex-shrink-0">
                                        {(log.name || log.userName || '?').charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-gray-900 leading-none">{log.name || log.userName || '—'}</p>
                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{log.email || log.userEmail || ''}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3.5 text-xs font-semibold text-gray-600">{fmtDate(loginIso || log.date || '')}</td>
                                  <td className="px-5 py-3.5">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                      <LogIn size={10} /> {fmtTime(loginIso)}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5">
                                    {logoutIso ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                                        <LogOutIcon size={10} /> {fmtTime(logoutIso)}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs font-bold border border-amber-100">
                                        Active
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5">
                                    {dur ? (
                                      <span className="text-xs font-black text-brand-primary">{dur.label}</span>
                                    ) : (
                                      <span className="text-xs text-gray-300 italic">—</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 text-xs text-gray-500 max-w-[120px] truncate italic">
                                    {log.notes || '—'}
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    <button
                                      onClick={() => {
                                        setEditingAttendance(log);
                                        setAttendanceEditForm({
                                          loginTime: loginIso ? new Date(loginIso).toISOString().slice(0, 16) : '',
                                          logoutTime: logoutIso ? new Date(logoutIso).toISOString().slice(0, 16) : '',
                                          notes: log.notes || ''
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-primary/5 hover:bg-brand-primary/15 text-brand-primary text-xs font-black border border-brand-primary/10 cursor-pointer transition-all"
                                    >
                                      <Edit size={11} /> Edit
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                {/* Per-Employee Summary */}
                {!attendanceLoading && attendanceLogs.length > 0 && (() => {
                  const calcDuration = (login: string, logout: string) => {
                    if (!login || !logout) return 0;
                    const diff = new Date(logout).getTime() - new Date(login).getTime();
                    return diff > 0 ? diff : 0;
                  };

                  const summaryMap: Record<string, { name: string; email: string; days: number; totalMs: number }> = {};
                  attendanceLogs.forEach((log: any) => {
                    const key = log.userId || log.user_id || log.email || log.userEmail || log.name;
                    if (!key) return;
                    if (!summaryMap[key]) {
                      summaryMap[key] = { name: log.name || log.userName || key, email: log.email || log.userEmail || '', days: 0, totalMs: 0 };
                    }
                    const loginIso = log.loginTime || log.login_time || '';
                    const logoutIso = log.logoutTime || log.logout_time || '';
                    if (loginIso) summaryMap[key].days += 1;
                    summaryMap[key].totalMs += calcDuration(loginIso, logoutIso);
                  });

                  const summaryRows = Object.values(summaryMap);
                  if (summaryRows.length === 0) return null;

                  return (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Employee Summary (Salary Reference)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-gray-100">
                              <th className="py-2 pr-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                              <th className="py-2 pr-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                              <th className="py-2 pr-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Days Present</th>
                              <th className="py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Hours</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {summaryRows.map((row, i) => {
                              const totalH = Math.floor(row.totalMs / 3600000);
                              const totalM = Math.floor((row.totalMs % 3600000) / 60000);
                              return (
                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="py-3 pr-6">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-black flex items-center justify-center">{row.name.charAt(0).toUpperCase()}</div>
                                      <span className="text-sm font-bold text-gray-900">{row.name}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 pr-6 text-xs text-gray-500">{row.email}</td>
                                  <td className="py-3 pr-6">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-100">
                                      <CheckCircle2 size={10} /> {row.days} {row.days === 1 ? 'day' : 'days'}
                                    </span>
                                  </td>
                                  <td className="py-3">
                                    <span className="text-sm font-black text-brand-primary">{totalH}h {totalM}m</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : activeTab === 'calendar' ? (
              <CalendarView user={user} />
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="w-16 h-16 bg-brand-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-md">
                  <Shield className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Section Under Maintenance</h2>
                <p className="text-gray-500 max-w-md mx-auto">
                  The "{activeTab}" management portal is currently being synchronized with our central servers. Check back shortly.
                </p>
                <Button variant="outline" className="mt-8" onClick={() => setActiveTab('overview')}>
                  Return to Overview
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {layoutMode === 'mobile' && (
        <nav className="fixed bottom-0 inset-x-0 h-14 bg-white/95 backdrop-blur-md border-t border-gray-200 px-1 py-1 flex items-center justify-around z-40 shadow-lg pb-safe">
          <button
            onClick={() => selectTab('overview')}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
              activeTab === 'overview' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Layout className="w-4 h-4 flex-shrink-0" />
            <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Overview</span>
          </button>
          <button
            onClick={() => selectTab('users')}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
              activeTab === 'users' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Users</span>
          </button>
          <button
            onClick={() => selectTab('invoices')}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
              activeTab === 'invoices' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Invoices</span>
          </button>
          <button
            onClick={() => selectTab('orders')}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
              activeTab === 'orders' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Workflow</span>
          </button>
          <button
            onClick={() => selectTab('calendar')}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
              activeTab === 'calendar' ? "text-indigo-600 font-bold" : "text-gray-400 hover:text-gray-600"
            )}
          >
            <CalendarDays className="w-4 h-4 flex-shrink-0" />
            <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Calendar</span>
          </button>
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 text-gray-400 hover:text-gray-600 font-medium transition-colors cursor-pointer border-none bg-transparent select-none"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">Profile</span>
          </button>
        </nav>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInviteModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Invite Team Member</h3>
                <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <p className="text-sm text-gray-500 mb-6">Send an invitation to join your workspace as a user or moderator.</p>
              {inviteGeneratedLink ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 text-green-700 rounded-xl text-xs font-semibold leading-relaxed border border-green-100">
                    Invitation generated successfully! You can share the link below with your colleague:
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteGeneratedLink}
                      className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteGeneratedLink);
                        alert('Copied to clipboard!');
                      }}
                      className="px-3 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors cursor-pointer border-none"
                    >
                      Copy
                    </button>
                  </div>
                  <Button className="w-full mt-4" onClick={() => {
                    setInviteGeneratedLink('');
                    setShowInviteModal(false);
                  }}>
                    Close
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/10 transition-all focus:outline-none text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">System Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-primary/10 transition-all focus:outline-none text-sm font-semibold bg-white"
                    >
                      <option value="marketing">Marketing</option>
                      <option value="designer">Designer (Art Studio)</option>
                      <option value="accounts">Accounts</option>
                      <option value="order_management">Order Management</option>
                      <option value="production">Production (Factory)</option>
                      <option value="digitizer">Digitizing & Embroidery</option>
                      <option value="delivery">Delivery</option>
                      <option value="onlineteam">Online Team</option>
                      <option value="vendor">Vendor</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                  <Button
                    className="w-full mt-4"
                    disabled={invitesLoading || !inviteEmail.trim()}
                    onClick={async () => {
                      if (!inviteEmail.trim()) return;
                      setInvitesLoading(true);
                      try {
                        const res = await mockDataService.createInvitation(inviteEmail.trim(), inviteRole);
                        if (res.success) {
                          const registerUrl = `${window.location.origin}/register?invite=${res.inviteId}`;
                          setInviteGeneratedLink(registerUrl);
                          await fetchInvitations();
                          alert('Invitation successfully created!');
                        } else {
                          alert('Failed to create invitation.');
                        }
                      } catch (err: any) {
                        alert(err.message || 'Error creating invitation.');
                      } finally {
                        setInvitesLoading(false);
                      }
                    }}
                  >
                    {invitesLoading ? 'Creating invite...' : 'Send Invitation'}
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logs Modal */}
      <AnimatePresence>
        {showLogsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLogsModal(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Audit Logs</h3>
                  <p className="text-sm text-gray-500">History of all critical system actions</p>
                </div>
                <button onClick={() => setShowLogsModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                {MOCK_LOGS.map(log => (
                  <div key={log.id} className="flex gap-4 p-4 border border-gray-50 rounded-xl hover:bg-gray-50/50">
                    <div className="w-10 h-10 bg-white border border-brand-secondary/30 rounded-full flex items-center justify-center text-brand-primary flex-shrink-0 shadow-sm">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-800 text-sm">{log.action}</p>
                        <span className="text-[10px] text-gray-400">{log.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{log.details}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Executed by {log.user}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <Button variant="ghost" className="text-xs" onClick={() => setShowLogsModal(false)}>Close Activity Log</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ProfileSettings isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <InvoiceModal
        invoice={selectedInvoice}
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
      <InvoiceFormModal
        isOpen={isInvoiceFormModalOpen}
        onClose={() => {
          setIsInvoiceFormModalOpen(false);
          setEditingInvoice(null);
        }}
        invoice={editingInvoice}
        onSubmit={handleEditInvoiceSubmit}
      />
      <AdminCreateOrderModal
        isOpen={isAdminOrderModalOpen}
        onClose={() => setIsAdminOrderModalOpen(false)}
      />
      {selectedOrderDetail && (
        <OrderDetailModal
          order={selectedOrderDetail}
          onClose={() => setSelectedOrderDetail(null)}
          onUpdateOrder={async (id, updates) => {
            try {
              await updateOrder(id, updates);
              setSelectedOrderDetail(prev => prev ? { ...prev, ...updates } : null);
              alert("Order updated successfully.");
            } catch (e) {
              console.error(e);
              alert("Failed to save changes.");
            }
          }}
          isAdmin={true}
        />
      )}
      {/* Fixed Bottom Quick Navigation Bar for Mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 px-1 py-1 flex items-center justify-around shadow-lg pb-safe">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'orders', label: 'Orders', icon: Zap },
          { id: 'invoices', label: 'Invoices', icon: BarChart3 },
          { id: 'online-leads', label: 'Leads', icon: Users },
          { id: 'users', label: 'Users', icon: UserPlus },
          { id: 'calendar', label: 'Calendar', icon: CalendarDays },
          { id: 'logs', label: 'Logs', icon: FileText },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'logs') {
                setShowLogsModal(true);
              } else {
                setActiveTab(item.id as any);
              }
            }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-1 px-0.5 min-w-0 transition-colors cursor-pointer border-none bg-transparent select-none",
              activeTab === item.id && item.id !== 'logs'
                ? "text-brand-primary font-black"
                : "text-gray-400 hover:text-gray-600 font-medium"
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-[9px] leading-none tracking-tight truncate max-w-full block mt-0.5">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Admin Call Logs Detail Modal (Mobile App Compact Model) */}
      {showAdminLogsModal && selectedAdminLeadForLogs && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[2.25rem] sm:rounded-[2.5rem] shadow-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 text-left">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-2.5 sm:hidden flex-shrink-0" />
            <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest block mb-0.5">Call Log History</span>
                <h3 className="text-lg font-black text-gray-900">{selectedAdminLeadForLogs.name}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedAdminLeadForLogs.number}</p>
              </div>
              <button
                onClick={() => {
                  setShowAdminLogsModal(false);
                  setSelectedAdminLeadForLogs(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors border-none cursor-pointer bg-transparent"
              >
                <Plus className="w-5 h-5 rotate-45 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto flex-1">
              {selectedAdminLeadForLogs.description ? (
                <div className="space-y-4">
                  {selectedAdminLeadForLogs.description.split('\n\n').map((entry, idx) => (
                    <div key={idx} className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-gray-700 whitespace-pre-wrap leading-relaxed shadow-xs">
                      {entry}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic text-center py-6">No call logs recorded yet.</p>
              )}
            </div>

            <div className="p-4 sm:p-6 bg-gray-50 flex justify-end flex-shrink-0 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowAdminLogsModal(false);
                  setSelectedAdminLeadForLogs(null);
                }}
                className="px-6 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary/95 transition-all cursor-pointer border-none shadow-md"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER & FACE ID REGISTRATION MODAL (Mobile App Compact Model) */}
      <AnimatePresence>
        {showEditUserModal && userToEdit && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white p-6 rounded-t-[2.25rem] sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] flex flex-col overflow-y-auto border border-gray-100 shadow-2xl relative text-left space-y-5"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-1 sm:hidden flex-shrink-0" />
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-brand-primary" />
                  Edit User & Face ID Settings
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUserModal(false);
                    setUserToEdit(null);
                  }}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center border-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveUserEdit} className="space-y-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block">User Name</label>
                  <input
                    type="text"
                    value={userToEdit.name || ''}
                    onChange={(e) => setUserToEdit({ ...userToEdit, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-primary"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block">Email Address</label>
                  <input
                    type="email"
                    value={userToEdit.email || ''}
                    onChange={(e) => setUserToEdit({ ...userToEdit, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-brand-primary"
                    required
                  />
                </div>

                {/* Role */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 block">System Role</label>
                  <select
                    value={userToEdit.role || 'marketing'}
                    onChange={(e) => setUserToEdit({ ...userToEdit, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-brand-primary cursor-pointer"
                  >
                    <option value="admin">Admin / CEO</option>
                    <option value="sales_head">Sales Head (Head of Sales & Marketing)</option>
                    <option value="operations_head">Operations Head (Workflow & Production)</option>
                    <option value="hr">HR & Payroll Manager</option>
                    <option value="staff">Staff</option>
                    <option value="marketing">Marketing</option>
                    <option value="accounts">Accounts</option>
                    <option value="order_management">Order Management</option>
                    <option value="production">Production</option>
                    <option value="delivery">Delivery</option>
                    <option value="designer">Designer</option>
                    <option value="digitizer">Digitizing & Embroidery</option>
                    <option value="onlineteam">Online Team</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </div>

                {/* Account Access Status (Active vs Blocked) */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-800">Account Access Status</p>
                    <p className="text-[10px] text-gray-400">Block user to revoke dashboard login access</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextBlocked = !Boolean(userToEdit.isBlocked || userToEdit.status === 'Blocked');
                      setUserToEdit({
                        ...userToEdit,
                        isBlocked: nextBlocked,
                        status: nextBlocked ? 'Blocked' : 'Active'
                      });
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer border-none",
                      userToEdit.isBlocked || userToEdit.status === 'Blocked'
                        ? "bg-red-500 text-white shadow-sm"
                        : "bg-emerald-500 text-white shadow-sm"
                    )}
                  >
                    {userToEdit.isBlocked || userToEdit.status === 'Blocked' ? '🚫 Blocked' : '🟢 Active'}
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs text-gray-500 flex-1"
                    onClick={() => {
                      setShowEditUserModal(false);
                      setUserToEdit(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="text-xs flex-1 bg-brand-primary text-white font-black"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SidebarChat />
    </div>
  );
}

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-600';
    case 'accounts': return 'bg-amber-100 text-amber-700';
    case 'design': return 'bg-purple-100 text-purple-700';
    case 'order_management': return 'bg-blue-100 text-blue-700';
    case 'production': return 'bg-purple-100 text-purple-700';
    case 'delivery': return 'bg-orange-100 text-orange-700';
    case 'delivered': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};

