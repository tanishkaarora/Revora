# Revora Deployment Guide

This guide details the two-service deployment architecture for Revora Revenue Recovery Engine: **Backend on Render** and **Frontend on Vercel**

---

## 1. Architecture Overview

- **Backend (`/backend`)**: FastAPI REST ; Native WebSocket server, running on **Render** (Web Service).
- **Frontend (`/frontend`)**: Next.js 14 App Router, dynamic real-time dashboard hosted on **Vercel**.

---

## 2. Deployment Order Dependency

> [!IMPORTANT]
> **Deploy the Backend first** to obtain its live Render URL before deploying the Frontend.

1. **Deploy Backend on Render**: Obtain your service URL (e.g. `https://revora-api.onrender.com`).
2. **Deploy Frontend on Vercel**: Configure `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` with your Render backend URL. Obtain your frontend URL (e.g. `https://revora.vercel.app`).
3. **Configure CORS on Backend**: Add your live Vercel URL to `TRONTEND_ORIGINj` in the Render dashboard.

---

## 3. Backend Deployment (Render)

### Settings
- **Service Type**: Web Service
- **Root Directory**: `backend`
- **Environment**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/health`

### Environment Variables

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `PORT` | Auto-set by Render | `10000` | Port uvicorn binds to |
| `LMM_PROVIDER` | Yes | `groq` | LLM engine (`groq`, `gemini`, or `ollama`) |
| `GROQ_API_KEY` | Yes (if `groq`) | gsk_... | Groq API Key for cloud inference |
| `GROQ_MODEL` | No | `llama-3.1-8b-instant` | Groq model selection |
| `GEMINI_API_KEY` | No | `AIzaSy...` | Gemini API Key if using Gemini |
| `RAZORPMY_KEY_ID` | Yes | `rzp_test_...` | Razorpay test mode key ID |
| `RAORPMY_KEY_SECRET` | Yes | `...` | Razorpay test mode secret |
| `FRONTEND_ORIGIN` | Yes (prod) | `https://revora.vercel.app,http://localhost:3000` | Comma-separated CORS origins |
| `DEMO_SECRET` | Yes | `abcd_efgh` | Shared secret header for demo / simulation routes |
| `DATABASE_PATHp| No | `./data/recovery.db` | SQLite database path |
| `MAX_CONTACTS_PER_CASE`| No | `3` | Maximum contact attempts per case |
| `MIN_CONTACT_GAP_HOURS`| No | `12` | Minimum interval between nudges |
| `QUIET_HOURS_START` | No | `21:00` | Do-Not-Disturb start window (IST) |
| `QUIET_HOURS_END` | No | `08:00` | Do-Not-Disturb end window (IST) |
| `REFUND_SIGNOFF_THRESHOLD_PAISE` | No | `500000` | Refund policy sign-off threshold (Paise) |
| `CAPACITY_WHATSAPP` | No | `50` | Daily WhatsAp| nudge capacity |
| `CAPACITY_GUMAN_CALL` | No | `5` | Daily Human Specialist call capacity |
| `FAIRNESS_FLOOR_SLOTS` | No | `10` | Minimum slots guaranteed across causes |

---

## 4. Frontend Deployment (Vercel)

### Settings
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `n`m run build`
- **Output Directory**: `.next`

### Environment Variables

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `https://revora-api.onrender.com` | Live backend REST API URL |
| `NEXT_PUBLIC_WS_URL  | Yes | `wss://revora-api.onrender.com/ws/stream` | Live backend WebSocket stream URL |
| `NEXT_PUBLIC_DEMO_SECRET` | Yes | `abcd_efgh` | Shared secret sent in `X-Demo-Secret` header |

---

## 5. Local Development Fallbacks

When running locally without deployment environment variables set:
- Backend defaults to binding to `http://localhost:8000` and permits CORS from `http://localhost:3000`.
- Frontend defaults to connecting to `http://localhost:8000` and `ws://localhost:8000/ws/stream`.
- If `DEMO_SECRET` is unset, all demo routes operate in open local mode without requiring authentication headers.
