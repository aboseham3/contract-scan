# ContractLens (عدسة العقود) — PRD
## Problem
AI web app analyzing contracts (car, rent, home purchase, any) to surface hidden clauses/penalties. Upload via camera scan, image or PDF (max 3 pages = 1 analysis). Detailed analysis + PDF export. Plans: Free 1, Monthly $20 = 6, Single $3. Email/password + Google auth. Stripe payment (card/Apple Pay/Google Pay). Bilingual AR(RTL)/EN, tech-forward dark design.
## Architecture
FastAPI + MongoDB; GPT-6 Sol vision via Emergent key (PDF pages rendered to images with PyMuPDF); Stripe Checkout via emergentintegrations (shared test key sk_test_emergent — claimable sandbox unavailable in SA); JWT email auth + Emergent Google auth (cookie). React + Tailwind + shadcn, html2canvas+jspdf export.
## Implemented (Jun 2026)
- Landing, Auth (email + Google), Dashboard (credits, upload zone, camera, history), Analysis view (risk score, hidden clauses, key points, recommendations, PDF export), Pricing, Payment success polling
- Credits: subscription -> single -> free; consumed only on successful analysis
## Backlog
- P1: Real recurring Stripe subscription (currently one-time $20 grants 6 credits for 30 days); own Stripe live key
- P1: Hero visual on landing right side
- P2: Share analysis link, compare two contracts, ask follow-up questions about a contract
- Jun 2026: Verified Emergent Google sign-in end-to-end (redirect, session exchange, cookie auth, logout cookie clearing fixed). Pending user decision: Saudi payment gateway (Moyasar recommended / Tap / Stripe via supported-country entity).
