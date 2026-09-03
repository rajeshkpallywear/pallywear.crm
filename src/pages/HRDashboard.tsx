/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  Clock,
  Download,
  Printer,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  ArrowLeft,
  RefreshCw,
  Building,
  CreditCard,
  Briefcase,
  AlertCircle,
  UserCheck,
  UserX,
  TrendingUp,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Award,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockDataService } from '../service/mockDataService';
import {
  SalarySlip,
  EmployeeSalaryProfile,
  StaffAttendanceRecord,
  AttendanceStatus,
  UserProfile,
  UserRole
} from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

// Convert number to Indian currency words
function numberToWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'Zero Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  let parts: string[] = [];

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const remainder = Math.floor(n % 100);

  const getTensAndOnes = (val: number) => {
    if (val < 20) return a[val];
    const tens = b[Math.floor(val / 10)];
    const ones = a[val % 10];
    return ones ? `${tens}-${ones}` : tens;
  };

  if (crore > 0) parts.push(`${getTensAndOnes(crore)} Crore`);
  if (lakh > 0) parts.push(`${getTensAndOnes(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${getTensAndOnes(thousand)} Thousand`);
  if (hundred > 0) parts.push(`and ${a[hundred]} Hundred`);
  if (remainder > 0) {
    if (parts.length === 0 || !parts[parts.length - 1].includes('Hundred')) {
      parts.push(`and ${getTensAndOnes(remainder)}`);
    } else {
      parts.push(`and ${getTensAndOnes(remainder)}`);
    }
  }

  // Remove leading 'and ' if it's the only part
  let result = parts.join(' ').trim();
  if (result.startsWith('and ')) {
    result = result.substring(4);
  }

  return `${result} Only`;
}

export default function HRDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Selected Period
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'attendance' | 'salary_slips' | 'salary_profiles'>('salary_slips');

  // Data States
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
  const [salaryProfiles, setSalaryProfiles] = useState<EmployeeSalaryProfile[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<StaffAttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters & Search
  const [searchStaff, setSearchStaff] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(now.toISOString().split('T')[0]);

  // Modals & Selected items
  const [selectedSlipForView, setSelectedSlipForView] = useState<SalarySlip | null>(null);
  const [editingProfile, setEditingProfile] = useState<EmployeeSalaryProfile | null>(null);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [downloadingSlipId, setDownloadingSlipId] = useState<string | null>(null);
  const [slipForExport, setSlipForExport] = useState<SalarySlip | null>(null);

  // Ref for PDF Capture
  const payslipPdfRef = useRef<HTMLDivElement>(null);

  // Fetch all HR data
  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, slipsData, profilesData, attData] = await Promise.all([
        mockDataService.getUsers().catch(() => []),
        mockDataService.getSalarySlips({ month: selectedMonth, year: selectedYear }).catch(() => []),
        mockDataService.getSalaryProfiles().catch(() => []),
        mockDataService.getStaffAttendance({
          month: MONTHS.indexOf(selectedMonth) + 1,
          year: selectedYear
        }).catch(() => [])
      ]);

      // Filter active employees (excluding vendors or customers if any)
      const validStaff = usersData.filter(u => u.role !== 'vendor');
      setEmployees(validStaff);
      setSalarySlips(slipsData);
      setSalaryProfiles(profilesData);
      setAttendanceRecords(attData);
    } catch (err) {
      console.error('Error loading HR data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  // Computed summary metrics
  const stats = useMemo(() => {
    const totalStaff = employees.length;
    const todayAtt = attendanceRecords.filter(a => a.date === selectedDate);
    const presentToday = todayAtt.filter(a => a.status === 'Present').length;
    const absentToday = todayAtt.filter(a => a.status === 'Absent').length;
    const leaveToday = todayAtt.filter(a => a.status === 'Paid Leave' || a.status === 'Unpaid Leave' || a.status === 'Half-Day').length;

    const currentSlips = salarySlips.filter(s => s.month === selectedMonth && Number(s.year) === Number(selectedYear));
    const totalGrossPayroll = currentSlips.reduce((sum, s) => sum + (Number(s.grossEarnings) || 0), 0);
    const totalNetPayroll = currentSlips.reduce((sum, s) => sum + (Number(s.netSalary) || 0), 0);
    const paidSlips = currentSlips.filter(s => s.status === 'Paid');
    const totalPaidAmount = paidSlips.reduce((sum, s) => sum + (Number(s.netSalary) || 0), 0);
    const pendingSlips = currentSlips.filter(s => s.status !== 'Paid');
    const totalPendingAmount = pendingSlips.reduce((sum, s) => sum + (Number(s.netSalary) || 0), 0);

    return {
      totalStaff,
      presentToday,
      absentToday,
      leaveToday,
      totalSlips: currentSlips.length,
      totalGrossPayroll,
      totalNetPayroll,
      totalPaidAmount,
      totalPendingAmount,
      paidCount: paidSlips.length,
      pendingCount: pendingSlips.length
    };
  }, [employees, attendanceRecords, selectedDate, salarySlips, selectedMonth, selectedYear]);

  // Filtered salary slips for table
  const filteredSalarySlips = useMemo(() => {
    return salarySlips.filter(s => {
      const matchMonth = s.month === selectedMonth && Number(s.year) === Number(selectedYear);
      if (!matchMonth) return false;

      if (searchStaff) {
        const q = searchStaff.toLowerCase();
        const matchName = s.userName?.toLowerCase().includes(q);
        const matchEmail = s.userEmail?.toLowerCase().includes(q);
        const matchRole = s.userRole?.toLowerCase().includes(q);
        const matchSlip = s.slipNumber?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRole && !matchSlip) return false;
      }

      if (statusFilter !== 'all') {
        if (s.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [salarySlips, selectedMonth, selectedYear, searchStaff, statusFilter]);

  // Quick Attendance Update
  const handleUpdateAttendance = async (emp: UserProfile, status: AttendanceStatus) => {
    try {
      const existing = attendanceRecords.find(a => a.userId === emp.uid && a.date === selectedDate);
      const updatedRecord: Partial<StaffAttendanceRecord> = {
        id: existing?.id,
        userId: emp.uid,
        userName: emp.name || emp.email.split('@')[0],
        date: selectedDate,
        status,
        checkInTime: status === 'Present' ? (existing?.checkInTime || '09:30 AM') : undefined,
        checkOutTime: status === 'Present' ? (existing?.checkOutTime || '06:30 PM') : undefined,
        workHours: status === 'Present' ? 8.0 : status === 'Half-Day' ? 4.0 : 0.0,
        verificationMode: 'Manual'
      };

      await mockDataService.saveStaffAttendance(updatedRecord);
      // Update local state
      setAttendanceRecords(prev => {
        const idx = prev.findIndex(a => a.userId === emp.uid && a.date === selectedDate);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = { ...clone[idx], ...updatedRecord } as StaffAttendanceRecord;
          return clone;
        }
        return [updatedRecord as StaffAttendanceRecord, ...prev];
      });
    } catch (err) {
      alert('Failed to update attendance');
    }
  };

  // Generate / Recalculate Monthly Salary Slips for All Staff
  const handleGenerateMonthlySlips = async () => {
    if (!window.confirm(`Generate/Update Salary Slips for all active staff for ${selectedMonth} ${selectedYear}?`)) return;

    setIsGeneratingBulk(true);
    try {
      // Total days in selected month
      const monthIdx = MONTHS.indexOf(selectedMonth);
      const daysInMonth = new Date(selectedYear, monthIdx + 1, 0).getDate();

      for (const emp of employees) {
        // Find profile
        const profile = salaryProfiles.find(p => p.userId === emp.uid);
        const basePay = profile ? Number(profile.basicSalary) || 0 : 25000;
        const hra = profile ? Number(profile.hra) || 0 : basePay * 0.3;
        const conveyance = profile ? Number(profile.conveyance) || 0 : 2000;
        const special = profile ? Number(profile.specialAllowance) || 0 : 1500;

        // Count attendance for this employee in the month
        const empAtt = attendanceRecords.filter(a => {
          if (a.userId !== emp.uid) return false;
          const [yr, mo] = a.date.split('-');
          return Number(yr) === Number(selectedYear) && Number(mo) === (monthIdx + 1);
        });

        const presentDaysCount = empAtt.filter(a => a.status === 'Present').length;
        const halfDaysCount = empAtt.filter(a => a.status === 'Half-Day').length;
        const paidLeavesCount = empAtt.filter(a => a.status === 'Paid Leave').length;
        const unpaidLeavesCount = empAtt.filter(a => a.status === 'Unpaid Leave' || a.status === 'Absent').length;

        // Default to working days if no explicit absent marked, or compute based on attendance
        const actualWorkingDays = daysInMonth;
        const effectivePresentDays = empAtt.length > 0
          ? presentDaysCount + (halfDaysCount * 0.5) + paidLeavesCount
          : daysInMonth; // default if not tracked day by day

        const lopDays = empAtt.length > 0 ? unpaidLeavesCount + (halfDaysCount * 0.5) : 0;

        // Earnings
        const grossEarnings = Math.round(basePay + hra + conveyance + special);

        // Deductions
        const epf = profile ? Number(profile.epfDeduction) || 0 : Math.round(basePay * 0.12);
        const esi = profile ? Number(profile.esiDeduction) || 0 : (grossEarnings < 21000 ? Math.round(grossEarnings * 0.0075) : 0);
        const pt = profile ? Number(profile.professionalTax) || 0 : 200;
        const perDaySalary = grossEarnings / daysInMonth;
        const lopDeduction = Math.round(lopDays * perDaySalary);
        const totalDeductions = Math.round(epf + esi + pt + lopDeduction);
        const netSalary = Math.max(0, grossEarnings - totalDeductions);

        const slipNumber = `PW-PAY-${selectedYear}-${String(monthIdx + 1).padStart(2, '0')}-${emp.uid.slice(-4).toUpperCase()}`;

        const slipData: Partial<SalarySlip> = {
          slipNumber,
          userId: emp.uid,
          userName: emp.name || emp.email.split('@')[0],
          userEmail: emp.email,
          userRole: emp.role,
          designation: profile?.designation || (emp.role === 'Accounts' ? 'Accounts Executive' : emp.role === 'Designer' ? 'Lead Designer' : emp.role === 'Marketing' ? 'Marketing Executive' : emp.role || 'Staff'),
          month: selectedMonth,
          year: selectedYear,
          workingDays: actualWorkingDays,
          presentDays: effectivePresentDays,
          paidLeaves: paidLeavesCount,
          unpaidLeaves: lopDays,
          basicSalary: basePay,
          hra,
          conveyance,
          specialAllowance: special,
          bonus: 0,
          incentive: 0,
          overtimePay: 0,
          grossEarnings,
          epfDeduction: epf,
          esiDeduction: esi,
          professionalTax: pt,
          tdsDeduction: 0,
          lopDeduction,
          advanceDeduction: 0,
          totalDeductions,
          netSalary,
          status: 'Pending',
          bankName: profile?.bankName || 'HDFC Bank',
          accountNumber: profile?.accountNumber || 'XXXXXXXX4892',
          ifscCode: profile?.ifscCode || 'HDFC0001234',
          panNumber: profile?.panNumber || 'ABCDE1234F',
          pfNumber: profile?.pfNumber || 'PW24Y11',
          paymentDate: `01/${String(monthIdx + 1).padStart(2, '0')}/${selectedYear}`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        await mockDataService.saveSalarySlip(slipData);
      }

      await loadData();
      alert(`Successfully generated salary slips for ${employees.length} staff members for ${selectedMonth} ${selectedYear}!`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate salary slips.');
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  // Mark Slip Status
  const handleUpdateSlipStatus = async (slip: SalarySlip, newStatus: 'Paid' | 'Pending' | 'Processing') => {
    try {
      const updates: Partial<SalarySlip> = {
        status: newStatus,
        paymentDate: newStatus === 'Paid' ? new Date().toISOString().split('T')[0] : undefined
      };
      await mockDataService.updateSalarySlip(slip.id, updates);
      setSalarySlips(prev => prev.map(s => s.id === slip.id ? { ...s, ...updates } : s));
      if (selectedSlipForView?.id === slip.id) {
        setSelectedSlipForView(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // Delete Slip
  const handleDeleteSlip = async (slipId: string) => {
    if (!window.confirm('Delete this salary slip?')) return;
    try {
      await mockDataService.deleteSalarySlip(slipId);
      setSalarySlips(prev => prev.filter(s => s.id !== slipId));
      if (selectedSlipForView?.id === slipId) {
        setSelectedSlipForView(null);
      }
    } catch (err) {
      alert('Failed to delete salary slip');
    }
  };

  // Save Salary Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    try {
      await mockDataService.saveSalaryProfile(editingProfile.userId, editingProfile);
      setSalaryProfiles(prev => {
        const idx = prev.findIndex(p => p.userId === editingProfile.userId);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = editingProfile;
          return clone;
        }
        return [editingProfile, ...prev];
      });
      setEditingProfile(null);
      alert('Employee salary structure saved successfully!');
    } catch (err) {
      alert('Failed to save salary structure');
    }
  };

  // PDF Generation / Download using jsPDF and html2canvas
  const handleDownloadPDF = async (targetSlip?: SalarySlip) => {
    const slip = targetSlip || selectedSlipForView;
    if (!slip) return;

    const targetId = slip.id;
    setDownloadingSlipId(targetId);
    setIsDownloadingPdf(true);
    setSlipForExport(slip);

    try {
      // Allow react to render the target export element if rendering off-screen
      await new Promise(resolve => setTimeout(resolve, 200));

      const element = document.getElementById(`payslip-document-export-${targetId}`) || payslipPdfRef.current;
      if (!element) {
        throw new Error('Payslip element not found');
      }

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width mm
      const pageHeight = 297; // A4 height mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      pdf.save(`Payslip_${slip.userName.replace(/\s+/g, '_')}_${slip.month}_${slip.year}.pdf`);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate PDF. You can also use the Print button.');
    } finally {
      setIsDownloadingPdf(false);
      setDownloadingSlipId(null);
      setSlipForExport(null);
    }
  };

  // Direct Print
  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="h-screen dashboard-page-bg text-slate-900 flex flex-col overflow-hidden">
      {/* Top Header Navigation */}
      <header className="shrink-0 bg-white/70 backdrop-blur-2xl border border-white/60 mx-3 sm:mx-6 md:mx-8 mt-3 sm:mt-4 rounded-2xl md:rounded-[1.75rem] px-4 sm:px-8 py-3.5 shadow-lg z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border-none cursor-pointer"
              title="Back to Admin Control Panel"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center font-black shadow-sm">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">HR & Payroll Portal</h1>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Official
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold">
                Staff Attendance Tracking, Salary Calculations & Official PDF Payslips
              </p>
            </div>
          </div>

          {/* Month & Year Filter + Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent border-none text-xs font-black text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
              >
                {MONTHS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-black text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => { setRefreshing(true); loadData(); }}
              disabled={refreshing}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer border-none"
              title="Refresh HR Data"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin text-brand-primary' : ''} />
            </button>

            <button
              onClick={handleGenerateMonthlySlips}
              disabled={isGeneratingBulk}
              className="px-3.5 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer border-none"
            >
              <Sparkles size={14} className={isGeneratingBulk ? 'animate-spin' : ''} />
              <span>{isGeneratingBulk ? 'Generating...' : `Auto-Generate ${selectedMonth} Slips`}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-6 pb-16 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Staff</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.totalStaff}</h3>
              <p className="text-[10px] text-green-600 font-bold mt-0.5">● Active in CRM</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Today's Attendance</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-slate-900">{stats.presentToday}</h3>
                <span className="text-xs text-slate-400 font-bold">/ {stats.totalStaff}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                {stats.absentToday} Absent, {stats.leaveToday} Leave
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
              <UserCheck size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{selectedMonth} Payroll Cost</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">₹{stats.totalNetPayroll.toLocaleString('en-IN')}</h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{stats.totalSlips} Slips Generated</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign size={22} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Payout Status</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-green-600">{stats.paidCount}</h3>
                <span className="text-xs text-amber-600 font-bold">({stats.pendingCount} Pending)</span>
              </div>
              <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                Pending: ₹{stats.totalPendingAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard size={22} />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200/80 w-fit gap-1 shadow-xs">
          {[
            { id: 'salary_slips', label: '1. Salary Slips & Payslips', icon: FileText, count: filteredSalarySlips.length },
            { id: 'attendance', label: '2. Daily & Monthly Attendance', icon: Calendar, count: attendanceRecords.length },
            { id: 'salary_profiles', label: '3. Employee Salary Structures', icon: Building, count: employees.length }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-none ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-100'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: SALARY SLIPS & PAYSLIPS */}
        {activeTab === 'salary_slips' && (
          <div className="space-y-4">
            {/* Search and Filters Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 md:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchStaff}
                  onChange={e => setSearchStaff(e.target.value)}
                  placeholder="Search staff name, email, role, or payslip #..."
                  className="w-full text-xs pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                {searchStaff && (
                  <button
                    onClick={() => setSearchStaff('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Status:</span>
                {(['all', 'Paid', 'Pending', 'Processing'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer border-none ${
                      statusFilter === st
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Payslips Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Slip #</th>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Period</th>
                    <th className="px-6 py-4 text-center">Attendance</th>
                    <th className="px-6 py-4 text-right">Gross Pay</th>
                    <th className="px-6 py-4 text-right">Deductions</th>
                    <th className="px-6 py-4 text-right font-black">Net Pay</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSalarySlips.map(slip => {
                    const isPaid = slip.status === 'Paid';
                    return (
                      <tr key={slip.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-6 py-4 font-mono font-black text-brand-primary text-[11px]">
                          {slip.slipNumber}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{slip.userName}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{slip.userEmail || 'No email'}</p>
                            <span className="inline-block px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase mt-0.5">
                              {slip.userRole || 'Staff'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          {slip.month} {slip.year}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-block px-2 py-1 rounded-lg bg-slate-100 font-bold text-slate-700 text-[11px]">
                            {slip.presentDays} / {slip.workingDays} days
                          </span>
                          {slip.unpaidLeaves > 0 && (
                            <span className="block text-[9px] text-red-500 font-bold mt-0.5">
                              -{slip.unpaidLeaves} LOP days
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-700">
                          ₹{Number(slip.grossEarnings).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-red-600">
                          -₹{Number(slip.totalDeductions).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-sm text-slate-900">
                          ₹{Number(slip.netSalary).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleUpdateSlipStatus(slip, isPaid ? 'Pending' : 'Paid')}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                              isPaid
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                            title="Click to toggle Paid / Pending"
                          >
                            {isPaid ? '✔ Paid' : '⏳ Pending'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedSlipForView(slip)}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer border-none"
                              title="View Payslip on Screen"
                            >
                              <FileText size={13} />
                              <span>View</span>
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(slip)}
                              disabled={isDownloadingPdf && downloadingSlipId === slip.id}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer border-none disabled:opacity-50"
                              title="Download PDF directly in this model"
                            >
                              <Download size={13} />
                              <span>{isDownloadingPdf && downloadingSlipId === slip.id ? 'Saving...' : 'Download PDF'}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteSlip(slip.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-none"
                              title="Delete Slip"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSalarySlips.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                        <div className="max-w-xs mx-auto space-y-2">
                          <FileText size={32} className="mx-auto text-slate-300" />
                          <p className="font-bold text-slate-700 text-sm">No Salary Slips for {selectedMonth} {selectedYear}</p>
                          <p className="text-xs text-slate-400">
                            Click <strong>"Auto-Generate {selectedMonth} Slips"</strong> above to compute monthly payslips automatically!
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ATTENDANCE HUB */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {/* Date Selector & Attendance Actions */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-500 uppercase">Select Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="text-xs border border-slate-200 bg-slate-50 rounded-xl px-3 py-1.5 text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span>Quick status for <strong>{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong>:</span>
              </div>
            </div>

            {/* Staff Daily Attendance List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status on {selectedDate}</th>
                    <th className="px-6 py-4">Check-In / Out</th>
                    <th className="px-6 py-4 text-center">Work Hours</th>
                    <th className="px-6 py-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map(emp => {
                    const att = attendanceRecords.find(a => a.userId === emp.uid && a.date === selectedDate);
                    const currentStatus: AttendanceStatus = att?.status || 'Present';

                    return (
                      <tr key={emp.uid} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary font-black flex items-center justify-center text-xs">
                              {emp.name?.slice(0, 2).toUpperCase() || 'EM'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{emp.name || emp.email.split('@')[0]}</p>
                              <p className="text-[10px] text-slate-400">{emp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            currentStatus === 'Present'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : currentStatus === 'Absent'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : currentStatus === 'Half-Day'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            {currentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-[11px] text-slate-600">
                          {att?.checkInTime || '09:30 AM'} - {att?.checkOutTime || '06:30 PM'}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-800">
                          {att?.workHours ? `${att.workHours} hrs` : '8.0 hrs'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(['Present', 'Half-Day', 'Absent', 'Paid Leave'] as const).map(st => (
                              <button
                                key={st}
                                onClick={() => handleUpdateAttendance(emp, st)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                                  currentStatus === st
                                    ? 'bg-black text-white border-black shadow-xs'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: EMPLOYEE SALARY STRUCTURES */}
        {activeTab === 'salary_profiles' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Staff Compensation & Salary Configurations</h3>
                <p className="text-xs text-slate-400">Configure base salary, HRA, allowances, and bank accounts for automatic payroll calculation</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map(emp => {
                const profile = salaryProfiles.find(p => p.userId === emp.uid);
                const basic = profile ? Number(profile.basicSalary) || 0 : 25000;
                const hra = profile ? Number(profile.hra) || 0 : basic * 0.3;
                const conveyance = profile ? Number(profile.conveyance) || 0 : 2000;
                const special = profile ? Number(profile.specialAllowance) || 0 : 1500;
                const totalGross = basic + hra + conveyance + special;

                return (
                  <div key={emp.uid} className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:border-brand-primary/40 transition-all flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-slate-900 text-base">{emp.name || emp.email.split('@')[0]}</h4>
                          <p className="text-xs text-slate-400">{emp.email}</p>
                          <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase mt-1">
                            {emp.role}
                          </span>
                        </div>
                        <button
                          onClick={() => setEditingProfile({
                            userId: emp.uid,
                            userName: emp.name || emp.email.split('@')[0],
                            userEmail: emp.email,
                            userRole: emp.role,
                            basicSalary: basic,
                            hra,
                            conveyance,
                            specialAllowance: special,
                            epfDeduction: profile?.epfDeduction || Math.round(basic * 0.12),
                            esiDeduction: profile?.esiDeduction || 0,
                            professionalTax: profile?.professionalTax || 200,
                            bankName: profile?.bankName || 'HDFC Bank',
                            accountNumber: profile?.accountNumber || '1234567890',
                            ifscCode: profile?.ifscCode || 'HDFC0001234',
                            panNumber: profile?.panNumber || 'ABCDE1234F'
                          })}
                          className="p-2 bg-slate-50 hover:bg-brand-primary hover:text-white text-slate-600 rounded-xl transition-colors cursor-pointer border-none"
                          title="Configure Salary Structure"
                        >
                          <Edit size={14} />
                        </button>
                      </div>

                      {/* Financial breakdown */}
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Basic Salary:</span>
                          <span className="font-bold">₹{basic.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>HRA & Allowances:</span>
                          <span className="font-bold">₹{(hra + conveyance + special).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-slate-900 font-black border-t border-dashed border-slate-200 pt-1.5">
                          <span>Monthly Gross:</span>
                          <span className="text-brand-primary text-sm">₹{totalGross.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Bank info */}
                      <div className="mt-3 bg-slate-50 p-2.5 rounded-xl text-[11px] text-slate-500 space-y-0.5">
                        <p><span className="font-bold">Bank:</span> {profile?.bankName || 'Not Set'}</p>
                        <p><span className="font-bold">A/C:</span> {profile?.accountNumber ? `••••${profile.accountNumber.slice(-4)}` : 'Not Set'}</p>
                        <p><span className="font-bold">PAN:</span> {profile?.panNumber || 'Not Set'}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditingProfile({
                        userId: emp.uid,
                        userName: emp.name || emp.email.split('@')[0],
                        userEmail: emp.email,
                        userRole: emp.role,
                        basicSalary: basic,
                        hra,
                        conveyance,
                        specialAllowance: special,
                        epfDeduction: profile?.epfDeduction || Math.round(basic * 0.12),
                        esiDeduction: profile?.esiDeduction || 0,
                        professionalTax: profile?.professionalTax || 200,
                        bankName: profile?.bankName || 'HDFC Bank',
                        accountNumber: profile?.accountNumber || '1234567890',
                        ifscCode: profile?.ifscCode || 'HDFC0001234',
                        panNumber: profile?.panNumber || 'ABCDE1234F'
                      })}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none"
                    >
                      Edit Salary Structure
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: OFFICIAL PRINTABLE & DOWNLOADABLE SALARY SLIP (PDF EXPORTER) */}
      {/* ========================================================================= */}
      {selectedSlipForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Modal Actions Header */}
            <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm tracking-tight">Official Salary Slip Preview</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  selectedSlipForView.status === 'Paid' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {selectedSlipForView.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPdf}
                  className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-none"
                >
                  <Download size={14} />
                  <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
                </button>
                <button
                  onClick={handlePrintSlip}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border-none"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setSelectedSlipForView(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer border-none"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Area */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100/50">
              <PayslipDocument
                slip={selectedSlipForView}
                id={`payslip-document-export-${selectedSlipForView.id}`}
                pdfRef={payslipPdfRef}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Off-screen Export Container for Direct Table PDF Downloads */}
      {slipForExport && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '800px', zIndex: -100 }}>
          <PayslipDocument
            slip={slipForExport}
            id={`payslip-document-export-${slipForExport.id}`}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT EMPLOYEE SALARY PROFILE */}
      {/* ========================================================================= */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden"
          >
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Configure Salary Structure</h3>
                <p className="text-xs text-slate-400">Employee: {editingProfile.userName}</p>
              </div>
              <button
                onClick={() => setEditingProfile(null)}
                className="p-1 text-slate-400 hover:text-white border-none bg-transparent cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">Basic Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editingProfile.basicSalary || ''}
                    onChange={e => setEditingProfile({ ...editingProfile, basicSalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">HRA (₹)</label>
                  <input
                    type="number"
                    value={editingProfile.hra || ''}
                    onChange={e => setEditingProfile({ ...editingProfile, hra: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">Conveyance (₹)</label>
                  <input
                    type="number"
                    value={editingProfile.conveyance || ''}
                    onChange={e => setEditingProfile({ ...editingProfile, conveyance: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-bold uppercase text-[10px] mb-1">Special Allowance (₹)</label>
                  <input
                    type="number"
                    value={editingProfile.specialAllowance || ''}
                    onChange={e => setEditingProfile({ ...editingProfile, specialAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="font-bold text-slate-800 mb-2 uppercase text-[10px]">Bank & Tax Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-semibold text-[10px] mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={editingProfile.bankName || ''}
                      onChange={e => setEditingProfile({ ...editingProfile, bankName: e.target.value })}
                      placeholder="e.g. HDFC Bank"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold text-[10px] mb-1">Account Number</label>
                    <input
                      type="text"
                      value={editingProfile.accountNumber || ''}
                      onChange={e => setEditingProfile({ ...editingProfile, accountNumber: e.target.value })}
                      placeholder="e.g. 50100482910"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold text-[10px] mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={editingProfile.ifscCode || ''}
                      onChange={e => setEditingProfile({ ...editingProfile, ifscCode: e.target.value })}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold text-[10px] mb-1">PAN Number</label>
                    <input
                      type="text"
                      value={editingProfile.panNumber || ''}
                      onChange={e => setEditingProfile({ ...editingProfile, panNumber: e.target.value })}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold text-[10px] mb-1">Designation</label>
                    <input
                      type="text"
                      value={editingProfile.designation || ''}
                      onChange={e => setEditingProfile({ ...editingProfile, designation: e.target.value })}
                      placeholder="e.g. Accounts Executive"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold text-[10px] mb-1">PF Number</label>
                    <input
                      type="text"
                      value={editingProfile.pfNumber || ''}
                      onChange={e => setEditingProfile({ ...editingProfile, pfNumber: e.target.value })}
                      placeholder="e.g. PW24Y11"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-xl font-bold cursor-pointer border-none shadow-sm"
                >
                  Save Structure
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

interface PayslipDocumentProps {
  slip: SalarySlip;
  id?: string;
  pdfRef?: React.RefObject<HTMLDivElement>;
}

function PayslipDocument({ slip, id, pdfRef }: PayslipDocumentProps) {
  const otherAllowance = (slip.hra || 0) + (slip.conveyance || 0) + (slip.specialAllowance || 0) + (slip.bonus || 0) + (slip.incentive || 0);
  const otherDeductions = (slip.esiDeduction || 0) + (slip.professionalTax || 0) + (slip.lopDeduction || 0) + (slip.advanceDeduction || 0);
  const monthIdx = MONTHS.indexOf(slip.month);
  const payDate = slip.paymentDate || `01/${String(monthIdx >= 0 ? monthIdx + 1 : 1).padStart(2, '0')}/${slip.year}`;

  return (
    <div
      id={id}
      ref={pdfRef}
      className="bg-white p-6 sm:p-10 rounded-2xl border border-gray-200 shadow-sm max-w-3xl mx-auto text-gray-900 font-sans space-y-6"
      style={{ minHeight: '800px', backgroundColor: '#ffffff' }}
    >
      {/* 1. Header: Logo, Company Name & Location, Payslip Month */}
      <div className="flex justify-between items-start pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
            <img src="/logo.png?v=2" alt="PW" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight text-gray-900 uppercase">
              PALLYWEAR GIFTING SOLUTION PVT LTD
            </h2>
            <p className="text-xs text-gray-500 font-medium">Tamilnadu India</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-400 font-medium">Payslip for the Month</p>
          <p className="text-sm sm:text-base font-black text-gray-900 tracking-tight">
            {slip.month} {slip.year}
          </p>
        </div>
      </div>

      {/* 2. Employee Summary & Net Pay Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Employee Summary (7 cols) */}
        <div className="md:col-span-7 space-y-2.5 text-left">
          <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            EMPLOYEE SUMMARY
          </h4>
          <div className="space-y-1.5 text-xs text-gray-600">
            <div className="grid grid-cols-12">
              <span className="col-span-4 text-gray-500 font-medium">Employee Name</span>
              <span className="col-span-1 text-gray-400 font-bold">:</span>
              <span className="col-span-7 font-black text-gray-900">{slip.userName}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-4 text-gray-500 font-medium">Employee ID</span>
              <span className="col-span-1 text-gray-400 font-bold">:</span>
              <span className="col-span-7 font-black text-gray-900 font-mono">
                {slip.userId || slip.slipNumber}
              </span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-4 text-gray-500 font-medium">Pay Period</span>
              <span className="col-span-1 text-gray-400 font-bold">:</span>
              <span className="col-span-7 font-medium text-gray-900">
                {slip.month} {slip.year}
              </span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-4 text-gray-500 font-medium">Pay Date</span>
              <span className="col-span-1 text-gray-400 font-bold">:</span>
              <span className="col-span-7 font-medium text-gray-900 font-mono">
                {payDate}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Net Pay Box (5 cols) */}
        <div className="md:col-span-5">
          <div className="bg-[#eefdf3] border border-emerald-200/80 rounded-2xl overflow-hidden shadow-xs text-left">
            {/* Top Banner with Green Vertical Bar */}
            <div className="p-4 border-b border-emerald-100 flex items-center gap-3">
              <div className="w-1.5 h-10 bg-emerald-500 rounded-full shrink-0" />
              <div>
                <div className="text-2xl font-black text-gray-900 tracking-tight">
                  ₹{Number(slip.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-gray-500 font-medium mt-0.5">
                  Employee Net Pay
                </div>
              </div>
            </div>

            {/* Bottom attendance inside card */}
            <div className="p-4 bg-white/70 space-y-1.5 text-xs">
              <div className="grid grid-cols-12">
                <span className="col-span-6 text-gray-500 font-medium">Paid Days</span>
                <span className="col-span-1 text-gray-400 font-bold">:</span>
                <span className="col-span-5 font-black text-gray-900 text-left pl-1">
                  {slip.presentDays + (slip.paidLeaves || 0)}
                </span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-6 text-gray-500 font-medium">LOP Days</span>
                <span className="col-span-1 text-gray-400 font-bold">:</span>
                <span className="col-span-5 font-black text-gray-900 text-left pl-1">
                  {slip.unpaidLeaves || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Designation & PF No Row */}
      <div className="border-t border-b border-gray-200 py-3 grid grid-cols-1 md:grid-cols-12 text-xs gap-4 text-left">
        <div className="md:col-span-6 grid grid-cols-12">
          <span className="col-span-4 text-gray-500 font-medium">Designation</span>
          <span className="col-span-1 text-gray-400 font-bold">:</span>
          <span className="col-span-7 font-black text-gray-900">
            {slip.designation || slip.userRole || 'Accounts Executive'}
          </span>
        </div>
        <div className="md:col-span-6 grid grid-cols-12">
          <span className="col-span-4 text-gray-500 font-medium">PF No</span>
          <span className="col-span-1 text-gray-400 font-bold">:</span>
          <span className="col-span-7 font-black text-gray-900 font-mono">
            {slip.pfNumber || '-'}
          </span>
        </div>
      </div>

      {/* 4. Earnings & Deductions Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden text-xs text-left">
        {/* Table Header */}
        <div className="grid grid-cols-2 bg-gray-50 text-gray-600 font-black uppercase text-[10px] py-2.5 px-4 tracking-wider border-b border-gray-200">
          <div className="flex justify-between pr-4">
            <span>EARNINGS</span>
            <span>AMOUNT</span>
          </div>
          <div className="flex justify-between pl-4 border-l border-gray-200">
            <span>DEDUCTIONS</span>
            <span>AMOUNT</span>
          </div>
        </div>

        {/* Table Body */}
        <div className="grid grid-cols-2 divide-x divide-gray-200 p-4">
          {/* Left Column: Earnings */}
          <div className="space-y-3 pr-4">
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium">Basic</span>
              <span className="font-black text-gray-900">
                ₹{Number(slip.basicSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium">Over Time</span>
              <span className="font-black text-gray-900">
                ₹{Number(slip.overtimePay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium">Other Allowance</span>
              <span className="font-black text-gray-900">
                ₹{Number(otherAllowance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Right Column: Deductions */}
          <div className="space-y-3 pl-4">
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium">Income Tax</span>
              <span className="font-black text-gray-900">
                ₹{Number(slip.tdsDeduction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700 font-medium">Provident Fund</span>
              <span className="font-black text-gray-900">
                ₹{Number(slip.epfDeduction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {Number(otherDeductions) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Other Deductions</span>
                <span className="font-black text-gray-900">
                  ₹{Number(otherDeductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Totals Row */}
        <div className="grid grid-cols-2 bg-gray-50 border-t border-gray-200 font-bold py-2.5 px-4 text-xs">
          <div className="flex justify-between pr-4">
            <span className="text-gray-700 font-bold">Gross Earnings</span>
            <span className="text-gray-950 font-black">
              ₹{Number(slip.grossEarnings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between pl-4 border-l border-gray-200">
            <span className="text-gray-700 font-bold">Total Deductions</span>
            <span className="text-gray-950 font-black">
              ₹{Number(slip.totalDeductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Total Net Payable Box */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden flex items-stretch justify-between text-left">
        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <h4 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider">
            TOTAL NET PAYABLE
          </h4>
          <p className="text-[10px] sm:text-[11px] text-gray-400 font-medium mt-0.5">
            Gross Earnings - Total Deductions
          </p>
        </div>
        <div className="bg-[#eefdf3] px-6 sm:px-10 py-4 flex items-center justify-center border-l border-emerald-100">
          <span className="text-lg sm:text-xl font-black text-gray-900">
            ₹{Number(slip.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* 6. Amount in Words */}
      <div className="text-center pt-2 space-y-4">
        <p className="text-xs text-gray-500 font-medium">
          Amount In Words: <strong className="text-gray-900 font-black">Indian Rupee {numberToWords(slip.netSalary)}</strong>
        </p>

        <hr className="border-gray-200" />

        <p className="text-[10.5px] text-gray-400 text-center italic">
          - This is a system generated payslip, hence the signature is not required. -
        </p>
      </div>
    </div>
  );
}
