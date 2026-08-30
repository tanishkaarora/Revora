// frontend/components/CapacityROI.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore, CapacityROIItem, CapacitySimulateResponse } from '../lib/store';
import { TrendingUp, Layers, Sliders, Cpu, CheckCircle2, AlertTriangle, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';

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

  // Sync slider default when capacityRoi loads
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
      const res = await simulateCapacity('whatsapp', val);
      if (res) {
        setSimulation(res);
      }
      setIsSimulating(false);
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
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-5 shadow-xl flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#232630] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Capacity ROI & Shadow Prices (Dual Values)
            </h3>
            <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
              Revora Optimizer
            </span>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
              Continuous LP Relaxation
            </span>
          </div>

          <p className="text-xs text-gray-400 mt-1">
            Exposing exact mathematical marginal yield (<span className="font-mono text-gray-300">∂Recovered / ∂Capacity</span>) from the optimization solver.
          </p>
        </div>

        <button
          onClick={() => {
            fetchCapacityRoi();
            runSimulation(sliderValue);
          }}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 bg-[#0A0B0F] border border-[#232630] hover:border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-emerald-400' : ''}`} />
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
                  ? 'bg-gradient-to-br from-[#181D24] to-[#12141A] border-amber-500/30 shadow-md'
                  : 'bg-[#0A0B0F] border-[#1E212B]'
              }`}
            >
              {/* Top Row: Channel Name + Binding Badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className={`w-4 h-4 ${item.is_binding ? 'text-amber-400' : 'text-gray-500'}`} />
                  <span className="font-bold text-sm text-gray-200 capitalize">
                    {isWa ? 'WhatsApp Nudge Channel' : 'Human Call Escalation'}
                  </span>
                </div>

                <span
                  className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold flex items-center gap-1.5 border ${
                    item.is_binding
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-gray-800/60 text-gray-400 border-gray-700'
                  }`}
                >
                  {item.is_binding ? (
                    <>
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      Binding (Bottleneck)
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-gray-400" />
                      Not Binding (Surplus)
                    </>
                  )}
                </span>
              </div>

              {/* Progress Bar & Capacity Utilization */}
              <div className="mb-3">
                <div className="flex justify-between text-xs font-mono text-gray-400 mb-1.5">
                  <span>Capacity Utilization</span>
                  <span className="font-bold text-gray-200">
                    {item.capacity_used} / {item.capacity_total} slots ({usedPct}%)
                  </span>
                </div>
                <div className="w-full bg-[#1B1D26] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.is_binding
                        ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                        : 'bg-emerald-600/70'
                    }`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
              </div>

              {/* Shadow Price Recommendation Line */}
              <div className="pt-2 border-t border-[#232630]/60">
                {item.is_binding ? (
                  <p className="text-xs text-amber-200/90 font-medium leading-relaxed">
                    ⚡ <span className="font-bold text-emerald-400">Each additional daily slot is worth ~₹{shadowRupees}</span> in expected revenue recovery.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 font-light leading-relaxed">
                    Adding more capacity here would recover <span className="font-mono text-gray-400 font-medium">₹0</span> more today (constraint has slack).
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive What-If Simulator Panel */}
      <div className="bg-[#0A0B0F] border border-[#232630] rounded-xl p-5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200">
                Live Capacity What-If Simulation
              </h4>
              <span className="text-[10px] text-gray-400">
                Adjust WhatsApp daily slots to observe the simulated recovery yield
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                isApprox
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
              }`}
            >
              <Cpu className="w-3 h-3" />
              {isApprox
                ? '⚡ Instant Dual Approximation (Δ ≤ ±20%)'
                : '🔄 Full MILP Re-optimized (Δ > ±20%)'}
            </span>
          </div>
        </div>

        {/* Slider & Value Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Slider Side */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-gray-400">Target WhatsApp Slots:</span>
              <span className="text-base font-bold text-emerald-400 bg-[#13151C] border border-[#232630] px-3 py-1 rounded-lg">
                {sliderValue} slots
                <span className="text-[10px] text-gray-500 ml-1.5 font-normal">
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
              className="w-full h-2 bg-[#1B1D26] rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>10 slots (Tight)</span>
              <span>50 slots (Default)</span>
              <span>150 slots (Expanded)</span>
            </div>
          </div>

          {/* Projected Yield Output */}
          <div className="lg:col-span-5 bg-[#13151C] p-4 rounded-xl border border-[#232630] flex flex-col justify-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
              Projected Batch Recovery
            </span>

            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-black font-mono text-emerald-400 transition-all duration-300">
                ₹{projectedRecoveredRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              {deltaGainRupees !== 0 && (
                <span
                  className={`text-xs font-mono font-bold flex items-center ${
                    deltaGainRupees > 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {deltaGainRupees > 0 ? '+' : ''}₹{deltaGainRupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              )}
            </div>

            <p className="text-[10px] text-gray-400 mt-2 font-mono leading-tight">
              {simulation?.explanation || 'Slide capacity to test marginal impact on recovery.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
