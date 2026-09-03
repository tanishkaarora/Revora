'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { 
  Calendar as CalendarIcon, CheckCircle, AlertTriangle, 
  Clock, ArrowRight, ShieldCheck, MessageSquare, Lock 
} from 'lucide-react';

export default function PromiseCalendar() {
  const promises = useAppStore((state) => state.promises);
  const fetchPromises = useAppStore((state) => state.fetchPromises);

  useEffect(() => {
    fetchPromises();
  }, [fetchPromises]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-[10px] bg-brand-amber-surface text-brand-amber border border-brand-amber-border px-2 py-0.5 rounded-full font-medium">
            <Clock className="w-3 h-3" /> Contact Suppressed
          </span>
        );
      case 'kept':
        return (
          <span className="flex items-center gap-1 text-[10px] bg-brand-jade-surface text-brand-jade border border-brand-jade-border px-2 py-0.5 rounded-full font-medium">
            <CheckCircle className="w-3 h-3" /> Promise Kept
          </span>
        );
      case 'broken':
        return (
          <span className="flex items-center gap-1 text-[10px] bg-brand-burgundy-surface text-brand-burgundy border border-brand-burgundy-border px-2 py-0.5 rounded-full font-medium">
            <AlertTriangle className="w-3 h-3" /> Broken (Re-triaged)
          </span>
        );
      default:
        return null;
    }
  };

  // Group promises by date
  const groupedPromises: Record<string, typeof promises> = {};
  promises.forEach((p) => {
    const date = p.promised_date || 'Flexible Commitment';
    if (!groupedPromises[date]) {
      groupedPromises[date] = [];
    }
    groupedPromises[date].push(p);
  });

  const sortedDates = Object.keys(groupedPromises).sort();

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-content-primary tracking-tight font-display">
              Payment Commitment State Engine
            </h3>
            <span className="text-[10px] text-brand-brass bg-brand-brass-surface px-2.5 py-0.5 rounded-full border border-brand-brass-border font-medium">
              State Tracker
            </span>
          </div>
          <p className="text-xs text-content-secondary mt-0.5">
            Automatic outreach suppression state machine triggered upon extracting customer payment promises.
          </p>
        </div>
        <span className="text-xs text-content-secondary font-sans self-start sm:self-auto">
          Active Commitments: <strong className="text-content-primary font-technical">{promises.length}</strong>
        </span>
      </div>

      {/* State Machine Transition Banner */}
      <div className="bg-surface-subtle p-3 rounded-xl border border-border-subtle flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-brand-brass font-medium">
          <MessageSquare className="w-4 h-4" />
          <span>1. Promise Extracted</span>
          <span className="text-content-tertiary font-sans text-[10px]">(NLP / LLM)</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-content-muted hidden md:block" />
        <div className="flex items-center gap-2 text-brand-amber font-medium">
          <Lock className="w-4 h-4" />
          <span>2. Outreach Suppressed</span>
          <span className="text-content-tertiary font-sans text-[10px]">(Zero spam calls)</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-content-muted hidden md:block" />
        <div className="flex items-center gap-2 text-brand-jade font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>3. Resolution Verified</span>
          <span className="text-content-tertiary font-sans text-[10px]">(Payment webhook)</span>
        </div>
      </div>

      {promises.length === 0 ? (
        <div className="h-[200px] flex flex-col items-center justify-center text-center p-6 border border-dashed border-border-muted rounded-xl">
          <CalendarIcon className="w-7 h-7 text-content-tertiary mb-2" />
          <span className="text-sm font-semibold text-content-secondary">No Commitments In Flight</span>
          <p className="text-xs text-content-tertiary max-w-[280px] mt-1 leading-relaxed font-sans">
            Customer replies via the WhatsApp simulator will automatically extract and track commitments here.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
          {sortedDates.map((date) => (
            <div key={date} className="space-y-2">
              <h4 className="text-xs font-semibold text-content-secondary font-sans flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-brass"></span>
                {date === 'Flexible Commitment' ? date : new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-3">
                {groupedPromises[date].map((p, index) => (
                  <div
                    key={`${p.failed_payment_id}-${index}`}
                    className="bg-surface-subtle p-3.5 rounded-xl border border-border-subtle flex flex-col justify-between space-y-2.5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-content-primary block">{p.customer_name}</span>
                        <span className="text-[10px] text-content-tertiary font-technical">ID: {p.failed_payment_id}</span>
                      </div>
                      {getStatusBadge(p.status)}
                    </div>
                    
                    <div className="bg-surface p-2 rounded-lg border border-border-subtle">
                      <p className="text-[11px] text-content-secondary italic truncate" title={p.raw_reply}>
                        &ldquo;{p.raw_reply}&rdquo;
                      </p>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-content-tertiary font-sans">
                      <span>Confidence: <strong className="text-content-primary">{(p.confidence * 100).toFixed(0)}%</strong></span>
                      <span>Recorded: {new Date(p.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
