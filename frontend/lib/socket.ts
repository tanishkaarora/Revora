// frontend/lib/socket.ts
import { useEffect, useRef } from 'react';
import { useAppStore } from './store';

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/stream';

export function useWebSocketConnection() {
  const socketRef = useRef<WebSocket | null>(null);
  
  const updateCase = useAppStore((state) => state.updateCase);
  const setKillSwitchActive = useAppStore((state) => state.setKillSwitchActive);
  const setSimulationRunning = useAppStore((state) => state.setSimulationRunning);
  const setLiveStage = useAppStore((state) => state.setLiveStage);
  const addAuditEntry = useAppStore((state) => state.addAuditEntry);
  const fetchResults = useAppStore((state) => state.fetchResults);
  const setComparison = useAppStore((state) => state.setComparison);
  const setEngineStatus = useAppStore((state) => state.setEngineStatus);
  const fetchCapacityRoi = useAppStore((state) => state.fetchCapacityRoi);
  const fetchCases = useAppStore((state) => state.fetchCases);

  useEffect(() => {
    let reconnectTimeoutId: any;

    function connect() {
      console.log('Connecting to WebSocket...');
      const ws = new WebSocket(WEBSOCKET_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setEngineStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'kill_switch_state') {
            setKillSwitchActive(message.active);
          } 
          
          else if (message.type === 'stage_update') {
            setLiveStage(message.data);
          }
          
          else if (message.type === 'audit_entry') {
            const caseData = message.data;
            updateCase(caseData);
            
            addAuditEntry({
              id: `log_${caseData.id}_${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              failed_payment_id: caseData.id,
              outcome: caseData.outcome,
              rule_fired: caseData.rule_fired,
              reason: caseData.guardrail_reason
            });
          } 
          
          else if (message.type === 'run_completed') {
            setSimulationRunning(false);
            setLiveStage(null);
            setComparison(message.data);
            fetchCases();
            fetchCapacityRoi();
          } 
          
          else if (message.type === 'run_terminated') {
            setSimulationRunning(false);
            setLiveStage(null);
            fetchResults();
            fetchCases();
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket closed. Attempting reconnect in 3s...');
        setEngineStatus('offline');
        reconnectTimeoutId = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        setEngineStatus('offline');
        ws.close();
      };
    }

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
      }
    };
  }, [updateCase, setKillSwitchActive, setSimulationRunning, setLiveStage, addAuditEntry, fetchResults, setComparison, setEngineStatus, fetchCapacityRoi, fetchCases]);

  return socketRef.current;
}
