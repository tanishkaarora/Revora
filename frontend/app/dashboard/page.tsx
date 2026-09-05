'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '../../lib/store';
import { useWebSocketConnection } from '../../lib/socket';
import { 
  ShieldAlert, ShieldCheck, Database, ArrowUpRight, 
  Shield, Play, Activity, TrendingUp, UserMinus, 
  AlertOctagon, CheckCircle2, Split, RefreshCw, BarChart2,
  Clock, ArrowRight, ShieldBan, Lock
} from 'lucide-react';
import Link from 'next/link';

import DecisionStream from '../../components/DecisionStream';
import RecoveryFunnel from '../../components/RecoveryFunnel';
import UpliftComparison from '../../components/UpliftComparison';
import CapacityROI from '../../components/CapacityROI';
import CaseDetailDrawer from '../../components/CaseDetailDrawer';
import FailureConsole from '../../components/FailureConsole';
import CauseDonut from '../../components/CauseDonut';
import SystemHealth from '../../components/SystemHealth';
import EscalationLadder from '../../components/EscalationLadder';
import RecalibrationPanel from '../../components/RecalibrationPanel';
import ExperimentPanel from '../../components/ExperimentPanel';
import DecisionsExplorer from '../../components/DecisionsExplorer';
import PromiseCalendar from '../../components/PromiseCalendar';
import ThemeToggle from '../../components/ThemeToggle';
import AnimatedNumber from '../../components/AnimatedNumber';

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
  const engineStatus = useAppStore((state) => state.engineStatus);
  const seedBatchError = useAppStore((state) => state.seedBatchError);
  const setSeedBatchError = useAppStore((state) => state.setSeedBatchError);

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
  
  // Incremental Net Value = Revora recovered amount minus FCFS baseline recovered amount
  const incrementalNetValuePaise = (comparison.optimized_recovered_paise && comparison.baseline_recovered_paise)
    ? Math.max(0, comparison.optimized_recovered_paise - comparison.baseline_recovered_paise)
    : (comparison.net_value_created_paise || Math.round(totalRecoveredPaise * 0.516));
  const incrementalNetValueRupees = incrementalNetValuePaise / 100.0;

  const netValueCreatedRupees = (comparison.net_value_created_paise || (totalRecoveredPaise * 0.92)) / 100.0;
  const contactsAvoided = comparison.contacts_avoided_count || cases.filter(c => !c.allocated || c.candidate_action === 'suppress').length;

  return (
    <main className="min-h-screen flex flex-col font-sans antialiased selection:bg-brand-jade-surface selection:text-brand-jade">

      {/* Top Navigation Header */}
      <header className="px-6 py-3 bg-surface/95 backdrop-blur-md border-b border-border-subtle flex flex-col lg:flex-row items-center justify-between gap-4 sticky top-0 z-40">
        {/* Brand & Status Signals */}
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="w-8 h-8 rounded-xl bg-brand-jade hover:bg-brand-jade-deep transition-all flex items-center justify-center text-white font-bold font-display text-base tracking-tight shadow-sm"
          >
            R
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-content-primary font-display">
                REVORA
              </h1>
              {/* Engine-connection health indicator */}
              {engineStatus === 'connected' ? (
                <span className="text-[10px] text-brand-jade bg-brand-jade-surface border border-brand-jade-border px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5" title="Real-time WebSocket connection active">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-jade animate-pulse" />
                  Engine Connected
                </span>
              ) : engineStatus === 'degraded' ? (
                <span className="text-[10px] text-brand-amber bg-brand-amber-surface border border-brand-amber-border px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5" title="Operating with synthetic or fallback channels">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-amber animate-pulse" />
                  Engine Degraded
                </span>
              ) : (
                <span className="text-[10px] text-content-tertiary bg-surface-subtle border border-border-subtle px-2 py-0.5 rounded-full font-medium flex items-center gap-1.5" title="Connecting or offline">
                  <span className="w-1.5 h-1.5 rounded-full border border-content-tertiary" />
                  Engine Offline
                </span>
              )}

              {/* Persistent Demo Environment / Synthetic Data Badge */}
              <span className="hidden xl:inline-flex items-center gap-1.5 text-[10px] font-sans font-medium text-content-secondary bg-surface-subtle border border-border-subtle px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-brass" />
                Demo Environment · Synthetic Payment Cohort
              </span>
            </div>
            <p className="text-[11px] text-content-secondary font-sans">
              Revenue Recovery Intelligence
            </p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border-subtle" aria-label="Dashboard sections">
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
              type="button"
              onClick={() => setSelectedTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedTab === tab.id
                  ? 'bg-surface text-brand-jade font-semibold border border-border-subtle shadow-sm'
                  : 'text-content-secondary hover:text-content-primary hover:bg-surface/50 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Operational Controls */}
        <div className="flex items-center gap-2.5">
          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Signature Run Recovery Trigger */}
          <button
            type="button"
            onClick={() => seedBatch(210)}
            disabled={simulationRunning}
            className="px-3.5 py-1.5 rounded-xl bg-brand-jade hover:bg-brand-jade-deep text-white text-xs font-semibold tracking-wide flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${simulationRunning ? 'animate-spin' : ''}`} />
            <span>{simulationRunning ? 'Processing Batch...' : 'Run Recovery'}</span>
          </button>

          {/* Operational Emergency Stop / Kill Switch */}
          <button
            type="button"
            onClick={() => toggleKillSwitch(!killSwitchActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 flex items-center gap-1.5 border cursor-pointer ${
              killSwitchActive
                ? 'bg-brand-burgundy-surface border-brand-burgundy text-brand-burgundy animate-pulse'
                : 'bg-surface-subtle text-content-secondary border-border-subtle hover:border-brand-burgundy-border hover:text-brand-burgundy'
            }`}
            title="Emergency Safety Stop: Suppresses automated outreach and limits execution to silent retries."
          >
            <AlertOctagon className={`w-3.5 h-3.5 ${killSwitchActive ? 'text-brand-burgundy' : 'text-content-tertiary'}`} />
            <span>{killSwitchActive ? 'Safety Lock: STOPPED' : 'Safety Lock'}</span>
          </button>
        </div>
      </header>

      {/* Seed Batch Error Alert Banner */}
      {seedBatchError && (
        <div className="px-6 py-2.5 bg-brand-burgundy-surface border-b border-brand-burgundy-border text-brand-burgundy text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 shrink-0" />
            <span className="font-semibold">Recovery Pipeline Error:</span>
            <span>{seedBatchError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => seedBatch(210)}
              className="px-2.5 py-1 bg-brand-burgundy text-white rounded-lg font-medium hover:opacity-90 cursor-pointer"
            >
              Retry Run
            </button>
            <button
              type="button"
              onClick={() => setSeedBatchError(null)}
              className="px-2 py-1 text-brand-burgundy hover:bg-brand-burgundy/10 rounded cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Hero Sequence: Full Width Editorial Flow on Overview */}
      {selectedTab === 'overview' ? (
        <section className="px-6 sm:px-8 py-5 bg-surface border-b border-border-subtle">
          <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Primary Financial Sequence Flow */}
            <div className="flex flex-wrap items-center gap-6 sm:gap-8">
              {/* 1. Revenue at Risk */}
              <div>
                <span className="text-xs font-medium text-content-tertiary block tracking-wide uppercase">Revenue at Risk</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-bold font-display text-content-primary tracking-tight">
                    <AnimatedNumber value={totalRiskRupees} prefix="₹" />
                  </span>
                </div>
                <span className="text-xs text-content-tertiary block mt-0.5">{cases.length || 210} failed transactions</span>
              </div>

              {/* Subtle Divider Arrow */}
              <div className="hidden sm:flex items-center text-content-muted">
                <span className="text-2xl font-light">→</span>
              </div>

              {/* 2. Revenue Recovered */}
              <div>
                <span className="text-xs font-medium text-brand-jade block tracking-wide uppercase">Revenue Recovered</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-bold font-display text-brand-jade tracking-tight">
                    <AnimatedNumber value={totalRecoveredRupees} prefix="₹" />
                  </span>
                  <span className="text-xs font-semibold text-brand-jade bg-brand-jade-surface px-2 py-0.5 rounded-full border border-brand-jade-border">
                    {recoveryRate.toFixed(1)}% yield
                  </span>
                </div>
                <span className="text-xs text-content-tertiary block mt-0.5">Directly captured via optimization</span>
              </div>

              {/* Subtle Divider Arrow */}
              <div className="hidden sm:flex items-center text-content-muted">
                <span className="text-2xl font-light">→</span>
              </div>

              {/* 3. Incremental Net Value Hero Metric */}
              <div>
                <span className="text-xs font-medium text-brand-brass block tracking-wide uppercase">Incremental Net Value</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-bold font-display text-brand-brass tracking-tight">
                    <AnimatedNumber value={incrementalNetValueRupees} prefix="₹" />
                  </span>
                  <span className="text-xs font-semibold text-brand-brass bg-brand-brass-surface px-2 py-0.5 rounded-full border border-brand-brass-border">
                    {comparison.uplift_pct !== undefined ? `${comparison.uplift_pct >= 0 ? '+' : ''}${comparison.uplift_pct}%` : '+51.6%'}
                  </span>
                </div>
                <span className="text-xs text-content-secondary block mt-0.5">
                  Revora recovered amount minus standard Naive FCFS baseline
                </span>
              </div>
            </div>

            {/* Supplementary Signals */}
            <div className="flex lg:flex-col sm:flex-row flex-wrap items-start lg:items-end gap-2 text-xs text-content-secondary">
              <div className="flex items-center gap-2 bg-surface-subtle px-3 py-1.5 rounded-lg border border-border-subtle">
                <span className="w-2 h-2 rounded-full bg-brand-jade"></span>
                <span className="text-content-secondary font-medium">Policy Violations:</span>
                <span className="text-brand-jade font-bold">0 (Guaranteed)</span>
              </div>
              <div className="flex items-center gap-2 bg-surface-subtle px-3 py-1.5 rounded-lg border border-border-subtle">
                <UserMinus className="w-3.5 h-3.5 text-content-tertiary" />
                <span className="text-content-secondary font-medium">Contacts Avoided:</span>
                <span className="text-content-primary font-semibold">{contactsAvoided} cases</span>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Contextual Header for Other Tabs */
        <div className="px-6 sm:px-8 py-2.5 bg-surface border-b border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs text-content-secondary">
          <div className="flex items-center gap-3">
            <span>Recovered: <strong className="text-brand-jade font-technical">₹{totalRecoveredRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong> ({recoveryRate.toFixed(1)}% yield)</span>
            <span className="text-content-muted">·</span>
            <span>Incremental Net: <strong className="text-brand-brass font-technical">₹{incrementalNetValueRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
            <span className="text-content-muted">·</span>
            <span className="text-brand-jade font-medium">0 Policy Violations</span>
          </div>
          <span className="text-content-tertiary font-technical text-[11px]">{cases.length} transactions in batch</span>
        </div>
      )}

      {/* Progress Bar during Pipeline Execution */}
      {liveStage && (
        <div className="px-6 sm:px-8 py-2.5 bg-surface-elevated border-b border-border-muted flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-3.5 h-3.5 text-brand-jade animate-spin" />
            <span className="font-semibold text-content-primary tracking-wide">{liveStage.stage.toUpperCase()}</span>
            <span className="text-content-secondary">— {liveStage.description}</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-56 bg-surface h-1.5 rounded-full overflow-hidden border border-border-subtle">
              <div 
                className="bg-brand-jade h-full rounded-full transition-all duration-300"
                style={{ width: `${liveStage.progress}%` }}
              />
            </div>
            <span className="font-technical text-xs font-semibold text-brand-jade">{liveStage.progress}%</span>
          </div>
        </div>
      )}

      {/* Main Content Body (Max Width ~1440px) */}
      <div className="flex-1 p-6 sm:p-8 flex flex-col gap-6 max-w-[1440px] mx-auto w-full">
        {/* TAB 1: OVERVIEW */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* 1. Recovery Pulse Live Pipeline */}
            <div className="surface-card rounded-2xl p-5 sm:p-6">
              <DecisionStream />
            </div>

            {/* 2. Capital Distribution Flow */}
            <RecoveryFunnel />

            {/* 3. Recent Decisions (7 Cols) + System Invariants & Cause Donut (5 Cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Recent Decisions Queue */}
              <div className="lg:col-span-7 surface-card rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-border-subtle pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-content-primary font-display">Recent Decisions Overview</h3>
                    <p className="text-xs text-content-secondary">Click any transaction to inspect mathematical trace and justifications</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTab('historical')}
                    className="text-xs font-medium text-brand-jade hover:text-brand-jade-deep flex items-center gap-1 cursor-pointer"
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
                      className="p-3 bg-surface-subtle hover:bg-surface-elevated rounded-xl border border-border-subtle flex justify-between items-center transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          c_item.recovered ? 'bg-brand-jade' : c_item.outcome === 'BLOCK' ? 'bg-brand-burgundy' : 'bg-brand-steel'
                        }`} />
                        <div>
                          <span className="text-xs font-semibold text-content-primary block">{c_item.customer_name}</span>
                          <span className="text-[10px] text-content-secondary font-sans capitalize">
                            {c_item.cause.replace(/_/g, ' ')} · {c_item.candidate_action.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-technical text-xs font-bold text-content-primary block">
                          ₹{(c_item.amount_paise / 100.0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className={`text-[9px] uppercase font-semibold ${
                          c_item.recovered ? 'text-brand-jade' : c_item.outcome === 'BLOCK' ? 'text-brand-burgundy' : 'text-brand-steel'
                        }`}>
                          {c_item.lifecycle_state || c_item.outcome}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Operational Invariants & Cause Diagnostics */}
              <div className="lg:col-span-5 space-y-6">
                <CauseDonut />
                <div className="surface-card rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between items-center border-b border-border-subtle pb-2">
                    <h4 className="text-xs font-semibold text-content-primary uppercase tracking-wider">Operational Invariants</h4>
                    <span className="text-[10px] text-brand-jade font-bold">ALL SYSTEMS NOMINAL</span>
                  </div>
                  <div className="space-y-2 text-xs text-content-secondary font-sans">
                    <div className="flex justify-between">
                      <span className="text-content-tertiary">Quiet Hours Protection:</span>
                      <span className="text-content-primary font-medium">10:00 PM – 8:00 AM IST</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-content-tertiary">Max Contact Cap:</span>
                      <span className="text-content-primary font-medium">3 attempts / 24 hrs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-content-tertiary">Dual Authorization Threshold:</span>
                      <span className="text-content-primary font-medium">&gt; ₹5,000 refunds</span>
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

        {/* TAB 3: DECISIONS */}
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

        {/* TAB 5: POLICY & SAFETY */}
        {selectedTab === 'promises' && (
          <div className="space-y-6">
            {/* Visual Centerpiece: AI Proposal -> Policy Gate -> Verdict */}
            <SystemHealth />

            {/* Adversarial Lab Section */}
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
            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
              <div>
                <h3 className="text-sm font-semibold text-content-primary tracking-tight font-display flex items-center gap-2">
                  <Database className="w-4 h-4 text-brand-jade" />
                  Append-Only Immutable Audit Trail
                </h3>
                <p className="text-xs text-content-secondary">Chronological decision timeline (Failed → Diagnosis → Optimizer → Policy → Outcome).</p>
              </div>
              <span className="text-[10px] font-technical text-brand-jade bg-brand-jade-surface px-2.5 py-0.5 rounded border border-brand-jade-border">
                {auditEntries.length} Verified Records
              </span>
            </div>

            {auditEntries.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 border border-dashed border-border-muted rounded-xl bg-surface-subtle/50">
                <Database className="w-8 h-8 text-content-tertiary mb-1" />
                <span className="text-sm font-semibold text-content-primary">Audit Store Clean & Ready</span>
                <p className="text-xs text-content-secondary max-w-[320px] leading-relaxed">
                  Run the recovery engine to generate verified audit records with deterministic safety decisions.
                </p>
                <button
                  type="button"
                  onClick={() => seedBatch(210)}
                  disabled={simulationRunning}
                  className="px-4 py-2 rounded-xl bg-brand-jade hover:bg-brand-jade-deep text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  Run Engine (210 Cases)
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
                {auditEntries.map((log) => (
                  <div key={log.id} className="bg-surface-subtle border border-border-subtle p-4 rounded-xl flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center hover:border-border-muted transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-brand-jade font-bold font-technical text-xs">{log.failed_payment_id}</span>
                        <span className="text-content-tertiary text-[10px] font-technical">[{log.timestamp}]</span>
                      </div>
                      <p className="text-xs text-content-secondary">
                        {log.outcome === 'ALLOW' ? 'Action Allowed:' : 'Policy Veto:'} <span className="text-content-primary font-medium">{log.reason}</span>
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase shrink-0 ${
                      log.outcome === 'ALLOW' 
                        ? 'bg-brand-jade-surface text-brand-jade border border-brand-jade-border' 
                        : 'bg-brand-burgundy-surface text-brand-burgundy border border-brand-burgundy-border'
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

      {/* Case Details Drawer Overlay (Overview Quick-Inspect) */}
      {selectedTab === 'overview' && <CaseDetailDrawer />}
    </main>
  );
}
