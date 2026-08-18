import React, { useState, useEffect } from 'react';
import { Phone, CheckCircle2, Clock, Search, Save, ClipboardList, AlertCircle, Plus, FileText, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { getApiUrl } from '../lib/apiConfig';
import { useLeads } from '../context/LeadContext';
import { useAuth } from '../context/AuthContext';

// Import subcomponents for hidden modal triggers
import LeadManager from './LeadManager';
import MarketingDashboard from './MarketingDashboard';
import InvoiceManager from './InvoiceManager';

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

export default function OnlineTeamDashboard({ user }: { user: any }) {
  const { leads, orders, inventory, addOrder, updateOrder, deleteOrder, addLead, updateLead } = useLeads();
  const { registeredUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'assign_leads' | 'marketing_leads'>('assign_leads');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Lead logs state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState('New');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter leads assigned to the logged-in Online Team member
  // Daniel and Admin can view all leads in the assignment dashboard
  const assignedLeads = React.useMemo(() => {
    if (user?.role === 'admin' || user?.email === 'daniel.smpallywear@gmail.com') return leads;
    if (user?.role === 'onlineteam') {
      return leads.filter(l => 
        l.assignedTo === user?.id || 
        l.assignedTo === user?.uid || 
        l.assignedTo === user?.email ||
        l.createdBy === user?.id ||
        l.createdBy === user?.uid
      );
    }
    return leads;
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

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    setIsSaving(true);
    try {
      const res = await fetch(getApiUrl(`/api/leads/${editingLead.id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          description: editNotes
        })
      });
      const data = await res.json();
      if (data.success) {
        await updateLead(editingLead.id, { status: editStatus, description: editNotes });
        setEditingLead(null);
      } else {
        alert('Failed to update lead');
      }
    } catch (e) {
      alert('Error updating lead');
    } finally {
      setIsSaving(false);
    }
  };

  // Excel Lead Parser removed

  // Triggers for hidden modals
  const triggerCreateLead = () => {
    window.dispatchEvent(new Event('onlineteam-create-lead'));
  };

  const triggerCreateOrder = () => {
    window.dispatchEvent(new Event('onlineteam-create-order'));
  };

  const triggerCreateInvoice = () => {
    window.dispatchEvent(new Event('onlineteam-create-invoice'));
  };

  const totalLeadsCount = assignedLeads.length;
  const contactedCount = assignedLeads.filter(l => 
    ['Called', 'Interested', 'Not Interested', 'Converted'].includes(l.status)
  ).length;
  const interestedCount = assignedLeads.filter(l => l.status === 'Interested').length;
  const pendingCount = assignedLeads.filter(l => l.status === 'New' || !l.status).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header & Tab Selection */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-150 pb-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            {activeTab === 'assign_leads' ? 'Assign Leads Dashboard' : 'Marketing Leads Dashboard'}
          </h2>
          <p className="text-gray-500 text-xs mt-0.5 font-semibold uppercase tracking-wider">
            {activeTab === 'assign_leads' 
              ? 'Call tracking and status management for your assigned leads' 
              : 'Monitor and review marketing uploaded pools and prospects'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 border border-gray-200 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => { setActiveTab('assign_leads'); setSearchTerm(''); }}
            className={cn(
              "flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer",
              activeTab === 'assign_leads' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800 bg-transparent"
            )}
          >
            Assign Leads
          </button>
          <button
            onClick={() => { setActiveTab('marketing_leads'); setSearchTerm(''); }}
            className={cn(
              "flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer",
              activeTab === 'marketing_leads' ? "bg-brand-primary text-white shadow-md" : "text-gray-500 hover:text-gray-800 bg-transparent"
            )}
          >
            Marketing Leads
          </button>
        </div>
      </div>

      {/* Quick Action Operations (Create Order, Invoice, Lead) */}
      <div className="bg-brand-primary/5 p-4 rounded-2xl border border-brand-primary/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-brand-primary animate-spin-slow" />
          <span className="text-xs font-bold text-gray-700">Online Team Operations Hub</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={triggerCreateLead}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border-none cursor-pointer shadow-sm transition-all"
          >
            <Plus size={14} /> Create Lead
          </button>
          <button
            onClick={triggerCreateOrder}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border-none cursor-pointer shadow-sm transition-all"
          >
            <Plus size={14} /> Create Order
          </button>
          <button
            onClick={triggerCreateInvoice}
            className="px-4 py-2 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border-none cursor-pointer shadow-sm transition-all"
          >
            <Plus size={14} /> Create Invoice
          </button>
        </div>
      </div>

      {/* Hidden Manager components to listen for modal dispatcher events */}
      <div className="absolute w-0 h-0 overflow-hidden">
        <LeadManager />
        <MarketingDashboard
          orders={orders}
          inventory={inventory}
          onCreateOrder={addOrder}
          onUpdateOrder={updateOrder}
          onDeleteOrder={deleteOrder}
          isAdmin={user?.role === 'admin'}
          user={user}
          leadManagerComponent={<LeadManager />}
        />
        <InvoiceManager />
      </div>

      {/* Tab content rendering */}
      {activeTab === 'assign_leads' ? (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Assigned</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{totalLeadsCount}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Contacted</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{contactedCount}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Interested</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{interestedCount}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Pending Call</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{pendingCount}</p>
              </div>
            </div>
          </div>

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
                              setEditNotes(lead.description || '');
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

                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Call Log Details / Notes</label>
                    <textarea
                      rows={4}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
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
      ) : (
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
                  <th className="px-6 py-4 text-right">Lead Type</th>
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
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                        lead.leadType === 'Hot' ? "bg-red-50 text-red-700 border-red-150" :
                        lead.leadType === 'Warm' ? "bg-amber-50 text-amber-700 border-amber-150" :
                        "bg-blue-50 text-blue-700 border-blue-150"
                      )}>
                        {lead.leadType || 'Warm'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredMarketingLeads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400 italic">
                      No marketing-uploaded leads match the search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
