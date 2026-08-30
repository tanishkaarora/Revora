// frontend/components/RecalibrationPanel.tsx
import React, { useState } from 'react';
import { RefreshCw, Sparkles, TrendingUp, CheckCircle2, ArrowRight, Activity, Database } from 'lucide-react';

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
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#232630] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Deterministic Learning Loop & Recalibration
            </h3>
            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Bayesian Beta-Binomial
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Updates posterior recovery probabilities using accumulated outcomes from recent batches. Fully deterministic and reproducible.
          </p>
        </div>

        <button
          onClick={handleRecalibrate}
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Recalibrating...' : 'Trigger Recalibration'}
        </button>
      </div>

      {/* Recalibration Results */}
      {result ? (
        <div className="space-y-4">
          <div className="bg-[#0A0B0F] p-3 rounded-lg border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono text-emerald-300 font-semibold">
                {result.badge_label}
              </span>
            </div>
            <span className="text-[10px] font-mono text-gray-400">
              Batch Samples: <strong className="text-white">{result.batch_sample_count}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.pairs.map((pair, idx) => {
              const deltaPct = (pair.delta * 100).toFixed(2);
              const isPositive = pair.delta >= 0;

              return (
                <div key={idx} className="bg-[#0A0B0F] p-4 rounded-xl border border-[#1B1D25] space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-gray-400 text-[10px] block uppercase">Cause</span>
                      <span className="font-bold text-white capitalize">{pair.cause.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-400 text-[10px] block uppercase">Action</span>
                      <span className="text-emerald-400 capitalize">{pair.action.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-[#13151C] p-3 rounded-lg border border-[#232630] text-center">
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase block">Before</span>
                      <span className="text-gray-300 font-bold">{(pair.before_p * 100).toFixed(1)}%</span>
                      <span className="text-[8px] text-gray-500 block">[{ (pair.before_ci[0]*100).toFixed(0) }%-{ (pair.before_ci[1]*100).toFixed(0) }%]</span>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5 text-gray-500 mb-0.5" />
                      <span className={`text-[10px] font-bold ${isPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isPositive ? `+${deltaPct}%` : `${deltaPct}%`}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase block">After</span>
                      <span className="text-emerald-400 font-bold">{(pair.after_p * 100).toFixed(1)}%</span>
                      <span className="text-[8px] text-gray-500 block">[{ (pair.after_ci[0]*100).toFixed(0) }%-{ (pair.after_ci[1]*100).toFixed(0) }%]</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] text-gray-400 pt-1 border-t border-[#1B1D25]">
                    <span>New Observations: <strong className="text-white">+{pair.new_observations}</strong></span>
                    <span>Total Posterior N: <strong className="text-white">{pair.total_observations}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-gray-500 text-xs font-mono border border-dashed border-[#232630] rounded-xl">
          Click &quot;Trigger Recalibration&quot; to execute the deterministic Bayesian update loop on the latest batch.
        </div>
      )}
    </div>
  );
}
