# Demo script (~2:30) and smoke-test checklist

| Time | Show |
|---|---|
| 0:00 | Login. "HireFlow AI: a clearer way to hire." |
| 0:20 | Dashboard: metrics, funnel, applications over time, recent activity. Toggle 7/30/90 days. |
| 0:45 | Candidates: search "react", filter stage = Interview, open a profile; show notes + timeline; add a note. |
| 1:15 | Pipeline: drag a card Screening → Interview; refresh to show it persisted; use the stage menu; show Undo. |
| 1:40 | Candidate → AI insights → Analyze Candidate. Walk through skills, gaps, evidence excerpts, alignment band, interview questions, caveats. |
| 2:15 | Wrap-up: Next.js + Supabase RLS + private storage + server-side AI with validated output; deployed on Vercel. |

## Smoke test after deploy
- [ ] Login / logout, refresh a protected page, visit `/dashboard` logged out (redirects)
- [ ] Dashboard loads with data
- [ ] Create job → create candidate with resume → add to job
- [ ] Duplicate application is refused
- [ ] Move stage in pipeline, refresh, check activity timeline
- [ ] Add/edit/delete a note
- [ ] Resume preview/download works
- [ ] AI analysis runs; second click uses cached result; edit job description → "Inputs changed" badge
- [ ] Layout at 1440 / 1024 / 768 / 390px
