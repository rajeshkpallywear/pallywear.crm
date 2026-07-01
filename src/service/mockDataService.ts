/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, OrderStatus, UserRole, UserProfile, Lead, Invoice, InventoryMovement } from '../types';

const ORDERS_KEY = 'pallywear_orders';
const USERS_KEY = 'pallywear_users';
const LEADS_KEY = 'pallywear_leads';
const INVOICES_KEY = 'pallywear_invoices';
const INVENTORY_KEY = 'pallywear_inventory';

function loadItem<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : fallback;
}

function saveItem<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function notifyUpdate() {
  window.dispatchEvent(new Event('pallywear-data-updated'));
}

export const mockDataService = {
  getOrders: (): Order[] => {
    return loadItem<Order[]>(ORDERS_KEY, []).map((o: any) => ({
      ...o,
      quantity: o.quantity || 0,
      sizeBreakdown: o.sizeBreakdown || [],
      staffImages: o.staffImages || (o.staffAttachments?.filter((a: string) => a.startsWith('data:image')) || []),
      staffPdfs: o.staffPdfs || (o.staffAttachments?.filter((a: string) => a.startsWith('data:application/pdf')) || []),
      financials: o.financials || { totalAmount: 0, advancePay: 0, balanceAmount: 0 }
    }));
  },

  saveOrder: (order: Order) => {
    try {
      const orders = mockDataService.getOrders();
      const index = orders.findIndex((o) => o.id === order.id);
      if (index > -1) {
        orders[index] = order;
      } else {
        orders.push(order);
      }
      saveItem(ORDERS_KEY, orders);
      notifyUpdate();
    } catch (error) {
      console.error('Storage error:', error);
      throw error;
    }
  },

  createOrder: (orderData: Partial<Order>): Order => {
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...orderData
    };

    mockDataService.saveOrder(newOrder);
    return newOrder;
  },

  deleteOrder: (id: string) => {
    const orders = mockDataService.getOrders();
    saveItem(ORDERS_KEY, orders.filter((o) => o.id !== id));
    notifyUpdate();
  },

  getLeads: (): Lead[] => {
    return loadItem<Lead[]>(LEADS_KEY, []);
  },

  saveLead: (lead: Lead) => {
    const leads = mockDataService.getLeads();
    const index = leads.findIndex((item) => item.id === lead.id);
    if (index > -1) {
      leads[index] = lead;
    } else {
      leads.push(lead);
    }
    saveItem(LEADS_KEY, leads);
    notifyUpdate();
  },

  deleteLead: (id: string) => {
    const leads = mockDataService.getLeads();
    saveItem(LEADS_KEY, leads.filter((lead) => lead.id !== id));
    notifyUpdate();
  },

  clearLeads: () => {
    saveItem(LEADS_KEY, []);
    notifyUpdate();
  },

  getInvoices: (): Invoice[] => {
    return loadItem<Invoice[]>(INVOICES_KEY, []);
  },

  saveInvoice: (invoice: Invoice) => {
    const invoices = mockDataService.getInvoices();
    const index = invoices.findIndex((item) => item.id === invoice.id);
    if (index > -1) {
      invoices[index] = invoice;
    } else {
      invoices.push(invoice);
    }
    saveItem(INVOICES_KEY, invoices);
    notifyUpdate();
  },

  deleteInvoice: (id: string) => {
    const invoices = mockDataService.getInvoices();
    saveItem(INVOICES_KEY, invoices.filter((invoice) => invoice.id !== id));
    notifyUpdate();
  },

  getInventory: (): InventoryMovement[] => {
    return loadItem<InventoryMovement[]>(INVENTORY_KEY, []);
  },

  saveInventoryMovement: (movement: InventoryMovement) => {
    const inventory = mockDataService.getInventory();
    const index = inventory.findIndex((item) => item.id === movement.id);
    if (index > -1) {
      inventory[index] = movement;
    } else {
      inventory.push(movement);
    }
    saveItem(INVENTORY_KEY, inventory);
    notifyUpdate();
  },

  deleteInventoryMovement: (id: string) => {
    const inventory = mockDataService.getInventory();
    saveItem(INVENTORY_KEY, inventory.filter((item) => item.id !== id));
    notifyUpdate();
  },

  getUsers: (): UserProfile[] => {
    const saved = localStorage.getItem(USERS_KEY);
    return saved ? JSON.parse(saved) : [
      { uid: 'admin-1', email: 'admin', role: UserRole.ADMIN, name: 'Main Admin' },
      { uid: 'staff-1', email: 'staff', role: UserRole.STAFF, name: 'Front Desk' },
      { uid: 'acc-1', email: 'accounts', role: UserRole.ACCOUNTS, name: 'Billing Dept' },
      { uid: 'om-1', email: 'order', role: UserRole.ORDER_MANAGEMENT, name: 'Admin Hub' },
      { uid: 'prod-1', email: 'prod', role: UserRole.PRODUCTION, name: 'Factory Lead' },
      { uid: 'del-1', email: 'del', role: UserRole.DELIVERY, name: 'Delivery Agent' },
    ];
  },

  register: (user: UserProfile) => {
    const users = mockDataService.getUsers();
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  login: (email: string, password: string): UserProfile | null => {
    // Default admin: admin / pally@123
    if (email === 'admin' && password === 'pally@123') {
      return { uid: 'admin-1', email: 'admin', role: UserRole.ADMIN, name: 'Main Admin' };
    }

    const users = mockDataService.getUsers();
    const user = users.find(u => u.email === email);
    // For demo/prototype, we accept valid passwords for valid usernames
    if (user && password === 'pally@123') {
      return user;
    }

    // Also allow role names as logins for easier testing
    const roleMatch = users.find(u => u.role === email);
    if (roleMatch && password === 'pally@123') {
      return roleMatch;
    }

    return null;
  },

  updateUser: (user: UserProfile) => {
    const users = mockDataService.getUsers();
    const index = users.findIndex(u => u.uid === user.uid);
    if (index > -1) {
      users[index] = user;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      notifyUpdate();
    }
  },

  deleteUser: (id: string) => {
    const users = mockDataService.getUsers();
    const filtered = users.filter(u => u.uid !== id);
    localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
    notifyUpdate();
  }
};
