// frontend/components/DecisionStream.tsx
import React from 'react';
import { useAppStore, CaseData } from '../lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, XCircle, AlertTriangle, AlertCircle, RefreshCw, Send, Users, ShieldAlert, Sparkles, Database } from 'lucide-react';

export default function DecisionStream() {
  const cases = useAppStore((state) => state.cases);
  const setActiveCaseId = useAppStore((state) => state.setActiveCaseId);
  const seedBatch = useAppStore((state) => state.seedBatch);
  const simulationRunning = useAppStore((state) => state.simulationRunning);

  // Take the most recently updated 8 cases to show a clean live stream without DOM bloat
  const activeCases = cases.slice(0, 8);

  const getCauseColor = (cause: string) => {
    switch (cause) {
      case 'insufficient_balance': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'bank_timeout': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'wrong_otp': return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'expired_mandate': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'card_declined': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'silent_retry': return <RefreshCw className="w-3.5 h-3.5 text-sky-400" />;
      case 'send_whatsapp_nudge':
      case 'suggest_alt_method': return <Send className="w-3.5 h-3.5 text-emerald-400" />;
      case 'escalate_human': return <Users className="w-3.5 h-3.5 text-amber-400" />;
      case 'issue_refund': return <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />;
      default: return <AlertCircle className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-bold tracking-tight">Live Decision Pipeline Stream</h2>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-medium border border-emerald-500/20">
          Revora Pulse
        </span>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-mono font-medium animate-pulse-slow">
          WS Stream Active
        </span>
      </div>

      {cases.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-[#232630] rounded-2xl bg-[#13151C]/25 shadow-inner">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <Database className="w-6 h-6 text-emerald-400 animate-pulse" />
          </div>
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-1.5">Operational Pipeline Empty</h3>
          <p className="text-xs text-gray-500 max-w-[420px] mb-5 leading-normal">
            There are currently no transaction cases ingested in the decision stream. Ingest a synthetic batch of 200+ payments to see the triage engine and guardrail policy gate operate.
          </p>
          <button
            onClick={() => seedBatch(210)}
            disabled={simulationRunning}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-black uppercase tracking-wider transition-all duration-200 shadow-md shadow-emerald-500/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {simulationRunning ? 'Seeding Batch...' : 'Seed 200+ Demo Batch'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Column 1: Diagnosed */}
          <div className="bg-[#13151C]/40 border border-[#232630]/60 rounded-xl p-4 min-h-[350px] flex flex-col">
            <div className="flex justify-between items-center mb-3 border-b border-[#232630] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                1. Diagnosed
              </h3>
              <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                Revora Intelligence
              </span>
            </div>
            <div className="flex-1 space-y-3">
              <AnimatePresence>
                {activeCases.map((c) => (
                  <motion.div
                    key={`diag-${c.id}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setActiveCaseId(c.id)}
                    className="bg-[#13151C] border border-[#232630] hover:border-gray-700 p-3 rounded-lg cursor-pointer transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[11px] font-semibold text-gray-300 truncate max-w-[120px]">
                        {c.customer_name}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-gray-400">
                        ₹{(c.amount_paise / 100.0).toFixed(2)}
                      </span>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded border inline-block capitalize ${getCauseColor(c.cause)}`}>
                      {c.cause.replace('_', ' ')}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Column 2: Triaged (LP Allocated) */}
          <div className="bg-[#13151C]/40 border border-[#232630]/60 rounded-xl p-4 min-h-[350px] flex flex-col">
            <div className="flex justify-between items-center mb-3 border-b border-[#232630] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                2. Triaged
              </h3>
              <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                Revora Optimizer
              </span>
            </div>
            <div className="flex-1 space-y-3">
              <AnimatePresence>
                {activeCases.map((c) => (
                  <motion.div
                    key={`triage-${c.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setActiveCaseId(c.id)}
                    className="bg-[#13151C] border border-[#232630] hover:border-gray-700 p-3 rounded-lg cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 justify-between mb-1.5">
                      <span className="text-[10px] font-mono text-gray-400">EV: +₹{(c.expected_value / 100.0).toFixed(2)}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${c.allocated ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {c.allocated ? 'Allocated' : 'Suppressed'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-300">
                      {getActionIcon(c.candidate_action)}
                      <span className="capitalize font-medium text-[11px]">{c.candidate_action.replace(/_/g, ' ')}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Column 3: Gated (Guardrail Check) */}
          <div className="bg-[#13151C]/40 border border-[#232630]/60 rounded-xl p-4 min-h-[350px] flex flex-col">
            <div className="flex justify-between items-center mb-3 border-b border-[#232630] pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                3. Gated
              </h3>
              <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                Revora Guard
              </span>
            </div>

            <div className="flex-1 space-y-3">
              <AnimatePresence>
                {activeCases.map((c) => {
                  const isBlock = c.outcome === 'BLOCK';
                  const isEscalate = c.outcome === 'ESCALATE';
                  const isAllow = c.outcome === 'ALLOW';

                  return (
                    <motion.div
                      key={`gate-${c.id}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        x: isBlock ? [0, -4, 4, -4, 4, 0] : 0
                      }}
                      transition={{ duration: isBlock ? 0.4 : 0.2 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setActiveCaseId(c.id)}
                      className={`p-3 rounded-lg cursor-pointer border ${
                        isBlock ? 'bg-red-500/5 border-red-500/30' :
                        isEscalate ? 'bg-amber-500/5 border-amber-500/30' :
                        'bg-emerald-500/5 border-emerald-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isAllow && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {isBlock && <XCircle className="w-4 h-4 text-red-400" />}
                          {isEscalate && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                          <span className="text-xs font-bold font-mono">
                            {c.outcome}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-500 font-mono">
                          {c.rule_fired !== 'none' ? c.rule_fired : 'Clean pass'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Column 4: Executed / Resolved */}
          <div className="bg-[#13151C]/40 border border-[#232630]/60 rounded-xl p-4 min-h-[350px] flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 border-b border-[#232630] pb-2">
              4. Executed Status
            </h3>
            <div className="flex-1 space-y-3">
              <AnimatePresence>
                {activeCases.map((c) => (
                  <motion.div
                    key={`exec-${c.id}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setActiveCaseId(c.id)}
                    className={`bg-[#13151C] border p-3 rounded-lg cursor-pointer ${
                      c.recovered 
                        ? 'border-emerald-500/40 bg-emerald-500/5' 
                        : c.degraded 
                        ? 'border-amber-500/30 border-dashed bg-amber-500/5'
                        : 'border-[#232630]'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold">
                        {c.recovered ? '₹ recovered!' : c.outcome === 'ALLOW' ? 'Action Executed' : 'Action Aborted'}
                      </span>
                      {c.degraded && (
                        <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded uppercase font-mono" title={c.degradation_reason}>
                          Degraded
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 font-mono">
                      {c.recovered 
                        ? `Recovered: +₹${(c.amount_recovered_paise / 100.0).toFixed(2)}` 
                        : c.outcome === 'ALLOW' 
                        ? 'Link sent / Retry fired'
                        : `Veto: ${c.rule_fired.replace(/_/g, ' ')}`}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
