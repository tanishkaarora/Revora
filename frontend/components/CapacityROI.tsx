'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore, CapacityROIItem, CapacitySimulateResponse } from '../lib/store';
import { TrendingUp, Layers, Sliders, Cpu, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';

export default function CapacityROI() {
  const capacityRoi = useAppStore((state) => state.capacityRoi);
  const fetchCapacityRoi = useAppStore((state) => state.fetchCapacityRoi);
  const simulateCapacity = useAppStore((state) => state.simulateCapacity);
  const comparison = useAppStore((state) => state.comparison);

  // Identify WhatsApp item (or first binding channel)
  const whatsappItem = capacityRoi.find((r) => r.channel === 'whatsapp') || {
    channel: 'whatsapp',
    capacity_used: 50,
    capacity_total: 50,
    is_binding: true,
    shadow_price_per_unit: 34000
  };

  const [sliderValue, setSliderValue] = useState<number>(whatsappItem.capacity_total || 50);
  const [simulation, setSimulation] = useState<CapacitySimulateResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    fetchCapacityRoi();
  }, [fetchCapacityRoi]);

  useEffect(() => {
    if (whatsappItem.capacity_total) {
      setSliderValue(whatsappItem.capacity_total);
    }
  }, [whatsappItem.capacity_total]);

  // Run simulation debounced on slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSliderValue(val);
  };

  const runSimulation = useCallback(
    async (val: number) => {
      setIsSimulating(true);
      setSimError(null);
      try {
        const res = await simulateCapacity('whatsapp', val);
        if (res) {
          setSimulation(res);
        } else {
          setSimError('Simulation request returned empty response.');
        }
      } catch (err: any) {
        setSimError(err?.message || 'Failed to simulate capacity. Please check backend connection.');
      } finally {
        setIsSimulating(false);
      }
    },
    [simulateCapacity]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation(sliderValue);
    }, 150);
    return () => clearTimeout(timer);
  }, [sliderValue, runSimulation]);

  const baseRecoveredRupees = comparison.optimized_recovered_paise / 100.0;
  const projectedRecoveredRupees = simulation
    ? simulation.projected_recovered_paise / 100.0
    : baseRecoveredRupees;
  const deltaGainRupees = simulation ? simulation.projected_gain_paise / 100.0 : 0;
  const isApprox = simulation?.is_linear_approximation ?? true;

  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-wide text-content-primary flex items-center gap-2 font-display">
              <TrendingUp className="w-4 h-4 text-brand-jade" />
              Channel Capacity ROI & Shadow Prices (Dual Values)
            </h3>
            <span className="text-[10px] font-medium text-brand-brass bg-brand-brass-surface px-2 py-0.5 rounded-full border border-brand-brass-border">
              Marginal Yield
            </span>
          </div>
          <p className="text-xs text-content-secondary mt-0.5">
            Mathematical marginal yield (<span className="font-technical text-content-primary">∂Recovered / ∂Capacity</span>) extracted from LP dual solutions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchCapacityRoi();
            runSimulation(sliderValue);
          }}
          className="flex items-center gap-1.5 text-xs text-content-secondary hover:text-content-primary bg-surface-subtle border border-border-subtle hover:border-border-muted px-3 py-1.5 rounded-lg transition-colors cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-brand-jade' : ''}`} />
          <span>Refresh Duals</span>
        </button>
      </div>

      {/* Channel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(capacityRoi.length > 0 ? capacityRoi : [
          { channel: 'whatsapp', capacity_used: 50, capacity_total: 50, is_binding: true, shadow_price_per_unit: 34000 },
          { channel: 'human', capacity_used: 2, capacity_total: 5, is_binding: false, shadow_price_per_unit: 0 }
        ]).map((item: CapacityROIItem) => {
          const usedPct = Math.min(100, Math.round((item.capacity_used / Math.max(1, item.capacity_total)) * 100));
          const shadowRupees = (item.shadow_price_per_unit / 100.0).toFixed(0);
          const isWa = item.channel === 'whatsapp';

          return (
            <div
              key={item.channel}
              className={`p-4 rounded-xl border transition-all ${
                item.is_binding
                  ? 'bg-surface-elevated border-brand-amber-border shadow-sm'
                  : 'bg-surface-subtle border-border-subtle'
              }`}
            >
              {/* Top Row: Channel Name + Binding Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className={`w-4 h-4 ${item.is_binding ? 'text-brand-amber' : 'text-content-tertiary'}`} />
                  <span className="font-semibold text-sm text-content-primary capitalize">
                    {isWa ? 'WhatsApp Nudge Channel' : 'Voice Concierge Triage'}
                  </span>
                </div>

                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-sans font-medium flex items-center gap-1.5 border ${
                    item.is_binding
                      ? 'bg-brand-amber-surface text-brand-amber border-brand-amber-border'
                      : 'bg-surface text-content-tertiary border-border-subtle'
                  }`}
                >
                  {item.is_binding ? (
                    <>
                      <AlertTriangle className="w-3 h-3 text-brand-amber" />
                      Binding (Bottleneck)
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-content-tertiary" />
                      Not Binding (Surplus)
                    </>
                  )}
                </span>
              </div>

              {/* Progress Bar & Capacity Utilization */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-content-secondary mb-1.5 font-sans">
                  <span>Capacity Utilization</span>
                  <span className="font-semibold text-content-primary font-technical">
                    {item.capacity_used} / {item.capacity_total} slots ({usedPct}%)
                  </span>
                </div>
                <div className="w-full bg-surface h-2 rounded-full overflow-hidden border border-border-subtle">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.is_binding
                        ? 'bg-brand-amber'
                        : 'bg-brand-jade'
                    }`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
              </div>

              {/* Shadow Price Recommendation */}
              <div className="pt-2 border-t border-border-subtle">
                {item.is_binding ? (
                  <p className="text-xs text-content-secondary font-sans leading-relaxed">
                    <span className="font-semibold text-brand-jade">Each additional daily slot is worth ~₹{shadowRupees}</span> in marginal revenue recovery.
                  </p>
                ) : (
                  <p className="text-xs text-content-tertiary font-sans leading-relaxed">
                    Adding more capacity here recovers <span className="font-technical text-content-secondary font-medium">₹0</span> extra today (slack available).
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive What-If Simulator Panel */}
      <div className="bg-surface-subtle border border-border-subtle rounded-xl p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-brand-jade" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-content-primary">
                Capacity Simulation Lab
              </h4>
              <span className="text-[11px] text-content-secondary font-sans">
                Adjust WhatsApp daily slots to observe the simulated recovery yield
              </span>
            </div>
          </div>

          <span
            className={`text-[10px] font-sans px-2.5 py-1 rounded-md border flex items-center gap-1.5 self-start sm:self-auto ${
              isApprox
                ? 'bg-brand-jade-surface text-brand-jade border-brand-jade-border'
                : 'bg-brand-brass-surface text-brand-brass border-brand-brass-border'
            }`}
          >
            <Cpu className="w-3 h-3" />
            {isApprox
              ? 'Instant Dual Approximation (Δ ≤ ±20%)'
              : 'Full MILP Re-optimized (Δ > ±20%)'}
          </span>
        </div>

        {simError && (
          <div className="mb-4 p-3 bg-brand-burgundy-surface border border-brand-burgundy-border text-brand-burgundy rounded-xl text-xs flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {simError}
            </span>
            <button
              type="button"
              onClick={() => runSimulation(sliderValue)}
              className="px-2 py-0.5 bg-brand-burgundy text-white rounded text-[10px] font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Slider & Value Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Slider Side */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex justify-between items-center text-xs font-sans">
              <span className="text-content-secondary">Target WhatsApp Slots:</span>
              <span className="text-sm font-bold text-brand-jade bg-surface border border-border-subtle px-3 py-1 rounded-lg font-technical">
                {sliderValue} slots
                <span className="text-[10px] text-content-tertiary ml-1.5 font-normal">
                  ({sliderValue - (whatsappItem.capacity_total || 50) >= 0 ? '+' : ''}
                  {sliderValue - (whatsappItem.capacity_total || 50)} vs base)
                </span>
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="150"
              step="1"
              value={sliderValue}
              onChange={handleSliderChange}
              className="w-full h-2 bg-surface rounded-lg appearance-none cursor-pointer accent-brand-jade border border-border-subtle"
            />

            <div className="flex justify-between text-[10px] text-content-tertiary font-sans">
              <span>10 slots (Tight)</span>
              <span>50 slots (Default)</span>
              <span>150 slots (Expanded)</span>
            </div>
          </div>

          {/* Projected Yield Output */}
          <div className="lg:col-span-5 bg-surface p-4 rounded-xl border border-border-subtle flex flex-col justify-center">
            <span className="text-[10px] text-content-tertiary font-bold uppercase tracking-wider block">
              Projected Batch Recovery
            </span>

            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-bold font-display text-brand-jade">
                <AnimatedNumber value={projectedRecoveredRupees} prefix="₹" />
              </span>
              {deltaGainRupees !== 0 && (
                <span
                  className={`text-xs font-technical font-semibold flex items-center ${
                    deltaGainRupees > 0 ? 'text-brand-jade' : 'text-brand-burgundy'
                  }`}
                >
                  {deltaGainRupees > 0 ? '+' : ''}₹{deltaGainRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>

            <p className="text-[11px] text-content-secondary mt-1.5 font-sans leading-relaxed">
              {simulation?.explanation || 'Slide capacity to test marginal impact on recovery.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
