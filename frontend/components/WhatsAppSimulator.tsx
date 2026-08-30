// frontend/components/WhatsAppSimulator.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore, CaseData } from '../lib/store';
import { Send, Phone, Video, MoreVertical, Smile, Paperclip, CheckCheck, Sparkles, MessageSquare, Loader2 } from 'lucide-react';

const FIRST_NAMES = [
  "Rahul", "Amit", "Priya", "Sneha", "Vikram", "Anjali", "Rohan", "Neha", 
  "Siddharth", "Pooja", "Arjun", "Deepika", "Karan", "Kirti", "Aditya", 
  "Shreya", "Varun", "Tanvi", "Ravi", "Divya"
];
const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Mehta", "Patel", "Singh", "Joshi", "Rao", 
  "Nair", "Reddy", "Choudhury", "Bose", "Das", "Sen", "Mishra", "Pandey"
];

function deriveCustomerName(idStr: string): string {
  const digits = idStr.replace(/\D/g, '');
  const num = digits ? parseInt(digits, 10) : idStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const first = FIRST_NAMES[num % FIRST_NAMES.length];
  const last = LAST_NAMES[num % LAST_NAMES.length];
  return `${first} ${last}`;
}

const SUGGESTED_REPLIES = [
  "Sorry, balance nahi tha. Kal subah pay kar dunga pakka.",
  "OTP verify nahi ho raha tha, main Friday tak check karke complete kar dunga.",
  "Payment link send kardo alternative, card se abhi kar deta hu.",
  "theek hai Monday pakka pay karunga",
  "No, stop messaging me. I will not pay."
];

export default function WhatsAppSimulator() {
  const cases = useAppStore((state) => state.cases);
  const activeCaseId = useAppStore((state) => state.activeCaseId);
  const simulateReply = useAppStore((state) => state.simulateReply);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find active case (default to first case if not explicitly selected)
  const activeCase = cases.find(c => c.id === activeCaseId) || cases[0];

  // Derive robust customer name
  const customerName = useMemo(() => {
    if (!activeCase) return '';
    if (activeCase.customer_name && activeCase.customer_name.trim() !== '') {
      return activeCase.customer_name;
    }
    return deriveCustomerName(activeCase.customer_id || activeCase.id);
  }, [activeCase]);

  // Generate outbound Hinglish nudge if not in case conversation
  const outboundNudgeText = useMemo(() => {
    if (!activeCase) return '';
    const cause = activeCase.cause;
    const amountRupees = (activeCase.amount_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const name = customerName;
    const link = `https://rzp.io/l/retry_${activeCase.id}`;

    if (cause === 'insufficient_balance') {
      return `Hi ${name}! Aapka ₹${amountRupees} ka payment check fail ho gaya balance issue ki wajah se. Koi baat nahi, aap is link pe click karke kisi aur account ya UPI se retry kar sakte hain: ${link}. Thank you!`;
    } else if (cause === 'bank_timeout') {
      return `Hi ${name}, server error ya network slow hone ki wajah se aapka ₹${amountRupees} ka payment drop ho gaya tha. Paise cut gaye ho toh automatically refund ho jayenge. Aap is link se safe retry kar sakte hain: ${link}.`;
    } else if (cause === 'wrong_otp') {
      return `Hello ${name}, ₹${amountRupees} transaction ke liye enter kiya gaya OTP invalid tha. Aap is link par click karke fresh OTP request karke complete kar sakte hain: ${link}.`;
    } else if (cause === 'expired_mandate') {
      return `Hi ${name}, aapka subscription mandate expire ho gaya hai. Aap is link se new mandate authorize kar sakte hain: ${link}.`;
    } else if (cause === 'card_declined') {
      return `Hi ${name}, aapka card bank network se decline ho gaya. Please doosra card ya UPI use karke complete karein: ${link}.`;
    } else {
      return `Hi ${name}! Aapka ₹${amountRupees} ka payment verify nahi ho paya. Please check karke retry karein: ${link}.`;
    }
  }, [activeCase, customerName]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    const targetCaseId = activeCase?.id;
    if (!targetCaseId || !text || isSending) return;
    
    setIsSending(true);
    setInputText('');
    try {
      await simulateReply(targetCaseId, text);
    } finally {
      setIsSending(false);
    }
  };

  const handleChipClick = (replyText: string) => {
    setInputText(replyText);
  };

  // Format conversation history - ensure outbound nudge is always present as the first message
  const rawConversation = activeCase?.conversation || [];
  const hasOutbound = rawConversation.some(m => m.sender === 'bot');

  const displayConversation = hasOutbound
    ? rawConversation
    : (activeCase ? [
        {
          sender: 'bot' as const,
          text: outboundNudgeText,
          timestamp: activeCase.timestamp || new Date().toISOString()
        },
        ...rawConversation
      ] : []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayConversation.length, isSending]);

  if (!activeCase) {
    return (
      <div className="bg-[#13151C] border border-[#232630] rounded-xl p-6 shadow-lg h-full flex flex-col items-center justify-center text-center min-h-[420px]">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mb-3 animate-pulse-slow">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-gray-200">WhatsApp Nudge Simulator</h4>
        <p className="text-xs text-gray-400 max-w-xs mt-2 leading-relaxed">
          Select any case from the Decision Feed or stream to inspect Revora&apos;s outbound Hinglish message and simulate real-time customer replies.
        </p>
      </div>
    );
  }

  const initialLetter = customerName ? customerName[0].toUpperCase() : 'C';

  return (
    <div 
      className="bg-[#111] border border-[#232630] rounded-xl shadow-2xl h-full flex flex-col overflow-hidden min-h-[440px] max-h-[560px] relative z-20"
      onClick={(e) => e.stopPropagation()}
    >
      {/* WhatsApp Header */}
      <div className="bg-[#075E54] px-4 py-2.5 flex items-center justify-between text-white shadow-md shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#128C7E] border border-emerald-300/30 flex items-center justify-center text-xs font-black font-mono shadow-inner">
            {initialLetter}
          </div>
          <div>
            <h4 className="text-xs font-bold leading-tight tracking-wide">{customerName}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
              <span className="text-[9px] text-emerald-100 font-mono">online · Case: {activeCase.id}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 opacity-80">
          <Video className="w-4 h-4 cursor-pointer hover:opacity-100" onClick={(e) => e.stopPropagation()} />
          <Phone className="w-4 h-4 cursor-pointer hover:opacity-100" onClick={(e) => e.stopPropagation()} />
          <MoreVertical className="w-4 h-4 cursor-pointer hover:opacity-100" onClick={(e) => e.stopPropagation()} />
        </div>
      </div>

      {/* WhatsApp Chat Thread (Scrollable internally) */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0B141A] flex flex-col min-h-0">
        {/* Date bubble */}
        <div className="self-center bg-[#182229] border border-[#232630]/60 text-[#8696A0] text-[9px] px-2.5 py-0.5 rounded-md font-mono font-medium shadow-sm">
          TODAY · REVORA NUDGE CHANNEL
        </div>

        {displayConversation.map((msg, index) => {
          const isBot = msg.sender === 'bot';
          const isSystem = msg.sender === 'system';

          if (isSystem) {
            return (
              <div key={index} className="self-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-3 py-1 rounded-md font-mono text-center max-w-xs shadow-sm">
                ✓ {msg.text}
              </div>
            );
          }

          return (
            <div
              key={index}
              className={`max-w-[85%] rounded-xl p-3 text-xs shadow-md flex flex-col relative transition-all ${
                isBot 
                  ? 'self-start bg-[#202C33] text-[#E9EDEF] border border-[#2A3942]/60 rounded-tl-sm' 
                  : 'self-end bg-[#005C4B] text-[#E9EDEF] border border-emerald-600/40 rounded-tr-sm'
              }`}
            >
              <div className="text-[9px] font-mono font-bold mb-1 opacity-70 flex items-center gap-1">
                {isBot ? (
                  <>
                    <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                    <span className="text-emerald-400">Revora Assistant</span>
                  </>
                ) : (
                  <span className="text-emerald-200">{customerName}</span>
                )}
              </div>

              <p className="leading-relaxed text-[11px] whitespace-pre-wrap">{msg.text}</p>
              <div className="self-end flex items-center gap-1 mt-1.5 opacity-60">
                <span className="text-[8px] font-mono">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                </span>
                <CheckCheck className="w-3 h-3 text-sky-400" />
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="self-start bg-[#202C33] text-gray-400 rounded-xl px-3 py-2 text-[11px] border border-[#2A3942] flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
            <span>Revora is extracting payment commitment...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Replies Header & Chips */}
      <div className="bg-[#111B21] px-3 pt-2 pb-1.5 border-t border-[#232630]/80 shrink-0">
        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5 font-semibold">
          Suggested Replies (Click to populate or send):
        </span>
        <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none pb-1">
          {SUGGESTED_REPLIES.map((reply, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleChipClick(reply);
              }}
              className="bg-[#202C33] hover:bg-[#2A3942] active:scale-95 border border-[#2A3942] hover:border-emerald-500/40 text-emerald-400 text-[10px] px-3 py-1 rounded-full transition-all cursor-pointer font-medium"
              title="Click to populate reply"
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* WhatsApp Input Bar (Pinned at bottom, never clipped) */}
      <div 
        className="bg-[#1F2C34] px-3 py-2.5 flex items-center gap-2.5 border-t border-[#232630] shrink-0 sticky bottom-0 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <Smile className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-200 transition-colors" onClick={(e) => e.stopPropagation()} />
        <Paperclip className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-200 transition-colors" onClick={(e) => e.stopPropagation()} />
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type simulated customer reply..."
          disabled={isSending}
          className="flex-1 bg-[#2A3942] rounded-lg text-xs px-3.5 py-2 text-white placeholder-gray-400 outline-none border border-transparent focus:border-emerald-500 transition-colors"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleSend();
          }}
          disabled={isSending || !inputText.trim()}
          className="w-8 h-8 rounded-full bg-[#00A884] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white cursor-pointer hover:bg-[#008F72] transition-all shadow-md active:scale-95 shrink-0"
          title="Send simulated reply"
        >
          {isSending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5 rotate-45" />
          )}
        </button>
      </div>
    </div>
  );
}


