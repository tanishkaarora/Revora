// frontend/components/SystemHealth.tsx
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../lib/store';
import { Shield, Clock, Activity, ShieldAlert, ShieldCheck, AlertTriangle, EyeOff, FileSignature } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

export default function SystemHealth() {
  const cases = useAppStore((state) => state.cases);
  const activeCaseId = useAppStore((state) => state.activeCaseId);

  // Time & Quiet Hours check
  const [time, setTime] = useState<string>('');
  const [isQuiet, setIsQuiet] = useState<boolean>(false);

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      setTime(timeStr);
      const quiet = hours >= 21 || hours < 8;
      setIsQuiet(quiet);
    }
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  // LLM Confidence calculations
  const activeCase = cases.find(c => c.id === activeCaseId);
  let confidenceValue = 0.0;
  let confidenceLabel = "Avg. Confidence";

  if (activeCase) {
    confidenceValue = activeCase.diagnosis_confidence;
    confidenceLabel = `Case: ${activeCase.id}`;
  } else if (cases.length > 0) {
    const totalConfidence = cases.reduce((acc, c) => acc + c.diagnosis_confidence, 0);
    confidenceValue = totalConfidence / cases.length;
  }
  const confidencePercentage = confidenceValue * 100;

  // Recharts RadialBar data format
  const chartData = [
    {
      name: 'Confidence',
      value: confidencePercentage,
      fill: confidencePercentage >= 80 ? '#10B981' : confidencePercentage >= 50 ? '#F59E0B' : '#EF4444'
    }
  ];

  // Guardrail counters
  const quietHoursBlocks = cases.filter(c => c.allocated && c.outcome === 'BLOCK' && c.rule_fired === 'quiet_hours').length;
  const contactCapBlocks = cases.filter(c => c.allocated && c.outcome === 'BLOCK' && c.rule_fired === 'contact_cap_exceeded').length;
  const promiseBlocks = cases.filter(c => c.allocated && c.outcome === 'BLOCK' && c.rule_fired === 'promise_pending').length;
  const refundEscalations = cases.filter(c => c.allocated && c.outcome === 'ESCALATE' && c.rule_fired === 'refund_signature_required').length;
  const killSwitchBlocks = cases.filter(c => c.allocated && c.outcome === 'BLOCK' && c.rule_fired === 'kill_switch_active').length;

  const totalInterventions = quietHoursBlocks + contactCapBlocks + promiseBlocks + refundEscalations + killSwitchBlocks;

  return (
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-5 shadow-lg flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-[#232630] pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          System Health & Policy Engine
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
            Revora Guard
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-emerald-400 font-mono font-medium">Policy Active</span>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sub-Widget 1: Quiet Hours Check */}
        <div className="bg-[#0A0B0F] p-3 rounded-lg border border-[#1B1D25] flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" /> Quiet Hours
            </span>
            <span className="text-xs font-mono text-gray-500">21:00 - 08:00</span>
          </div>
          <div className="my-2 text-center">
            <span className="text-xl font-bold font-mono text-white tracking-wide">{time}</span>
          </div>
          <div className={`px-2 py-1 rounded text-[8px] font-mono leading-none flex items-center gap-1 ${
            isQuiet ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            {isQuiet ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
            {isQuiet ? 'Outreach Suspended' : 'Nudges & Calls Active'}
          </div>
        </div>

        {/* Sub-Widget 2: LLM Confidence */}
        <div className="bg-[#0A0B0F] p-3 rounded-lg border border-[#1B1D25] flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" /> LLM Confidence
            </span>
          </div>
          
          <div className="flex items-center justify-around gap-2 my-1">
            <div className="w-[50px] h-[50px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="75%"
                  outerRadius="100%"
                  barSize={4}
                  data={chartData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background={{ fill: '#1F2937' }} dataKey="value" cornerRadius={2} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold font-mono text-white">{confidencePercentage.toFixed(0)}%</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-gray-500 uppercase tracking-wider leading-none">Diagnostic Scope</span>
              <span className="text-[10px] text-gray-300 font-mono mt-0.5 truncate max-w-[90px]" title={confidenceLabel}>
                {confidenceLabel}
              </span>
            </div>
          </div>

          <span className="text-[8px] text-gray-500 text-center leading-none">
            Fallback active for low confidence cases
          </span>
        </div>

        {/* Sub-Widget 3: Interventions */}
        <div className="bg-[#0A0B0F] p-3 rounded-lg border border-[#1B1D25] flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-500" /> Interventions
            </span>
            <span className="text-base font-bold font-mono text-amber-500">{totalInterventions}</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 my-1 text-[8px] font-mono">
            <div className="flex justify-between text-gray-400">
              <span className="truncate">Kill Switch:</span>
              <span className="text-red-500 font-bold">{killSwitchBlocks}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span className="truncate">Quiet Hours:</span>
              <span className="text-blue-400 font-bold">{quietHoursBlocks}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span className="truncate">Contact Cap:</span>
              <span className="text-orange-400 font-bold">{contactCapBlocks}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span className="truncate">Promises:</span>
              <span className="text-amber-500 font-bold">{promiseBlocks}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-[8px] font-mono border-t border-[#1B1D25] pt-1">
            <span className="text-gray-500 uppercase">Refund Overrides:</span>
            <span className="text-purple-400 font-bold">{refundEscalations}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
