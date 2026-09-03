'use client';

import React, { useState } from 'react';
import { useAppStore, CaseData } from '../lib/store';
import { 
  Search, Filter, CheckCircle2, AlertTriangle, XCircle, Zap, 
  Calculator, Activity, MessageSquare, ShieldCheck, ArrowRight, 
  Database, RefreshCw, Send, Lock, UserCheck, Check, Sparkles 
} from 'lucide-react';
import WhatsAppSimulator from './WhatsAppSimulator';
import AnimatedNumber from './AnimatedNumber';

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

  // Selected case
  const selectedCase = cases.find(c => c.id === activeCaseId) || filteredCases[0] || cases[0];

  if (cases.length === 0) {
    return (
      <div className="surface-card rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-brand-jade-surface border border-brand-jade-border flex items-center justify-center text-brand-jade">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-content-primary font-display">No Decisions In Queue</h3>
          <p className="text-xs text-content-secondary max-w-[440px] mt-1 leading-relaxed">
            Run the recovery engine to ingest failed payment events, compute Bayesian probabilities, solve LP allocations, and gate through safety policies.
          </p>
        </div>
        <button
          type="button"
          onClick={() => seedBatch(210)}
          disabled={simulationRunning}
          className="px-5 py-2.5 rounded-xl bg-brand-jade hover:bg-brand-jade-deep text-white text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer disabled:opacity-50"
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
    { action: 'escalate_human', name: 'Voice Concierge Triage', cost: 150, p: 0.85 },
    { action: 'suppress', name: 'Suppression (Fatigue Cap)', cost: 0, p: 0.0 }
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
            <Search className="w-4 h-4 text-content-tertiary absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customer, ID, or cause..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-subtle border border-border-subtle rounded-xl pl-9 pr-3 py-2 text-xs text-content-primary placeholder-content-muted focus:outline-none focus:border-brand-jade font-sans"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'RECOVERED', 'ALLOW', 'BLOCK', 'ESCALATE'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setFilterOutcome(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterOutcome === filter
                  ? 'bg-brand-jade text-white font-semibold shadow-sm'
                  : 'bg-surface text-content-secondary hover:text-content-primary border border-border-subtle'
              }`}
            >
              {filter === 'ALL' ? 'All Transactions' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Column Decision Exploration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Transaction Queue (5 Cols) */}
        <div className="lg:col-span-5 surface-card rounded-2xl p-4 space-y-2 max-h-[740px] overflow-y-auto">
          <div className="flex justify-between items-center px-2 py-1 text-xs text-content-secondary border-b border-border-subtle pb-2">
            <span className="font-semibold text-content-primary">Payment Queue</span>
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
                    ? 'bg-surface-elevated border-brand-jade shadow-sm ring-1 ring-brand-jade/20'
                    : isRecovered
                    ? 'bg-surface border-brand-jade-border hover:border-brand-jade'
                    : isBlocked
                    ? 'bg-surface border-brand-burgundy-border hover:border-brand-burgundy'
                    : isEscalated
                    ? 'bg-surface border-brand-amber-border hover:border-brand-amber'
                    : 'bg-surface border-border-subtle hover:border-border-muted'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-semibold text-content-primary block">{item.customer_name}</span>
                    <span className="text-[10px] text-content-tertiary font-technical">ID: {item.id.slice(0, 10)}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-technical text-xs font-bold text-content-primary block">
                      ₹{(item.amount_paise / 100.0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-[10px] text-brand-jade font-medium">
                      {(item.probability_estimate * 100).toFixed(0)}% P(rec)
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] mt-2.5 pt-2 border-t border-border-subtle">
                  <span className="capitalize text-content-secondary font-medium">{item.cause.replace(/_/g, ' ')}</span>
                  <span className={`px-2 py-0.5 rounded font-medium uppercase text-[9px] ${
                    item.lifecycle_state === 'RECOVERED'
                      ? 'bg-brand-jade-surface text-brand-jade border border-brand-jade-border'
                      : item.lifecycle_state === 'CONTACTED'
                      ? 'bg-brand-steel-surface text-brand-steel border border-brand-steel-border'
                      : item.lifecycle_state === 'SUPPRESSED'
                      ? 'bg-surface-subtle text-content-tertiary border border-border-subtle'
                      : item.lifecycle_state === 'ESCALATED'
                      ? 'bg-brand-amber-surface text-brand-amber border border-brand-amber-border'
                      : 'bg-surface-subtle text-content-secondary'
                  }`}>
                    {item.lifecycle_state || item.outcome}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Progressive Decision Intelligence Panel (7 Cols) */}
        {selectedCase ? (
          <div className="lg:col-span-7 space-y-4">
            {/* Visual Hierarchy: Data -> Diagnosis -> Expected Value -> Optimization -> Policy -> Action */}
            <div className="surface-card rounded-2xl p-4 bg-surface-subtle border border-border-subtle">
              <span className="text-[10px] font-semibold text-content-tertiary uppercase tracking-wider block mb-2">
                Decision Pipeline Hierarchy
              </span>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-content-secondary font-sans">
                <span className="bg-surface px-2.5 py-1 rounded-md border border-border-subtle font-medium text-content-primary">
                  1. Payment Ingestion
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-content-muted" />
                <span className="bg-surface px-2.5 py-1 rounded-md border border-border-subtle font-medium text-brand-steel">
                  2. Diagnosis ({c.cause.replace(/_/g, ' ')})
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-content-muted" />
                <span className="bg-surface px-2.5 py-1 rounded-md border border-border-subtle font-medium text-brand-brass">
                  3. Expected Value (+₹{evRupees.toFixed(2)})
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-content-muted" />
                <span className="bg-surface px-2.5 py-1 rounded-md border border-border-subtle font-medium text-brand-jade">
                  4. Action ({c.candidate_action.replace(/_/g, ' ')})
                </span>
              </div>
            </div>

            {/* Primary Action Card */}
            <div className="surface-card rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-start border-b border-border-subtle pb-3">
                <div>
                  <span className="text-xs font-semibold text-brand-jade uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Optimal Action Selected
                  </span>
                  <h3 className="text-lg font-bold text-content-primary capitalize font-display mt-1">
                    {c.candidate_action.replace(/_/g, ' ')}
                  </h3>
                  <span className="text-xs text-content-secondary">
                    Channel: <strong className="text-content-primary uppercase">{c.channel || 'Auto'}</strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-technical text-lg font-bold text-brand-jade block">
                    +₹{evRupees.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-content-tertiary">Expected Net Value</span>
                </div>
              </div>

              {/* Metric Highlights */}
              <div className="grid grid-cols-3 gap-3 text-xs bg-surface-subtle p-3 rounded-xl border border-border-subtle">
                <div>
                  <span className="text-content-tertiary block text-[10px]">Payment Value</span>
                  <span className="font-technical font-bold text-content-primary">₹{amountRupees.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-content-tertiary block text-[10px]">P(Recovery)</span>
                  <span className="font-technical font-bold text-brand-jade">{(pRecovery * 100).toFixed(0)}%</span>
                </div>
                <div>
                  <span className="text-content-tertiary block text-[10px]">Channel Cost</span>
                  <span className="font-technical font-bold text-content-secondary">₹{costRupees.toFixed(2)}</span>
                </div>
              </div>

              {/* Why Justification */}
              <div className="bg-surface-subtle p-3.5 rounded-xl border border-border-subtle text-xs text-content-secondary leading-relaxed">
                <span className="font-semibold text-content-primary block mb-0.5">Decision Justification:</span>
                {c.triage_reason || `Optimized allocation selected '${c.candidate_action}' to maximize expected net value while adhering to capacity and fatigue limits.`}
              </div>
            </div>

            {/* Why Not The Alternatives? Comparison */}
            <div className="surface-card rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-border-subtle pb-2">
                <h4 className="text-xs font-semibold text-content-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-brand-steel" />
                  Why Not The Alternatives?
                </h4>
                <span className="text-[10px] text-content-tertiary font-sans">Ranked by Net EV</span>
              </div>

              <div className="space-y-2.5">
                {channelEVs.map(ch => {
                  const isSelected = ch.action === c.candidate_action;
                  const ratio = Math.max(0, Math.min(100, (ch.expectedNetRupees / maxNetEV) * 100));

                  return (
                    <div key={ch.action} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className={isSelected ? 'font-semibold text-brand-jade' : 'text-content-secondary'}>
                          {ch.name}
                        </span>
                        <span className={`font-technical text-xs ${isSelected ? 'font-bold text-brand-jade' : 'text-content-tertiary'}`}>
                          ₹{ch.expectedNetRupees.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-surface-subtle h-1.5 rounded-full overflow-hidden border border-border-subtle">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSelected ? 'bg-brand-jade' : 'bg-content-muted'
                          }`}
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Embedded WhatsApp Simulator */}
            <WhatsAppSimulator />
          </div>
        ) : null}
      </div>
    </div>
  );
}
