// frontend/components/DecisionStream.tsx
import React from 'react';
import { useAppStore, CaseData } from '../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, CheckCircle2, XCircle, AlertTriangle, AlertCircle, 
  RefreshCw, Send, Users, ShieldAlert, Sparkles, Database, ShieldCheck, Zap
} from 'lucide-react';

export default function DecisionStream() {
  const cases = useAppStore((state) => state.cases);
  const setActiveCaseId = useAppStore((state) => state.setActiveCaseId);
  const seedBatch = useAppStore((state) => state.seedBatch);
  const simulationRunning = useAppStore((state) => state.simulationRunning);

  // Take the most recently active 6 cases for clean, focused layout
  const activeCases = cases.slice(0, 6);

  const getCauseBadge = (cause: string) => {
    switch (cause) {
      case 'insufficient_balance':
        return <span className="text-[11px] font-medium text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Insufficient Balance</span>;
      case 'bank_timeout':
        return <span className="text-[11px] font-medium text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">Bank Timeout</span>;
      case 'wrong_otp':
        return <span className="text-[11px] font-medium text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">Authentication Error</span>;
      case 'expired_mandate':
        return <span className="text-[11px] font-medium text-yellow-300 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">Expired Mandate</span>;
      case 'card_declined':
        return <span className="text-[11px] font-medium text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">Card Declined</span>;
      default:
        return <span className="text-[11px] font-medium text-gray-300 bg-gray-500/10 px-2 py-0.5 rounded border border-gray-500/20">Unknown Cause</span>;
    }
  };

  const getActionName = (action: string) => {
    switch (action) {
      case 'silent_retry': return 'Silent Network Retry';
      case 'send_whatsapp_nudge': return 'WhatsApp Recovery Nudge';
      case 'suggest_alt_method': return 'Alt Payment Link Suggestion';
      case 'escalate_human': return 'Human Support Callback';
      case 'issue_refund': return 'Refund Authorization Flow';
      default: return 'Suppression (Low Yield)';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <h2 className="text-sm font-semibold text-white tracking-tight font-display">
            Recovery Pulse — Real-Time Decision Pipeline
          </h2>
          <span className="text-[10px] text-gray-400 bg-[#161922] px-2.5 py-0.5 rounded-full border border-[#242938]">
            Revora Pulse
          </span>
        </div>
        <span className="text-xs text-gray-400 font-sans">
          Click any transaction row for full decision trace and mathematical justification
        </span>
      </div>

      {cases.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-[#232736] rounded-2xl bg-[#0D0F14]/60">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
            <Database className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <h3 className="text-sm font-semibold text-gray-200 mb-1">Operational Pipeline Standby</h3>
          <p className="text-xs text-gray-400 max-w-[420px] mb-5 leading-relaxed">
            There are currently no transactions in the pipeline. Run the recovery engine to ingest transactions and stream automated triage decisions.
          </p>
          <button
            onClick={() => seedBatch(210)}
            disabled={simulationRunning}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wide transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
          >
            {simulationRunning ? 'Ingesting Batch...' : 'Run Recovery Engine (210 Cases)'}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Column Header Guide */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-medium text-gray-400 uppercase tracking-wider border-b border-[#1E222D]">
            <div className="col-span-3">1. Failed Event</div>
            <div className="col-span-3">2. AI Diagnosis</div>
            <div className="col-span-3">3. PuLP Allocation (ENV)</div>
            <div className="col-span-2">4. Policy Gate</div>
            <div className="col-span-1 text-right">5. Status</div>
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  onClick={() => setActiveCaseId(c.id)}
                  className="surface-card-interactive p-4 rounded-xl cursor-pointer grid grid-cols-1 lg:grid-cols-12 gap-3 items-center group shadow-sm"
                >
                  {/* Step 1: Failed Event */}
                  <div className="lg:col-span-3 flex items-center justify-between lg:justify-start gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                          {c.customer_name}
                        </span>
                        <span className="font-technical text-[10px] text-gray-400">
                          {c.id.slice(0, 8)}
                        </span>
                      </div>
                      <span className="font-technical text-xs font-bold text-gray-200 mt-0.5 block">
                        ₹{(c.amount_paise / 100.0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Step 2: AI Diagnosis */}
                  <div className="lg:col-span-3 flex items-center gap-2">
                    {getCauseBadge(c.cause)}
                    <span className="text-[10px] text-gray-400 font-sans">
                      ({(c.diagnosis_confidence * 100).toFixed(0)}% conf)
                    </span>
                  </div>

                  {/* Step 3: PuLP Allocation */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-200 font-medium">
                      <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span className="truncate">{getActionName(c.candidate_action)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-technical text-[11px] font-semibold text-emerald-400">
                        ENV: +₹{(c.expected_value / 100.0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        P(rec)={c.probability_estimate.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Step 4: Policy Gate */}
                  <div className="lg:col-span-2 flex items-center gap-2">
                    {isAllow && (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Allowed</span>
                      </div>
                    )}
                    {isBlock && (
                      <div className="flex items-center gap-1.5 text-rose-400 text-xs font-medium bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Veto: {c.rule_fired.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                    {isEscalate && (
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Escalate</span>
                      </div>
                    )}
                  </div>

                  {/* Step 5: Status */}
                  <div className="lg:col-span-1 text-left lg:text-right">
                    {c.recovered ? (
                      <span className="text-xs font-bold text-emerald-400">
                        Recovered
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
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

