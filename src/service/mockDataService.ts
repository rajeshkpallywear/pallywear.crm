/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, OrderStatus, UserRole, UserProfile, Lead, Invoice, InventoryMovement, SidebarMessage, SalarySlip, EmployeeSalaryProfile, StaffAttendanceRecord } from '../types';
import { getApiUrl } from '../lib/apiConfig';

function notifyUpdate() {
  window.dispatchEvent(new Event('pallywear-data-updated'));
}

/**
 * Sanitize an ID for use in URL paths.
 * Strips # and other URL-unsafe characters that Apache/cPanel decode
 * and interpret as URL fragments, breaking the proxy routing.
 */
function sanitizeId(id: string): string {
  return id.replace(/#/g, '');
}

const DEFAULT_USERS: UserProfile[] = [
  { uid: 'u1', name: 'CEO Admin', email: 'ceo@pallywear.com', role: UserRole.ADMIN, status: 'Active' },
  { uid: 'u2', name: 'Mahendran', email: 'mahendran.pallywear@gmail.com', role: UserRole.DELIVERY, status: 'Active' },
  { uid: 'u3', name: 'Godwin', email: 'godwin.pallywear@gmail.com', role: UserRole.MARKETING, status: 'Active' },
  { uid: 'u4', name: 'Jimla', email: 'jimla@pallywear.com', role: UserRole.MARKETING, status: 'Active' },
  { uid: 'u5', name: 'Vivek', email: 'vivekpallywear@gmail.com', role: UserRole.MARKETING, status: 'Active' },
  { uid: 'u6', name: 'Daniel', email: 'daniel.smpallywear@gmail.com', role: UserRole.MARKETING, status: 'Active' },
  { uid: 'u7', name: 'Vasudev', email: 'vasudevpallywear@gmail.com', role: UserRole.STAFF, status: 'Active' },
];

function loadLocalUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem('pallywear_users_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return DEFAULT_USERS;
}

function saveLocalUsers(users: UserProfile[]) {
  try {
    localStorage.setItem('pallywear_users_v2', JSON.stringify(users));
  } catch (_) {}
}

// In-Memory & LocalStorage SWR Cache Layer
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string, maxAgeMs = 15000): T | null {
  const mem = memoryCache.get(key);
  if (mem && (Date.now() - mem.timestamp < maxAgeMs)) {
    return mem.data;
  }
  if (!mem) {
    try {
      const raw = localStorage.getItem(`pw_cache_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.data) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch (_) {}
  }
  return mem ? mem.data : null;
}

function setCache<T>(key: string, data: T) {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);
  try {
    if (Array.isArray(data) && data.length < 2000) {
      localStorage.setItem(`pw_cache_${key}`, JSON.stringify(entry));
    }
  } catch (_) {}
}

export function getInitialCached<T>(key: string): T[] {
  try {
    const mem = memoryCache.get(key);
    if (mem && Array.isArray(mem.data)) return mem.data;
    const raw = localStorage.getItem(`pw_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.data)) {
        memoryCache.set(key, parsed);
        return parsed.data;
      }
    }
  } catch (_) {}
  return [];
}

export function invalidateCache(key?: string) {
  if (key) {
    memoryCache.delete(key);
    try { localStorage.removeItem(`pw_cache_${key}`); } catch (_) {}
  } else {
    memoryCache.clear();
  }
}

export const mockDataService = {
  getOrders: async (forceFresh = false): Promise<Order[]> => {
    if (!forceFresh) {
      const cached = getCached<Order[]>('orders', 12000);
      if (cached && cached.length > 0) {
        // Return cached immediately and refresh in background
        fetch(getApiUrl('/api/orders'))
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && Array.isArray(data)) setCache('orders', data);
          })
          .catch(() => {});
        return cached;
      }
    }
    const res = await fetch(getApiUrl('/api/orders'));
    if (!res.ok) {
      const fallback = getCached<Order[]>('orders', 86400000);
      if (fallback) return fallback;
      throw new Error('Failed to fetch orders');
    }
    const data = await res.json();
    setCache('orders', data);
    return data;
  },

  getOrderAttachments: async (id: string): Promise<any> => {
    const cacheKey = `att_${sanitizeId(id)}`;
    const cached = getCached<any>(cacheKey, 60000);
    if (cached) return cached;

    const res = await fetch(getApiUrl(`/api/orders/${encodeURIComponent(sanitizeId(id))}/attachments`));
    if (!res.ok) throw new Error('Failed to fetch order attachments');
    const data = await res.json();
    setCache(cacheKey, data);
    return data;
  },

  patchOrder: async (id: string, updates: any): Promise<void> => {
    invalidateCache('orders');
    invalidateCache(`att_${sanitizeId(id)}`);
    const res = await fetch(getApiUrl(`/api/orders/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = 'Failed to update order';
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error || errJson.message || errMsg;
      } catch (e) {
        if (errText) errMsg = errText;
      }
      throw new Error(errMsg);
    }
    notifyUpdate();
  },

  saveOrder: async (order: Order): Promise<void> => {
    invalidateCache('orders');
    invalidateCache(`att_${sanitizeId(order.id)}`);
    const res = await fetch(getApiUrl('/api/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (!res.ok) throw new Error('Failed to save order');
    notifyUpdate();
  },

  createOrder: async (orderData: Partial<Order>): Promise<Order> => {
    const id = Math.random().toString(36).substr(2, 9).toUpperCase();
    const newOrder: Order = {
      id,
      customerInfo: {
        name: '',
        phone: '',
        address: '',
        ...orderData.customerInfo
      },
      category: orderData.category || 'General',
      quantity: orderData.quantity || 1,
      details: orderData.details || {},
      sizeBreakdown: orderData.sizeBreakdown || [],
      financials: orderData.financials || { totalAmount: 0, advancePay: 0, balanceAmount: 0 },
      status: orderData.status || OrderStatus.ACCOUNTS,
      staffImages: orderData.staffImages || [],
      staffPdfs: orderData.staffPdfs || [],
      accountsAttachments: [],
      orderManagementAttachments: [],
      sentByAccounts: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...orderData
    };

    await mockDataService.saveOrder(newOrder);
    return newOrder;
  },

  deleteOrder: async (id: string): Promise<void> => {
    invalidateCache('orders');
    invalidateCache(`att_${sanitizeId(id)}`);
    const res = await fetch(getApiUrl(`/api/orders/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete order');
    notifyUpdate();
  },

  getLeads: async (forceFresh = false): Promise<Lead[]> => {
    if (!forceFresh) {
      const cached = getCached<Lead[]>('leads', 12000);
      if (cached && cached.length > 0) {
        fetch(getApiUrl('/api/leads'))
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && Array.isArray(data)) setCache('leads', data);
          })
          .catch(() => {});
        return cached;
      }
    }
    const res = await fetch(getApiUrl('/api/leads'));
    if (!res.ok) {
      const fallback = getCached<Lead[]>('leads', 86400000);
      if (fallback) return fallback;
      throw new Error('Failed to fetch leads');
    }
    const data = await res.json();
    setCache('leads', data);
    return data;
  },

  addLead: async (lead: Lead): Promise<void> => {
    invalidateCache('leads');
    const res = await fetch(getApiUrl('/api/leads'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
    if (!res.ok) throw new Error('Failed to add lead');
    notifyUpdate();
  },

  updateLead: async (id: string, updates: Partial<Lead>): Promise<void> => {
    invalidateCache('leads');
    const res = await fetch(getApiUrl(`/api/leads/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update lead');
    notifyUpdate();
  },

  deleteLead: async (id: string): Promise<void> => {
    invalidateCache('leads');
    const res = await fetch(getApiUrl(`/api/leads/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete lead');
    notifyUpdate();
  },

  clearLeads: async (): Promise<void> => {
    invalidateCache('leads');
    const res = await fetch(getApiUrl('/api/leads/clear'), {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to clear leads');
    notifyUpdate();
  },

  getInvoices: async (forceFresh = false): Promise<Invoice[]> => {
    if (!forceFresh) {
      const cached = getCached<Invoice[]>('invoices', 12000);
      if (cached && cached.length > 0) {
        fetch(getApiUrl('/api/invoices'))
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && Array.isArray(data)) setCache('invoices', data);
          })
          .catch(() => {});
        return cached;
      }
    }
    const res = await fetch(getApiUrl('/api/invoices'));
    if (!res.ok) {
      const fallback = getCached<Invoice[]>('invoices', 86400000);
      if (fallback) return fallback;
      throw new Error('Failed to fetch invoices');
    }
    const data = await res.json();
    setCache('invoices', data);
    return data;
  },

  addInvoice: async (invoice: Invoice): Promise<void> => {
    invalidateCache('invoices');
    const res = await fetch(getApiUrl('/api/invoices'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice)
    });
    if (!res.ok) throw new Error('Failed to add invoice');
    notifyUpdate();
  },

  updateInvoice: async (id: string, updates: Partial<Invoice>): Promise<void> => {
    invalidateCache('invoices');
    const res = await fetch(getApiUrl(`/api/invoices/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update invoice');
    notifyUpdate();
  },

  deleteInvoice: async (id: string): Promise<void> => {
    invalidateCache('invoices');
    const res = await fetch(getApiUrl(`/api/invoices/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete invoice');
    notifyUpdate();
  },

  getInventoryMovements: async (forceFresh = false): Promise<InventoryMovement[]> => {
    if (!forceFresh) {
      const cached = getCached<InventoryMovement[]>('inventory', 15000);
      if (cached && cached.length > 0) {
        fetch(getApiUrl('/api/inventory'))
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && Array.isArray(data)) setCache('inventory', data);
          })
          .catch(() => {});
        return cached;
      }
    }
    const res = await fetch(getApiUrl('/api/inventory'));
    if (!res.ok) {
      const fallback = getCached<InventoryMovement[]>('inventory', 86400000);
      if (fallback) return fallback;
      throw new Error('Failed to fetch inventory movements');
    }
    const data = await res.json();
    setCache('inventory', data);
    return data;
  },

  addInventoryMovement: async (movement: InventoryMovement): Promise<void> => {
    invalidateCache('inventory');
    const res = await fetch(getApiUrl('/api/inventory'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movement)
    });
    if (!res.ok) throw new Error('Failed to add inventory movement');
    notifyUpdate();
  },

  updateInventoryMovement: async (id: string, updates: Partial<InventoryMovement>): Promise<void> => {
    invalidateCache('inventory');
    const res = await fetch(getApiUrl(`/api/inventory/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update inventory movement');
    notifyUpdate();
  },

  saveLead: async (lead: Lead): Promise<void> => {
    return mockDataService.addLead(lead);
  },

  saveInvoice: async (invoice: Invoice): Promise<void> => {
    return mockDataService.addInvoice(invoice);
  },

  getInventory: async (forceFresh = false): Promise<InventoryMovement[]> => {
    return mockDataService.getInventoryMovements(forceFresh);
  },

  saveInventoryMovement: async (movement: InventoryMovement): Promise<void> => {
    return mockDataService.addInventoryMovement(movement);
  },

  deleteInventoryMovement: async (id: string): Promise<void> => {
    invalidateCache('inventory');
    const res = await fetch(getApiUrl(`/api/inventory/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete inventory movement');
    notifyUpdate();
  },

  getUsers: async (forceFresh = false): Promise<UserProfile[]> => {
    if (!forceFresh) {
      const cached = getCached<UserProfile[]>('users', 30000);
      if (cached && cached.length > 0) {
        fetch(getApiUrl('/api/users'))
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data && Array.isArray(data) && data.length > 0) setCache('users', data);
          })
          .catch(() => {});
        return cached;
      }
    }
    try {
      const res = await fetch(getApiUrl('/api/users'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCache('users', data);
          return data;
        }
      }
    } catch (e) {
      console.warn('Backend API getUsers unreachable, falling back to local storage:', e);
    }
    return loadLocalUsers();
  },

  register: async (user: UserProfile): Promise<void> => {
    try {
      const res = await fetch(getApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      if (!res.ok) {
        const err = await res.json();
        console.warn('Backend API register returned error:', err);
      }
    } catch (e: any) {
      console.warn('Backend API register unreachable, saving locally:', e);
    }
    const localUsers = loadLocalUsers();
    const existingIndex = localUsers.findIndex(u => u.email === user.email);
    if (existingIndex === -1) {
      localUsers.push(user);
    } else {
      localUsers[existingIndex] = { ...localUsers[existingIndex], ...user };
    }
    saveLocalUsers(localUsers);
    notifyUpdate();
  },

  login: async (email: string, password: string): Promise<UserProfile | null> => {
    try {
      const res = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) return data.user;
      }
    } catch (e) {
      console.warn('Backend API login unreachable, checking local database:', e);
    }
    const localUsers = loadLocalUsers();
    const matched = localUsers.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
    return matched || null;
  },

  updateUser: async (user: UserProfile): Promise<void> => {
    const userId = user.uid || (user as any).id;
    try {
      const res = await fetch(getApiUrl(`/api/users/${userId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          role: user.role,
          password: user.password,
          status: user.status,
          isBlocked: user.isBlocked,
          faceRegistered: user.faceRegistered,
          faceData: user.faceData
        })
      });
      if (!res.ok) {
        console.warn('Backend API updateUser returned non-ok status');
      }
    } catch (e) {
      console.warn('Backend API updateUser unreachable, persisting to local storage:', e);
    }

    const localUsers = loadLocalUsers();
    const existingIndex = localUsers.findIndex(u => (u.uid || (u as any).id) === userId || u.email === user.email);
    if (existingIndex !== -1) {
      localUsers[existingIndex] = { ...localUsers[existingIndex], ...user };
    } else {
      localUsers.push(user);
    }
    saveLocalUsers(localUsers);

    notifyUpdate();
  },

  deleteUser: async (id: string): Promise<void> => {
    const res = await fetch(getApiUrl(`/api/users/${id}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete user');
    notifyUpdate();
  },

  getMessages: async (senderId?: string, recipientId?: string): Promise<SidebarMessage[]> => {
    let url = getApiUrl('/api/messages');
    if (senderId && recipientId) {
      url += `?senderId=${senderId}&recipientId=${recipientId}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch sidebar messages');
    return res.json();
  },

  saveMessage: async (msg: Omit<SidebarMessage, 'id' | 'createdAt'>): Promise<void> => {
    const res = await fetch(getApiUrl('/api/messages'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });
    if (!res.ok) throw new Error('Failed to save sidebar message');
    notifyUpdate();
  },

  getInvitations: async (): Promise<any[]> => {
    const res = await fetch(getApiUrl('/api/invitations'));
    if (!res.ok) throw new Error('Failed to fetch invitations');
    return res.json();
  },

  createInvitation: async (email: string, role: string): Promise<any> => {
    const res = await fetch(getApiUrl('/api/invitations'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });
    if (!res.ok) throw new Error('Failed to create invitation');
    return res.json();
  },

  getInvitationDetails: async (id: string): Promise<any> => {
    const res = await fetch(getApiUrl(`/api/invitations/${id}`));
    if (!res.ok) throw new Error('Failed to fetch invitation details');
    return res.json();
  },

  deleteInvitation: async (id: string): Promise<void> => {
    const res = await fetch(getApiUrl(`/api/invitations/${id}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete invitation');
    notifyUpdate();
  },

  logLogin: async (userId: string, name: string, email: string, loginType?: string): Promise<void> => {
    const res = await fetch(getApiUrl('/api/auth/log-login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name, email, loginType: loginType || 'PASSWORD' })
    });
    if (!res.ok) throw new Error('Failed to log login');
  },

  logLogout: async (userId: string): Promise<void> => {
    const res = await fetch(getApiUrl('/api/auth/log-logout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to log logout');
  },

  getActivityLogs: async (): Promise<{ success: boolean; logs: any[]; counts: any[]; userSummaries?: any[] }> => {
    const res = await fetch(getApiUrl('/api/auth/activity-logs'));
    if (!res.ok) throw new Error('Failed to fetch activity logs');
    return res.json();
  },

  // HR & PAYROLL / ATTENDANCE METHODS
  getSalarySlips: async (filters?: { month?: string; year?: number; userId?: string; status?: string }): Promise<SalarySlip[]> => {
    const params = new URLSearchParams();
    if (filters?.month) params.append('month', filters.month);
    if (filters?.year) params.append('year', String(filters.year));
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.status) params.append('status', filters.status);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(getApiUrl(`/api/hr/salary-slips${qs}`));
    if (!res.ok) throw new Error('Failed to fetch salary slips');
    const data = await res.json();
    return data.salarySlips || [];
  },

  saveSalarySlip: async (slip: Partial<SalarySlip>): Promise<{ success: boolean; id: string }> => {
    const res = await fetch(getApiUrl('/api/hr/salary-slips'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slip)
    });
    if (!res.ok) throw new Error('Failed to save salary slip');
    notifyUpdate();
    return res.json();
  },

  updateSalarySlip: async (id: string, updates: Partial<SalarySlip>): Promise<void> => {
    const res = await fetch(getApiUrl(`/api/hr/salary-slips/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update salary slip');
    notifyUpdate();
  },

  deleteSalarySlip: async (id: string): Promise<void> => {
    const res = await fetch(getApiUrl(`/api/hr/salary-slips/${id}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete salary slip');
    notifyUpdate();
  },

  getSalaryProfiles: async (): Promise<EmployeeSalaryProfile[]> => {
    const res = await fetch(getApiUrl('/api/hr/salary-profiles'));
    if (!res.ok) throw new Error('Failed to fetch salary profiles');
    const data = await res.json();
    return data.profiles || [];
  },

  saveSalaryProfile: async (userId: string, profile: Partial<EmployeeSalaryProfile>): Promise<void> => {
    const res = await fetch(getApiUrl(`/api/hr/salary-profiles/${userId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    if (!res.ok) throw new Error('Failed to save salary profile');
    notifyUpdate();
  },

  getStaffAttendance: async (filters?: { date?: string; month?: number; year?: number; userId?: string }): Promise<StaffAttendanceRecord[]> => {
    const params = new URLSearchParams();
    if (filters?.date) params.append('date', filters.date);
    if (filters?.month) params.append('month', String(filters.month));
    if (filters?.year) params.append('year', String(filters.year));
    if (filters?.userId) params.append('userId', filters.userId);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(getApiUrl(`/api/hr/attendance${qs}`));
    if (!res.ok) throw new Error('Failed to fetch attendance records');
    const data = await res.json();
    return data.attendance || [];
  },

  saveStaffAttendance: async (record: Partial<StaffAttendanceRecord>): Promise<void> => {
    const res = await fetch(getApiUrl('/api/hr/attendance'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (!res.ok) throw new Error('Failed to save attendance record');
    notifyUpdate();
  },

  saveStaffAttendanceBulk: async (records: Partial<StaffAttendanceRecord>[]): Promise<void> => {
    const res = await fetch(getApiUrl('/api/hr/attendance/bulk'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    });
    if (!res.ok) throw new Error('Failed to save bulk attendance');
    notifyUpdate();
  }
};
