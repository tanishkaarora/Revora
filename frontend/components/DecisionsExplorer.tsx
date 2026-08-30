// frontend/components/DecisionsExplorer.tsx
import React, { useState } from 'react';
import { useAppStore, CaseData } from '../lib/store';
import { 
  Search, Filter, CheckCircle2, AlertTriangle, XCircle, Zap, 
  Calculator, Activity, MessageSquare, ShieldCheck, ArrowRight, 
  Database, RefreshCw, Send, Lock, UserCheck, AlertOctagon 
} from 'lucide-react';
import WhatsAppSimulator from './WhatsAppSimulator';

export default function DecisionsExplorer() {
  const cases = useAppStore((state) => state.cases);
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const setActiveCaseId = useAppStore((state) => state.setActiveCaseId);
  const seedBatch = useAppStore((state) => state.seedBatch);
  const simulationRunning = useAppStore((state) => state.simulationRunning);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'RECOVERED' | 'ALLOW' | 'BLOCK' | 'ESCALATE'>('ALL');

  // Filter cases
  const filteredCases = cases.filter(c => {
    const matchesSearch = 
      c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cause.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterOutcome === 'ALL') return true;
    if (filterOutcome === 'RECOVERED') return c.recovered;
    return c.outcome === filterOutcome;
  });

  // Selected case (default to activeCaseId or first case)
  const selectedCase = cases.find(c => c.id === activeCaseId) || filteredCases[0] || cases[0];

  if (cases.length === 0) {
    return (
      <div className="surface-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white font-display">No Decisions Generated Yet</h3>
          <p className="text-xs text-gray-400 max-w-[440px] mt-1 leading-relaxed">
            Run the autonomous recovery engine to ingest failed payment events, compute Bayesian probabilities, solve LP allocations, and gate through safety policies.
          </p>
        </div>
        <button
          onClick={() => seedBatch(210)}
          disabled={simulationRunning}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wide transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
        >
          {simulationRunning ? 'Processing Pipeline...' : 'Run Recovery Engine (210 Cases)'}
        </button>
      </div>
    );
  }

  // Selected case metrics
  const c = selectedCase;
  const amountRupees = c ? c.amount_paise / 100.0 : 0;
  const costRupees = c ? c.cost / 100.0 : 0;
  const evRupees = c ? c.expected_value / 100.0 : 0;
  const pRecovery = c ? c.probability_estimate : 0;

  // Comparison channels
  const candidateActions = [
    { action: 'silent_retry', name: 'Silent Network Retry', cost: 0, p: c?.cause === 'bank_timeout' ? 0.80 : 0.05 },
    { action: 'send_whatsapp_nudge', name: 'WhatsApp Nudge', cost: 5, p: 0.65 },
    { action: 'suggest_alt_method', name: 'Alt Method Suggestion', cost: 5, p: 0.70 },
    { action: 'escalate_human', name: 'Human Support Callback', cost: 150, p: 0.85 },
    { action: 'suppress', name: 'Suppression (No Outreach)', cost: 0, p: 0.0 }
  ];

  const channelEVs = candidateActions.map(ch => {
    const gross = ch.p * amountRupees;
    const net = gross - ch.cost;
    return { ...ch, expectedNetRupees: net };
  }).sort((a, b) => b.expectedNetRupees - a.expectedNetRupees);

  const maxNetEV = Math.max(...channelEVs.map(ch => ch.expectedNetRupees), 1);

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by customer, ID, or cause..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111319] border border-[#1E222D] rounded-xl pl-9 pr-3 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 font-sans"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'RECOVERED', 'ALLOW', 'BLOCK', 'ESCALATE'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterOutcome(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterOutcome === filter
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold'
                  : 'bg-[#111319] text-gray-400 hover:text-gray-200 border border-[#1E222D]'
              }`}
            >
              {filter === 'ALL' ? 'All Transactions' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Column Decision Exploration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Transaction Queue (5-6 Cols) */}
        <div className="lg:col-span-6 xl:col-span-5 surface-card rounded-2xl p-4 space-y-2 max-h-[720px] overflow-y-auto">
          <div className="flex justify-between items-center px-2 py-1 text-xs text-gray-400 border-b border-[#1E222D] pb-2">
            <span className="font-semibold text-white">Payment Queue</span>
            <span className="font-technical text-[11px]">{filteredCases.length} items</span>
          </div>

          {filteredCases.map((item) => {
            const isSelected = selectedCase?.id === item.id;
            const isRecovered = item.recovered;
            const isBlocked = item.outcome === 'BLOCK';
            const isEscalated = item.outcome === 'ESCALATE';

            return (
              <div
                key={item.id}
                onClick={() => setActiveCaseId(item.id)}
                className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-[#1A1E29] border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                    : isRecovered
                    ? 'bg-[#11141C] border-emerald-500/20 hover:border-emerald-500/40'
                    : isBlocked
                    ? 'bg-[#141116] border-rose-500/20 hover:border-rose-500/40'
                    : isEscalated
                    ? 'bg-[#161410] border-amber-500/20 hover:border-amber-500/40'
                    : 'bg-[#111319] border-[#1E222D] hover:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-white block">{item.customer_name}</span>
                    <span className="text-[10px] text-gray-500 font-technical">ID: {item.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-technical text-xs font-bold text-white block">
                      ₹{(item.amount_paise / 100.0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {(item.probability_estimate * 100).toFixed(0)}% P(rec)
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] mt-2.5 pt-2 border-t border-[#1C202C]">
                  <span className="capitalize text-gray-400 font-medium">{item.cause.replace(/_/g, ' ')}</span>
                  <span className={`px-2 py-0.5 rounded font-medium uppercase text-[9px] ${
                    item.lifecycle_state === 'RECOVERED'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : item.lifecycle_state === 'CONTACTED'
                      ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                      : item.lifecycle_state === 'SUPPRESSED'
                      ? 'bg-gray-800 text-gray-400'
                      : item.lifecycle_state === 'ESCALATED'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      : 'bg-gray-800 text-gray-300'
                  }`}>
                    {item.lifecycle_state || item.outcome}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Progressive Decision Detail Panel (6-7 Cols) */}
        {selectedCase ? (
          <div className="lg:col-span-6 xl:col-span-7 space-y-4">
            {/* Primary Action Card */}
            <div className="surface-card rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-start border-b border-[#1E222D] pb-3">
                <div>
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Optimal Action Selected
                  </span>
                  <h3 className="text-lg font-bold text-white capitalize font-display mt-1">
                    {c.candidate_action.replace(/_/g, ' ')}
                  </h3>
                  <span className="text-xs text-gray-400">
                    Channel: <strong className="text-gray-200 uppercase">{c.channel || 'Auto'}</strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-technical text-lg font-bold text-emerald-400 block">
                    +₹{evRupees.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-gray-400">Expected Net Value (ENV)</span>
                </div>
              </div>

              {/* Metric Highlights */}
              <div className="grid grid-cols-3 gap-3 text-xs bg-[#0A0B0E] p-3 rounded-xl border border-[#1E222D]">
                <div>
                  <span className="text-gray-400 block text-[10px]">Transaction Value</span>
                  <span className="font-technical font-bold text-white">₹{amountRupees.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Recovery Probability</span>
                  <span className="font-technical font-bold text-emerald-400">{(pRecovery * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Direct Cost</span>
                  <span className="font-technical font-bold text-gray-300">₹{costRupees.toFixed(2)}</span>
                </div>
              </div>

              {/* Why One-Liner */}
              <div className="bg-[#12141D] p-3 rounded-xl border border-[#1E222D] text-xs text-gray-300 leading-relaxed">
                <span className="font-semibold text-indigo-300 block mb-0.5">Decision Justification:</span>
                {c.triage_reason || `Optimized allocation selected '${c.candidate_action}' to maximize expected net revenue while adhering to channel capacity and fatigue limits.`}
              </div>
            </div>

            {/* Why Not The Alternatives? Comparison Bars */}
            <div className="surface-card rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-[#1E222D] pb-2">
                <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-purple-400" />
                  Why Not The Alternatives?
                </h4>
                <span className="text-[10px] text-gray-500">Ranked by Net EV</span>
              </div>

              <div className="space-y-2.5">
                {channelEVs.map(ch => {
                  const isSelected = ch.action === c.candidate_action;
                  const ratio = Math.max(0, Math.min(100, (ch.expectedNetRupees / maxNetEV) * 100));

                  return (
                    <div key={ch.action} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className={isSelected ? 'font-semibold text-emerald-400' : 'text-gray-400'}>
                          {ch.name}
                        </span>
                        <span className={`font-technical text-xs ${isSelected ? 'font-bold text-emerald-400' : 'text-gray-400'}`}>
                          ₹{ch.expectedNetRupees.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-[#1A1D27] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSelected ? 'bg-emerald-500' : 'bg-gray-700'
                          }`}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive WhatsApp Simulator Preview */}
            <WhatsAppSimulator />
          </div>
        ) : null}
      </div>
    </div>
  );
}
