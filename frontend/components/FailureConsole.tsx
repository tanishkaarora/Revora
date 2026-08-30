// frontend/components/FailureConsole.tsx
import React, { useState } from 'react';
import { useAppStore } from '../lib/store';
import { Play, ShieldAlert, ZapOff, ShieldCheck, Bug, PlayCircle } from 'lucide-react';

export default function FailureConsole() {
  const seedBatch = useAppStore((state) => state.seedBatch);
  const triggerAdversarial = useAppStore((state) => state.triggerAdversarial);
  const injectFailure = useAppStore((state) => state.injectFailure);
  const simulationRunning = useAppStore((state) => state.simulationRunning);

  const [activeFailure, setActiveFailure] = useState<'llm_timeout' | 'razorpay_error' | 'none'>('none');

  const handleInject = async (type: 'llm_timeout' | 'razorpay_error' | 'none') => {
    await injectFailure(type);
    setActiveFailure(type);
  };

  return (
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-5 shadow-lg flex flex-col justify-between h-full">
      <div>
        <div className="flex justify-between items-center mb-4 border-b border-[#232630] pb-2">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-300 flex items-center gap-2">
            <Bug className="w-4 h-4 text-red-400" />
            Failure Injection & Demo Control
          </h3>
          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
            Revora Guard
          </span>
        </div>


        <div className="space-y-4">
          {/* Main seed control */}
          <div className="flex gap-2">
            <button
              onClick={() => seedBatch(210)}
              disabled={simulationRunning}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                simulationRunning
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Play className="w-4 h-4" />
              {simulationRunning ? 'Ingesting Batch...' : 'Seed 200+ Demo Batch'}
            </button>
            
            <button
              onClick={triggerAdversarial}
              disabled={simulationRunning}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 cursor-pointer transition-colors"
              title="Runs a single high-value adversarial case containing Prompt Injection or Refund Threshold violations."
            >
              <PlayCircle className="w-4 h-4" />
              Run Adversarial Test
            </button>
          </div>

          {/* Failure Injection Console */}
          <div className="space-y-2">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">
              Simulation Degradation Hooks
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleInject('llm_timeout')}
                className={`text-[10px] p-2 rounded-lg font-semibold border cursor-pointer transition-all ${
                  activeFailure === 'llm_timeout'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-[#0A0B0F] border-[#1B1D25] text-gray-400 hover:border-red-500/50 hover:text-red-400'
                }`}
              >
                <ZapOff className="w-3.5 h-3.5 mx-auto mb-1 block" />
                Ollama Down
              </button>

              <button
                onClick={() => handleInject('razorpay_error')}
                className={`text-[10px] p-2 rounded-lg font-semibold border cursor-pointer transition-all ${
                  activeFailure === 'razorpay_error'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-[#0A0B0F] border-[#1B1D25] text-gray-400 hover:border-red-500/50 hover:text-red-400'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 mx-auto mb-1 block" />
                Razorpay Err
              </button>

              <button
                onClick={() => handleInject('none')}
                className={`text-[10px] p-2 rounded-lg font-semibold border cursor-pointer transition-all ${
                  activeFailure === 'none'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-[#0A0B0F] border-[#1B1D25] text-gray-400 hover:border-emerald-500/50 hover:text-emerald-400'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 mx-auto mb-1 block" />
                Healthy Mode
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#232630] flex items-center justify-between text-[9px] text-gray-500 font-mono">
        <span>STATUS: {simulationRunning ? 'SIMULATING' : 'IDLE'}</span>
        <span>ERROR STATE: <span className={activeFailure === 'none' ? 'text-emerald-500' : 'text-red-500 font-bold'}>{activeFailure.toUpperCase()}</span></span>
      </div>
    </div>
  );
}
