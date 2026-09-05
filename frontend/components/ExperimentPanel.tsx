'use client';

import React, { useState } from 'react';
import { Split, Trophy, CheckCircle2, TrendingUp, BarChart2, ArrowRight, AlertCircle } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';

interface GroupStats {
  group_label: string;
  action: string;
  attempts: number;
  recovered_count: number;
  recovery_rate: number;
  ci_lower?: number;
  ci_upper?: number;
  ci_display?: string;
  recovered_paise: number;
  costs_paise: number;
  net_value_paise: number;
}

interface ExperimentResponse {
  experiment_name: string;
  sample_size: number;
  requested_n?: number;
  available_matching_count?: number;
  cohort_explanation?: string;
  target_causes?: string[];
  split_method: string;
  winner: string;
  is_inconclusive?: boolean;
  group_a: GroupStats;
  group_b: GroupStats;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function ExperimentPanel() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExperimentResponse | null>(null);

  const handleRunExperiment = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers: Record<string, string> = {};
      const demoSecret = process.env.NEXT_PUBLIC_DEMO_SECRET;
      if (demoSecret) {
        headers['X-Demo-Secret'] = demoSecret;
      }
      const res = await fetch(`${API_URL}/demo/run-experiment?count=120`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errText = await res.text();
        setError(`Failed to run experiment (${res.status}): ${errText || 'Internal Server Error'}`);
      }
    } catch (err: any) {
      console.error('Failed to run experiment:', err);
      setError(`Unable to connect to recovery engine: ${err?.message || 'Network unreachable'}`);
    } finally {
      setLoading(false);
    }
  };

  const isInconclusive = data?.winner === 'Inconclusive at this sample size' || data?.is_inconclusive;

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Split className="w-4 h-4 text-brand-brass" />
            <h3 className="text-sm font-semibold text-content-primary font-display">
              Recovery Experimentation Lab
            </h3>
            <span className="text-[10px] font-sans font-medium px-2.5 py-0.5 rounded-full bg-brand-brass-surface text-brand-brass border border-brand-brass-border">
              Simulated Holdout Experiment
            </span>
          </div>

          <p className="text-xs text-content-secondary">
            Simulated holdout evaluation comparing candidate recovery actions on identical customer failure cohorts from active batch.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunExperiment}
          disabled={loading}
          className="px-4 py-2 bg-brand-jade hover:bg-brand-jade-deep text-white rounded-xl text-xs font-semibold tracking-wide flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <BarChart2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Evaluating Cohorts...' : 'Run Experiment (N=120)'}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 bg-brand-burgundy-surface border border-brand-burgundy-border text-brand-burgundy rounded-xl text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold block">Experiment Execution Error</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={handleRunExperiment}
            className="px-2.5 py-1 bg-brand-burgundy text-white rounded-lg text-[11px] font-medium hover:opacity-90 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Trial Results */}
      {data ? (
        <div className="space-y-5">
          {/* Winner or Inconclusive Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isInconclusive 
              ? 'bg-surface-elevated border-brand-amber-border' 
              : 'bg-surface-elevated border-brand-brass-border'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                isInconclusive 
                  ? 'bg-brand-amber-surface border-brand-amber-border text-brand-amber' 
                  : 'bg-brand-brass-surface border-brand-brass-border text-brand-brass'
              }`}>
                {isInconclusive ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Trophy className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-sans uppercase text-content-tertiary block">Experiment Verdict</span>
                <span className="text-sm font-semibold text-content-primary">
                  {isInconclusive ? (
                    'Inconclusive at this sample size'
                  ) : (
                    `${data.winner === 'Group A' ? data.group_a.group_label : data.group_b.group_label} generated superior net revenue yield`
                  )}
                </span>
                <span className="text-[11px] text-content-secondary block mt-0.5">
                  {data.cohort_explanation || (
                    isInconclusive 
                      ? 'Confidence intervals overlap substantially. A larger sample cohort is required to establish statistical significance.'
                      : 'Evaluated across identical customer failure cohorts from active batch.'
                  )}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-sans text-brand-brass bg-brand-brass-surface px-3 py-1 rounded-lg border border-brand-brass-border inline-block">
                Sample N={data.sample_size} ({data.split_method})
              </span>
              {data.available_matching_count !== undefined && (
                <span className="text-[10px] text-content-tertiary block mt-1">
                  {data.sample_size === (data.requested_n || 120) 
                    ? `Full requested N=${data.sample_size} reached (${data.available_matching_count} eligible in batch)`
                    : `Capped at ${data.sample_size} available matching cases`}
                </span>
              )}
            </div>
          </div>

          {/* Side by Side Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Group A */}
            <div className={`p-5 rounded-xl border space-y-4 ${
              !isInconclusive && data.winner === 'Group A' 
                ? 'bg-surface-elevated border-brand-brass shadow-sm' 
                : 'bg-surface-subtle border-border-subtle'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-sans text-content-tertiary block">Strategy Variant A</span>
                  <h4 className="text-sm font-bold text-content-primary font-display">{data.group_a.group_label}</h4>
                </div>
                {!isInconclusive && data.winner === 'Group A' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-brass-surface text-brand-brass border border-brand-brass-border flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Winner
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Attempts</span>
                  <span className="text-content-primary font-bold">{data.group_a.attempts}</span>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Recovery Rate (95% CI)</span>
                  <div className="flex flex-col">
                    <span className="text-brand-jade font-bold font-technical">
                      {data.group_a.ci_display || `${(data.group_a.recovery_rate * 100).toFixed(1)}%`}
                    </span>
                    <span className="text-[9px] text-content-tertiary">Wilson Score Interval</span>
                  </div>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Gross Recovered</span>
                  <span className="text-content-primary font-bold font-technical">₹{(data.group_a.recovered_paise / 100.0).toFixed(2)}</span>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Direct Channel Costs</span>
                  <span className="text-content-secondary font-bold font-technical">₹{(data.group_a.costs_paise / 100.0).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border-subtle flex justify-between items-center text-xs">
                <span className="text-content-secondary font-sans">Net Value Created:</span>
                <span className="text-sm font-bold text-brand-jade font-technical">
                  ₹{(data.group_a.net_value_paise / 100.0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Group B */}
            <div className={`p-5 rounded-xl border space-y-4 ${
              !isInconclusive && data.winner === 'Group B' 
                ? 'bg-surface-elevated border-brand-brass shadow-sm' 
                : 'bg-surface-subtle border-border-subtle'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-sans text-content-tertiary block">Strategy Variant B</span>
                  <h4 className="text-sm font-bold text-content-primary font-display">{data.group_b.group_label}</h4>
                </div>
                {!isInconclusive && data.winner === 'Group B' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-brand-brass-surface text-brand-brass border border-brand-brass-border flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Winner
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Attempts</span>
                  <span className="text-content-primary font-bold">{data.group_b.attempts}</span>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Recovery Rate (95% CI)</span>
                  <div className="flex flex-col">
                    <span className="text-brand-jade font-bold font-technical">
                      {data.group_b.ci_display || `${(data.group_b.recovery_rate * 100).toFixed(1)}%`}
                    </span>
                    <span className="text-[9px] text-content-tertiary">Wilson Score Interval</span>
                  </div>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Gross Recovered</span>
                  <span className="text-content-primary font-bold font-technical">₹{(data.group_b.recovered_paise / 100.0).toFixed(2)}</span>
                </div>
                <div className="bg-surface p-2.5 rounded-lg border border-border-subtle">
                  <span className="text-[10px] text-content-tertiary block uppercase">Direct Channel Costs</span>
                  <span className="text-content-secondary font-bold font-technical">₹{(data.group_b.costs_paise / 100.0).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border-subtle flex justify-between items-center text-xs">
                <span className="text-content-secondary font-sans">Net Value Created:</span>
                <span className="text-sm font-bold text-brand-jade font-technical">
                  ₹{(data.group_b.net_value_paise / 100.0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-content-secondary text-xs font-sans border border-dashed border-border-muted rounded-xl flex flex-col items-center justify-center space-y-3">
          <Split className="w-7 h-7 text-content-tertiary" />
          <div className="max-w-sm">
            <span className="font-semibold text-content-primary block mb-0.5">No Active Trial Results</span>
            <span>Click &quot;Run Experiment&quot; to execute a simulated holdout experiment comparing recovery strategies across identical cohorts.</span>
          </div>
          <button
            type="button"
            onClick={handleRunExperiment}
            disabled={loading}
            className="px-4 py-2 bg-brand-jade hover:bg-brand-jade-deep text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer"
          >
            Launch Trial
          </button>
        </div>
      )}
    </div>
  );
}
