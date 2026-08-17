import React, { useState, useEffect } from 'react';
import { Phone, Users, CheckCircle2, Clock, Search, Save, Calendar, FileText, ClipboardList, Plus, BarChart3, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { getApiUrl } from '../lib/apiConfig';
import { useLeads } from '../context/LeadContext';
import { useAuth } from '../context/AuthContext';
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
}

interface OnlineTeamDashboardProps {
  user: any;
}

export default function OnlineTeamDashboard({ user }: OnlineTeamDashboardProps) {
  const { leads, orders, invoices, inventory, addOrder, updateOrder, deleteOrder, updateLead } = useLeads();
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'call_logs' | 'orders' | 'invoices'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editStatus, setEditStatus] = useState('New');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter leads for the quick status updater on Overview tab
  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (l.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          l.number.includes(searchTerm);
    return matchesSearch;
  });

  // Call Logs are leads that have already been called or have description notes
  const callLogs = leads.filter(l => 
    ['Called', 'Interested', 'Not Interested', 'Converted'].includes(l.status) || 
    (l.description && l.description.trim() !== '')
  );

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
        // Trigger context update
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

  const totalLeadsCount = leads.length;
  const calledCount = callLogs.length;
  const interestedCount = leads.filter(l => l.status === 'Interested').length;
  const pendingCount = leads.filter(l => l.status === 'New' || !l.status).length;

  return (
    <div className="space-y-6">
      
      {/* Header and Custom Tab Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-150 pb-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Online Team Operations</h2>
          <p className="text-gray-500 text-xs mt-0.5 font-semibold uppercase tracking-wider">
            Consolidated portal for lead generation, call tracking, order processing & client invoicing
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-gray-100 border border-gray-200 rounded-2xl w-full md:w-auto">
          {[
            { id: 'overview', label: 'Overview', icon: ClipboardList },
            { id: 'call_logs', label: 'Call Logs', icon: Phone },
            { id: 'leads', label: 'All Leads', icon: Users },
            { id: 'orders', label: 'Orders (Marketing)', icon: FileText },
            { id: 'invoices', label: 'Invoice Center', icon: BarChart3 },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer",
                  isActive 
                    ? "bg-brand-primary text-white shadow-md" 
                    : "text-gray-500 hover:text-gray-800 bg-transparent"
                )}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Renderings */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Leads</p>
                <p className="text-3xl font-black text-gray-900 mt-0.5 leading-none">{totalLeadsCount}</p>
                <span className="text-[9px] font-semibold text-gray-400 block mt-2">Active database pool</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Calls Logged</p>
                <p className="text-3xl font-black text-indigo-600 mt-0.5 leading-none">{calledCount}</p>
                <span className="text-[9px] font-semibold text-gray-400 block mt-2">Contacted leads</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Interested / Hot</p>
                <p className="text-3xl font-black text-green-600 mt-0.5 leading-none">{interestedCount}</p>
                <span className="text-[9px] font-semibold text-gray-400 block mt-2">High conversion prospects</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">New / Uncalled</p>
                <p className="text-3xl font-black text-amber-600 mt-0.5 leading-none">{pendingCount}</p>
                <span className="text-[9px] font-semibold text-gray-400 block mt-2">Pipeline backlog queue</span>
              </div>
            </div>
          </div>

          {/* Quick Lead status updater table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                  <Search className="text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Quick search leads to log status..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-sm placeholder:text-gray-400 outline-none"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50 text-left">
                        <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Name</th>
                        <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Phone</th>
                        <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Company</th>
                        <th className="px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Call Status</th>
                        <th className="px-5 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredLeads.slice(0, 10).map((lead, i) => (
                        <tr key={lead.id} className={cn("hover:bg-gray-50/30 transition-colors", i % 2 === 0 ? 'bg-white' : 'bg-gray-50/10')}>
                          <td className="px-5 py-4 font-semibold text-gray-900">{lead.name}</td>
                          <td className="px-5 py-4 text-gray-700 font-mono text-xs">{lead.number}</td>
                          <td className="px-5 py-4 text-gray-500">{lead.companyName || '—'}</td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                              lead.status === 'Interested' ? "bg-green-50 text-green-700 border-green-150" :
                              lead.status === 'Not Interested' ? "bg-red-50 text-red-700 border-red-155" :
                              lead.status === 'Called' ? "bg-indigo-50 text-indigo-700 border-indigo-150" :
                              lead.status === 'Converted' ? "bg-blue-50 text-blue-700 border-blue-150" :
                              "bg-amber-50 text-amber-700 border-amber-150"
                            )}>
                              {lead.status || 'New'}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => {
                                setEditingLead(lead);
                                setEditStatus(lead.status || 'New');
                                setEditNotes(lead.description || '');
                              }}
                              className="px-3.5 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-colors border-none cursor-pointer"
                            >
                              Update Status
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-gray-400 italic">No leads match your search criteria.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Quick Status Updater Sidebar Panel */}
            <div className="lg:col-span-1">
              {editingLead ? (
                <div className="bg-white rounded-3xl border border-gray-150 shadow-md p-6 space-y-5 text-left animate-in slide-in-from-right duration-250">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-bold text-gray-900">Update Lead Call Info</h3>
                    <button onClick={() => setEditingLead(null)} className="text-gray-400 hover:text-gray-600 border-none bg-transparent cursor-pointer font-black text-lg">×</button>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Client Name</p>
                    <p className="font-bold text-gray-900 text-base">{editingLead.name}</p>
                    {editingLead.companyName && <p className="text-xs text-gray-500 mt-0.5">{editingLead.companyName}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Phone Number</p>
                    <a href={`tel:${editingLead.number}`} className="text-brand-primary font-bold hover:underline flex items-center gap-1 text-sm">
                      <Phone size={14} /> {editingLead.number}
                    </a>
                  </div>

                  <form onSubmit={handleUpdateStatus} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Call Status</label>
                      <select 
                        value={editStatus} 
                        onChange={e => setEditStatus(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-primary text-sm bg-white font-medium"
                      >
                        <option value="New">New / Uncalled</option>
                        <option value="Called">Called / Left Message</option>
                        <option value="Interested">Interested / Hot Prospect</option>
                        <option value="Not Interested">Not Interested</option>
                        <option value="Converted">Converted to Order</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Call Notes / Follow up</label>
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        rows={4}
                        placeholder="Record summary of the call or next follow up details..."
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-primary text-xs resize-none font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/25 disabled:opacity-50 border-none cursor-pointer"
                    >
                      <Save size={14} />
                      {isSaving ? 'Saving...' : 'Save Updates'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-gray-50/50 rounded-3xl border border-dashed border-gray-200 p-8 text-center text-gray-400 h-64 flex flex-col items-center justify-center gap-2">
                  <Phone size={24} className="text-gray-300" />
                  <p className="text-xs font-bold uppercase tracking-wider">No Lead Selected</p>
                  <p className="text-[10px] max-w-[200px] leading-relaxed">Select a lead from the quick status list to record call notes and update logs.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Call Logs Tab */}
      {activeTab === 'call_logs' && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 text-left">
          <div className="flex justify-between items-center border-b border-gray-50 pb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Activity Call Logs</h3>
              <p className="text-xs text-gray-500">History of all lead calls, notes, and progress</p>
            </div>
            <span className="px-3 py-1 bg-brand-secondary text-brand-primary rounded-full text-[10px] font-black uppercase tracking-wider">
              {callLogs.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px] border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Logged Status</th>
                  <th className="px-6 py-4">Call Notes / Summary</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {callLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{log.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      <a href={`tel:${log.number}`} className="hover:underline text-brand-primary font-bold">
                        {log.number}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-semibold">{log.companyName || 'Individual'}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                        log.status === 'Interested' ? "bg-green-50 text-green-700 border-green-150" :
                        log.status === 'Not Interested' ? "bg-red-50 text-red-700 border-red-155" :
                        log.status === 'Called' ? "bg-indigo-50 text-indigo-700 border-indigo-150" :
                        log.status === 'Converted' ? "bg-blue-50 text-blue-700 border-blue-150" :
                        "bg-amber-50 text-amber-700 border-amber-150"
                      )}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={log.description}>
                      {log.description || <span className="text-gray-300 italic">No notes captured</span>}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs font-semibold">{log.entryDate || 'Recent'}</td>
                  </tr>
                ))}
                {callLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 italic">
                      No calls logged yet. Start calling leads to record follow-up logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Leads Tab (Renders LeadManager) */}
      {activeTab === 'leads' && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm text-left">
          <div className="border-b border-gray-100 pb-3 mb-6">
            <h3 className="text-lg font-bold text-gray-900">Lead Registry Center</h3>
            <p className="text-xs text-gray-500">Register new clients, convert them to orders, and manage sales funnels</p>
          </div>
          <LeadManager />
        </div>
      )}

      {/* Orders Tab (Renders MarketingDashboard) */}
      {activeTab === 'orders' && (
        <div className="text-left">
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
        </div>
      )}

      {/* Invoices Tab (Renders InvoiceManager) */}
      {activeTab === 'invoices' && (
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm text-left">
          <div className="border-b border-gray-100 pb-3 mb-6">
            <h3 className="text-lg font-bold text-gray-900">Online Team Billing Center</h3>
            <p className="text-xs text-gray-500">Create, review, and issue payment invoices to clients</p>
          </div>
          <InvoiceManager />
        </div>
      )}

    </div>
  );
}
