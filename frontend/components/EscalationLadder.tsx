'use client';

import React from 'react';
import { Send, Users, Ban, ArrowRight } from 'lucide-react';

export default function EscalationLadder() {
  return (
    <div className="surface-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between h-full min-h-[220px]">
      <div>
        <h3 className="text-xs font-semibold tracking-wide uppercase text-content-primary flex items-center gap-2 mb-4 border-b border-border-subtle pb-2">
          Recovery Escalation Stage Hierarchy
        </h3>

        <div className="flex items-center gap-2 text-content-primary">
          {/* Stage 1 */}
          <div className="flex-1 bg-surface-subtle p-3.5 rounded-xl border border-border-subtle text-center space-y-1">
            <Send className="w-4 h-4 text-brand-steel mx-auto mb-1" />
            <span className="text-[10px] font-bold font-technical text-brand-steel block">STAGE 1</span>
            <span className="text-xs font-medium block text-content-primary">Automated Nudges</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-content-muted shrink-0" />

          {/* Stage 2 */}
          <div className="flex-1 bg-surface-subtle p-3.5 rounded-xl border border-border-subtle text-center space-y-1">
            <Users className="w-4 h-4 text-brand-brass mx-auto mb-1" />
            <span className="text-[10px] font-bold font-technical text-brand-brass block">STAGE 2</span>
            <span className="text-xs font-medium block text-content-primary">Voice Concierge</span>
          </div>

          <ArrowRight className="w-3.5 h-3.5 text-content-muted shrink-0" />

          {/* Stage 3 */}
          <div className="flex-1 bg-surface-subtle p-3.5 rounded-xl border border-border-subtle text-center space-y-1">
            <Ban className="w-4 h-4 text-brand-burgundy mx-auto mb-1" />
            <span className="text-[10px] font-bold font-technical text-brand-burgundy block">STAGE 3</span>
            <span className="text-xs font-medium block text-content-primary">Suppression</span>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-content-secondary mt-4 leading-normal font-sans pt-2 border-t border-border-subtle">
        Revora routes actions dynamically according to Bayesian posterior probability, solver constraints, and customer latency.
      </div>
    </div>
  );
}
