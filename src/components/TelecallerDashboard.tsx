import React, { useState, useEffect } from 'react';
import { Phone, Users, CheckCircle2, AlertCircle, Search, HelpCircle, Save, Calendar, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { getApiUrl } from '../lib/apiConfig';

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
}

interface TelecallerDashboardProps {
  user: any;
}

export default function TelecallerDashboard({ user }: TelecallerDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState('New');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchLeads = async () => {
    try {
      const res = await fetch(getApiUrl('/api/leads'));
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeads(data);
      }
    } catch (e) {
      console.error('Failed to fetch leads', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

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
        setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, status: editStatus, description: editNotes } : l));
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

  // Filter leads assigned to this telecaller (or all leads if not strictly restricted)
  const myLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (l.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.number.includes(searchTerm);
    return matchesSearch;
  });

  const totalCount = myLeads.length;
  const calledCount = myLeads.filter(l => ['Called', 'Interested', 'Not Interested', 'Converted'].includes(l.status)).length;
  const interestedCount = myLeads.filter(l => l.status === 'Interested').length;
  const pendingCount = myLeads.filter(l => l.status === 'New' || !l.status).length;

  return (
    <div className="space-y-6">


      {/* Stats Cards - Compact Mobile Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-3">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400 truncate">Total Leads</p>
            <p className="text-base sm:text-3xl font-black text-gray-900 mt-0.5 leading-none">{totalCount}</p>
            <span className="text-[9px] font-medium text-gray-400 hidden sm:block mt-2">Assigned lead records</span>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-3">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs shrink-0">
            <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400 truncate">Total Called</p>
            <p className="text-base sm:text-3xl font-black text-gray-900 mt-0.5 leading-none">{calledCount}</p>
            <span className="text-[9px] font-medium text-gray-400 hidden sm:block mt-2">Leads contacted by phone</span>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-3">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shadow-xs shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400 truncate">Interested</p>
            <p className="text-base sm:text-3xl font-black text-green-600 mt-0.5 leading-none">{interestedCount}</p>
            <span className="text-[9px] font-medium text-gray-400 hidden sm:block mt-2">Potential customer conversions</span>
          </div>
        </div>

        <div className="bg-white p-3 sm:p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-3">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs shrink-0">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400 truncate">Pending Calls</p>
            <p className="text-base sm:text-3xl font-black text-amber-500 mt-0.5 leading-none">{pendingCount}</p>
            <span className="text-[9px] font-medium text-gray-400 hidden sm:block mt-2">Awaiting initial contact</span>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads List */}
        <div className={cn("bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden", editingLead ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
            <Search className="text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, company, phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 text-sm placeholder:text-gray-400"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400">Loading leads...</div>
          ) : myLeads.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No leads match your search criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left">
                    <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Name</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Phone</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Company</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Call Status</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Type</th>
                    <th className="px-5 py-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {myLeads.map((lead, i) => (
                    <tr key={lead.id} className={cn("border-b border-gray-50 hover:bg-gray-50/30 transition-colors", i % 2 === 0 ? 'bg-white' : 'bg-gray-50/10')}>
                      <td className="px-5 py-4 font-semibold text-gray-900">{lead.name}</td>
                      <td className="px-5 py-4 text-gray-700 font-mono">{lead.number}</td>
                      <td className="px-5 py-4 text-gray-500">{lead.companyName || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                          lead.status === 'Interested' ? "bg-green-100 text-green-700" :
                          lead.status === 'Not Interested' ? "bg-red-100 text-red-700" :
                          lead.status === 'Called' ? "bg-indigo-100 text-indigo-700" :
                          lead.status === 'Converted' ? "bg-blue-100 text-blue-700" :
                          "bg-amber-100 text-amber-700"
                        )}>
                          {lead.status || 'New'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          lead.leadType === 'Hot' ? "bg-red-50 text-red-600 border border-red-100" :
                          lead.leadType === 'Warm' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                          "bg-blue-50 text-blue-600 border border-blue-100"
                        )}>
                          {lead.leadType || 'Cold'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => {
                            setEditingLead(lead);
                            setEditStatus(lead.status || 'New');
                            setEditNotes(lead.description || '');
                          }}
                          className="px-3.5 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors"
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Update Side Panel */}
        {editingLead && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 space-y-4 h-fit">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900">Update Lead Call Info</h3>
              <button onClick={() => setEditingLead(null)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-black tracking-widest">Client Name</p>
              <p className="font-bold text-gray-900 text-base">{editingLead.name}</p>
              {editingLead.companyName && <p className="text-xs text-gray-500 mt-0.5">{editingLead.companyName}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase font-black tracking-widest mb-1">Phone Number</p>
              <a href={`tel:${editingLead.number}`} className="text-brand-primary font-bold hover:underline flex items-center gap-1">
                <Phone size={14} /> {editingLead.number}
              </a>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Call Status</label>
                <select 
                  value={editStatus} 
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-primary text-sm bg-white"
                >
                  <option value="New">New / Uncalled</option>
                  <option value="Called">Called / Left Message</option>
                  <option value="Interested">Interested / Hot Prospect</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Converted">Converted to Order</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Call Notes / Follow up</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={4}
                  placeholder="Record summary of the call or next follow up details..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-primary text-sm resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/25 disabled:opacity-50"
              >
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save Updates'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
