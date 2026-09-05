// frontend/lib/store.ts
import { create } from 'zustand';

export interface CaseMessage {
  sender: 'bot' | 'user' | 'system';
  text: string;
  timestamp: string;
}

export interface CaseData {
  id: string;
  customer_id: string;
  customer_name: string;
  amount_paise: number;
  method: string;
  error_code: string;
  error_reason: string;
  timestamp: string;
  cause: string;
  diagnosis_confidence: number;
  diagnosis_source: string;
  evidence?: any;
  candidate_action: string;
  channel: string;
  expected_value: number;
  probability_estimate: number;
  cost: number;
  allocated: boolean;
  triage_reason: string;
  outcome: string; // 'ALLOW' | 'BLOCK' | 'ESCALATE'
  rule_fired: string;
  guardrail_reason: string;
  lifecycle_state?: string;
  recovered: boolean;
  amount_recovered_paise: number;
  conversation?: CaseMessage[];
  degraded?: boolean;
  degradation_reason?: string;
  active_promise?: any;
}

export interface StrategyStat {
  name: string;
  recovered_paise: number;
  total_cost_paise?: number;
  net_value_paise?: number;
  uplift_pct?: number;
  uplift_pct_vs_fcfs?: number;
}

export interface ComparisonMetrics {
  optimized_recovered_paise: number;
  baseline_recovered_paise: number;
  uplift_pct: number;
  by_cause: Record<string, { optimized: number; baseline?: number; fcfs?: number; highest_amount?: number; highest_probability?: number }>;
  total_revenue_at_risk_paise?: number;
  net_value_created_paise?: number;
  contacts_avoided_count?: number;
  policy_violations_count?: number;
  strategies?: Record<string, StrategyStat>;
}

export interface CapacityROIItem {
  channel: string;
  capacity_used: number;
  capacity_total: number;
  is_binding: boolean;
  shadow_price_per_unit: number; // in paise
}

export interface CapacitySimulateResponse {
  channel: string;
  original_capacity: number;
  new_capacity: number;
  delta: number;
  is_linear_approximation: boolean;
  projected_recovered_paise: number;
  projected_gain_paise: number;
  shadow_price_per_unit: number;
  explanation: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  failed_payment_id: string;
  outcome: string;
  rule_fired: string;
  reason: string;
}

export interface LiveStage {
  stage: string;
  progress: number;
  description: string;
}

interface AppState {
  cases: CaseData[];
  activeCaseId: string | null;
  comparison: ComparisonMetrics;
  capacityRoi: CapacityROIItem[];
  killSwitchActive: boolean;
  simulationRunning: boolean;
  auditEntries: AuditLog[];
  selectedTab: string;
  promises: any[];
  liveStage: LiveStage | null;
  engineStatus: 'connected' | 'degraded' | 'offline';
  seedBatchError: string | null;
  
  // Actions
  setCases: (cases: CaseData[]) => void;
  updateCase: (caseData: CaseData) => void;
  setActiveCaseId: (id: string | null) => void;
  setComparison: (metrics: ComparisonMetrics) => void;
  setCapacityRoi: (roi: CapacityROIItem[]) => void;
  setKillSwitchActive: (active: boolean) => void;
  setSimulationRunning: (running: boolean) => void;
  setLiveStage: (stage: LiveStage | null) => void;
  addAuditEntry: (entry: AuditLog) => void;
  setSelectedTab: (tab: string) => void;
  setEngineStatus: (status: 'connected' | 'degraded' | 'offline') => void;
  setSeedBatchError: (err: string | null) => void;
  
  // API Fetch Thunks
  fetchCases: () => Promise<void>;
  fetchResults: () => Promise<void>;
  fetchCapacityRoi: () => Promise<void>;
  simulateCapacity: (channel: string, newCapacity: number) => Promise<CapacitySimulateResponse | null>;
  fetchPromises: () => Promise<void>;
  toggleKillSwitch: (active: boolean) => Promise<void>;
  seedBatch: (limit?: number) => Promise<void>;
  triggerAdversarial: () => Promise<CaseData | null>;
  injectFailure: (type: 'llm_timeout' | 'razorpay_error' | 'none') => Promise<void>;
  simulateReply: (caseId: string, text: string) => Promise<void>;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useAppStore = create<AppState>((set, get) => ({
  cases: [],
  activeCaseId: null,
  comparison: {
    optimized_recovered_paise: 0,
    baseline_recovered_paise: 0,
    uplift_pct: 0.0,
    by_cause: {},
    total_revenue_at_risk_paise: 0,
    net_value_created_paise: 0,
    contacts_avoided_count: 0,
    policy_violations_count: 0,
    strategies: {}
  },
  capacityRoi: [],
  promises: [],
  killSwitchActive: false,
  simulationRunning: false,
  auditEntries: [],
  selectedTab: 'overview',
  liveStage: null,
  engineStatus: 'connected',
  seedBatchError: null,

  setCases: (cases) => set({ cases }),
  
  updateCase: (caseData) => set((state) => {
    const exists = state.cases.some((c) => c.id === caseData.id);
    const newCases = exists
      ? state.cases.map((c) => (c.id === caseData.id ? { ...c, ...caseData } : c))
      : [caseData, ...state.cases];
    return { cases: newCases };
  }),

  setActiveCaseId: (id) => set({ activeCaseId: id }),
  setComparison: (comparison) => set({ comparison }),
  setCapacityRoi: (capacityRoi) => set({ capacityRoi }),
  setKillSwitchActive: (killSwitchActive) => set({ killSwitchActive }),
  setSimulationRunning: (simulationRunning) => set({ simulationRunning }),
  setLiveStage: (liveStage) => set({ liveStage }),
  
  addAuditEntry: (entry) => set((state) => {
    if (state.auditEntries.some(e => e.id === entry.id)) return state;
    return { auditEntries: [entry, ...state.auditEntries].slice(0, 100) };
  }),

  setSelectedTab: (selectedTab) => set({ selectedTab, activeCaseId: null }),


  setEngineStatus: (engineStatus) => set({ engineStatus }),
  setSeedBatchError: (seedBatchError) => set({ seedBatchError }),

  fetchCases: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/cases`);
      if (response.ok) {
        const data = await response.json();
        set({ cases: data, engineStatus: 'connected' });
      } else {
        set({ engineStatus: 'degraded' });
      }
    } catch (error) {
      console.error('Failed to fetch cases:', error);
      set({ engineStatus: 'offline' });
    }
  },

  fetchResults: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/results/comparison`);
      if (response.ok) {
        const data = await response.json();
        set({ comparison: data });
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    }
  },

  fetchCapacityRoi: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/results/capacity-roi`);
      if (response.ok) {
        const data = await response.json();
        set({ capacityRoi: data });
      }
    } catch (error) {
      console.error('Failed to fetch capacity ROI:', error);
    }
  },

  simulateCapacity: async (channel: string, newCapacity: number) => {
    try {
      const response = await fetch(`${BACKEND_URL}/results/capacity-roi/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, new_capacity: newCapacity })
      });
      if (response.ok) {
        const data: CapacitySimulateResponse = await response.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error('Failed to simulate capacity:', error);
      return null;
    }
  },

  toggleKillSwitch: async (active) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const demoSecret = process.env.NEXT_PUBLIC_DEMO_SECRET;
      if (demoSecret) {
        headers['X-Demo-Secret'] = demoSecret;
      }
      const response = await fetch(`${BACKEND_URL}/demo/kill-switch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ active })
      });
      if (response.ok) {
        const data = await response.json();
        set({ killSwitchActive: data.kill_switch_active });
      }
    } catch (error) {
      console.error('Failed to toggle kill switch:', error);
    }
  },

  seedBatch: async (limit = 210) => {
    try {
      set({ 
        simulationRunning: true, 
        seedBatchError: null,
        cases: [], 
        auditEntries: [],
        liveStage: { stage: 'Ingesting', progress: 10, description: 'Starting live decision pipeline replay...' }
      });
      const headers: Record<string, string> = {};
      const demoSecret = process.env.NEXT_PUBLIC_DEMO_SECRET;
      if (demoSecret) {
        headers['X-Demo-Secret'] = demoSecret;
      }
      const response = await fetch(`${BACKEND_URL}/demo/seed-batch?limit=${limit}`, {
        method: 'POST',
        headers
      });
      if (!response.ok) {
        const errorText = await response.text();
        set({ 
          simulationRunning: false, 
          liveStage: null, 
          seedBatchError: `Failed to execute recovery batch (${response.status}): ${errorText || 'Server error'}`
        });
      }
    } catch (error: any) {
      console.error('Failed to seed batch:', error);
      set({ 
        simulationRunning: false, 
        liveStage: null, 
        seedBatchError: `Unable to connect to Revora recovery engine: ${error?.message || 'Network unreachable'}`
      });
    }
  },

  triggerAdversarial: async () => {
    try {
      const headers: Record<string, string> = {};
      const demoSecret = process.env.NEXT_PUBLIC_DEMO_SECRET;
      if (demoSecret) {
        headers['X-Demo-Secret'] = demoSecret;
      }
      const response = await fetch(`${BACKEND_URL}/demo/trigger-adversarial-case`, {
        method: 'POST',
        headers
      });
      if (response.ok) {
        const data = await response.json();
        if (data.case) {
          get().updateCase(data.case);
          get().setActiveCaseId(data.case.id);
          return data.case;
        }
        await get().fetchCases();
      }
      return null;
    } catch (error) {
      console.error('Failed to trigger adversarial case:', error);
      return null;
    }
  },

  injectFailure: async (type) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const demoSecret = process.env.NEXT_PUBLIC_DEMO_SECRET;
      if (demoSecret) {
        headers['X-Demo-Secret'] = demoSecret;
      }
      await fetch(`${BACKEND_URL}/demo/inject-failure`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ failure_type: type })
      });
    } catch (error) {
      console.error('Failed to inject failure:', error);
    }
  },

  simulateReply: async (caseId, text) => {
    // 1. Optimistic conversation append for immediate UI feedback
    const currentCase = get().cases.find(c => c.id === caseId);
    if (currentCase) {
      const conv = currentCase.conversation ? [...currentCase.conversation] : [];
      const hasBot = conv.some(m => m.sender === 'bot');
      if (!hasBot) {
        const cName = currentCase.customer_name || 'Customer';
        const amountRupees = (currentCase.amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        conv.unshift({
          sender: 'bot',
          text: `Hi ${cName}! Aapka ₹${amountRupees} ka payment complete nahi ho paya. Aap is secure link se retry kar sakte hain: https://rzp.io/l/retry_${caseId}`,
          timestamp: currentCase.timestamp || new Date().toISOString()
        });
      }

      conv.push({
        sender: 'user',
        text,
        timestamp: new Date().toISOString()
      });

      get().updateCase({
        ...currentCase,
        conversation: conv
      });
    }

    // 2. Perform backend commitment extraction and state update
    try {
      const response = await fetch(`${BACKEND_URL}/cases/${caseId}/simulate-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.case) {
          get().updateCase({
            ...data.case,
            customer_name: currentCase?.customer_name || data.case.customer_name,
            active_promise: data.commitment?.commits ? data.commitment : data.case.active_promise
          });
        }
        await get().fetchPromises();
      }
    } catch (error) {
      console.error('Failed to simulate reply:', error);
    }
  },


  fetchPromises: async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/cases/promises`);
      if (response.ok) {
        const data = await response.json();
        set({ promises: data });
      }
    } catch (error) {
      console.error('Failed to fetch promises:', error);
    }
  }
}));
