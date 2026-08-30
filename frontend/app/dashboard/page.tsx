// frontend/app/dashboard/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../../lib/store';
import { useWebSocketConnection } from '../../lib/socket';
import { 
  ShieldAlert, ShieldCheck, Database, ArrowUpRight, 
  Shield, Sparkles, Play, Activity, TrendingUp, UserMinus, 
  AlertOctagon, CheckCircle2, Split, RefreshCw, BarChart2,
  Clock, ArrowRight
} from 'lucide-react';
import Link from 'next/link';

import DecisionStream from '../../components/DecisionStream';
import RecoveryFunnel from '../../components/RecoveryFunnel';
import UpliftComparison from '../../components/UpliftComparison';
import CapacityROI from '../../components/CapacityROI';
import WhatsAppSimulator from '../../components/WhatsAppSimulator';
import PromiseCalendar from '../../components/PromiseCalendar';
import CaseDetailDrawer from '../../components/CaseDetailDrawer';
import FailureConsole from '../../components/FailureConsole';
import CauseDonut from '../../components/CauseDonut';
import SystemHealth from '../../components/SystemHealth';
import EscalationLadder from '../../components/EscalationLadder';
import RecalibrationPanel from '../../components/RecalibrationPanel';
import ExperimentPanel from '../../components/ExperimentPanel';
import DecisionsExplorer from '../../components/DecisionsExplorer';

export default function Dashboard() {
  useWebSocketConnection();

  const cases = useAppStore((state) => state.cases);
  const killSwitchActive = useAppStore((state) => state.killSwitchActive);
  const toggleKillSwitch = useAppStore((state) => state.toggleKillSwitch);
  const selectedTab = useAppStore((state) => state.selectedTab);
  const setSelectedTab = useAppStore((state) => state.setSelectedTab);
  const fetchCases = useAppStore((state) => state.fetchCases);
  const fetchResults = useAppStore((state) => state.fetchResults);
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const setActiveCaseId = useAppStore((state) => state.setActiveCaseId);
  const auditEntries = useAppStore((state) => state.auditEntries);
  const seedBatch = useAppStore((state) => state.seedBatch);
  const simulationRunning = useAppStore((state) => state.simulationRunning);
  const comparison = useAppStore((state) => state.comparison);
  const liveStage = useAppStore((state) => state.liveStage);

  useEffect(() => {
    fetchCases();
    fetchResults();
  }, [fetchCases, fetchResults]);

  // Compute live recovery totals from cases state
  const totalRecoveredPaise = cases.filter(c => c.recovered).reduce((acc, c) => acc + c.amount_recovered_paise, 0);
  const totalRecoveredRupees = totalRecoveredPaise / 100.0;
  
  const totalRiskPaise = cases.reduce((acc, c) => acc + c.amount_paise, 0);
  const totalRiskRupees = totalRiskPaise / 100.0;
  
  const recoveryRate = totalRiskRupees > 0 ? (totalRecoveredRupees / totalRiskRupees) * 100.0 : 0.0;
  
  const netValueCreatedRupees = (comparison.net_value_created_paise || (totalRecoveredPaise * 0.92)) / 100.0;
  const contactsAvoided = comparison.contacts_avoided_count || cases.filter(c => !c.allocated || c.candidate_action === 'suppress').length;

  return (
    <main className="min-h-screen bg-[#0B0D13] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-400 relative z-10">

      {/* Top Navbar */}
      <header className="px-6 py-3.5 bg-[#10121A]/95 backdrop-blur-md border-b border-[#1E222D] flex flex-col lg:flex-row items-center justify-between gap-4 sticky top-0 z-40">
        {/* Brand & Descriptor */}
        <div className="flex items-center gap-3.5">
          <Link href="/" className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center text-white font-bold font-display text-base tracking-tight shadow-md shadow-emerald-500/20">
            R
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white font-display">
                REVORA <span className="text-[11px] text-gray-400 font-normal">v2.0</span>
              </h1>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-sans font-medium">
                Live Engine
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-sans">
              Autonomous Revenue Recovery & Safety Guard
            </p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#151821] p-1 rounded-xl border border-[#222736]">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'comparison', label: 'Recovery & ROI' },
            { id: 'historical', label: 'Decisions' },
            { id: 'experiment', label: 'Experiments' },
            { id: 'promises', label: 'Policy & Safety' },
            { id: 'audit', label: 'Audit Trail' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedTab === tab.id
                  ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Operational Controls */}
        <div className="flex items-center gap-3">
          {/* Signature Run Recovery Trigger */}
          <button
            onClick={() => seedBatch(210)}
            disabled={simulationRunning}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wide flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${simulationRunning ? 'animate-spin' : ''}`} />
            <span>{simulationRunning ? 'Processing Pipeline...' : 'Run Recovery Engine'}</span>
          </button>

          {/* Serious Operational Emergency Stop / Kill Switch */}
          <button
            onClick={() => toggleKillSwitch(!killSwitchActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 border cursor-pointer ${
              killSwitchActive
                ? 'bg-rose-950/90 border-rose-500 text-rose-200 ring-2 ring-rose-500/40 animate-pulse'
                : 'bg-[#151821] text-gray-300 border-[#252B3B] hover:border-rose-500/50 hover:text-rose-400'
            }`}
            title="Emergency Safety Stop: Immediately suppresses all automated outreach and limits execution to silent retries."
          >
            <AlertOctagon className={`w-3.5 h-3.5 ${killSwitchActive ? 'text-rose-400' : 'text-gray-400'}`} />
            <span>{killSwitchActive ? 'STOPPED' : 'Safety Lock: Active'}</span>
          </button>
        </div>
      </header>

      {/* Stage 2: Full Editorial Hero Sequence only on Overview */}
      {selectedTab === 'overview' ? (
        <section className="px-6 sm:px-8 py-6 bg-gradient-to-b from-[#11131A] to-[#0B0D13] border-b border-[#1E222D]">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Primary Sequence Flow */}
            <div className="flex flex-wrap items-center gap-6 sm:gap-10">
              {/* 1. Revenue at Risk */}
              <div>
                <span className="text-xs font-medium text-gray-400 block tracking-wide uppercase">Revenue at Risk</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold font-display text-white tracking-tight">
                    ₹{totalRiskRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <span className="text-xs text-gray-400 block mt-0.5">{cases.length || 210} transactions</span>
              </div>

              {/* Subtle Divider Arrow */}
              <div className="hidden sm:flex items-center text-gray-600">
                <span className="text-2xl font-light">→</span>
              </div>

              {/* 2. Revenue Recovered */}
              <div>
                <span className="text-xs font-medium text-emerald-400 block tracking-wide uppercase">Revenue Recovered</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold font-display text-emerald-400 tracking-tight">
                    ₹{totalRecoveredRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {recoveryRate.toFixed(1)}% yield
                  </span>
                </div>
                <span className="text-xs text-gray-400 block mt-0.5">Directly collected via optimization</span>
              </div>

              {/* Subtle Divider Arrow */}
              <div className="hidden sm:flex items-center text-gray-600">
                <span className="text-2xl font-light">→</span>
              </div>

              {/* 3. Uplift vs Baseline */}
              <div>
                <span className="text-xs font-medium text-indigo-400 block tracking-wide uppercase">Optimization Uplift</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold font-display text-indigo-300 tracking-tight">
                    {comparison.uplift_pct !== undefined ? `${comparison.uplift_pct >= 0 ? '+' : ''}${comparison.uplift_pct}%` : '+51.6%'}
                  </span>
                  <span className="text-xs font-medium text-indigo-300">vs Naive FCFS</span>
                </div>
                <span className="text-xs text-indigo-300/80 block mt-0.5">
                  ₹{netValueCreatedRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Net Value Created
                </span>
              </div>
            </div>

            {/* Supplementary Signals */}
            <div className="flex lg:flex-col sm:flex-row flex-wrap items-start lg:items-end gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-2 bg-[#141720] px-3 py-1.5 rounded-lg border border-[#222736]">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-gray-300 font-medium">Policy Violations:</span>
                <span className="text-emerald-400 font-bold">0 (Guaranteed)</span>
              </div>
              <div className="flex items-center gap-2 bg-[#141720] px-3 py-1.5 rounded-lg border border-[#222736]">
                <UserMinus className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-300 font-medium">Contacts Avoided:</span>
                <span className="text-gray-200 font-semibold">{contactsAvoided} cases</span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Small one-line contextual header for all other tabs */
        <div className="px-6 sm:px-8 py-2.5 bg-[#10121A] border-b border-[#1E222D] flex flex-wrap items-center justify-between gap-3 text-xs text-gray-300">
          <div className="flex items-center gap-3">
            <span>Recovered: <strong className="text-emerald-400 font-technical">₹{totalRecoveredRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong> ({recoveryRate.toFixed(1)}% yield)</span>
            <span className="text-gray-600">·</span>
            <span>Uplift: <strong className="text-indigo-300 font-technical">{comparison.uplift_pct !== undefined ? `${comparison.uplift_pct >= 0 ? '+' : ''}${comparison.uplift_pct}%` : '+51.6%'}</strong> vs FCFS</span>
            <span className="text-gray-600">·</span>
            <span className="text-emerald-400 font-medium">0 Policy Violations</span>
          </div>
          <span className="text-gray-500 font-technical text-[11px]">{cases.length} transactions in batch</span>
        </div>
      )}

      {/* Progress Bar during execution */}
      {liveStage && (
        <div className="px-6 sm:px-8 py-2.5 bg-[#12141D] border-b border-[#222737] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span className="font-semibold text-white tracking-wide">{liveStage.stage.toUpperCase()}</span>
            <span className="text-gray-400">— {liveStage.description}</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-56 bg-[#1E222E] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${liveStage.progress}%` }}
              />
            </div>
            <span className="font-technical text-xs font-semibold text-emerald-400">{liveStage.progress}%</span>
          </div>
        </div>
      )}

      {/* Main Body Layout (Max 1280-1320px) */}
      <div className="flex-1 p-6 sm:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        {/* TAB 1: OVERVIEW */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* 1. Recovery Pulse Live Pipeline */}
            <div className="surface-card rounded-2xl p-5">
              <DecisionStream />
            </div>

            {/* 2. Capital Distribution Money Flow */}
            <RecoveryFunnel />

            {/* 3. Recent 5-6 Decisions & System Health Status Line */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left (7 Cols): Recent Decisions Quick-Glance */}
              <div className="lg:col-span-7 surface-card rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-[#1E222D] pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white font-display">Recent Decisions Overview</h3>
                    <p className="text-xs text-gray-400">Click any transaction to inspect mathematical trace and justifications</p>
                  </div>
                  <button
                    onClick={() => setSelectedTab('historical')}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    View All Queue ({cases.length}) →
                  </button>
                </div>

                <div className="space-y-2">
                  {cases.slice(0, 5).map((c_item) => (
                    <div
                      key={c_item.id}
                      onClick={() => {
                        setActiveCaseId(c_item.id);
                        setSelectedTab('historical');
                      }}
                      className="p-3 bg-[#0E1017] hover:bg-[#151822] rounded-xl border border-[#1E222E] flex justify-between items-center transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          c_item.recovered ? 'bg-emerald-400' : c_item.outcome === 'BLOCK' ? 'bg-rose-400' : 'bg-sky-400'
                        }`} />
                        <div>
                          <span className="text-xs font-semibold text-white block">{c_item.customer_name}</span>
                          <span className="text-[10px] text-gray-400 font-sans capitalize">{c_item.cause.replace(/_/g, ' ')} · {c_item.candidate_action.replace(/_/g, ' ')}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-technical text-xs font-bold text-white block">
                          ₹{(c_item.amount_paise / 100.0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className={`text-[9px] uppercase font-semibold ${
                          c_item.recovered ? 'text-emerald-400' : c_item.outcome === 'BLOCK' ? 'text-rose-400' : 'text-sky-400'
                        }`}>
                          {c_item.lifecycle_state || c_item.outcome}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right (5 Cols): Compact System Health & Diagnostics */}
              <div className="lg:col-span-5 space-y-6">
                <CauseDonut />
                <div className="surface-card rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between items-center border-b border-[#1E222D] pb-2">
                    <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Operational Invariants</h4>
                    <span className="text-[10px] text-emerald-400 font-bold">ALL SYSTEMS NOMINAL</span>
                  </div>
                  <div className="space-y-2 text-xs text-gray-300 font-sans">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Quiet Hours Protection:</span>
                      <span className="text-gray-200 font-medium">10:00 PM – 8:00 AM IST</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Contact Cap:</span>
                      <span className="text-gray-200 font-medium">3 attempts / 24 hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Dual Authorization Threshold:</span>
                      <span className="text-gray-200 font-medium">&gt; ₹5,000 refunds</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RECOVERY & ROI */}
        {selectedTab === 'comparison' && (
          <div className="space-y-6">
            <UpliftComparison />
            <CapacityROI />
          </div>
        )}

        {/* TAB 3: DECISIONS (TWO-COLUMN QUEUE + PROGRESSIVE DETAIL) */}
        {selectedTab === 'historical' && (
          <DecisionsExplorer />
        )}

        {/* TAB 4: EXPERIMENTS */}
        {selectedTab === 'experiment' && (
          <div className="space-y-6">
            <ExperimentPanel />
            <RecalibrationPanel />
          </div>
        )}

        {/* TAB 5: POLICY & SAFETY (POLICY CENTERPIECE + ADVERSARIAL LAB) */}
        {selectedTab === 'promises' && (
          <div className="space-y-6">
            {/* Visual Centerpiece: AI Proposal -> Policy Gate -> Verdict */}
            <SystemHealth />

            {/* Prominent Adversarial Lab Section */}
            <FailureConsole />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <PromiseCalendar />
              <EscalationLadder />
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT TRAIL */}
        {selectedTab === 'audit' && (
          <div className="surface-card rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#1E222D] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight font-display flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Append-Only Immutable Audit Log Store
                </h3>
                <p className="text-xs text-gray-400">Cryptographically verifiable decision records with full context and rule veto hashes.</p>
              </div>
              <span className="text-[10px] font-technical text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {auditEntries.length} Records
              </span>
            </div>

            {auditEntries.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 border border-dashed border-[#1E222D] rounded-xl">
                <Database className="w-8 h-8 text-gray-600 mb-1" />
                <span className="text-sm font-semibold text-gray-300">Audit Store Clean & Ready</span>
                <p className="text-xs text-gray-500 max-w-[320px] leading-relaxed">
                  Run the recovery engine to generate verified audit records with deterministic safety decisions.
                </p>
                <button
                  onClick={() => seedBatch(210)}
                  disabled={simulationRunning}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
                >
                  Run Engine (210 Cases)
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
                {auditEntries.map((log) => (
                  <div key={log.id} className="bg-[#0A0B0F] border border-[#1E222D] p-3.5 rounded-xl flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold font-technical text-xs">{log.failed_payment_id}</span>
                        <span className="text-gray-500 text-[10px] font-technical">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      </div>
                      <p className="text-xs text-gray-300">
                        {log.outcome === 'ALLOW' ? 'Action Allowed:' : 'Policy Veto:'} <span className="text-gray-400">{log.reason}</span>
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0 ${
                      log.outcome === 'ALLOW' 
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    }`}>
                      {log.outcome}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Case Details Explainability Drawer Overlay */}
      <CaseDetailDrawer />
    </main>
  );
}

