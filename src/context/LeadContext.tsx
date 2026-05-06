import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Lead } from '../types';

interface LeadContextType {
  leads: Lead[];
  addLead: (lead: Omit<Lead, 'id'>) => void;
  updateLead: (id: string, lead: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

// Initial mock data
export function LeadProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('leads');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('leads', JSON.stringify(leads));
  }, [leads]);

  const addLead = (lead: Omit<Lead, 'id'>) => {
    const newLead = {
      ...lead,
      id: Math.random().toString(36).substring(2, 9),
    };
    setLeads([...leads, newLead]);
  };

  const updateLead = (id: string, leadUpdate: Partial<Lead>) => {
    setLeads(leads.map(l => l.id === id ? { ...l, ...leadUpdate } : l));
  };

  const deleteLead = (id: string) => {
    setLeads(leads.filter(l => l.id !== id));
  };

  return (
    <LeadContext.Provider value={{ leads, addLead, updateLead, deleteLead }}>
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
