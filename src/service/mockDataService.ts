/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, OrderStatus, UserRole, UserProfile, Lead, Invoice, InventoryMovement, SidebarMessage } from '../types';
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

export const mockDataService = {
  getOrders: async (): Promise<Order[]> => {
    const res = await fetch(getApiUrl('/api/orders'));
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  getOrderAttachments: async (id: string): Promise<any> => {
    const res = await fetch(getApiUrl(`/api/orders/${encodeURIComponent(sanitizeId(id))}/attachments`));
    if (!res.ok) throw new Error('Failed to fetch order attachments');
    return res.json();
  },

  patchOrder: async (id: string, updates: any): Promise<void> => {
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
    const res = await fetch(getApiUrl(`/api/orders/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete order');
    notifyUpdate();
  },

  getLeads: async (): Promise<Lead[]> => {
    const res = await fetch(getApiUrl('/api/leads'));
    if (!res.ok) throw new Error('Failed to fetch leads');
    return res.json();
  },

  addLead: async (lead: Lead): Promise<void> => {
    const res = await fetch(getApiUrl('/api/leads'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
    if (!res.ok) throw new Error('Failed to add lead');
    notifyUpdate();
  },

  updateLead: async (id: string, updates: Partial<Lead>): Promise<void> => {
    const res = await fetch(getApiUrl(`/api/leads/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update lead');
    notifyUpdate();
  },

  deleteLead: async (id: string): Promise<void> => {
    const res = await fetch(getApiUrl(`/api/leads/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete lead');
    notifyUpdate();
  },

  clearLeads: async (): Promise<void> => {
    const res = await fetch(getApiUrl('/api/leads/clear'), {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to clear leads');
    notifyUpdate();
  },

  getInvoices: async (): Promise<Invoice[]> => {
    const res = await fetch(getApiUrl('/api/invoices'));
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  },

  addInvoice: async (invoice: Invoice): Promise<void> => {
    const res = await fetch(getApiUrl('/api/invoices'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice)
    });
    if (!res.ok) throw new Error('Failed to add invoice');
    notifyUpdate();
  },

  updateInvoice: async (id: string, updates: Partial<Invoice>): Promise<void> => {
    const res = await fetch(getApiUrl(`/api/invoices/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update invoice');
    notifyUpdate();
  },

  deleteInvoice: async (id: string): Promise<void> => {
    const res = await fetch(getApiUrl(`/api/invoices/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete invoice');
    notifyUpdate();
  },

  getInventoryMovements: async (): Promise<InventoryMovement[]> => {
    const res = await fetch(getApiUrl('/api/inventory'));
    if (!res.ok) throw new Error('Failed to fetch inventory movements');
    return res.json();
  },

  addInventoryMovement: async (movement: InventoryMovement): Promise<void> => {
    const res = await fetch(getApiUrl('/api/inventory'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movement)
    });
    if (!res.ok) throw new Error('Failed to add inventory movement');
    notifyUpdate();
  },

  updateInventoryMovement: async (id: string, updates: Partial<InventoryMovement>): Promise<void> => {
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

  getInventory: async (): Promise<InventoryMovement[]> => {
    return mockDataService.getInventoryMovements();
  },

  saveInventoryMovement: async (movement: InventoryMovement): Promise<void> => {
    return mockDataService.addInventoryMovement(movement);
  },

  deleteInventoryMovement: async (id: string): Promise<void> => {
    const res = await fetch(getApiUrl(`/api/inventory/${encodeURIComponent(sanitizeId(id))}`), {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete inventory movement');
    notifyUpdate();
  },

  getUsers: async (): Promise<UserProfile[]> => {
    try {
      const res = await fetch(getApiUrl('/api/users'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
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
  }
};
