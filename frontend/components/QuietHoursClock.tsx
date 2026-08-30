// frontend/components/QuietHoursClock.tsx
import React, { useEffect, useState } from 'react';
import { Clock, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function QuietHoursClock() {
  const [time, setTime] = useState<string>('');
  const [isQuiet, setIsQuiet] = useState<boolean>(false);

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      setTime(timeStr);
      
      // Quiet hours window: 21:00 to 08:00
      const quiet = hours >= 21 || hours < 8;
      setIsQuiet(quiet);
    }
    
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#13151C] border border-[#232630] rounded-xl p-5 shadow-lg flex flex-col justify-between h-full min-h-[220px]">
      <div>
        <h3 className="text-sm font-semibold tracking-wide uppercase text-gray-400 flex items-center gap-2 mb-2 border-b border-[#232630] pb-2">
          <Clock className="w-4 h-4 text-blue-400" />
          Quiet Hours Check
        </h3>

        <div className="flex flex-col items-center justify-center py-3">
          <span className="text-2xl font-bold font-mono text-white tracking-wide">{time}</span>
          <span className="text-[10px] text-gray-500 font-mono mt-1">Configured: 21:00 - 08:00</span>
        </div>
      </div>

      <div className={`p-3 rounded-lg border flex items-center gap-2 mt-2 ${
        isQuiet 
          ? 'bg-red-500/10 border-red-500/20 text-red-400' 
          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      }`}>
        {isQuiet ? (
          <>
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <div className="text-[9px] leading-tight">
              <span className="font-bold block uppercase">Outreach Suspended</span>
              Active nudges blocked. Silent retries permitted.
            </div>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <div className="text-[9px] leading-tight">
              <span className="font-bold block uppercase">Outreach Allowed</span>
              Active nudges and calls enabled.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
