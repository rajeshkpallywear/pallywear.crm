import React, { useState, useEffect, useMemo } from 'react';
import {
  Phone, CheckCircle2, Clock, Search, Save, ClipboardList,
  AlertCircle, Plus, FileText, RefreshCw, Users, ArrowUpRight,
  MessageCircle, Edit, Edit3, X, Flame, Thermometer, Snowflake,
  Building2, MapPin, UserCheck, ExternalLink, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getApiUrl } from '../lib/apiConfig';
import { useLeads } from '../context/LeadContext';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';



interface Lead {
  id: string;
  name: string;
  number: string;
  companyName?: string;
  description?: string;
  status: string;
  leadType?: string;
  assignedTo?: string;
  assignedToName?: string;
  entryDate?: string;
  createdBy: string;
  createdByName?: string;
}

const isLeadAssignedToUser = (l: Lead, u: any) => {
  if (!l.assignedTo?.trim() && !l.assignedToName?.trim()) return false;
  const myId = u?.id || u?.uid;
  const myEmail = (u?.email || '').toLowerCase();
  const myName = (u?.name || '').toLowerCase();
  const assignedTo = (l.assignedTo || '').toLowerCase();
  const assignedToName = (l.assignedToName || '').toLowerCase();

  return (
    (myId && (l.assignedTo === u?.id || l.assignedTo === u?.uid)) ||
    (myEmail && assignedTo === myEmail) ||
    (myName && assignedToName === myName) ||
    (myEmail === 'daniel.smpallywear@gmail.com' && (assignedTo === 'admin-daniel' || assignedToName.includes('daniel')))
  );
};

export default function OnlineTeamDashboard({ user, defaultTab = 'active_leads', hideHeaderAndTabs = false }: { user: any; defaultTab?: 'active_leads' | 'assign_leads' | 'marketing_leads' | 'call_logs' | 'all_online_leads'; hideHeaderAndTabs?: boolean }) {
  const { leads, updateLead, addLead } = useLeads();
  const { registeredUsers } = useAuth();

  const isOverallManager = React.useMemo(() => {
    return user?.role === 'admin' || user?.email?.toLowerCase() === 'daniel.smpallywear@gmail.com' || user?.email?.toLowerCase() === 'jimpallywear@gmail.com';
  }, [user]);

  const canAssign = isOverallManager;

  const onlineTeamAgents = React.useMemo(() => {
    return registeredUsers?.filter((u: any) => u.role === 'onlineteam' || u.role === 'UserRole.ONLINETEAM') || [];
  }, [registeredUsers]);
  const marketingAgents = React.useMemo(() => {
    return registeredUsers?.filter((u: any) => (u.role === 'marketing' || u.role === 'UserRole.MARKETING') && u.email?.toLowerCase() !== 'daniel.smpallywear@gmail.com') || [];
  }, [registeredUsers]);

  const assignableAgents = React.useMemo(() => {
    const isJim = user?.email === 'jimpallywear@gmail.com';
    if (isJim) return onlineTeamAgents;

    const list = [...marketingAgents, ...onlineTeamAgents];
    const uniqueMap = new Map();
    list.forEach(agent => {
      const key = agent.id || agent.uid || agent.email;
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, agent);
      }
    });
    return Array.from(uniqueMap.values());
  }, [onlineTeamAgents, marketingAgents, user]);

  const [activeTab, setActiveTab] = useState<'active_leads' | 'assign_leads' | 'marketing_leads' | 'call_logs' | 'all_online_leads'>(defaultTab);
  const [assignedAgentFilter, setAssignedAgentFilter] = useState<string>(isOverallManager ? 'all' : 'me');

  useEffect(() => {
    if (!isOverallManager) {
      setAssignedAgentFilter('me');
    }
  }, [isOverallManager]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdminLogsModal, setShowAdminLogsModal] = useState(false);
  const [selectedLeadForAdminLogs, setSelectedLeadForAdminLogs] = useState<Lead | null>(null);
  
  // Lead logs state (inline side workspace)
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState('New');
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick Update Status modal (Mobile App Compact Model)
  const [quickUpdateLead, setQuickUpdateLead] = useState<Lead | null>(null);
  const [quickUpdateStatus, setQuickUpdateStatus] = useState('New');
  const [quickUpdateNote, setQuickUpdateNote] = useState('');
  const [isQuickSaving, setIsQuickSaving] = useState(false);

  // Full Edit Lead Modal State (Mobile App Compact Model)
  const [fullEditLead, setFullEditLead] = useState<Lead | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editLeadType, setEditLeadType] = useState<string>('Warm');
  const [editFullStatus, setEditFullStatus] = useState('New');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editAssignedToName, setEditAssignedToName] = useState('');
  const [editFullNote, setEditFullNote] = useState('');
  const [isFullSaving, setIsFullSaving] = useState(false);

  const openFullEditModal = (lead: Lead) => {
    setFullEditLead(lead);
    setEditName(lead.name || '');
    setEditNumber(lead.number || '');
    setEditCompany(lead.companyName || '');
    setEditLocation((lead as any).location || '');
    setEditLeadType(lead.leadType || 'Warm');
    setEditFullStatus(lead.status || 'New');
    setEditAssignedTo(lead.assignedTo || '');
    setEditAssignedToName(lead.assignedToName || '');
    setEditFullNote('');
  };

  const handleSaveFullEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullEditLead) return;
    if (!editName.trim() || !editNumber.trim()) {
      alert('Please provide both Client Name and Phone Number.');
      return;
    }

    setIsFullSaving(true);
    try {
      const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
      const entry = editFullNote.trim()
        ? `[${timestamp}] ${user?.name || 'Online Team'}: ${editFullNote.trim()}`
        : '';
      const updatedDescription = entry
        ? (fullEditLead.description ? `${fullEditLead.description}\n\n${entry}` : entry)
        : fullEditLead.description || '';

      const matchedAgent = assignableAgents.find((a: any) => (a.id || a.uid) === editAssignedTo);
      const finalAssignedName = editAssignedTo ? (matchedAgent ? matchedAgent.name : editAssignedToName) : undefined;

      const updates: Partial<Lead> = {
        name: editName.trim(),
        number: editNumber.trim(),
        companyName: editCompany.trim(),
        leadType: editLeadType as any,
        status: editFullStatus,
        description: updatedDescription,
        assignedTo: editAssignedTo || undefined,
        assignedToName: finalAssignedName || undefined,
        isTaken: Boolean(editAssignedTo)
      };

      const res = await fetch(getApiUrl(`/api/leads/${fullEditLead.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        await updateLead(fullEditLead.id, updates);
        setFullEditLead(null);
        alert('✓ Lead updated successfully!');
      } else {
        alert('Failed to update lead: ' + (data?.message || 'Server error'));
      }
    } catch (err: any) {
      console.error('Error saving lead:', err);
      alert('Error updating lead: ' + (err?.message || 'Network error'));
    } finally {
      setIsFullSaving(false);
    }
  };

  // Add Call Log Form State
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [addLogName, setAddLogName] = useState('');
  const [addLogPhone, setAddLogPhone] = useState('');
  const [addLogRequirement, setAddLogRequirement] = useState('');
  const [addLogNotes, setAddLogNotes] = useState('');
  const [isAddingLog, setIsAddingLog] = useState(false);

  const resetAddLogForm = () => {
    setAddLogName('');
    setAddLogPhone('');
    setAddLogRequirement('');
    setAddLogNotes('');
  };

  // Add Lead Inline Form State (Online leads page for operators)
  const [showAddLeadFormInline, setShowAddLeadFormInline] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadLocation, setNewLeadLocation] = useState('');
  const [newLeadType, setNewLeadType] = useState<'Hot' | 'Warm' | 'Cold'>('Warm');
  const [isSubmittingNewLead, setIsSubmittingNewLead] = useState(false);

  const handleAddNewLeadInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadPhone) return;
    setIsSubmittingNewLead(true);
    const isJimCreator = user?.email === 'jimpallywear@gmail.com';
    try {
      await addLead({
        name: newLeadName,
        number: newLeadPhone,
        companyName: newLeadLocation,
        gst: '',
        leadType: newLeadType,
        entryDate: new Date().toISOString(),
        forecastedValue: 0,
        convertedValue: 0,
        totalOrderValue: 0,
        createdBy: user?.id || user?.uid || 'onlineteam',
        createdByName: user?.name || 'Online Team',
        status: 'New',
        description: '',
        isOnlineLead: true,
        assignedTo: isJimCreator ? (user?.id || user?.uid) : undefined,
        assignedToName: isJimCreator ? user?.name : undefined,
        isTaken: isJimCreator ? true : false
      });
      // Reset form
      setNewLeadName('');
      setNewLeadPhone('');
      setNewLeadLocation('');
      setNewLeadType('Warm');
      setShowAddLeadFormInline(false);
      alert('Lead successfully registered and saved to database.');
    } catch (err) {
      console.error(err);
      alert('Failed to register lead. Please try again.');
    } finally {
      setIsSubmittingNewLead(false);
    }
  };

  const handleAddCallLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addLogName.trim() || !addLogPhone.trim()) return;
    setIsAddingLog(true);
    try {
      const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
      const initialLog = addLogNotes.trim()
        ? `[${timestamp}] ${user?.name || 'Online Team'}: ${addLogNotes.trim()}`
        : '';
      const fullDescription = addLogRequirement.trim()
        ? `Requirements: ${addLogRequirement.trim()}${initialLog ? `\n\n${initialLog}` : ''}`
        : initialLog;

      await addLead({
        name: addLogName.trim(),
        number: addLogPhone.trim(),
        companyName: addLogRequirement.trim(),
        status: 'Called',
        leadType: 'Warm',
        entryDate: new Date().toLocaleDateString('en-US'),
        description: fullDescription,
        assignedTo: user?.id || user?.uid,
        assignedToName: user?.name,
        createdBy: user?.id || user?.uid,
        createdByName: user?.name,
        forecastedValue: 0,
        convertedValue: 0,
        totalOrderValue: 0,
      });

      setIsAddLogOpen(false);
      resetAddLogForm();
      alert('Call log added successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to add call log.');
    } finally {
      setIsAddingLog(false);
    }
  };

  const assignedLeads = React.useMemo(() => {
    const filteredLeads = leads.filter(l => !l.isOnlineLead);
    if (isOverallManager) return filteredLeads;
    return filteredLeads.filter(l => 
      isLeadAssignedToUser(l, user) || 
      l.createdBy === user?.id || 
      l.createdBy === user?.uid
    );
  }, [leads, user, isOverallManager]);

  const debouncedSearchTerm = useDebounce(searchTerm, 150);

  const filteredAssignedLeads = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase().trim();
    if (!term) return assignedLeads;
    return assignedLeads.filter(l => 
      l.name.toLowerCase().includes(term) || 
      (l.companyName || '').toLowerCase().includes(term) ||
      l.number.includes(term)
    );
  }, [assignedLeads, debouncedSearchTerm]);

  // Filter leads created by Marketing (non-Online Team creators)
  const marketingLeads = React.useMemo(() => {
    return leads.filter(l => {
      const isCreatorOnlineTeam = registeredUsers?.some(
        u => u.id === l.createdBy && (u.role === 'onlineteam' || u.role === 'UserRole.ONLINETEAM')
      );
      return !isCreatorOnlineTeam;
    });
  }, [leads, registeredUsers]);

  const filteredMarketingLeads = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase().trim();
    if (!term) return marketingLeads;
    return marketingLeads.filter(l => 
      l.name.toLowerCase().includes(term) || 
      (l.companyName || '').toLowerCase().includes(term) ||
      l.number.includes(term)
    );
  }, [marketingLeads, debouncedSearchTerm]);

  const allCallLogs = React.useMemo(() => {
    const logsList: { leadId: string; leadName: string; number: string; timestamp: string; note: string }[] = [];
    assignedLeads.forEach(lead => {
      if (lead.description) {
        const entries = lead.description.split('\n\n');
        entries.forEach(entry => {
          const match = entry.match(/^\[(.*?)\]\s*(.*?):\s*(.*)$/s);
          if (match) {
            logsList.push({
              leadId: lead.id,
              leadName: lead.name,
              number: lead.number,
              timestamp: match[1],
              note: `${match[2]}: ${match[3]}`
            });
          } else {
            logsList.push({
              leadId: lead.id,
              leadName: lead.name,
              number: lead.number,
              timestamp: 'Log Entry',
              note: entry
            });
          }
        });
      }
    });
    return logsList.reverse();
  }, [assignedLeads]);

  const unassignedLeads = React.useMemo(() => {
    return leads.filter(l => !l.isOnlineLead && !l.assignedTo);
  }, [leads]);

  const filteredUnassignedLeads = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase().trim();
    if (!term) return unassignedLeads;
    return unassignedLeads.filter(l => 
      l.name.toLowerCase().includes(term) || 
      (l.companyName || '').toLowerCase().includes(term) ||
      l.number.includes(term)
    );
  }, [unassignedLeads, debouncedSearchTerm]);

  const userRoleMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    registeredUsers?.forEach((u: any) => {
      map[u.id] = u.role;
    });
    return map;
  }, [registeredUsers]);

  const isOnlineTeam = React.useCallback((createdBy: string) => {
    const role = userRoleMap[createdBy];
    return role === 'onlineteam' || role === 'UserRole.ONLINETEAM';
  }, [userRoleMap]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    setIsSaving(true);
    try {
      const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
      const entry = `[${timestamp}] ${user?.name || 'Online Team'}: ${newNote.trim()}`;
      const updatedDescription = newNote.trim()
        ? (editingLead.description ? `${editingLead.description}\n\n${entry}` : entry)
        : editingLead.description || '';

      const res = await fetch(getApiUrl(`/api/leads/${editingLead.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          description: updatedDescription
        })
      });
      const data = await res.json();
      if (data.success) {
        await updateLead(editingLead.id, { status: editStatus, description: updatedDescription });
        setEditingLead(null);
        setNewNote('');
      } else {
        alert('Failed to update lead');
      }
    } catch (e) {
      alert('Error updating lead');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUpdateLead) return;
    setIsQuickSaving(true);
    try {
      const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
      const entry = quickUpdateNote.trim()
        ? `[${timestamp}] ${user?.name || 'Online Team'}: ${quickUpdateNote.trim()}`
        : '';
      const updatedDescription = entry
        ? (quickUpdateLead.description ? `${quickUpdateLead.description}\n\n${entry}` : entry)
        : quickUpdateLead.description || '';

      const res = await fetch(getApiUrl(`/api/leads/${quickUpdateLead.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: quickUpdateStatus, description: updatedDescription })
      });
      const data = await res.json();
      if (data.success) {
        await updateLead(quickUpdateLead.id, { status: quickUpdateStatus, description: updatedDescription });
        setQuickUpdateLead(null);
        setQuickUpdateNote('');
      } else {
        alert('Failed to update lead');
      }
    } catch {
      alert('Error updating lead');
    } finally {
      setIsQuickSaving(false);
    }
  };

  const contactedCount = assignedLeads.filter(l => 
    ['Called', 'Interested', 'Not Interested', 'Converted'].includes(l.status)
  ).length;
  const interestedCount = assignedLeads.filter(l => l.status === 'Interested').length;
  const pendingCount = assignedLeads.filter(l => l.status === 'New' || !l.status).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header & Tab Selection */}
      {!hideHeaderAndTabs && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-150 pb-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {activeTab === 'active_leads' 
                ? 'My Active Leads' 
                : activeTab === 'assign_leads'
                ? 'Assign / Claim Leads'
                : activeTab === 'marketing_leads' 
                ? 'Marketing Leads Dashboard' 
                : activeTab === 'call_logs'
                ? 'Call Logs Timeline'
                : 'Online Leads Dashboard'}
            </h2>
            <p className="text-gray-500 text-xs mt-0.5 font-semibold uppercase tracking-wider">
              {activeTab === 'active_leads' 
                ? 'Call tracking and status management for your assigned leads' 
                : activeTab === 'assign_leads'
                ? 'Claim unassigned leads to work on them in your active workspace'
                : activeTab === 'marketing_leads' 
                ? 'Monitor and review marketing uploaded pools and prospects'
                : activeTab === 'call_logs'
                ? 'Chronological timeline of all your recorded interaction notes'
                : 'Comprehensive statistics and registry of all online team leads'}
            </p>
          </div>

          {/* Tab Selection & Add Call Log Action */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsAddLogOpen(true)}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border-none cursor-pointer shadow-md transition-all active:scale-95 animate-pulse-subtle"
            >
              <Plus size={14} /> Add Call Log
            </button>
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 border border-gray-250 rounded-2xl">
              <button
                onClick={() => { setActiveTab('active_leads'); setSearchTerm(''); }}
                className={cn(
                  "flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5",
                  activeTab === 'active_leads' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800 bg-transparent"
                )}
                title="Active Leads"
              >
                <ClipboardList size={16} />
              </button>
              <button
                onClick={() => { setActiveTab('assign_leads'); setSearchTerm(''); }}
                className={cn(
                  "flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5",
                  activeTab === 'assign_leads' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800 bg-transparent"
                )}
                title="Assign Leads"
              >
                <Users size={16} />
              </button>
              <button
                onClick={() => { setActiveTab('marketing_leads'); setSearchTerm(''); }}
                className={cn(
                  "flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5",
                  activeTab === 'marketing_leads' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800 bg-transparent"
                )}
                title="Marketing Leads"
              >
                <ArrowUpRight size={16} />
              </button>
              <button
                onClick={() => { setActiveTab('call_logs'); setSearchTerm(''); }}
                className={cn(
                  "flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1.5",
                  activeTab === 'call_logs' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800 bg-transparent"
                )}
                title="Call History Log"
              >
                <FileText size={16} />
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Tab content rendering */}
      {activeTab === 'active_leads' ? (
        <div className="space-y-6">
          {/* Stats Cards Removed */}

          {/* Table workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Your Assigned Leads</h3>
                  <p className="text-xs text-gray-500">Call leads to collect requirements & update call logs</p>
                </div>
                
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Quick search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              </div>

              <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Client Name</th>
                      <th className="px-6 py-4">Phone / Contact</th>
                      <th className="px-6 py-4">Company</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredAssignedLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">{lead.name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-gray-600">
                          <div className="flex items-center gap-2">
                            <a href={`tel:${lead.number}`} className="hover:underline text-brand-primary font-bold">
                              {lead.number}
                            </a>
                            <a
                              href={`https://wa.me/${lead.number.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 p-1 hover:bg-emerald-50 rounded-md transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-semibold">{lead.companyName || 'Individual'}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                            lead.status === 'Interested' ? "bg-green-50 text-green-700 border-green-150" :
                            lead.status === 'Not Interested' ? "bg-red-50 text-red-700 border-red-155" :
                            lead.status === 'Called' ? "bg-indigo-50 text-indigo-700 border-indigo-150" :
                            lead.status === 'Converted' ? "bg-blue-50 text-blue-700 border-blue-150" :
                            "bg-amber-50 text-amber-700 border-amber-150"
                          )}>
                            {lead.status || 'New'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setQuickUpdateLead(lead);
                                setQuickUpdateStatus(lead.status || 'New');
                                setQuickUpdateNote('');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg uppercase tracking-wider transition-all border-none cursor-pointer shadow-xs active:scale-95"
                              title="Quick Status & Note"
                            >
                              Update
                            </button>
                            <button
                              onClick={() => openFullEditModal(lead)}
                              className="px-2.5 py-1 bg-brand-primary hover:bg-brand-primary/90 text-white text-[10px] font-black rounded-lg uppercase tracking-wider transition-all border-none cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                              title="Edit All Details"
                            >
                              <Edit size={11} /> Edit
                            </button>
                            <button
                              onClick={() => {
                                setEditingLead(lead);
                                setEditStatus(lead.status || 'New');
                                setNewNote('');
                              }}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all border-none cursor-pointer"
                              title="Open in Workspace"
                            >
                              Workspace
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAssignedLeads.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400 italic">
                          No assigned leads match the search filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Compact Cards for Small Screens */}
              <div className="space-y-3 block md:hidden">
                {filteredAssignedLeads.map(lead => (
                  <div key={lead.id} className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-3 text-left shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-black text-sm text-gray-900 leading-tight truncate">{lead.name}</h4>
                        <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{lead.companyName || 'Individual'}</p>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex-shrink-0",
                        lead.status === 'Interested' ? "bg-green-50 text-green-700 border-green-200" :
                        lead.status === 'Not Interested' ? "bg-red-50 text-red-700 border-red-200" :
                        lead.status === 'Called' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                        lead.status === 'Converted' ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {lead.status || 'New'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <a href={`tel:${lead.number}`} className="flex items-center gap-1 text-brand-primary font-bold font-mono">
                          <Phone size={12} /> {lead.number}
                        </a>
                        <a
                          href={`https://wa.me/${lead.number.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 p-1 hover:bg-emerald-50 rounded"
                          title="WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          setQuickUpdateLead(lead);
                          setQuickUpdateStatus(lead.status || 'New');
                          setQuickUpdateNote('');
                        }}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all border-none cursor-pointer text-center"
                      >
                        ⚡ Update Status
                      </button>
                      <button
                        onClick={() => openFullEditModal(lead)}
                        className="flex-1 py-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Edit size={11} /> Edit Lead
                      </button>
                    </div>
                  </div>
                ))}
                {filteredAssignedLeads.length === 0 && (
                  <div className="py-8 text-center text-gray-400 italic text-xs">
                    No assigned leads match your search.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm text-left">
              {editingLead ? (
                <form onSubmit={handleUpdateStatus} className="space-y-4">
                  <div className="border-b border-gray-50 pb-3 flex items-start justify-between">
                    <div>
                      <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest font-bold">Call Workspace</span>
                      <h4 className="text-base font-black text-gray-900 uppercase mt-0.5">{editingLead.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <a href={`tel:${editingLead.number}`} className="text-xs text-brand-primary font-bold hover:underline font-mono">
                          {editingLead.number}
                        </a>
                        <a
                          href={`https://wa.me/${editingLead.number.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <MessageCircle size={14} />
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openFullEditModal(editingLead)}
                      className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-brand-primary rounded-lg text-[10px] font-bold uppercase border border-gray-200 cursor-pointer flex items-center gap-1"
                      title="Edit Full Lead Details"
                    >
                      <Edit size={11} /> Edit All
                    </button>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Lead call Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-155 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 font-bold text-gray-800"
                    >
                      <option value="New">🟡 New / Uncalled</option>
                      <option value="Called">📞 Called / Follow Up</option>
                      <option value="Interested">🔥 Interested / Hot</option>
                      <option value="Follow Up">🔄 Follow Up</option>
                      <option value="Not Interested">❌ Not Interested</option>
                      <option value="Converted">✅ Converted</option>
                    </select>
                  </div>

                  {editingLead.description && (
                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Call Log History</label>
                      <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 max-h-40 overflow-y-auto text-[11px] font-medium text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
                        {editingLead.description}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Add Call Log Details / Notes</label>
                    <textarea
                      rows={4}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Enter details of conversation..."
                      className="w-full bg-gray-50 border border-gray-155 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingLead(null)}
                      className="px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer bg-transparent"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none"
                    >
                      {isSaving ? 'Saving...' : 'Save Call log'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 mb-4 border border-gray-100 shadow-inner">
                    <AlertCircle size={20} />
                  </div>
                  <p className="text-xs text-gray-800 font-bold uppercase tracking-wider">No Lead Selected</p>
                  <p className="text-[11px] text-gray-400 font-medium max-w-[180px] mt-1.5">
                    Select a lead from the list to record call notes and update logs.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'assign_leads' ? (
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm text-left space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Unassigned Leads Pool</h3>
              <p className="text-xs text-gray-500">Select and claim leads to add them to your active workspace</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search unassigned leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Created By</th>
                  <th className="px-6 py-4 text-center">Lead Type</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUnassignedLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{lead.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <a href={`tel:${lead.number}`} className="hover:underline text-brand-primary font-bold">
                          {lead.number}
                        </a>
                        <a
                          href={`https://wa.me/${lead.number.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                          title="WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-semibold">{lead.companyName || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-600 font-medium">{lead.createdByName || 'System'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                        lead.leadType === 'Hot' ? "bg-red-50 text-red-700 border-red-150" :
                        lead.leadType === 'Warm' ? "bg-amber-50 text-amber-700 border-amber-150" :
                        "bg-blue-50 text-blue-700 border-blue-150"
                      )}>
                        {lead.leadType || 'Warm'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(getApiUrl(`/api/leads/${lead.id}`), {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  assignedTo: user?.id || user?.uid,
                                  assignedToName: user?.name,
                                  isTaken: true
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                await updateLead(lead.id, {
                                  assignedTo: user?.id || user?.uid,
                                  assignedToName: user?.name,
                                  isTaken: true
                                });
                                alert('Lead claimed successfully!');
                              }
                            } catch (e) {
                              console.error("Failed to claim lead:", e);
                            }
                          }}
                          className="px-2.5 py-1 bg-brand-primary text-white text-[10px] font-black rounded-lg uppercase tracking-wider hover:bg-brand-secondary hover:text-brand-primary transition-all border-none cursor-pointer shadow-xs active:scale-95"
                        >
                          Claim
                        </button>
                        <button
                          onClick={() => {
                            setQuickUpdateLead(lead);
                            setQuickUpdateStatus(lead.status || 'New');
                            setQuickUpdateNote('');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg uppercase tracking-wider transition-all border-none cursor-pointer shadow-xs active:scale-95"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => openFullEditModal(lead)}
                          className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border-none cursor-pointer"
                          title="Full Edit"
                        >
                          <Edit size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUnassignedLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 italic">
                      No unassigned leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards for Unassigned Leads */}
          <div className="space-y-3 block md:hidden">
            {filteredUnassignedLeads.map(lead => (
              <div key={lead.id} className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-3 text-left shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-black text-sm text-gray-900 leading-tight truncate">{lead.name}</h4>
                    <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{lead.companyName || 'Individual'}</p>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex-shrink-0",
                    lead.leadType === 'Hot' ? "bg-red-50 text-red-700 border-red-200" :
                    lead.leadType === 'Warm' ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-blue-50 text-blue-700 border-blue-200"
                  )}>
                    {lead.leadType || 'Warm'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <a href={`tel:${lead.number}`} className="flex items-center gap-1 text-brand-primary font-bold font-mono">
                      <Phone size={12} /> {lead.number}
                    </a>
                    <a
                      href={`https://wa.me/${lead.number.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 p-1 hover:bg-emerald-50 rounded"
                      title="WhatsApp"
                    >
                      <MessageCircle size={14} />
                    </a>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">By {lead.createdByName || 'System'}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(getApiUrl(`/api/leads/${lead.id}`), {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            assignedTo: user?.id || user?.uid,
                            assignedToName: user?.name,
                            isTaken: true
                          })
                        });
                        const data = await res.json();
                        if (data.success) {
                          await updateLead(lead.id, {
                            assignedTo: user?.id || user?.uid,
                            assignedToName: user?.name,
                            isTaken: true
                          });
                          alert('Lead claimed successfully!');
                        }
                      } catch (e) {
                        console.error("Failed to claim lead:", e);
                      }
                    }}
                    className="flex-1 py-1.5 bg-brand-primary text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all border-none cursor-pointer shadow-xs active:scale-95 text-center"
                  >
                    Claim Lead
                  </button>
                  <button
                    onClick={() => {
                      setQuickUpdateLead(lead);
                      setQuickUpdateStatus(lead.status || 'New');
                      setQuickUpdateNote('');
                    }}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all border-none cursor-pointer text-center"
                  >
                    ⚡ Update
                  </button>
                  <button
                    onClick={() => openFullEditModal(lead)}
                    className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-colors border-none cursor-pointer"
                    title="Full Edit"
                  >
                    <Edit size={14} />
                  </button>
                </div>
              </div>
            ))}
            {filteredUnassignedLeads.length === 0 && (
              <div className="py-8 text-center text-gray-400 italic text-xs">
                No unassigned leads found.
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'marketing_leads' ? (
        /* Marketing Leads tab content */
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Marketing Upload Pool</h3>
              <p className="text-xs text-gray-500">All uploaded leads and prospects from Marketing department</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search marketing leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Uploaded By</th>
                  <th className="px-6 py-4 text-center">Lead Type</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredMarketingLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{lead.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <a href={`tel:${lead.number}`} className="hover:underline text-brand-primary font-bold">
                          {lead.number}
                        </a>
                        <a
                          href={`https://wa.me/${lead.number.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                          title="WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-semibold">{lead.companyName || 'Individual'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center text-[9px] font-bold">
                          {lead.createdByName?.charAt(0) || 'M'}
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{lead.createdByName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                        lead.leadType === 'Hot' ? "bg-red-50 text-red-700 border-red-150" :
                        lead.leadType === 'Warm' ? "bg-amber-50 text-amber-700 border-amber-150" :
                        "bg-blue-50 text-blue-700 border-blue-150"
                      )}>
                        {lead.leadType || 'Warm'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setQuickUpdateLead(lead);
                            setQuickUpdateStatus(lead.status || 'New');
                            setQuickUpdateNote('');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg uppercase tracking-wider transition-all border-none cursor-pointer shadow-xs active:scale-95"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => openFullEditModal(lead)}
                          className="px-2.5 py-1 bg-brand-primary hover:bg-brand-primary/90 text-white text-[10px] font-black rounded-lg uppercase tracking-wider transition-all border-none cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                        >
                          <Edit size={11} /> Edit
                        </button>
                        {lead.description && (
                          <button
                            onClick={() => { setSelectedLeadForAdminLogs(lead); setShowAdminLogsModal(true); }}
                            className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-100 transition-colors cursor-pointer"
                            title="View Call Logs"
                          >
                            <FileText size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredMarketingLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 italic">
                      No marketing-uploaded leads match the search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards for Marketing Leads */}
          <div className="space-y-3 block md:hidden">
            {filteredMarketingLeads.map(lead => (
              <div key={lead.id} className="p-4 bg-gray-50 border border-gray-150 rounded-2xl space-y-3 text-left shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-black text-sm text-gray-900 leading-tight truncate">{lead.name}</h4>
                    <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{lead.companyName || 'Individual'}</p>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex-shrink-0",
                    lead.leadType === 'Hot' ? "bg-red-50 text-red-700 border-red-200" :
                    lead.leadType === 'Warm' ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-blue-50 text-blue-700 border-blue-200"
                  )}>
                    {lead.leadType || 'Warm'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <a href={`tel:${lead.number}`} className="flex items-center gap-1 text-brand-primary font-bold font-mono">
                      <Phone size={12} /> {lead.number}
                    </a>
                    <a
                      href={`https://wa.me/${lead.number.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 p-1 hover:bg-emerald-50 rounded"
                      title="WhatsApp"
                    >
                      <MessageCircle size={14} />
                    </a>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">By {lead.createdByName || 'Marketing'}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setQuickUpdateLead(lead);
                      setQuickUpdateStatus(lead.status || 'New');
                      setQuickUpdateNote('');
                    }}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all border-none cursor-pointer text-center"
                  >
                    ⚡ Update
                  </button>
                  <button
                    onClick={() => openFullEditModal(lead)}
                    className="flex-1 py-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white text-[10px] font-black rounded-xl uppercase tracking-wider transition-all border-none cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Edit size={11} /> Edit
                  </button>
                </div>
              </div>
            ))}
            {filteredMarketingLeads.length === 0 && (
              <div className="py-8 text-center text-gray-400 italic text-xs">
                No marketing leads found.
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'call_logs' ? (
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm text-left space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Your Call Log History</h3>
              <p className="text-xs text-gray-500">Every client note, discussion detail, and interaction you have recorded</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search call logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {allCallLogs
              .filter(log => 
                log.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.number.includes(searchTerm)
              )
              .map((log, idx) => (
                <div key={idx} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col md:flex-row md:items-start gap-4 transition-all hover:border-gray-250 animate-in fade-in">
                  <div className="flex-shrink-0 flex items-center md:flex-col items-start gap-2.5 md:w-40 min-w-0">
                    <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest bg-brand-primary/10 px-2 py-0.5 rounded-md">
                      {log.timestamp}
                    </span>
                    <div className="min-w-0">
                      <p className="font-black text-xs text-gray-900 truncate">{log.leadName}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{log.number}</p>
                    </div>
                  </div>
                  <div className="flex-1 text-xs text-gray-700 font-medium whitespace-pre-wrap leading-relaxed">
                    {log.note}
                  </div>
                </div>
              ))}

            {allCallLogs.length === 0 && (
              <div className="text-center py-12 text-gray-400 italic">
                No call logs recorded yet. Start by selecting an assigned lead or adding a call log.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fadeIn text-left">
          {(() => {
            const otLeads = leads.filter(l => {
              if (isOverallManager) {
                // Jim / Daniel: see all online leads AND any lead assigned to online-team or marketing agents
                const isOnlineLead = isOnlineTeam(l.createdBy) || l.isOnlineLead;
                const isAssignedToAnyAgent = !!(l.assignedTo?.trim());
                return isOnlineLead || isAssignedToAnyAgent;
              }

              // All non-admin marketing & online team staff: see leads created by them, assigned to them, OR unassigned online leads
              const isOwnLead =
                l.createdBy === user?.id ||
                l.createdBy === user?.uid ||
                (user?.name && l.createdByName && l.createdByName.toLowerCase() === user.name.toLowerCase());
              const isAssignedToMe = isLeadAssignedToUser(l, user);
              const isUnassignedOnline = !l.assignedTo?.trim() && (l.isOnlineLead || isOnlineTeam(l.createdBy));

              return isOwnLead || isAssignedToMe || isUnassignedOnline;
            });

            return (
              <>
                {!hideHeaderAndTabs && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    <div className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs flex flex-col gap-2 sm:gap-3 animate-fadeIn">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner animate-pulse-subtle">
                        <ClipboardList size={18} className="sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Online Leads</p>
                        <p className="text-lg sm:text-2xl font-black text-gray-900 mt-1">{otLeads.length}</p>
                      </div>
                    </div>

                    <div className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs flex flex-col gap-2 sm:gap-3 animate-fadeIn">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner animate-pulse-subtle">
                        <Phone size={18} className="sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Called / Followed Up</p>
                        <p className="text-lg sm:text-2xl font-black text-gray-900 mt-1">
                          {otLeads.filter(l => ['Called', 'Interested', 'Not Interested', 'Converted'].includes(l.status || '')).length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs flex flex-col gap-2 sm:gap-3 animate-fadeIn">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner animate-pulse-subtle">
                        <AlertCircle size={18} className="sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Interested (Hot)</p>
                        <p className="text-lg sm:text-2xl font-black text-gray-900 mt-1">
                          {otLeads.filter(l => l.status === 'Interested' || l.leadType === 'Hot').length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-3 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs flex flex-col gap-2 sm:gap-3 animate-fadeIn">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner animate-pulse-subtle">
                        <CheckCircle2 size={18} className="sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Converted Deals</p>
                        <p className="text-lg sm:text-2xl font-black text-gray-900 mt-1">
                          {otLeads.filter(l => l.status === 'Converted' || l.convertedValue > 0).length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Leads Registry ── */}
                <div className="space-y-4 animate-fadeIn">
                  {/* Header row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-lg font-black text-gray-900">Leads Registry &amp; Call Logs</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        Showing unassigned &amp; assigned leads in separate columns
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => setShowAddLeadFormInline(true)}
                        className="px-3.5 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 border-none cursor-pointer shadow-md transition-all active:scale-95 flex-shrink-0"
                      >
                        <Plus size={14} /> Add Lead
                      </button>
                      <div className="relative flex-1 sm:w-52 min-w-[150px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search leads..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Two-column layout */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                    {/* ── UNASSIGNED LEADS ── */}
                    {(() => {
                      const unassigned = otLeads.filter(l =>
                        !l.assignedTo?.trim() &&
                        (
                          l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (l.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.number.includes(searchTerm) ||
                          (l.createdByName || '').toLowerCase().includes(searchTerm.toLowerCase())
                        )
                      );
                      return (
                        <div className="bg-white rounded-[1.75rem] border-2 border-amber-200 shadow-sm overflow-hidden">
                          {/* Column header */}
                          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-amber-400/20 flex items-center justify-center">
                                <AlertCircle size={16} className="text-amber-600" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Pending Assignment</p>
                                <h4 className="text-sm font-black text-gray-900 leading-none mt-0.5">Unassigned Leads</h4>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-amber-400 text-white text-xs font-black rounded-full shadow-sm">
                              {unassigned.length}
                            </span>
                          </div>
                          <div className="overflow-x-hidden max-h-[480px] overflow-y-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-amber-50/60 text-amber-700/70 font-black uppercase tracking-widest text-[9px] border-b border-amber-100 sticky top-0">
                                <tr>
                                  <th className="px-3 py-3">Client</th>
                                  <th className="px-3 py-3">Phone</th>
                                  <th className="px-3 py-3 text-center">Status</th>
                                  <th className="px-3 py-3 text-center">Assign</th>
                                  <th className="px-3 py-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-50">
                                {unassigned.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="py-10 text-center">
                                      <div className="flex flex-col items-center gap-2 text-amber-400">
                                        <CheckCircle2 size={28} className="opacity-40" />
                                        <span className="text-xs font-bold text-gray-400 italic">All leads are assigned!</span>
                                      </div>
                                    </td>
                                  </tr>
                                ) : unassigned.map((lead) => {
                                  const logs = lead.description ? lead.description.split('\n\n') : [];
                                  const latestLog = logs.length > 0 ? logs[logs.length - 1] : lead.description || '—';
                                  return (
                                    <tr key={lead.id} className="hover:bg-amber-50/40 transition-colors group">
                                      <td className="px-3 py-3">
                                        <p className="font-black text-gray-900 leading-tight">{lead.name}</p>
                                        <p className="text-[10px] text-gray-400 font-medium truncate max-w-[100px]">{lead.companyName || '—'}</p>
                                      </td>
                                      <td className="px-3 py-3 font-mono text-gray-500 text-[11px]">
                                        <div className="flex items-center gap-1.5">
                                          <a href={`tel:${lead.number}`} className="hover:text-amber-600 transition-colors font-bold">{lead.number}</a>
                                          <a
                                            href={`https://wa.me/${lead.number.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-emerald-600 hover:text-emerald-700"
                                            title="WhatsApp"
                                          >
                                            <MessageCircle size={13} />
                                          </a>
                                        </div>
                                      </td>
                                      <td className="px-3 py-3 text-center">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                                          lead.status === 'Converted' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                          lead.status === 'Interested' ? "bg-red-50 text-red-700 border-red-200" :
                                          lead.status === 'Called' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                          "bg-amber-50 text-amber-700 border-amber-200"
                                        )}>
                                          {lead.status || 'New'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-3 text-center">
                                        {canAssign ? (
                                          <select
                                            value={lead.assignedTo || ''}
                                            onChange={async (e) => {
                                              const agentId = e.target.value;
                                              const targetAgents = assignableAgents;
                                              const agent = targetAgents.find((u: any) => u.id === agentId || u.uid === agentId);
                                              const agentName = agent ? agent.name : '';
                                              try {
                                                const res = await fetch(getApiUrl(`/api/leads/${lead.id}`), {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ assignedTo: agentId || null, assignedToName: agentName || null, isTaken: agentId ? true : false })
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                  await updateLead(lead.id, { assignedTo: agentId || undefined, assignedToName: agentName || undefined, isTaken: agentId ? true : false });
                                                  alert(`Lead assigned to ${agentName || 'unassigned'} successfully!`);
                                                }
                                              } catch (err) { console.error(err); alert('Failed to assign lead.'); }
                                            }}
                                            className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-400 text-amber-800 font-bold cursor-pointer max-w-[90px]"
                                          >
                                            <option value="">— Assign —</option>
                                            {assignableAgents.map((agent: any) => (
                                              <option key={agent.id || agent.uid} value={agent.id || agent.uid}>{agent.name}</option>
                                            ))}
                                          </select>
                                        ) : (
                                          <button
                                            onClick={async () => {
                                              try {
                                                const res = await fetch(getApiUrl(`/api/leads/${lead.id}`), {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({
                                                    assignedTo: user?.id || user?.uid,
                                                    assignedToName: user?.name,
                                                    isTaken: true
                                                  })
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                  await updateLead(lead.id, {
                                                    assignedTo: user?.id || user?.uid,
                                                    assignedToName: user?.name,
                                                    isTaken: true
                                                  });
                                                  alert('Lead claimed successfully!');
                                                }
                                              } catch (e) {
                                                console.error("Failed to claim lead:", e);
                                              }
                                            }}
                                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider border-none cursor-pointer shadow-xs transition-all active:scale-95"
                                          >
                                            Claim
                                          </button>
                                        )}
                                      </td>
                                      <td className="px-3 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            onClick={() => {
                                              setQuickUpdateLead(lead);
                                              setQuickUpdateStatus(lead.status || 'New');
                                              setQuickUpdateNote('');
                                            }}
                                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black rounded-lg uppercase tracking-wider transition-all border-none cursor-pointer"
                                            title="Quick Update"
                                          >
                                            Update
                                          </button>
                                          <button
                                            onClick={() => openFullEditModal(lead)}
                                            className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border-none cursor-pointer"
                                            title="Edit Lead"
                                          >
                                            <Edit size={12} />
                                          </button>
                                          {lead.description && (
                                            <button
                                              onClick={() => { setSelectedLeadForAdminLogs(lead); setShowAdminLogsModal(true); }}
                                              title={latestLog}
                                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 transition-all cursor-pointer"
                                            >
                                              <FileText size={12} />
                                            </button>
                                          )}
                                        </div>
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

                    {/* ── ASSIGNED LEADS ── */}
                    {(() => {
                      const assigned = otLeads.filter(l => {
                        if (!l.assignedTo?.trim()) return false;
                        if (!canAssign) {
                          // Regular marketing/staff users ONLY see leads assigned to their name
                          if (!isLeadAssignedToUser(l, user)) return false;
                        } else {
                          if (assignedAgentFilter === 'me') {
                            if (!isLeadAssignedToUser(l, user)) return false;
                          } else if (assignedAgentFilter !== 'all') {
                            const matchesFilter = l.assignedTo === assignedAgentFilter || l.assignedToName === assignedAgentFilter;
                            if (!matchesFilter) return false;
                          }
                        }
                        const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (l.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.number.includes(searchTerm) ||
                          (l.createdByName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (l.assignedToName || '').toLowerCase().includes(searchTerm.toLowerCase());
                        return matchesSearch;
                      });
                      return (
                        <div className="bg-white rounded-[1.75rem] border-2 border-emerald-200 shadow-sm overflow-hidden">
                          {/* Column header */}
                          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-emerald-400/20 flex items-center justify-center">
                                <CheckCircle2 size={16} className="text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">In Progress</p>
                                <h4 className="text-sm font-black text-gray-900 leading-none mt-0.5">Assigned Leads</h4>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={assignedAgentFilter}
                                onChange={(e) => setAssignedAgentFilter(e.target.value)}
                                className="bg-white border border-emerald-200 text-emerald-800 rounded-lg px-2.5 py-1 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer shadow-xs"
                              >
                                {canAssign && <option value="all">All Assigned Staff</option>}
                                <option value="me">Assigned to {user?.name || 'Me'}</option>
                                {canAssign && assignableAgents.map((agent: any) => (
                                  <option key={agent.id || agent.uid} value={agent.id || agent.uid}>
                                    {agent.name}
                                  </option>
                                ))}
                              </select>
                              <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-black rounded-full shadow-sm">
                                {assigned.length}
                              </span>
                            </div>
                          </div>
                          <div className="overflow-x-hidden max-h-[480px] overflow-y-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-emerald-50/60 text-emerald-700/70 font-black uppercase tracking-widest text-[9px] border-b border-emerald-100 sticky top-0">
                                <tr>
                                  <th className="px-3 py-3">Client</th>
                                  <th className="px-3 py-3">Phone</th>
                                  <th className="px-3 py-3 text-center">Status</th>
                                  <th className="px-3 py-3 text-center">Assigned To</th>
                                  <th className="px-3 py-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-emerald-50">
                                {assigned.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="py-10 text-center">
                                      <div className="flex flex-col items-center gap-2 text-emerald-400">
                                        <Users size={28} className="opacity-40" />
                                        <span className="text-xs font-bold text-gray-400 italic">No leads assigned yet.</span>
                                      </div>
                                    </td>
                                  </tr>
                                ) : assigned.map((lead) => {
                                  const logs = lead.description ? lead.description.split('\n\n') : [];
                                  const latestLog = logs.length > 0 ? logs[logs.length - 1] : lead.description || '—';
                                  return (
                                    <tr key={lead.id} className="hover:bg-emerald-50/40 transition-colors group">
                                      <td className="px-3 py-3">
                                        <p className="font-black text-gray-900 leading-tight">{lead.name}</p>
                                        <p className="text-[10px] text-gray-400 font-medium truncate max-w-[110px]">{lead.companyName || '—'}</p>
                                      </td>
                                      <td className="px-3 py-3 font-mono text-gray-500 text-[11px]">
                                        <div className="flex items-center gap-1.5">
                                          <a href={`tel:${lead.number}`} className="hover:text-emerald-600 transition-colors font-bold">{lead.number}</a>
                                          <a
                                            href={`https://wa.me/${lead.number.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-emerald-600 hover:text-emerald-700"
                                            title="WhatsApp"
                                          >
                                            <MessageCircle size={13} />
                                          </a>
                                        </div>
                                      </td>
                                      <td className="px-3 py-3 text-center">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                                          lead.status === 'Converted' ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                                          lead.status === 'Interested' ? "bg-red-50 text-red-700 border-red-200" :
                                          lead.status === 'Called' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                          "bg-amber-50 text-amber-700 border-amber-200"
                                        )}>
                                          {lead.status || 'New'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-3 text-center">
                                        {canAssign ? (
                                          <select
                                            value={lead.assignedTo || ''}
                                            onChange={async (e) => {
                                              const agentId = e.target.value;
                                              const targetAgents = assignableAgents;
                                              const agent = targetAgents.find((u: any) => u.id === agentId || u.uid === agentId);
                                              const agentName = agent ? agent.name : '';
                                              try {
                                                const res = await fetch(getApiUrl(`/api/leads/${lead.id}`), {
                                                  method: 'PATCH',
                                                  headers: { 'Content-Type': 'application/json' },
                                                  body: JSON.stringify({ assignedTo: agentId || null, assignedToName: agentName || null, isTaken: agentId ? true : false })
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                  await updateLead(lead.id, { assignedTo: agentId || undefined, assignedToName: agentName || undefined, isTaken: agentId ? true : false });
                                                  alert(`Lead ${agentName ? `reassigned to ${agentName}` : 'unassigned'} successfully!`);
                                                }
                                              } catch (err) { console.error(err); alert('Failed to update assignment.'); }
                                            }}
                                            className="bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400 text-emerald-800 font-bold cursor-pointer max-w-[90px]"
                                          >
                                            <option value="">— Unassign —</option>
                                            {assignableAgents.map((agent: any) => (
                                              <option key={agent.id || agent.uid} value={agent.id || agent.uid}>{agent.name}</option>
                                            ))}
                                          </select>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-black uppercase border border-emerald-200">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            {lead.assignedToName}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          {/* Quick Update Button */}
                                          <button
                                            onClick={() => {
                                              setQuickUpdateLead(lead);
                                              setQuickUpdateStatus(lead.status || 'New');
                                              setQuickUpdateNote('');
                                            }}
                                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black rounded-lg border-none cursor-pointer transition-all uppercase tracking-wider shadow-sm active:scale-95"
                                            title="Update Status & Note"
                                          >
                                            Update
                                          </button>
                                          {/* Full Edit Button */}
                                          <button
                                            onClick={() => openFullEditModal(lead)}
                                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border-none cursor-pointer"
                                            title="Edit Lead Details"
                                          >
                                            <Edit size={13} />
                                          </button>
                                          {/* Call Logs button */}
                                          {lead.description && (
                                            <button
                                              onClick={() => { setSelectedLeadForAdminLogs(lead); setShowAdminLogsModal(true); }}
                                              title={latestLog}
                                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 transition-all cursor-pointer"
                                            >
                                              <FileText size={13} />
                                            </button>
                                          )}
                                        </div>
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
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ── Mobile App Compact Quick Update Status Modal ── */}
      {quickUpdateLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-[2.25rem] sm:rounded-[2.25rem] shadow-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col border border-gray-150 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 overflow-hidden text-left">
            {/* Mobile swipe/grab pill */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-2.5 sm:hidden flex-shrink-0" />

            {/* Modal header with quick contact actions */}
            <div className="px-5 pt-3 pb-4 border-b border-gray-100 flex items-start justify-between gap-3 bg-gradient-to-b from-gray-50/70 to-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-wider rounded-md border border-emerald-200">
                    Quick Update
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                    quickUpdateLead.status === 'Interested' ? "bg-green-50 text-green-700 border-green-200" :
                    quickUpdateLead.status === 'Called' ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                    quickUpdateLead.status === 'Converted' ? "bg-emerald-100 text-emerald-800 border-emerald-300" :
                    quickUpdateLead.status === 'Not Interested' ? "bg-red-50 text-red-700 border-red-200" :
                    "bg-amber-50 text-amber-700 border-amber-200"
                  )}>
                    {quickUpdateLead.status || 'New'}
                  </span>
                </div>
                <h3 className="text-base font-black text-gray-900 truncate leading-tight">{quickUpdateLead.name}</h3>
                <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{quickUpdateLead.companyName || 'Individual'}</p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <a
                  href={`tel:${quickUpdateLead.number}`}
                  className="w-8 h-8 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 flex items-center justify-center transition-all shadow-xs"
                  title="Call Customer"
                >
                  <Phone size={14} />
                </a>
                <a
                  href={`https://wa.me/${quickUpdateLead.number.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-all shadow-xs"
                  title="WhatsApp Message"
                >
                  <MessageCircle size={14} />
                </a>
                <button
                  onClick={() => setQuickUpdateLead(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleQuickUpdateStatus} className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              {/* 1-Tap Status Selector Grid */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  Select Lead Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'New', label: '🟡 New', color: 'hover:border-amber-400 hover:bg-amber-50', active: 'bg-amber-50 text-amber-800 border-amber-400 ring-2 ring-amber-200 font-black' },
                    { val: 'Called', label: '📞 Called', color: 'hover:border-indigo-400 hover:bg-indigo-50', active: 'bg-indigo-50 text-indigo-800 border-indigo-400 ring-2 ring-indigo-200 font-black' },
                    { val: 'Interested', label: '🔥 Hot / Interested', color: 'hover:border-red-400 hover:bg-red-50', active: 'bg-red-50 text-red-800 border-red-400 ring-2 ring-red-200 font-black' },
                    { val: 'Follow Up', label: '🔄 Follow Up', color: 'hover:border-blue-400 hover:bg-blue-50', active: 'bg-blue-50 text-blue-800 border-blue-400 ring-2 ring-blue-200 font-black' },
                    { val: 'Not Interested', label: '❌ Not Interested', color: 'hover:border-gray-400 hover:bg-gray-100', active: 'bg-gray-100 text-gray-800 border-gray-400 ring-2 ring-gray-200 font-black' },
                    { val: 'Converted', label: '✅ Converted', color: 'hover:border-emerald-400 hover:bg-emerald-50', active: 'bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-200 font-black' },
                  ].map(s => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setQuickUpdateStatus(s.val)}
                      className={cn(
                        "py-2 px-2 text-xs font-bold rounded-xl border transition-all text-center border-gray-200 cursor-pointer bg-white",
                        s.color,
                        quickUpdateStatus === s.val ? s.active : "text-gray-700"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  Quick Note Templates
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Spoke with client",
                    "Call back tomorrow",
                    "Interested in bulk quote",
                    "Budget discussion ongoing",
                    "Wrong number / No answer",
                    "Ready for invoice"
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuickUpdateNote(prev => prev ? `${prev} - ${chip}` : chip);
                      }}
                      className="px-2.5 py-1 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 text-gray-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  Call Notes &amp; Discussion
                </label>
                <textarea
                  value={quickUpdateNote}
                  onChange={(e) => setQuickUpdateNote(e.target.value)}
                  placeholder="Enter details of your phone call..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 resize-none transition-all placeholder:text-gray-400 leading-relaxed"
                />
              </div>

              {/* Switch to Full Edit Link */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const leadToEdit = quickUpdateLead;
                    setQuickUpdateLead(null);
                    openFullEditModal(leadToEdit);
                  }}
                  className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-brand-primary rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-dashed border-gray-300 cursor-pointer transition-colors"
                >
                  <Edit size={13} /> Edit Full Lead Details (Name, Phone, Assignee) →
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickUpdateLead(null)}
                  className="w-1/3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isQuickSaving}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all border-none cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20"
                >
                  {isQuickSaving ? 'Saving…' : 'Save Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Mobile App Compact Full Edit Lead Modal ── */}
      {fullEditLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-[2.25rem] sm:rounded-[2.25rem] shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col border border-gray-150 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 overflow-hidden text-left">
            {/* Mobile swipe/grab pill */}
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-2.5 sm:hidden flex-shrink-0" />

            {/* Modal Header */}
            <div className="px-5 pt-3 pb-4 border-b border-gray-100 flex items-start justify-between gap-3 bg-gradient-to-b from-gray-50/70 to-white">
              <div className="min-w-0">
                <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[9px] font-black uppercase tracking-wider rounded-md border border-brand-primary/20 block w-fit mb-1">
                  Edit Lead Details
                </span>
                <h3 className="text-lg font-black text-gray-900 truncate leading-tight">{editName || 'Edit Lead'}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{editNumber || 'No phone'}</p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {editNumber && (
                  <>
                    <a
                      href={`tel:${editNumber}`}
                      className="w-8 h-8 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 flex items-center justify-center transition-all shadow-xs"
                      title="Call Customer"
                    >
                      <Phone size={14} />
                    </a>
                    <a
                      href={`https://wa.me/${editNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-all shadow-xs"
                      title="WhatsApp Message"
                    >
                      <MessageCircle size={14} />
                    </a>
                  </>
                )}
                <button
                  onClick={() => setFullEditLead(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors border-none bg-transparent cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveFullEdit} className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Client Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Client Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  />
                </div>

                {/* Company Name / Requirement */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Company / Requirement</label>
                  <input
                    type="text"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    placeholder="e.g. Sports Club / 50 Jerseys"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  />
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">City / Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Chennai, Tamil Nadu"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  />
                </div>
              </div>

              {/* Lead Warmth / Type Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Lead Type / Interest Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'Hot', label: '🔥 Hot (High Priority)', active: 'bg-red-50 text-red-800 border-red-400 ring-2 ring-red-200 font-black' },
                    { val: 'Warm', label: '⚡ Warm (Moderate)', active: 'bg-amber-50 text-amber-800 border-amber-400 ring-2 ring-amber-200 font-black' },
                    { val: 'Cold', label: '❄️ Cold (Prospect)', active: 'bg-blue-50 text-blue-800 border-blue-400 ring-2 ring-blue-200 font-black' },
                  ].map(t => (
                    <button
                      key={t.val}
                      type="button"
                      onClick={() => setEditLeadType(t.val as any)}
                      className={cn(
                        "py-2 px-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer bg-white",
                        editLeadType === t.val ? t.active : "text-gray-600 border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead Status Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Workflow Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'New', label: '🟡 New', active: 'bg-amber-50 text-amber-800 border-amber-400 ring-2 ring-amber-200 font-black' },
                    { val: 'Called', label: '📞 Called', active: 'bg-indigo-50 text-indigo-800 border-indigo-400 ring-2 ring-indigo-200 font-black' },
                    { val: 'Interested', label: '🔥 Interested', active: 'bg-red-50 text-red-800 border-red-400 ring-2 ring-red-200 font-black' },
                    { val: 'Follow Up', label: '🔄 Follow Up', active: 'bg-blue-50 text-blue-800 border-blue-400 ring-2 ring-blue-200 font-black' },
                    { val: 'Not Interested', label: '❌ Not Interested', active: 'bg-gray-100 text-gray-800 border-gray-400 ring-2 ring-gray-200 font-black' },
                    { val: 'Converted', label: '✅ Converted', active: 'bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-200 font-black' },
                  ].map(s => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setEditFullStatus(s.val)}
                      className={cn(
                        "py-2 px-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer bg-white",
                        editFullStatus === s.val ? s.active : "text-gray-600 border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assignee Selection (if manager or can assign) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Assigned Executive / Agent</label>
                {canAssign ? (
                  <select
                    value={editAssignedTo}
                    onChange={(e) => {
                      const id = e.target.value;
                      setEditAssignedTo(id);
                      const agent = assignableAgents.find((a: any) => (a.id || a.uid) === id);
                      setEditAssignedToName(agent ? agent.name : '');
                    }}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
                  >
                    <option value="">— Unassigned Pool —</option>
                    {assignableAgents.map((agent: any) => (
                      <option key={agent.id || agent.uid} value={agent.id || agent.uid}>
                        {agent.name} ({agent.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 flex items-center gap-2">
                    <UserCheck size={14} className="text-emerald-600" />
                    <span>{fullEditLead.assignedToName || 'Unassigned'}</span>
                  </div>
                )}
              </div>

              {/* Add New Call Record */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Add New Call Note (Optional)</label>
                <textarea
                  value={editFullNote}
                  onChange={(e) => setEditFullNote(e.target.value)}
                  placeholder="e.g. Spoke with client — confirmed order requirements. Ready for invoice."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 resize-none transition-all placeholder:text-gray-400 leading-relaxed"
                />
              </div>

              {/* Past Call History */}
              {fullEditLead.description && (
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Previous Call History</label>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 max-h-32 overflow-y-auto text-[11px] font-medium text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {fullEditLead.description}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 sticky bottom-0 bg-white py-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setFullEditLead(null)}
                  className="w-1/3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFullSaving}
                  className="flex-1 py-2.5 bg-brand-primary hover:bg-brand-primary/95 disabled:bg-brand-primary/50 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all border-none cursor-pointer active:scale-95 shadow-md shadow-brand-primary/20"
                >
                  {isFullSaving ? 'Saving Changes…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lead Inline Modal Form (Mobile App Compact Model) */}
      {showAddLeadFormInline && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-[2.25rem] sm:rounded-[2.25rem] shadow-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col border border-gray-150 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 overflow-hidden text-left">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-2.5 sm:hidden flex-shrink-0" />
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest block mb-0.5">Register New Prospect</span>
                <h3 className="text-lg font-black text-gray-900">Add Lead</h3>
              </div>
              <button
                onClick={() => {
                  setShowAddLeadFormInline(false);
                  setNewLeadName('');
                  setNewLeadPhone('');
                  setNewLeadLocation('');
                  setNewLeadType('Warm');
                }}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleAddNewLeadInline} className="p-6 space-y-4 text-left overflow-y-auto flex-1">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9999999999"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 font-mono font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Location / City</label>
                <input
                  type="text"
                  placeholder="e.g. New Delhi, India"
                  value={newLeadLocation}
                  onChange={(e) => setNewLeadLocation(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Lead Type</label>
                <select
                  value={newLeadType}
                  onChange={(e) => setNewLeadType(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
                >
                  <option value="Hot">🔥 Hot (High Interest)</option>
                  <option value="Warm">⚡ Warm (Moderate Interest)</option>
                  <option value="Cold">❄️ Cold (Prospect)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddLeadFormInline(false);
                    setNewLeadName('');
                    setNewLeadPhone('');
                    setNewLeadLocation('');
                    setNewLeadType('Warm');
                  }}
                  className="w-1/3 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer bg-transparent uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewLead}
                  className="flex-1 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-md"
                >
                  {isSubmittingNewLead ? 'Submitting...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Online Leads Call Logs Detail Modal (Mobile App Compact Model) */}
      {showAdminLogsModal && selectedLeadForAdminLogs && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-[2.25rem] sm:rounded-[2.25rem] shadow-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col border border-gray-150 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 overflow-hidden text-left">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-2.5 sm:hidden flex-shrink-0" />
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest block mb-0.5">Call Log History</span>
                <h3 className="text-lg font-black text-gray-900">{selectedLeadForAdminLogs.name}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{selectedLeadForAdminLogs.number}</p>
              </div>
              <button
                onClick={() => {
                  setShowAdminLogsModal(false);
                  setSelectedLeadForAdminLogs(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto flex-1">
              {selectedLeadForAdminLogs.description ? (
                <div className="space-y-4">
                  {selectedLeadForAdminLogs.description.split('\n\n').map((entry, idx) => (
                    <div key={idx} className="p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-semibold text-gray-700 whitespace-pre-wrap leading-relaxed shadow-xs">
                      {entry}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic text-center py-6">No call logs recorded yet.</p>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  const leadToEdit = selectedLeadForAdminLogs;
                  setShowAdminLogsModal(false);
                  setSelectedLeadForAdminLogs(null);
                  openFullEditModal(leadToEdit);
                }}
                className="px-4 py-2 bg-white text-brand-primary border border-brand-primary/20 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-brand-primary/5 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Edit size={12} /> Edit Lead
              </button>
              <button
                onClick={() => {
                  setShowAdminLogsModal(false);
                  setSelectedLeadForAdminLogs(null);
                }}
                className="px-5 py-2 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary/95 transition-all cursor-pointer border-none shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Call Log Modal Form (Mobile App Compact Model) */}
      {isAddLogOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-[2.25rem] sm:rounded-[2.25rem] shadow-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col border border-gray-150 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 overflow-hidden text-left">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto my-2.5 sm:hidden flex-shrink-0" />
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest block mb-0.5">Record Client Interaction</span>
                <h3 className="text-lg font-black text-gray-900">Add Call Log</h3>
              </div>
              <button
                onClick={() => {
                  setIsAddLogOpen(false);
                  resetAddLogForm();
                }}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors border-none bg-transparent cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleAddCallLog} className="p-6 space-y-4 text-left overflow-y-auto flex-1">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Client Name *</label>
                <input
                  type="text"
                  required
                  value={addLogName}
                  onChange={(e) => setAddLogName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={addLogPhone}
                  onChange={(e) => setAddLogPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 font-mono text-gray-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Requirement / Company Name</label>
                <input
                  type="text"
                  value={addLogRequirement}
                  onChange={(e) => setAddLogRequirement(e.target.value)}
                  placeholder="e.g. 50 Customized Hoodies"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Call Notes / Discussion Details</label>
                <textarea
                  rows={4}
                  value={addLogNotes}
                  onChange={(e) => setAddLogNotes(e.target.value)}
                  placeholder="Enter details of conversation..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 font-medium text-gray-800 resize-none"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddLogOpen(false);
                    resetAddLogForm();
                  }}
                  className="w-1/3 py-2.5 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer bg-transparent uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingLog}
                  className="flex-1 py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-md"
                >
                  {isAddingLog ? 'Submitting...' : 'Save Call log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
