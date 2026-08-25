Slide-ready deck — Mysp0tify (each slide is a short, single-screen bullet set)

Slide 1 — Title
- Mysp0tify: Azure Integration & Deployment
- Status: Live (proof-of-concept)
- Duration: ~10 days

Slide 2 — Objective
- Deliver a working web experience using a Spotify-themed front-end
- Add a light-weight backend to support dynamic content
- Host publicly and automate deployments for fast updates

Slide 3 — High-level timeline
- Day 1: Adopted front-end and created GitHub repo
- Day 2: Set up development branch and added collaborator
- Days 3–5: Created Azure account, set access, built backend, and deployed Azure Functions
- Day 6: Provisioned Cosmos DB and tested locally (swa)
- Days 7–10: Set up Azure Static Web Apps, Netlify, CI/CD, monitoring, and deployed

Slide 4 — Architecture (simple)
- Front-end: Static site (Spotify-themed) hosted on Azure Static Web Apps and Netlify
- Backend: Node.js API running as Azure Functions
- Database: Azure Cosmos DB (managed, scalable)
- CI/CD: GitHub -> pipeline -> Azure (automated deployments)
- Monitoring: Log Analytics -> Microsoft Sentinel

Slide 5 — What’s working today
- Public website is live and reachable
- Backend functions execute in Azure and connect to Cosmos DB
- Local development workflow validated with Static Web Apps tooling
- CI/CD pipeline deploys changes from main automatically
- Basic security monitoring/logging enabled

Slide 6 — Risks & Mitigations
- Risk: Credentials and access misconfiguration
  - Mitigation: Enforce least-privilege, rotate credentials, enable MFA on accounts
- Risk: No production backups or SLA in free-tier
  - Mitigation: Move to paid subscription, enable Cosmos DB backups
- Risk: Limited automated testing
  - Mitigation: Add unit and smoke tests into CI pipeline

Slide 7 — Business benefits
- Faster delivery of updates via automated deployments
- Lower operational overhead using serverless and managed DB
- Improved ability to detect and respond to incidents (monitoring)
- Team collaboration enabled through GitHub and branching strategy

Slide 8 — Recommended next steps (short)
- Move to paid Azure subscription and set billing/ownership
- Add custom domain and SSL
- Implement backups and retention policies
- Add basic automated tests to CI/CD
- Define monitoring alerts and on-call paths

Slide 9 — Links & who to contact
- Technical docs: AZURE_DEPLOYMENT_GUIDE.md | SWA_COSMOS_STARTER_GUIDE.md | AZURE_STATIC_COSMOS_DEPLOYMENT.md
- Repo and presentation: PRESENTATION.md
- Contact: (add team lead / technical contact here)

Notes for presenter:
- Keep each slide to ~1–2 minutes during the update
- Focus on benefits and next steps for non-technical stakeholders
