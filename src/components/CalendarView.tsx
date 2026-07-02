import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Check, X, AlertCircle, Plus, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface Leave {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  startDate: string;
  endDate: string;
  leaveType: string;
  reason: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: number;
}

interface CalendarViewProps {
  user: any;
}

export default function CalendarView({ user }: CalendarViewProps) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAdmin = user?.role === 'admin';

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaves');
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (e) {
      console.error('Error fetching leaves:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!startDate || !endDate || !leaveType) {
      setError('Please fill in all required fields.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date.');
      return;
    }

    setSubmitting(true);
    const leaveId = 'leave-' + Math.random().toString(36).substr(2, 9);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leaveId,
          userId: user?.id || 'unknown',
          userName: user?.name || 'Staff User',
          userRole: user?.role || 'staff',
          startDate,
          endDate,
          leaveType,
          reason
        })
      });

      if (res.ok) {
        setSuccess('Leave request submitted successfully!');
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchLeaves();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to submit leave request.');
      }
    } catch (e) {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    setActioningId(id);
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        fetchLeaves();
      } else {
        alert('Failed to update leave status.');
      }
    } catch (e) {
      alert('Connection error.');
    } finally {
      setActioningId(null);
    }
  };

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getLeavesForDate = (dateString: string) => {
    return leaves.filter(leave => {
      if (leave.status === 'Rejected') return false;
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const current = new Date(dateString);
      // Reset times to compare dates only
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      current.setHours(0,0,0,0);
      return current >= start && current <= end;
    });
  };

  const renderDays = () => {
    const days = [];
    // Blank days for padding
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 bg-gray-50/50 border border-gray-100/50" />);
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayLeaves = getLeavesForDate(dateStr);

      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();

      days.push(
        <div key={day} className={cn(
          "h-28 p-2 border border-gray-100 flex flex-col justify-between transition-colors bg-white hover:bg-gray-50/30",
          isToday && "bg-brand-primary/5 border-brand-primary/20"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center",
              isToday ? "bg-brand-primary text-white" : "text-gray-700"
            )}>
              {day}
            </span>
          </div>
          <div className="flex-1 mt-2 overflow-y-auto space-y-1 scrollbar-none">
            {dayLeaves.map(leave => (
              <div
                key={leave.id}
                className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded border truncate shadow-sm",
                  leave.status === 'Approved'
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}
                title={`${leave.userName} - ${leave.leaveType} (${leave.status})`}
              >
                {leave.userName.split(' ')[0]}: {leave.leaveType.split(' ')[0]}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary shadow-sm">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Calendar & Leaves</h2>
            <p className="text-gray-500 mt-1">Apply for leave and view team attendance</p>
          </div>
        </div>
        <button
          onClick={fetchLeaves}
          className="px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
        >
          Refresh Sync
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side Panels: Leave Form & Admin Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Apply Leave Panel */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Plus className="text-brand-primary" size={20} />
                Apply for Leave
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Submit your leave request for approval</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-100 text-green-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <Check size={16} />
                {success}
              </div>
            )}

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-150 focus:outline-none focus:border-brand-primary text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-150 focus:outline-none focus:border-brand-primary text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-150 focus:outline-none focus:border-brand-primary text-sm font-medium bg-white"
                >
                  <option>Casual Leave</option>
                  <option>Sick Leave</option>
                  <option>Paid Leave</option>
                  <option>Unpaid Leave</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Reason / Notes</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain reason for leave..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-150 focus:outline-none focus:border-brand-primary text-sm font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-brand-primary hover:bg-brand-primary/95 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-primary/10 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>

          {/* Admin Leaves Review Panel */}
          {isAdmin && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Clock className="text-amber-500" size={20} />
                  Pending Leaves Review
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Approve or reject leave requests</p>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin">
                {leaves.filter(l => l.status === 'Pending').length > 0 ? (
                  leaves.filter(l => l.status === 'Pending').map(leave => (
                    <div key={leave.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-gray-900 text-sm">
                            <User size={14} className="text-gray-400" />
                            {leave.userName}
                          </div>
                          <span className="text-[9px] font-black uppercase text-brand-primary bg-brand-primary/5 px-1.5 py-0.5 rounded block w-max mt-1">
                            {leave.userRole}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                          Pending
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1 bg-white p-2.5 rounded-xl border border-gray-100/50">
                        <p><strong className="text-gray-500">Dates:</strong> {leave.startDate} to {leave.endDate}</p>
                        <p><strong className="text-gray-500">Type:</strong> {leave.leaveType}</p>
                        {leave.reason && <p className="italic mt-1 text-gray-500 border-t border-gray-50 pt-1">"{leave.reason}"</p>}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateStatus(leave.id, 'Approved')}
                          disabled={actioningId !== null}
                          className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(leave.id, 'Rejected')}
                          disabled={actioningId !== null}
                          className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 bg-gray-50 border border-dashed border-gray-200 rounded-2xl text-center text-gray-400 italic text-xs">
                    No pending leaves found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Center/Right Side: Calendar View */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <h3 className="text-xl font-black text-gray-900">
              {monthNames[month]} {year}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 border border-gray-150 rounded-xl transition-all text-gray-600 cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 border border-gray-150 rounded-xl transition-all text-gray-600 cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-1 bg-gray-100 rounded-2xl overflow-hidden p-1 shadow-inner border border-gray-100">
            {renderDays()}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-500 mt-4 border-t border-gray-50 pt-4">
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-green-100 border border-green-200" />
              Approved Leaves
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-200" />
              Pending Approval
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
