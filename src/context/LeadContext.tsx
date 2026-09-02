import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { mockDataService } from '../service/mockDataService';
import { Lead, Invoice, Order, InventoryMovement } from '../types';
import { useAuth } from './AuthContext';

interface LeadContextType {
  leads: Lead[];
  invoices: Invoice[];
  orders: Order[];
  inventory: InventoryMovement[];
  addLead: (lead: Omit<Lead, 'id'>) => Promise<void>;
  updateLead: (id: string, lead: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<void>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  addOrder: (order: Partial<Order>) => Promise<void>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  addInventoryMovement: (movement: Omit<InventoryMovement, 'id' | 'createdAt'>) => Promise<void>;
  deleteInventoryMovement: (id: string) => Promise<void>;
  loadOrderAttachments: (orderId: string) => Promise<any>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

function sanitizeForStorage(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((value) => sanitizeForStorage(value));
  }
  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (value !== undefined) {
        sanitized[key] = sanitizeForStorage(value);
      }
    }
  }
  return sanitized;
}

function hasArrayChanged<T extends { id?: string; updatedAt?: number; createdAt?: any; status?: string }>(prev: T[], next: T[]): boolean {
  if (prev === next) return false;
  if (!prev || !next) return true;
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (!p || !n) return true;
    if (p.id !== n.id) return true;
    if (p.updatedAt !== n.updatedAt) return true;
    if (p.status !== n.status) return true;
  }
  return false;
}

export function LeadProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryMovement[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const loadData = async (force = false) => {
      try {
        const [leadsData, invoicesData, ordersData, inventoryData] = await Promise.all([
          mockDataService.getLeads(force),
          mockDataService.getInvoices(force),
          mockDataService.getOrders(force),
          mockDataService.getInventory(force)
        ]);
        setLeads(prev => hasArrayChanged(prev, leadsData) ? leadsData : prev);
        setInvoices(prev => hasArrayChanged(prev, invoicesData) ? invoicesData : prev);
        setOrders(prev => hasArrayChanged(prev, ordersData) ? ordersData : prev);
        setInventory(prev => hasArrayChanged(prev, inventoryData) ? inventoryData : prev);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (!user) {
      setLeads([]);
      setInvoices([]);
      setOrders([]);
      setInventory([]);
      return;
    }

    // Instant load from SWR memory/local cache
    loadData(false);

    // ⚡ Smart background refresh every 20 seconds (pauses when tab is hidden)
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadData(true);
      }
    }, 20000);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        loadData(false);
      }
    };

    const handleDataUpdated = () => loadData(true);

    window.addEventListener('pallywear-data-updated', handleDataUpdated);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('pallywear-data-updated', handleDataUpdated);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user]);

  const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const addLead = async (lead: Omit<Lead, 'id'>) => {
    if (!user) return;
    const nextLead: Lead = sanitizeForStorage({
      ...lead,
      id: createId('lead'),
      number: lead.number || (lead as any).phone || 'N/A',
      createdBy: lead.createdBy || user.id,
      createdByName: lead.createdByName || user.name,
    });
    await mockDataService.saveLead(nextLead);
    setLeads((prev) => [...prev, nextLead]);
  };

  const updateLead = async (id: string, leadUpdate: Partial<Lead>) => {
    const existing = leads.find((lead) => lead.id === id);
    if (!existing) return;
    const nextLead: Lead = {
      ...existing,
      ...sanitizeForStorage(leadUpdate),
    } as Lead;
    await mockDataService.saveLead(nextLead);
    setLeads((prev) => prev.map((lead) => (lead.id === id ? nextLead : lead)));
  };

  const deleteLead = async (id: string) => {
    await mockDataService.deleteLead(id);
    setLeads((prev) => prev.filter((lead) => lead.id !== id));
  };

  const addInvoice = async (invoice: Omit<Invoice, 'id'>) => {
    if (!user) return;
    const nextInvoice: Invoice = sanitizeForStorage({
      ...invoice,
      id: createId('invoice'),
      createdBy: user.id,
      createdByName: user.name,
    }) as Invoice;
    await mockDataService.saveInvoice(nextInvoice);
    setInvoices((prev) => [...prev, nextInvoice]);
  };

  const updateInvoice = async (id: string, invoiceUpdate: Partial<Invoice>) => {
    const existing = invoices.find((invoice) => invoice.id === id);
    if (!existing) return;
    const nextInvoice: Invoice = {
      ...existing,
      ...sanitizeForStorage(invoiceUpdate),
    } as Invoice;
    await mockDataService.saveInvoice(nextInvoice);
    setInvoices((prev) => prev.map((invoice) => (invoice.id === id ? nextInvoice : invoice)));
  };

  const deleteInvoice = async (id: string) => {
    await mockDataService.deleteInvoice(id);
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
  };

  const addOrder = async (orderData: Partial<Order>) => {
    if (!user) return;
    const nextOrder = await mockDataService.createOrder({
      ...orderData,
      createdBy: orderData.createdBy || user.id,
      createdByName: orderData.createdByName || user.name,
    });
    setOrders((prev) => [...prev, nextOrder]);

    // Automatically sync/create Client (Lead)
    const phone = nextOrder.customerInfo?.phone;
    if (phone) {
      const existingLead = leads.find(l => l.number === phone);
      const orderAmount = nextOrder.financials?.totalAmount || 0;
      if (existingLead) {
        updateLead(existingLead.id, {
          totalOrderValue: (existingLead.totalOrderValue || 0) + orderAmount,
          convertedValue: (existingLead.convertedValue || 0) + orderAmount,
          status: 'Converted'
        }).catch(err => console.error("Failed to sync lead in background:", err));
      } else {
        addLead({
          name: nextOrder.customerInfo?.name || 'Client',
          number: phone,
          companyName: nextOrder.customerInfo?.address || nextOrder.details?.company || '',
          gst: nextOrder.details?.gst || '',
          leadType: 'Hot',
          entryDate: new Date().toLocaleDateString('en-US'),
          status: 'Converted',
          createdBy: nextOrder.createdBy || user.id,
          createdByName: nextOrder.createdByName || user.name,
          assignedTo: nextOrder.createdBy || user.id,
          assignedToName: nextOrder.createdByName || user.name,
          forecastedValue: orderAmount,
          convertedValue: orderAmount,
          totalOrderValue: orderAmount,
          description: `Automatically created from Order #${nextOrder.id.slice(-8)}`
        }).catch(err => console.error("Failed to sync lead in background:", err));
      }
    }
  };

  const updateOrder = async (id: string, orderUpdate: Partial<Order>) => {
    const existing = orders.find((order) => order.id === id);
    if (!existing) return;
    const nextOrder: Order = {
      ...existing,
      ...sanitizeForStorage(orderUpdate),
      updatedAt: Date.now(),
    };

    // ⚡ Instant optimistic UI update (1 second response)
    setOrders((prev) => prev.map((order) => (order.id === id ? nextOrder : order)));

    try {
      await mockDataService.patchOrder(id, sanitizeForStorage(orderUpdate));

      // Sync changes to the associated Lead/Client
      const phone = nextOrder.customerInfo?.phone || existing.customerInfo?.phone;
      if (phone) {
        const associatedLead = leads.find(l => l.number === phone);
        if (associatedLead) {
          const updates: Partial<Lead> = {};
          if (orderUpdate.customerInfo?.name) updates.name = orderUpdate.customerInfo.name;
          if (orderUpdate.customerInfo?.address) updates.companyName = orderUpdate.customerInfo.address;
          
          // Re-calculate sum of all order amounts for this client phone number
          const clientOrders = orders.map(o => o.id === id ? nextOrder : o)
            .filter(o => o.customerInfo?.phone === phone);
          const totalValue = clientOrders.reduce((sum, o) => sum + (o.financials?.totalAmount || 0), 0);
          updates.totalOrderValue = totalValue;
          updates.convertedValue = totalValue;
          updates.status = 'Converted';

          await updateLead(associatedLead.id, updates);
        }
      }
    } catch (err) {
      console.error("Background sync error:", err);
      throw err;
    }
  };

  const deleteOrder = async (id: string) => {
    await mockDataService.deleteOrder(id);
    setOrders((prev) => prev.filter((order) => order.id !== id));
  };

  const addInventoryMovement = async (movement: Omit<InventoryMovement, 'id' | 'createdAt'>) => {
    const nextMovement: InventoryMovement = sanitizeForStorage({
      ...movement,
      id: createId('inventory'),
      createdAt: Date.now(),
    }) as InventoryMovement;
    await mockDataService.saveInventoryMovement(nextMovement);
    setInventory((prev) => [...prev, nextMovement]);
  };

  const deleteInventoryMovement = async (id: string) => {
    await mockDataService.deleteInventoryMovement(id);
    setInventory((prev) => prev.filter((item) => item.id !== id));
  };

  const loadOrderAttachments = async (orderId: string): Promise<any> => {
    try {
      const attachments = await mockDataService.getOrderAttachments(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...attachments } : o))
      );
      return attachments;
    } catch (error) {
      console.error('Error loading order attachments:', error);
      return {};
    }
  };

  return (
    <LeadContext.Provider value={{
      leads,
      invoices,
      orders,
      inventory,
      addLead,
      updateLead,
      deleteLead,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      addOrder,
      updateOrder,
      deleteOrder,
      addInventoryMovement,
      deleteInventoryMovement,
      loadOrderAttachments
    }}>
      {children}
    </LeadContext.Provider>
  );
}

export function useLeads() {
  const context = useContext(LeadContext);
  if (context === undefined) {
    throw new Error('useLeads must be used within a LeadProvider');
  }
  return context;
}
