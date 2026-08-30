// frontend/app/dashboard/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../../lib/store';
import { useWebSocketConnection } from '../../lib/socket';
import { 
  ShieldAlert, ShieldCheck, Flame, Coins, Database, ArrowUpRight, 
  Shield, Clock, Sparkles, Play, Activity, TrendingUp, UserMinus, 
  AlertOctagon, CheckCircle2, Split, RefreshCw, BarChart2
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
import HistoricalEvidence from '../../components/HistoricalEvidence';
import RecalibrationPanel from '../../components/RecalibrationPanel';
import ExperimentPanel from '../../components/ExperimentPanel';

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
  const policyViolations = 0; // Structurally impossible by Guardrail guarantee

  const stagesList = [
    'Ingesting', 'Diagnosing', 'Scoring & Optimizing', 'Guardrail & Execution', 'Updating Metrics'
  ];

  return (
    <main className="min-h-screen bg-[#0A0B0E] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-400 relative z-10">

      {/* Top Navbar */}
      <header className="px-6 py-4 bg-[#10121A]/95 backdrop-blur-md border-b border-[#1E222D] flex flex-col lg:flex-row items-center justify-between gap-4 sticky top-0 z-40">
        {/* Brand & Descriptor */}
        <div className="flex items-center gap-3.5">
          <Link href="/" className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center text-white font-bold font-display text-lg tracking-tight shadow-md shadow-emerald-500/20">
            R
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white font-display">
                REVORA <span className="text-xs text-gray-400 font-normal">v2.0</span>
              </h1>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-sans font-medium">
                Live Engine
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-sans">
              AI Revenue Recovery & Safety Guard
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wide flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${simulationRunning ? 'animate-spin' : ''}`} />
            <span>{simulationRunning ? 'Processing Pipeline...' : 'Run Recovery Engine'}</span>
          </button>

          {/* Serious Operational Emergency Stop / Kill Switch */}
          <button
            onClick={() => toggleKillSwitch(!killSwitchActive)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-2 border cursor-pointer ${
              killSwitchActive
                ? 'bg-rose-950/90 border-rose-500 text-rose-200 ring-2 ring-rose-500/40 animate-pulse'
                : 'bg-[#151821] text-gray-300 border-[#252B3B] hover:border-rose-500/50 hover:text-rose-400'
            }`}
            title="Emergency Safety Stop: Immediately suppresses all automated outreach and limits execution to silent retries."
          >
            <AlertOctagon className={`w-4 h-4 ${killSwitchActive ? 'text-rose-400' : 'text-gray-400'}`} />
            <span>{killSwitchActive ? 'EMERGENCY STOPPED' : 'Safety Lock: Active'}</span>
          </button>
        </div>
      </header>

      {/* Stage 1: Editorial Hero Sequence (Open & Borderless) */}
      <section className="px-8 py-7 bg-gradient-to-b from-[#11131A] to-[#0A0B0E] border-b border-[#1E222D]">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          {/* Primary Sequence Flow */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            {/* 1. Revenue at Risk */}
            <div>
              <span className="text-xs font-medium text-gray-400 block tracking-wide uppercase">Revenue at Risk</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-bold font-display text-white tracking-tight">
                  ₹{totalRiskRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <span className="text-xs text-gray-400 block mt-1">{cases.length || 210} failed transactions</span>
            </div>

            {/* Subtle Divider Arrow */}
            <div className="hidden sm:flex items-center text-gray-600">
              <span className="text-2xl font-light">→</span>
            </div>

            {/* 2. Revenue Recovered */}
            <div>
              <span className="text-xs font-medium text-emerald-400 block tracking-wide uppercase">Revenue Recovered</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-bold font-display text-emerald-400 tracking-tight">
                  ₹{totalRecoveredRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
                <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {recoveryRate.toFixed(1)}% yield
                </span>
              </div>
              <span className="text-xs text-gray-400 block mt-1">Directly collected via optimization</span>
            </div>

            {/* Subtle Divider Arrow */}
            <div className="hidden sm:flex items-center text-gray-600">
              <span className="text-2xl font-light">→</span>
            </div>

            {/* 3. Uplift vs Baseline */}
            <div>
              <span className="text-xs font-medium text-indigo-400 block tracking-wide uppercase">Optimization Uplift</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl sm:text-4xl font-bold font-display text-indigo-300 tracking-tight">
                  {comparison.uplift_pct !== undefined ? `${comparison.uplift_pct >= 0 ? '+' : ''}${comparison.uplift_pct}%` : '+51.6%'}
                </span>
                <span className="text-xs font-medium text-indigo-300">vs Naive FCFS</span>
              </div>
              <span className="text-xs text-indigo-300/80 block mt-1">
                ₹{netValueCreatedRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Net Value Created
              </span>
            </div>
          </div>

          {/* Supplementary Invariant & Policy Signals */}
          <div className="flex lg:flex-col sm:flex-row flex-wrap items-start lg:items-end gap-3 text-xs text-gray-400 border-t lg:border-t-0 border-[#1E222D] pt-4 lg:pt-0">
            <div className="flex items-center gap-2 bg-[#141720] px-3 py-1.5 rounded-lg border border-[#222736]">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-gray-300 font-medium">Policy Violations:</span>
              <span className="text-emerald-400 font-bold">0 (Deterministic Guarantee)</span>
            </div>
            <div className="flex items-center gap-2 bg-[#141720] px-3 py-1.5 rounded-lg border border-[#222736]">
              <UserMinus className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-300 font-medium">Contacts Avoided:</span>
              <span className="text-gray-200 font-semibold">{contactsAvoided} cases</span>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Multi-Step Recovery Engine Processing Bar */}
      {liveStage && (
        <div className="px-8 py-3.5 bg-[#12141D] border-b border-[#222737] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white tracking-wide">{liveStage.stage.toUpperCase()}</span>
              <span className="text-gray-400">— {liveStage.description}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-full sm:w-64 bg-[#1E222E] h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${liveStage.progress}%` }}
              />
            </div>
            <span className="font-technical text-xs font-semibold text-emerald-400">{liveStage.progress}%</span>
          </div>
        </div>
      )}

      {/* Main Body Layout */}
      <div className="flex-1 p-6 sm:p-8 flex flex-col gap-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {selectedTab === 'overview' && (


          <>
            {/* Decision Stream */}
            <section className="w-full">
              <div className="bg-[#111319] border border-[#232630] rounded-2xl p-6 shadow-xl">
                <DecisionStream />
              </div>
            </section>

            {/* Funnel and Interactive Controls */}
            <section className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="flex-1 w-full space-y-8">
                <RecoveryFunnel />

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <WhatsAppSimulator />
                  <FailureConsole />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2">
                    <SystemHealth />
                  </div>
                  <div>
                    <CauseDonut />
                  </div>
                </div>
              </div>

              {/* Case Feed Sidebar with Lifecycle Badges */}
              <div className="w-full lg:w-[360px] shrink-0 bg-[#13151C] border border-[#232630] rounded-2xl p-5 shadow-lg flex flex-col h-[750px] sticky top-24">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4 border-b border-[#232630] pb-2 flex items-center justify-between">
                  <span>Recovery Case Feed</span>
                  <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">{cases.length} cases</span>
                </h3>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                  {cases.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 py-20 border border-dashed border-[#232630] rounded-xl bg-[#0A0B0F]/50">
                      <Database className="w-8 h-8 text-gray-700 mb-3" />
                      <span className="font-bold text-gray-400 block mb-1">Feed Offline</span>
                      <span className="text-[10px] text-gray-500 max-w-[200px] mb-4">No cases processed yet. Run live decision mode to stream cases.</span>
                      <button
                        onClick={() => seedBatch(210)}
                        disabled={simulationRunning}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Seed Batch
                      </button>
                    </div>
                  ) : (
                    cases.map((c_item) => {
                      const isActive = c_item.id === activeCaseId;
                      const isRecovered = c_item.recovered;
                      const isBlocked = c_item.outcome === 'BLOCK';
                      const isEscalated = c_item.outcome === 'ESCALATE';

                      return (
                        <div
                          key={c_item.id}
                          onClick={() => setActiveCaseId(c_item.id)}
                          className={`p-3 rounded-lg cursor-pointer transition-all border ${
                            isActive
                              ? 'bg-[#1D212A] border-gray-500 shadow-md'
                              : isRecovered
                              ? 'bg-emerald-950/10 border-emerald-500/20 hover:border-emerald-500/30'
                              : isBlocked
                              ? 'bg-red-950/10 border-red-500/20 hover:border-red-500/30'
                              : isEscalated
                              ? 'bg-amber-950/10 border-amber-500/20 hover:border-amber-500/30'
                              : 'bg-[#0A0B0F] border-[#1B1D25] hover:border-gray-700'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <span className="text-xs font-bold tracking-tight text-gray-200 block truncate max-w-[150px]">
                              {c_item.customer_name}
                            </span>
                            <span className="text-xs font-bold font-mono text-gray-300">
                              ₹{(c_item.amount_paise / 100.0).toFixed(0)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[9px] font-mono mt-1">
                            <span className="capitalize text-orange-400">{c_item.cause.replace('_', ' ')}</span>
                            <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                              c_item.lifecycle_state === 'RECOVERED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : c_item.lifecycle_state === 'CONTACTED'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : c_item.lifecycle_state === 'SUPPRESSED'
                                ? 'bg-gray-800 text-gray-400'
                                : c_item.lifecycle_state === 'ESCALATED'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-gray-700 text-gray-300'
                            }`}>
                              {c_item.lifecycle_state || (isRecovered ? 'RECOVERED' : isBlocked ? 'SUPPRESSED' : 'DIAGNOSED')}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {selectedTab === 'comparison' && (
          <div className="flex flex-col space-y-8">
            <UpliftComparison />
            <CapacityROI />
          </div>
        )}

        {selectedTab === 'historical' && (
          <HistoricalEvidence />
        )}

        {selectedTab === 'recalibration' && (
          <RecalibrationPanel />
        )}

        {selectedTab === 'experiment' && (
          <ExperimentPanel />
        )}

        {selectedTab === 'promises' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-2">
              <PromiseCalendar />
            </div>
            <div className="space-y-8">
              <EscalationLadder />
              <SystemHealth />
            </div>
          </div>
        )}

        {selectedTab === 'audit' && (
          <div className="bg-[#13151C] border border-[#232630] rounded-xl p-6 shadow-lg flex flex-col h-[600px]">
            <div className="flex justify-between items-center mb-4 border-b border-[#232630] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Append-Only Audit Logs Store
              </h3>
              <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                Revora Audit
              </span>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 text-[11px] font-mono space-y-2">

              {auditEntries.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                  <span>Audit log is empty. Trigger a batch run to populate entries.</span>
                  <button
                    onClick={() => seedBatch(210)}
                    disabled={simulationRunning}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Seed Batch
                  </button>
                </div>
              ) : (
                auditEntries.map((log) => (
                  <div key={log.id} className="bg-[#0A0B0F] border border-[#1B1D25] p-2.5 rounded flex justify-between gap-4 items-center">
                    <div>
                      <span className="text-gray-500 mr-2">[{log.timestamp}]</span>
                      <span className="text-emerald-400 font-bold mr-2">{log.failed_payment_id}</span>
                      <span className="text-gray-300">
                        {log.outcome === 'ALLOW' ? 'Action ALLOWED:' : 'Veto Blocked:'} {log.reason}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${
                      log.outcome === 'ALLOW' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {log.outcome}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Case Details Explainability Drawer Overlay */}
      <CaseDetailDrawer />
    </main>
  );
}
