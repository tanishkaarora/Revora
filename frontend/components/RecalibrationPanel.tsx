'use client';

import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

interface RecalibrationPair {
  cause: string;
  action: string;
  before_p: number;
  after_p: number;
  delta: number;
  before_ci: [number, number];
  after_ci: [number, number];
  new_observations: number;
  total_observations: number;
}

export default function RecalibrationPanel() {
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{
    badge_label: string;
    batch_sample_count: number;
    pairs: RecalibrationPair[];
  } | null>(null);

  const handleRecalibrate = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/demo/recalibrate', {
        method: 'POST'
      });
      if (res.ok) {
        const json = await res.json();
        setResult(json);
      }
    } catch (err) {
      console.error('Failed to recalibrate:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-4 h-4 text-brand-jade" />
            <h3 className="text-sm font-semibold text-content-primary font-display">
              Bayesian Posterior Recalibration
            </h3>
            <span className="text-[10px] font-sans font-medium px-2.5 py-0.5 rounded-full bg-brand-jade-surface text-brand-jade border border-brand-jade-border">
              Beta-Binomial Updates
            </span>
          </div>
          <p className="text-xs text-content-secondary">
            Updates posterior recovery probabilities using accumulated outcomes from recent batches. Fully deterministic and reproducible.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRecalibrate}
          disabled={loading}
          className="px-4 py-2 bg-brand-jade hover:bg-brand-jade-deep text-white rounded-xl text-xs font-semibold tracking-wide flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Recalibrating...' : 'Trigger Recalibration'}
        </button>
      </div>

      {/* Recalibration Results */}
      {result ? (
        <div className="space-y-4">
          <div className="bg-surface-subtle p-3 rounded-xl border border-brand-jade-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-jade" />
              <span className="text-xs text-brand-jade font-semibold font-sans">
                {result.badge_label}
              </span>
            </div>
            <span className="text-[11px] text-content-secondary font-sans">
              Batch Samples: <strong className="text-content-primary">{result.batch_sample_count}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.pairs.map((pair, idx) => {
              const deltaPct = (pair.delta * 100).toFixed(2);
              const isPositive = pair.delta >= 0;

              return (
                <div key={idx} className="bg-surface-subtle p-4 rounded-xl border border-border-subtle space-y-3 text-xs font-sans">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-content-tertiary text-[10px] block uppercase">Cause</span>
                      <span className="font-semibold text-content-primary capitalize">{pair.cause.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-content-tertiary text-[10px] block uppercase">Action</span>
                      <span className="text-brand-jade font-semibold capitalize">{pair.action.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-surface p-3 rounded-lg border border-border-subtle text-center">
                    <div>
                      <span className="text-[10px] text-content-tertiary uppercase block">Prior P</span>
                      <span className="text-content-secondary font-bold font-technical">{(pair.before_p * 100).toFixed(1)}%</span>
                      <span className="text-[9px] text-content-muted block font-technical">[{ (pair.before_ci[0]*100).toFixed(0) }%-{ (pair.before_ci[1]*100).toFixed(0) }%]</span>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5 text-content-muted mb-0.5" />
                      <span className={`text-[11px] font-bold font-technical ${isPositive ? 'text-brand-jade' : 'text-brand-amber'}`}>
                        {isPositive ? `+${deltaPct}%` : `${deltaPct}%`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-content-tertiary uppercase block">Posterior P</span>
                      <span className="text-brand-jade font-bold font-technical">{(pair.after_p * 100).toFixed(1)}%</span>
                      <span className="text-[9px] text-content-muted block font-technical">[{ (pair.after_ci[0]*100).toFixed(0) }%-{ (pair.after_ci[1]*100).toFixed(0) }%]</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] text-content-secondary pt-1 border-t border-border-subtle font-sans">
                    <span>New Observations: <strong className="text-content-primary font-technical">+{pair.new_observations}</strong></span>
                    <span>Total Posterior N: <strong className="text-content-primary font-technical">{pair.total_observations}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-10 text-center text-content-secondary text-xs font-sans border border-dashed border-border-muted rounded-xl">
          Click &quot;Trigger Recalibration&quot; to execute the deterministic Bayesian update loop on the latest batch.
        </div>
      )}
    </div>
  );
}
