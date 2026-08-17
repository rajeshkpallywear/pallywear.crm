import React, { useState } from 'react';
import { Phone, CheckCircle2, Clock, Search, Save, ClipboardList, AlertCircle } from 'lucide-react';
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

export default function OnlineTeamDashboard({ user }: { user: any }) {
  const { leads, updateLead } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState('New');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter leads assigned to the logged-in Online Team member
  // Daniel and Admin can view all leads in the assignment dashboard
  const visibleLeads = React.useMemo(() => {
    if (user?.role === 'admin' || user?.email === 'daniel.smpallywear@gmail.com') return leads;
    if (user?.role === 'onlineteam') {
      return leads.filter(l => l.assignedTo === user?.id || l.assignedTo === user?.uid || l.assignedTo === user?.email);
    }
    return leads;
  }, [leads, user]);

  const filteredLeads = visibleLeads.filter(l => {
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

  const totalLeadsCount = visibleLeads.length;
  const contactedCount = visibleLeads.filter(l => 
    ['Called', 'Interested', 'Not Interested', 'Converted'].includes(l.status)
  ).length;
  const interestedCount = visibleLeads.filter(l => l.status === 'Interested').length;
  const pendingCount = visibleLeads.filter(l => l.status === 'New' || !l.status).length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="border-b border-gray-150 pb-4">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Assign Leads Dashboard</h2>
        <p className="text-gray-500 text-xs mt-0.5 font-semibold uppercase tracking-wider">
          Call tracking and status management for your assigned leads
        </p>
      </div>

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

      {/* Main Content Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle: Leads list queue */}
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
                {filteredLeads.map(lead => (
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
                {filteredLeads.length === 0 && (
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

        {/* Right: Update log status active workspace */}
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
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
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
                  className="w-full bg-gray-50 border border-gray-150 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
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
  );
}
