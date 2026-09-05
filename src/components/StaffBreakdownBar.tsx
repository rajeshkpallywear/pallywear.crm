/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Search, X, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { cn } from '../lib/utils';

export type DateRangeFilterType = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

export interface StaffBreakdownBarProps {
  orders: Order[] | any[];
  staffFilter: string;
  onStaffFilterChange: (staff: string) => void;
  dateRangeFilter: DateRangeFilterType;
  onDateRangeFilterChange: (range: DateRangeFilterType) => void;
  customDate: string;
  onCustomDateChange: (date: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  filteredCount: number;
  onResetFilters?: () => void;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  itemLabel?: string;
}

export interface StaffUploadStat {
  name: string;
  todayOrdersCount: number;
  todayTotalValue: number;
  yesterdayOrdersCount: number;
  allOrdersCount: number;
  allTotalValue: number;
}

export function filterOrdersWithStaffAndDate<T extends Order | any>(
  items: T[],
  staffFilter: string,
  dateRangeFilter: DateRangeFilterType,
  customDate: string,
  searchQuery: string,
  userMap?: Record<string, string>
): T[] {
  let list = items;

  // 1. Search Query Filter
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(item => {
      const creator = (item.createdByName || (userMap && item.createdBy && userMap[item.createdBy]) || item.createdBy || '').toLowerCase();
      const customer = (item.customerInfo?.name || item.customerName || item.clientName || '').toLowerCase();
      const phone = (item.customerInfo?.phone || item.phone || '').toLowerCase();
      const id = (item.id || '').toLowerCase();
      const designer = (item.assignedDesigner || item.claimedByName || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const notes = (item.notes || item.designNotes || '').toLowerCase();

      return (
        creator.includes(q) ||
        customer.includes(q) ||
        phone.includes(q) ||
        id.includes(q) ||
        designer.includes(q) ||
        category.includes(q) ||
        notes.includes(q)
      );
    });
  }

  // 2. Staff Member Filter
  if (staffFilter && staffFilter !== 'all') {
    const targetStaff = staffFilter.trim().toLowerCase();
    list = list.filter(item => {
      const creator = (item.createdByName || (userMap && item.createdBy && userMap[item.createdBy]) || item.createdBy || '').trim().toLowerCase();
      return creator === targetStaff;
    });
  }

  // 3. Date Range Filter
  if (dateRangeFilter !== 'all') {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 86400000;
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - (now.getDay() * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    list = list.filter(item => {
      let t = Number(item.createdAt || 0);
      if (!t && item.date) {
        t = new Date(item.date).getTime();
      }
      if (!t) return false;

      if (dateRangeFilter === 'today') return t >= todayStart && t < todayEnd;
      if (dateRangeFilter === 'yesterday') return t >= yesterdayStart && t < todayStart;
      if (dateRangeFilter === 'this_week') return t >= weekStart && t < todayEnd;
      if (dateRangeFilter === 'this_month') return t >= monthStart && t < todayEnd;
      if (dateRangeFilter === 'custom' && customDate) {
        const cDate = new Date(customDate);
        const cStart = new Date(cDate.getFullYear(), cDate.getMonth(), cDate.getDate()).getTime();
        const cEnd = cStart + 86400000;
        return t >= cStart && t < cEnd;
      }
      return true;
    });
  }

  return list;
}

export default function StaffBreakdownBar({
  orders,
  staffFilter,
  onStaffFilterChange,
  dateRangeFilter,
  onDateRangeFilterChange,
  customDate,
  onCustomDateChange,
  searchQuery,
  onSearchQueryChange,
  filteredCount,
  onResetFilters,
  title = "Today's Staff Uploads",
  subtitle = "LIVE TRACKING OF ORDERS UPLOADED BY EACH STAFF MEMBER TODAY",
  placeholder = "Search staff (e.g. Godwin), customer, order #, category, designer...",
  itemLabel = "Orders"
}: StaffBreakdownBarProps) {
  const { registeredUsers } = useAuth();

  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    (registeredUsers || []).forEach((u: any) => {
      if (u.id) map[u.id] = u.name || u.email;
      if (u.uid) map[u.uid] = u.name || u.email;
      if (u.email) map[u.email] = u.name || u.email;
    });
    return map;
  }, [registeredUsers]);

  const staffUploadStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 86400000;
    const yesterdayStart = todayStart - 86400000;

    const staffMap: Record<string, StaffUploadStat> = {};

    (orders || []).forEach(o => {
      const creatorName = (o.createdByName || userMap[o.createdBy] || o.createdBy || 'Unknown Staff').trim();
      if (!creatorName) return;

      if (!staffMap[creatorName]) {
        staffMap[creatorName] = {
          name: creatorName,
          todayOrdersCount: 0,
          todayTotalValue: 0,
          yesterdayOrdersCount: 0,
          allOrdersCount: 0,
          allTotalValue: 0,
        };
      }

      let orderTime = Number(o.createdAt || 0);
      if (!orderTime && o.date) {
        orderTime = new Date(o.date).getTime();
      }

      const amount = Number(o.financials?.totalAmount ?? o.financials?.balanceAmount ?? o.totalAmount ?? 0);
      const validAmount = isNaN(amount) ? 0 : amount;

      staffMap[creatorName].allOrdersCount += 1;
      staffMap[creatorName].allTotalValue += validAmount;

      if (orderTime >= todayStart && orderTime < todayEnd) {
        staffMap[creatorName].todayOrdersCount += 1;
        staffMap[creatorName].todayTotalValue += validAmount;
      } else if (orderTime >= yesterdayStart && orderTime < todayStart) {
        staffMap[creatorName].yesterdayOrdersCount += 1;
      }
    });

    return Object.values(staffMap).sort(
      (a, b) => b.todayOrdersCount - a.todayOrdersCount || b.allOrdersCount - a.allOrdersCount
    );
  }, [orders, userMap]);

  const totalTodayUploadedOrders = useMemo(() => {
    return staffUploadStats.reduce((sum, s) => sum + s.todayOrdersCount, 0);
  }, [staffUploadStats]);

  const totalTodayUploadedValue = useMemo(() => {
    return staffUploadStats.reduce((sum, s) => sum + s.todayTotalValue, 0);
  }, [staffUploadStats]);

  const isAnyFilterActive = searchQuery || staffFilter !== 'all' || dateRangeFilter !== 'all' || customDate;

  const handleReset = () => {
    if (onResetFilters) {
      onResetFilters();
    } else {
      onSearchQueryChange('');
      onStaffFilterChange('all');
      onDateRangeFilterChange('all');
      onCustomDateChange('');
    }
  };

  return (
    <div className="space-y-3 text-left w-full">
      {/* Today's Staff Uploads Analytics Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-sm">
              <Zap size={16} className="fill-amber-500" />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                {title}
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  {totalTodayUploadedOrders} {itemLabel} Today (₹{totalTodayUploadedValue.toLocaleString('en-IN')})
                </span>
              </h4>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-150">
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: `Today (${totalTodayUploadedOrders})` },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map(dr => (
              <button
                key={dr.id}
                type="button"
                onClick={() => onDateRangeFilterChange(dr.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer border-none",
                  dateRangeFilter === dr.id
                    ? "bg-black text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 bg-transparent hover:bg-gray-200/50"
                )}
              >
                {dr.label}
              </button>
            ))}
          </div>
        </div>

        {dateRangeFilter === 'custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Select Date:</span>
            <input
              type="date"
              value={customDate}
              onChange={e => onCustomDateChange(e.target.value)}
              className="text-xs border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-1 text-gray-700 font-bold focus:outline-none"
            />
          </div>
        )}

        {/* Staff Badges Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-dashed border-gray-100">
          <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider mr-1">Staff Breakdown:</span>
          <button
            type="button"
            onClick={() => onStaffFilterChange('all')}
            className={cn(
              "px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
              staffFilter === 'all'
                ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            )}
          >
            <span>All Staff</span>
            <span className="px-1.5 py-0.2 rounded-md bg-black/15 text-[9px] font-black">{(orders || []).length}</span>
          </button>

          {staffUploadStats.map(s => {
            const isSelected = staffFilter.toLowerCase() === s.name.toLowerCase();
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => onStaffFilterChange(isSelected ? 'all' : s.name)}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border",
                  isSelected
                    ? "bg-black text-white border-black shadow-xs"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                )}
              >
                <span>{s.name}</span>
                {s.todayOrdersCount > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-white text-[9px] font-black shadow-xs">
                    +{s.todayOrdersCount} today
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-md bg-gray-200 text-gray-600 text-[9px] font-black">
                    0 today
                  </span>
                )}
                <span className="text-[9px] text-gray-400 font-medium">({s.allOrdersCount} total)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Bar Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            placeholder={placeholder}
            className="w-full text-xs pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-gray-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 border-none bg-transparent cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-black text-gray-500 px-2">
            {filteredCount} {itemLabel} Found
          </span>
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleReset}
              className="px-3.5 py-2 bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl hover:bg-red-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
