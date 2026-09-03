'use client';

import React, { useState } from 'react';
import { useAppStore, CaseData } from '../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, CheckCircle2, XCircle, AlertTriangle, 
  RefreshCw, Send, Users, ShieldAlert, Sparkles, Database, ShieldCheck, Zap,
  Activity, ArrowUpRight, Lock, Check
} from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';

export default function DecisionStream() {
  const cases = useAppStore((state) => state.cases);
  const setActiveCaseId = useAppStore((state) => state.setActiveCaseId);
  const seedBatch = useAppStore((state) => state.seedBatch);
  const simulationRunning = useAppStore((state) => state.simulationRunning);

  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Handle subtle 2-4px cursor parallax on the visual centerpiece
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // 5 primary recent cases for clean editorial density
  const activeCases = cases.slice(0, 5);

  const getCauseBadge = (cause: string) => {
    switch (cause) {
      case 'insufficient_balance':
        return <span className="text-[11px] font-medium text-brand-amber bg-brand-amber-surface px-2 py-0.5 rounded border border-brand-amber-border">Insufficient Balance</span>;
      case 'bank_timeout':
        return <span className="text-[11px] font-medium text-brand-steel bg-brand-steel-surface px-2 py-0.5 rounded border border-brand-steel-border">Bank Timeout</span>;
      case 'wrong_otp':
        return <span className="text-[11px] font-medium text-brand-steel bg-brand-steel-surface px-2 py-0.5 rounded border border-brand-steel-border">Authentication Error</span>;
      case 'expired_mandate':
        return <span className="text-[11px] font-medium text-brand-amber bg-brand-amber-surface px-2 py-0.5 rounded border border-brand-amber-border">Expired Mandate</span>;
      case 'card_declined':
        return <span className="text-[11px] font-medium text-brand-burgundy bg-brand-burgundy-surface px-2 py-0.5 rounded border border-brand-burgundy-border">Card Declined</span>;
      default:
        return <span className="text-[11px] font-medium text-content-tertiary bg-surface-subtle px-2 py-0.5 rounded border border-border-subtle">Unknown Cause</span>;
    }
  };

  const getActionName = (action: string) => {
    switch (action) {
      case 'silent_retry': return 'Silent Network Retry';
      case 'send_whatsapp_nudge': return 'WhatsApp Recovery Nudge';
      case 'suggest_alt_method': return 'Alt Payment Link';
      case 'escalate_human': return 'Voice Concierge Triage';
      case 'issue_refund': return 'Dual-Signoff Refund';
      default: return 'Suppression (Fatigue Cap)';
    }
  };

  return (
    <div 
      className="w-full space-y-4 perspective-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-brand-jade animate-pulse"></div>
          <h2 className="text-sm font-semibold text-content-primary tracking-tight font-display">
            Recovery Pulse — Capital Flow Pipeline
          </h2>
          <span className="text-[10px] text-content-secondary bg-surface-subtle px-2.5 py-0.5 rounded-full border border-border-subtle font-medium">
            Live Stream
          </span>
        </div>
        <span className="text-xs text-content-tertiary font-sans">
          Select any transaction to inspect mathematical probability & policy trace
        </span>
      </div>

      {cases.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center py-14 px-6 text-center border border-dashed border-border-muted rounded-2xl bg-surface-subtle/50">
          <div className="w-11 h-11 rounded-xl bg-brand-jade-surface border border-brand-jade-border flex items-center justify-center mb-3">
            <Database className="w-5 h-5 text-brand-jade" />
          </div>
          <h3 className="text-sm font-semibold text-content-primary mb-1">Recovery Engine Standby</h3>
          <p className="text-xs text-content-secondary max-w-[420px] mb-4 leading-relaxed">
            There are currently no transactions in the pipeline. Run the recovery engine to ingest failed payments and stream automated triage decisions.
          </p>
          <button
            type="button"
            onClick={() => seedBatch(210)}
            disabled={simulationRunning}
            className="px-4 py-2 rounded-xl bg-brand-jade hover:bg-brand-jade-deep text-white text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            {simulationRunning ? 'Ingesting Batch...' : 'Run Recovery Engine (210 Cases)'}
          </button>
        </div>
      ) : (
        <div 
          className="space-y-2.5 depth-layer-1"
          style={{
            transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0px)`,
            transition: 'transform 0.15s ease-out',
          }}
        >
          {/* Visual Column Guide */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-medium text-content-tertiary uppercase tracking-wider border-b border-border-subtle">
            <div className="col-span-3">1. Failed Payment</div>
            <div className="col-span-3">2. Diagnosis & Prior</div>
            <div className="col-span-3">3. Optimization (ENV)</div>
            <div className="col-span-2">4. Policy Check</div>
            <div className="col-span-1 text-right">5. Outcome</div>
          </div>

          {/* Flowing Event Rows */}
          <AnimatePresence>
            {activeCases.map((c, index) => {
              const isAllow = c.outcome === 'ALLOW';
              const isBlock = c.outcome === 'BLOCK';
              const isEscalate = c.outcome === 'ESCALATE';

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  onClick={() => setActiveCaseId(c.id)}
                  className="surface-card-interactive p-3.5 rounded-xl cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-3 items-center group relative overflow-hidden"
                >
                  {/* Subtle Jade Left Indicator for Recovered */}
                  {c.recovered && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-jade rounded-l-xl" />
                  )}

                  {/* Step 1: Failed Payment */}
                  <div className="lg:col-span-3 flex items-center justify-between lg:justify-start gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-content-primary group-hover:text-brand-jade transition-colors">
                          {c.customer_name}
                        </span>
                        <span className="font-technical text-[10px] text-content-tertiary">
                          {c.id.slice(0, 8)}
                        </span>
                      </div>
                      <span className="font-technical text-xs font-bold text-content-primary mt-0.5 block">
                        ₹{(c.amount_paise / 100.0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Step 2: Diagnosis */}
                  <div className="lg:col-span-3 flex items-center gap-2">
                    {getCauseBadge(c.cause)}
                    <span className="text-[10px] text-content-tertiary font-sans">
                      ({(c.diagnosis_confidence * 100).toFixed(0)}%)
                    </span>
                  </div>

                  {/* Step 3: Optimization */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center gap-1.5 text-xs text-content-primary font-medium">
                      <Zap className="w-3.5 h-3.5 text-brand-brass shrink-0" />
                      <span className="truncate">{getActionName(c.candidate_action)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-technical text-[11px] font-semibold text-brand-jade">
                        ENV: +₹{(c.expected_value / 100.0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-content-tertiary">
                        P={(c.probability_estimate * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Step 4: Policy Check */}
                  <div className="lg:col-span-2 flex items-center gap-2">
                    {isAllow && (
                      <div className="flex items-center gap-1.5 text-brand-jade text-xs font-medium bg-brand-jade-surface px-2.5 py-1 rounded-lg border border-brand-jade-border">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Allowed</span>
                      </div>
                    )}
                    {isBlock && (
                      <div className="flex items-center gap-1.5 text-brand-burgundy text-xs font-medium bg-brand-burgundy-surface px-2.5 py-1 rounded-lg border border-brand-burgundy-border">
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Veto</span>
                      </div>
                    )}
                    {isEscalate && (
                      <div className="flex items-center gap-1.5 text-brand-amber text-xs font-medium bg-brand-amber-surface px-2.5 py-1 rounded-lg border border-brand-amber-border">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Escalate</span>
                      </div>
                    )}
                  </div>

                  {/* Step 5: Outcome */}
                  <div className="lg:col-span-1 text-left lg:text-right">
                    {c.recovered ? (
                      <span className="text-xs font-bold text-brand-jade flex items-center lg:justify-end gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Recovered
                      </span>
                    ) : (
                      <span className="text-xs text-content-tertiary">
                        {isAllow ? 'Dispatched' : 'Protected'}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
