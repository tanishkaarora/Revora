// frontend/components/EscalationLadder.tsx
import React from 'react';
import { Send, Users, Ban, ArrowRight } from 'lucide-react';

export default function EscalationLadder() {
  return (
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-5 shadow-lg flex flex-col justify-between h-full min-h-[220px]">
      <div>
        <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-400 flex items-center gap-2 mb-4 border-b border-[#232630] pb-2">
          Recovery Escalation Stage Ladder
        </h3>

        <div className="flex items-center gap-2 text-gray-300">
          {/* Stage 1 */}
          <div className="flex-1 bg-[#0A0B0F] p-3 rounded-lg border border-[#1B1D25] text-center">
            <Send className="w-4 h-4 text-sky-400 mx-auto mb-1.5" />
            <span className="text-[9px] font-bold font-mono text-sky-400 block">DAY 1</span>
            <span className="text-[10px] font-medium block">Nudges</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-gray-700" />

          {/* Stage 2 */}
          <div className="flex-1 bg-[#0A0B0F] p-3 rounded-lg border border-[#1B1D25] text-center">
            <Users className="w-4 h-4 text-amber-400 mx-auto mb-1.5" />
            <span className="text-[9px] font-bold font-mono text-amber-400 block">DAY 15</span>
            <span className="text-[10px] font-medium block">Human Calls</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-gray-700" />

          {/* Stage 3 */}
          <div className="flex-1 bg-[#0A0B0F] p-3 rounded-lg border border-[#1B1D25] text-center">
            <Ban className="w-4 h-4 text-red-400 mx-auto mb-1.5" />
            <span className="text-[9px] font-bold font-mono text-red-400 block">DAY 30+</span>
            <span className="text-[10px] font-medium block">Charge-offs</span>
          </div>
        </div>
      </div>

      <div className="text-[9px] text-gray-500 mt-4 leading-normal">
        *Revora prioritizes actions depending on duration since payment failure, solver efficiency, and customer response latency.

      </div>
    </div>
  );
}
