import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2, Timer, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface DesignTaskTimerProps {
  claimedAt?: number | string;
  completedAt?: number | string;
  isCompleted?: boolean;
  slaMinutes?: number; // default 120 (2 hours)
  variant?: 'badge' | 'compact' | 'bar';
  className?: string;
  designerName?: string;
}

export default function DesignTaskTimer({
  claimedAt,
  completedAt,
  isCompleted = false,
  slaMinutes = 120,
  variant = 'badge',
  className,
  designerName
}: DesignTaskTimerProps) {
  const [now, setNow] = useState(Date.now());

  const numClaimedAt = React.useMemo(() => {
    if (!claimedAt) return undefined;
    const n = typeof claimedAt === 'number' ? claimedAt : new Date(claimedAt).getTime();
    return isNaN(n) ? undefined : n;
  }, [claimedAt]);

  const numCompletedAt = React.useMemo(() => {
    if (!completedAt) return undefined;
    const n = typeof completedAt === 'number' ? completedAt : new Date(completedAt).getTime();
    return isNaN(n) ? undefined : n;
  }, [completedAt]);

  useEffect(() => {
    if (isCompleted || !numClaimedAt) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [numClaimedAt, isCompleted]);

  if (!numClaimedAt) {
    return (
      <span className={cn("text-[9px] font-bold text-gray-400 inline-flex items-center gap-1", className)}>
        <Clock className="w-3 h-3 opacity-60" /> 2h SLA ready
      </span>
    );
  }

  const slaMs = slaMinutes * 60 * 1000;
  const deadline = numClaimedAt + slaMs;

  if (isCompleted) {
    if (numCompletedAt && numClaimedAt) {
      const elapsedMs = Math.max(0, numCompletedAt - numClaimedAt);
      const elapsedMins = Math.floor(elapsedMs / 60000);
      const elapsedSecs = Math.floor((elapsedMs % 60000) / 1000);
      const wasOnTime = elapsedMs <= slaMs;

      return (
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
          wasOnTime ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200",
          className
        )}>
          <CheckCircle2 className="w-2.5 h-2.5" />
          {wasOnTime ? `Done in ${elapsedMins}m ${elapsedSecs}s (Within 2h)` : `Done in ${elapsedMins}m (+${elapsedMins - slaMinutes}m over 2h SLA)`}
        </span>
      );
    }
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-700 border-emerald-200",
        className
      )}>
        <CheckCircle2 className="w-2.5 h-2.5" /> Completed (Artwork Ready)
      </span>
    );
  }

  const diffMs = deadline - now;
  const isOverdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);
  const minutes = Math.floor(absDiff / 60000);
  const seconds = Math.floor((absDiff % 60000) / 1000);
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  
  const formattedTime = hours > 0 
    ? `${hours}h ${remainingMins}m ${seconds.toString().padStart(2, '0')}s`
    : `${minutes}m ${seconds.toString().padStart(2, '0')}s`;

  if (variant === 'bar') {
    const elapsed = Math.max(0, now - (numClaimedAt || 0));
    const progressPct = Math.min(100, Math.max(0, (elapsed / slaMs) * 100));
    return (
      <div className={cn(
        "p-3 rounded-2xl border transition-all shadow-xs",
        isOverdue 
          ? "bg-red-50/90 border-red-300 text-red-900" 
          : diffMs < 30 * 60000 
            ? "bg-amber-50/90 border-amber-300 text-amber-900" 
            : "bg-purple-50/90 border-purple-200 text-purple-900",
        className
      )}>
        <div className="flex items-center justify-between text-xs font-black">
          <div className="flex items-center gap-1.5">
            <Timer className={cn("w-4 h-4", isOverdue ? "text-red-600 animate-pulse" : "text-purple-600 animate-spin-slow")} />
            <span>2-Hour Task SLA Timer</span>
            {designerName && (
              <span className="text-[10px] font-bold opacity-75">({designerName})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isOverdue ? (
              <span className="text-red-600 flex items-center gap-1 font-black bg-white/90 px-2 py-0.5 rounded-lg border border-red-200">
                <AlertTriangle className="w-3.5 h-3.5" /> OVERDUE: +{formattedTime}
              </span>
            ) : (
              <span className={cn(
                "font-black px-2 py-0.5 rounded-lg border bg-white/90 flex items-center gap-1",
                diffMs < 30 * 60000 ? "text-amber-700 border-amber-200" : "text-purple-700 border-purple-200"
              )}>
                <Clock className="w-3 h-3" /> {formattedTime} remaining
              </span>
            )}
          </div>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-black/10 rounded-full h-2 mt-2 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-1000",
              isOverdue ? "bg-red-600" : diffMs < 30 * 60000 ? "bg-amber-500" : "bg-gradient-to-r from-purple-500 to-indigo-600"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    );
  }

  if (isOverdue) {
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-300 animate-pulse",
        className
      )}>
        <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
        🚨 Overdue +{formattedTime}
      </span>
    );
  }

  if (diffMs < 30 * 60000) {
    // Less than 30 mins left
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 animate-pulse",
        className
      )}>
        <Clock className="w-2.5 h-2.5 text-amber-600" />
        ⚠️ {formattedTime} left
      </span>
    );
  }

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200",
      className
    )}>
      <Clock className="w-2.5 h-2.5 text-purple-600" />
      ⏱️ {formattedTime} left
    </span>
  );
}
