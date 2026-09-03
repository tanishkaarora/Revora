'use client';

import React from 'react';
import { useAppStore } from '../lib/store';
import { 
  Send, RefreshCw, UserCheck, Ban, ArrowRight, CheckCircle2 
} from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';

export default function RecoveryFunnel() {
  const cases = useAppStore((state) => state.cases);

  // Stage: Channel Allocations
  const whatsappAlloc = cases.filter(c => c.allocated && (c.candidate_action === 'send_whatsapp_nudge' || c.candidate_action === 'suggest_alt_method'));
  const humanAlloc = cases.filter(c => c.allocated && c.candidate_action === 'escalate_human');
  const retryAlloc = cases.filter(c => c.allocated && c.candidate_action === 'silent_retry');
  const suppressedCases = cases.filter(c => !c.allocated || c.candidate_action === 'suppress');

  const whatsappRupees = whatsappAlloc.reduce((acc, c) => acc + c.amount_paise, 0) / 100.0;
  const humanRupees = humanAlloc.reduce((acc, c) => acc + c.amount_paise, 0) / 100.0;
  const retryRupees = retryAlloc.reduce((acc, c) => acc + c.amount_paise, 0) / 100.0;
  const suppressedRupees = suppressedCases.reduce((acc, c) => acc + c.amount_paise, 0) / 100.0;

  // Recovered totals
  const recoveredCases = cases.filter(c => c.recovered);
  const recoveredValueRupees = recoveredCases.reduce((acc, c) => acc + c.amount_recovered_paise, 0) / 100.0;
  const totalValueRupees = cases.reduce((acc, c) => acc + c.amount_paise, 0) / 100.0;
  const recoveryRate = totalValueRupees > 0 ? (recoveredValueRupees / totalValueRupees) * 100.0 : 0.0;

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-content-primary tracking-tight font-display">
              Capital Flow & Channel Routing Distribution
            </h3>
            <span className="text-[10px] text-brand-steel bg-brand-steel-surface px-2.5 py-0.5 rounded-full border border-brand-steel-border font-medium">
              Routing Matrix
            </span>
          </div>
          <p className="text-xs text-content-secondary mt-0.5">
            Optimal routing of failed capital across automated channels and policy-suppressed cohorts.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-content-secondary">
          <span>Aggregate Yield:</span>
          <span className="text-sm font-bold font-technical text-brand-jade">
            {recoveryRate.toFixed(1)}% (₹{recoveredValueRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
          </span>
        </div>
      </div>

      {/* 4 Clean Channel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* WhatsApp Channel */}
        <div className="bg-surface-subtle p-4 rounded-xl border border-border-subtle space-y-2.5 hover:border-brand-jade-border transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="text-brand-jade font-semibold flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> WhatsApp Nudges
            </span>
            <span className="text-content-tertiary font-technical text-[11px]">{whatsappAlloc.length} cases</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-technical text-lg font-bold text-content-primary">
              <AnimatedNumber value={whatsappRupees} prefix="₹" />
            </span>
            <span className="text-[11px] text-brand-jade font-medium">P(rec) ~ 74%</span>
          </div>
          <p className="text-[11px] text-content-secondary pt-1.5 border-t border-border-subtle leading-relaxed">
            Direct payment links with smart expiration nudges.
          </p>
        </div>

        {/* Silent Retry Channel */}
        <div className="bg-surface-subtle p-4 rounded-xl border border-border-subtle space-y-2.5 hover:border-brand-steel-border transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="text-brand-steel font-semibold flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Silent Network Retry
            </span>
            <span className="text-content-tertiary font-technical text-[11px]">{retryAlloc.length} cases</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-technical text-lg font-bold text-content-primary">
              <AnimatedNumber value={retryRupees} prefix="₹" />
            </span>
            <span className="text-[11px] text-brand-steel font-medium">₹0 Direct Cost</span>
          </div>
          <p className="text-[11px] text-content-secondary pt-1.5 border-t border-border-subtle leading-relaxed">
            Zero-contact retry during gateway timeouts.
          </p>
        </div>

        {/* Voice Concierge Triage */}
        <div className="bg-surface-subtle p-4 rounded-xl border border-border-subtle space-y-2.5 hover:border-brand-brass-border transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="text-brand-brass font-semibold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Voice Concierge
            </span>
            <span className="text-content-tertiary font-technical text-[11px]">{humanAlloc.length} cases</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-technical text-lg font-bold text-content-primary">
              <AnimatedNumber value={humanRupees} prefix="₹" />
            </span>
            <span className="text-[11px] text-brand-brass font-medium">Top High Ticket</span>
          </div>
          <p className="text-[11px] text-content-secondary pt-1.5 border-t border-border-subtle leading-relaxed">
            Dedicated human triage reserved for high-value transactions.
          </p>
        </div>

        {/* Suppression & Policy Guard */}
        <div className="bg-surface-subtle p-4 rounded-xl border border-border-subtle space-y-2.5 hover:border-brand-burgundy-border transition-all">
          <div className="flex items-center justify-between text-xs">
            <span className="text-brand-burgundy font-semibold flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5" /> Suppressed Outreach
            </span>
            <span className="text-content-tertiary font-technical text-[11px]">{suppressedCases.length} cases</span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-technical text-lg font-bold text-content-primary">
              <AnimatedNumber value={suppressedRupees} prefix="₹" />
            </span>
            <span className="text-[11px] text-content-tertiary font-medium">Fatigue Protected</span>
          </div>
          <p className="text-[11px] text-content-secondary pt-1.5 border-t border-border-subtle leading-relaxed">
            Suppressed to honor quiet hours and negative ENV.
          </p>
        </div>
      </div>
    </div>
  );
}
