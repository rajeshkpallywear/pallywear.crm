import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle2, Clock, Search, Save, ClipboardList, AlertCircle, Plus, FileText, RefreshCw, Users, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { getApiUrl } from '../lib/apiConfig';
import { useLeads } from '../context/LeadContext';
import { useAuth } from '../context/AuthContext';



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

export default function OnlineTeamDashboard({ user, defaultTab = 'active_leads', hideHeaderAndTabs = false }: { user: any; defaultTab?: 'active_leads' | 'assign_leads' | 'marketing_leads' | 'call_logs' | 'all_online_leads'; hideHeaderAndTabs?: boolean }) {
  const { leads, updateLead, addLead } = useLeads();
  const { registeredUsers } = useAuth();
  const onlineTeamAgents = React.useMemo(() => {
    return registeredUsers?.filter((u: any) => u.role === 'onlineteam' || u.role === 'UserRole.ONLINETEAM') || [];
  }, [registeredUsers]);
  const marketingAgents = React.useMemo(() => {
    return registeredUsers?.filter((u: any) => u.role === 'marketing' || u.role === 'UserRole.MARKETING') || [];
  }, [registeredUsers]);
  const [activeTab, setActiveTab] = useState<'active_leads' | 'assign_leads' | 'marketing_leads' | 'call_logs' | 'all_online_leads'>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdminLogsModal, setShowAdminLogsModal] = useState(false);
  const [selectedLeadForAdminLogs, setSelectedLeadForAdminLogs] = useState<Lead | null>(null);
  
  // Lead logs state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState('New');
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick Update Status modal (Assigned Leads column)
  const [quickUpdateLead, setQuickUpdateLead] = useState<Lead | null>(null);
  const [quickUpdateStatus, setQuickUpdateStatus] = useState('New');
  const [quickUpdateNote, setQuickUpdateNote] = useState('');
  const [isQuickSaving, setIsQuickSaving] = useState(false);

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
    if (user?.role === 'admin' || user?.email === 'daniel.smpallywear@gmail.com') return filteredLeads;
    if (user?.role === 'onlineteam') {
      return filteredLeads.filter(l => 
        l.assignedTo === user?.id || 
        l.assignedTo === user?.uid || 
        l.assignedTo === user?.email ||
        l.createdBy === user?.id ||
        l.createdBy === user?.uid
      );
    }
    return filteredLeads;
  }, [leads, user]);

  const filteredAssignedLeads = assignedLeads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (l.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.number.includes(searchTerm);
    return matchesSearch;
  });

  // Filter leads created by Marketing (non-Online Team creators)
  const marketingLeads = React.useMemo(() => {
    return leads.filter(l => {
      const isCreatorOnlineTeam = registeredUsers?.some(
        u => u.id === l.createdBy && (u.role === 'onlineteam' || u.role === 'UserRole.ONLINETEAM')
      );
      return !isCreatorOnlineTeam;
    });
  }, [leads, registeredUsers]);

  const filteredMarketingLeads = marketingLeads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (l.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.number.includes(searchTerm);
    return matchesSearch;
  });

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

  const filteredUnassignedLeads = unassignedLeads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (l.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.number.includes(searchTerm);
    return matchesSearch;
  });

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

              <div className="overflow-x-auto">
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
                          <a href={`tel:${lead.number}`} className="hover:underline text-brand-primary font-bold">
                            {lead.number}
                          </a>
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
                          <button
                            onClick={() => {
                              setEditingLead(lead);
                              setEditStatus(lead.status || 'New');
                              setNewNote('');
                            }}
                            className="px-3 py-1 bg-brand-primary text-white text-[10px] font-black rounded-lg uppercase tracking-wider hover:bg-brand-secondary hover:text-brand-primary transition-all border-none cursor-pointer"
                          >
                            Update Status
                          </button>
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
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm text-left">
              {editingLead ? (
                <form onSubmit={handleUpdateStatus} className="space-y-4">
                  <div className="border-b border-gray-50 pb-3">
                    <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest font-bold">Call Workspace</span>
                    <h4 className="text-base font-black text-gray-900 uppercase mt-0.5">{editingLead.name}</h4>
                    <a href={`tel:${editingLead.number}`} className="text-xs text-brand-primary font-bold hover:underline font-mono">
                      {editingLead.number}
                    </a>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Lead call Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-155 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    >
                      <option value="New">New / Uncalled</option>
                      <option value="Called">Called / Follow Up</option>
                      <option value="Interested">Interested / Hot</option>
                      <option value="Not Interested">Not Interested</option>
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

          <div className="overflow-x-auto">
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
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{lead.number}</td>
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
                        className="px-3 py-1 bg-brand-primary text-white text-[10px] font-black rounded-lg uppercase tracking-wider hover:bg-brand-secondary hover:text-brand-primary transition-all border-none cursor-pointer"
                      >
                        Claim Lead
                      </button>
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

          <div className="overflow-x-auto">
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
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">{lead.number}</td>
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
                      <button
                        onClick={async () => {
                          if (!lead.assignedTo) {
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
                              }
                            } catch (e) {
                              console.error("Failed to assign lead:", e);
                            }
                          }
                          setActiveTab('assign_leads');
                          setEditingLead(lead);
                          setEditStatus(lead.status || 'New');
                          setNewNote('');
                        }}
                        className="px-3 py-1 bg-brand-primary text-white text-[10px] font-black rounded-lg uppercase tracking-wider hover:bg-brand-secondary hover:text-brand-primary transition-all border-none cursor-pointer"
                      >
                        Update Status
                      </button>
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
            const isPriyaOrNirmala = user?.email === 'priyapallywear@gmail.com' || user?.email === 'nirmalapallywear@gmail.com';

            const otLeads = leads.filter(l => {
              const isOverallManager = user?.role === 'admin' || user?.email === 'daniel.smpallywear@gmail.com';
              if (isOverallManager) {
                // Jim / Daniel: see all online leads AND any lead assigned to online-team or marketing agents
                const isOnlineLead = isOnlineTeam(l.createdBy) || l.isOnlineLead;
                const isAssignedToAnyAgent = !!(l.assignedTo?.trim());
                return isOnlineLead || isAssignedToAnyAgent;
              }

              // Priya & Nirmala: see their own created leads + leads assigned TO them by Jim
              if (isPriyaOrNirmala) {
                const isOwnLead =
                  l.createdBy === user?.id ||
                  l.createdBy === user?.uid ||
                  l.createdByName === user?.name;
                const myNameLower = (user?.name || '').toLowerCase();
                const assignedNameLower = (l.assignedToName || '').toLowerCase();
                const isAssignedToMe =
                  (user?.id && l.assignedTo === user?.id) ||
                  (user?.uid && l.assignedTo === user?.uid) ||
                  (myNameLower && assignedNameLower === myNameLower);
                return isOwnLead || isAssignedToMe;
              }

              // All other online team users: see only their own online leads
              const matchesBase = isOnlineTeam(l.createdBy) || l.isOnlineLead;
              if (!matchesBase) return false;
              return l.createdBy === user?.id || l.createdBy === user?.uid;
            });
            const isManager = user?.email === 'daniel.smpallywear@gmail.com';
            const isJim = user?.email === 'jimpallywear@gmail.com';
            const canAssign = user?.role === 'admin' || isManager || isJim;

            // Removed manager-only registration card overlay to display the registry dashboard to regular online team members

            return (
              <>
                {!hideHeaderAndTabs && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 animate-fadeIn">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner animate-pulse-subtle">
                        <ClipboardList size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Online Leads</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">{otLeads.length}</p>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 animate-fadeIn">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner animate-pulse-subtle">
                        <Phone size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Called / Followed Up</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">
                          {otLeads.filter(l => ['Called', 'Interested', 'Not Interested', 'Converted'].includes(l.status || '')).length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 animate-fadeIn">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-inner animate-pulse-subtle">
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Interested (Hot)</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">
                          {otLeads.filter(l => l.status === 'Interested' || l.leadType === 'Hot').length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 animate-fadeIn">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner animate-pulse-subtle">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Converted Deals</p>
                        <p className="text-2xl font-black text-gray-900 mt-1">
                          {otLeads.filter(l => l.status === 'Converted' || l.convertedValue > 0).length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Leads Registry: Split Unassigned / Assigned ── */}
                <div className="space-y-4 animate-fadeIn">
                  {/* Header row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-lg font-black text-gray-900">Leads Registry &amp; Call Logs</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Showing unassigned &amp; assigned leads in separate columns</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowAddLeadFormInline(true)}
                        className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border-none cursor-pointer shadow-md transition-all active:scale-95"
                      >
                        <Plus size={14} /> Add Lead
                      </button>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search leads..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-52 bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
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
                                  <th className="px-4 py-3">Agent</th>
                                  <th className="px-4 py-3">Client Name</th>
                                  <th className="px-4 py-3">Phone</th>
                                  <th className="px-4 py-3">Company</th>
                                  <th className="px-4 py-3 text-center">Status</th>
                                  <th className="px-4 py-3 text-center">Assign To</th>
                                  <th className="px-4 py-3 text-right">Logs</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-50">
                                {unassigned.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="py-10 text-center">
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
                                      <td className="px-4 py-3 font-bold text-gray-600 text-[11px]">{lead.createdByName || 'System'}</td>
                                      <td className="px-4 py-3 font-black text-gray-900">{lead.name}</td>
                                      <td className="px-4 py-3 font-mono text-gray-500 text-[11px]">
                                        <a href={`tel:${lead.number}`} className="hover:text-amber-600 transition-colors">{lead.number}</a>
                                      </td>
                                      <td className="px-4 py-3 text-gray-400 font-medium truncate max-w-[100px]">{lead.companyName || '—'}</td>
                                      <td className="px-4 py-3 text-center">
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
                                      <td className="px-4 py-3 text-center">
                                        {canAssign ? (
                                          <select
                                            value={lead.assignedTo || ''}
                                            onChange={async (e) => {
                                              const agentId = e.target.value;
                                              const targetAgents = isJim ? onlineTeamAgents : marketingAgents;
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
                                            className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400 text-amber-800 font-bold cursor-pointer"
                                          >
                                            <option value="">— Assign —</option>
                                            {(isJim ? onlineTeamAgents : marketingAgents).map((agent: any) => (
                                              <option key={agent.id || agent.uid} value={agent.id || agent.uid}>{agent.name}</option>
                                            ))}
                                          </select>
                                        ) : (
                                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase border border-amber-200">Unassigned</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        {lead.description && (
                                          <button
                                            onClick={() => { setSelectedLeadForAdminLogs(lead); setShowAdminLogsModal(true); }}
                                            title={latestLog}
                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 transition-all cursor-pointer ml-auto"
                                          >
                                            <FileText size={13} />
                                          </button>
                                        )}
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
                      const assigned = otLeads.filter(l =>
                        !!(l.assignedTo?.trim()) &&
                        (
                          l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (l.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.number.includes(searchTerm) ||
                          (l.createdByName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (l.assignedToName || '').toLowerCase().includes(searchTerm.toLowerCase())
                        )
                      );
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
                            <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-black rounded-full shadow-sm">
                              {assigned.length}
                            </span>
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
                                        <a href={`tel:${lead.number}`} className="hover:text-emerald-600 transition-colors">{lead.number}</a>
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
                                              const targetAgents = isJim ? onlineTeamAgents : marketingAgents;
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
                                            {(isJim ? onlineTeamAgents : marketingAgents).map((agent: any) => (
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
                                        <div className="flex items-center justify-end gap-1.5">
                                          {/* Update Status button */}
                                          <button
                                            onClick={() => {
                                              setQuickUpdateLead(lead);
                                              setQuickUpdateStatus(lead.status || 'New');
                                              setQuickUpdateNote('');
                                            }}
                                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black rounded-lg border-none cursor-pointer transition-all uppercase tracking-wider shadow-sm active:scale-95"
                                            title="Update Status & Add Note"
                                          >
                                            Update
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

      {/* ── Quick Update Status Modal ── */}
      {quickUpdateLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm border border-gray-100 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-0.5">Assigned Lead</span>
                <h3 className="text-base font-black text-gray-900 leading-tight">{quickUpdateLead.name}</h3>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">{quickUpdateLead.number}{quickUpdateLead.companyName ? ` · ${quickUpdateLead.companyName}` : ''}</p>
              </div>
              <button
                onClick={() => setQuickUpdateLead(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors border-none bg-transparent cursor-pointer flex-shrink-0 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleQuickUpdateStatus} className="px-6 py-5 space-y-4">
              {/* Status selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Update Status</label>
                <select
                  value={quickUpdateStatus}
                  onChange={(e) => setQuickUpdateStatus(e.target.value)}
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 cursor-pointer"
                >
                  <option value="New">🟡 New</option>
                  <option value="Called">📞 Called</option>
                  <option value="Interested">🔥 Interested</option>
                  <option value="Not Interested">❌ Not Interested</option>
                  <option value="Follow Up">🔄 Follow Up</option>
                  <option value="Converted">✅ Converted</option>
                </select>
              </div>

              {/* Notes textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Add Note (optional)</label>
                <textarea
                  value={quickUpdateNote}
                  onChange={(e) => setQuickUpdateNote(e.target.value)}
                  placeholder="e.g. Called — interested in jersey order of 50 pcs..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium text-gray-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-200 resize-none transition-all placeholder:text-gray-300"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isQuickSaving}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-black rounded-xl text-sm transition-all border-none cursor-pointer active:scale-95 shadow-md shadow-emerald-200"
                >
                  {isQuickSaving ? 'Saving…' : 'Save Update'}
                </button>
                <button
                  type="button"
                  onClick={() => setQuickUpdateLead(null)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-all border-none cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lead Inline Modal Form */}
      {showAddLeadFormInline && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
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
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors border-none cursor-pointer bg-transparent"
              >
                <Plus className="w-5 h-5 rotate-45 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddNewLeadInline} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Kumar"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
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
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Location</label>
                <input
                  type="text"
                  placeholder="e.g. New Delhi, India"
                  value={newLeadLocation}
                  onChange={(e) => setNewLeadLocation(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Lead Type</label>
                <select
                  value={newLeadType}
                  onChange={(e) => setNewLeadType(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="Hot">🔥 Hot (High Interest)</option>
                  <option value="Warm">⚡ Warm (Moderate Interest)</option>
                  <option value="Cold">❄️ Cold (Prospect)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddLeadFormInline(false);
                    setNewLeadName('');
                    setNewLeadPhone('');
                    setNewLeadLocation('');
                    setNewLeadType('Warm');
                  }}
                  className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer bg-transparent uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewLead}
                  className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-md"
                >
                  {isSubmittingNewLead ? 'Submitting...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daniel's Online Leads Call Logs Detail Modal */}
      {showAdminLogsModal && selectedLeadForAdminLogs && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-150 animate-in fade-in zoom-in-95 duration-200 text-left">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
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
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors border-none cursor-pointer bg-transparent"
              >
                <Plus className="w-5 h-5 rotate-45 text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
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

            <div className="p-6 bg-gray-50 flex justify-end">
              <button
                onClick={() => {
                  setShowAdminLogsModal(false);
                  setSelectedLeadForAdminLogs(null);
                }}
                className="px-6 py-2.5 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary/95 transition-all cursor-pointer border-none shadow-md"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Call Log Modal Form */}
      {isAddLogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black text-brand-primary uppercase tracking-widest block mb-0.5">Record New Client Interaction</span>
                <h3 className="text-lg font-black text-gray-900">Add Call Log</h3>
              </div>
              <button
                onClick={() => {
                  setIsAddLogOpen(false);
                  resetAddLogForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus className="w-5 h-5 rotate-45 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddCallLog} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Client Name *</label>
                <input
                  type="text"
                  required
                  value={addLogName}
                  onChange={(e) => setAddLogName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-bold text-gray-800"
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
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-mono text-gray-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Requirement / Company Name</label>
                <input
                  type="text"
                  value={addLogRequirement}
                  onChange={(e) => setAddLogRequirement(e.target.value)}
                  placeholder="e.g. 50 Customized Hoodies"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Call Notes / Discussion Details</label>
                <textarea
                  rows={4}
                  value={addLogNotes}
                  onChange={(e) => setAddLogNotes(e.target.value)}
                  placeholder="Enter details of conversation..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary font-medium text-gray-800"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddLogOpen(false);
                    resetAddLogForm();
                  }}
                  className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer bg-transparent uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingLog}
                  className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-md"
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
