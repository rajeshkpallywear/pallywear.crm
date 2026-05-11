import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  addDoc as firestoreAddDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  doc,
  query,
  where,
  setDoc,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Lead, Invoice } from '../types';
import { useAuth } from './AuthContext';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // You can show a notification here if you have a toast system
  throw new Error(JSON.stringify(errInfo));
}

interface LeadContextType {
  leads: Lead[];
  invoices: Invoice[];
  addLead: (lead: Omit<Lead, 'id'>) => Promise<void>;
  updateLead: (id: string, lead: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => Promise<void>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

export function LeadProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    if (!user) {
      setLeads([]);
      setInvoices([]);
      return;
    }

    const leadsRef = collection(db, 'leads');
    // If admin, show all leads. Otherwise, show only leads created by the user.
    const qLeads = user.role === 'admin'
      ? query(leadsRef)
      : query(leadsRef, where('createdBy', '==', user.id));

    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Lead[];
      setLeads(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leads');
    });

    const invoicesRef = collection(db, 'invoices');
    const qInvoices = user.role === 'admin'
      ? query(invoicesRef)
      : query(invoicesRef, where('createdBy', '==', user.id));

    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Invoice[];
      setInvoices(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
    });

    return () => {
      unsubscribeLeads();
      unsubscribeInvoices();
    };
  }, [user]);

  const addLead = async (lead: Omit<Lead, 'id'>) => {
    if (!user) return;

    const leadId = Math.random().toString(36).substring(2, 9);
    const newLead = {
      ...lead,
      id: leadId,
      createdBy: user.id,
      createdByName: user.name,
    };

    try {
      await setDoc(doc(db, 'leads', leadId), newLead);
      console.log('Lead successfully saved to Cloud:', leadId);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `leads/${leadId}`);
    }
  };

  const updateLead = async (id: string, leadUpdate: Partial<Lead>) => {
    try {
      await firestoreUpdateDoc(doc(db, 'leads', id), leadUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${id}`);
    }
  };

  const deleteLead = async (id: string) => {
    try {
      await firestoreDeleteDoc(doc(db, 'leads', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `leads/${id}`);
    }
  };

  const addInvoice = async (invoice: Omit<Invoice, 'id'>) => {
    if (!user) return;

    try {
      const invoicesRef = collection(db, 'invoices');
      const docRef = doc(invoicesRef);
      const newInvoice = {
        ...invoice,
        id: docRef.id,
        createdBy: user.id,
        createdByName: user.name,
      };
      await setDoc(docRef, newInvoice);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invoices');
    }
  };

  const updateInvoice = async (id: string, invoiceUpdate: Partial<Invoice>) => {
    try {
      await firestoreUpdateDoc(doc(db, 'invoices', id), invoiceUpdate);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${id}`);
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await firestoreDeleteDoc(doc(db, 'invoices', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invoices/${id}`);
    }
  };

  return (
    <LeadContext.Provider value={{ leads, invoices, addLead, updateLead, deleteLead, addInvoice, updateInvoice, deleteInvoice }}>
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
