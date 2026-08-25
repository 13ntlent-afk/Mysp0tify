Slide 1 — Title
- Mysp0tify: Azure Integration & Deployment
- Status: Live (proof-of-concept)
- Duration: ~10 days

Speaker notes:
Welcome — this short update explains what was built, how long it took, and where it runs. Emphasize that this is a proof-of-concept: it is functional and demonstrates the end-to-end flow from code to live site.

Slide 2 — Objective
- Deliver a working web experience using a Spotify-themed front-end
- Add a light-weight backend to support dynamic content
- Host publicly and automate deployments for fast updates

Speaker notes:
Quickly summarize the goals: provide a working site that looks good, can handle small amounts of dynamic content, and can be updated automatically. The focus was on speed, low operational overhead, and setting up the automation and monitoring needed to scale later.

Slide 3 — High-level timeline
- Day 1: Adopted front-end and created GitHub repo
- Day 2: Set up development branch and added collaborator
- Days 3–5: Azure account, access, backend, Azure Functions
- Day 6: Cosmos DB and local testing with Static Web Apps tooling
- Days 7–10: Static Web Apps, Netlify, CI/CD, monitoring, deployed

Speaker notes:
Walk through the timeline at a glance. Note that most setup and verification occurred early (account, tools, backend), with final days focused on hosting, automation, and testing. The total elapsed time was about ten days.

Slide 4 — Architecture (simple)
- Front-end: Static site hosted on Azure Static Web Apps and Netlify
- Backend: Node.js API running as Azure Functions
- Database: Azure Cosmos DB (managed, scalable)
- CI/CD: GitHub -> pipeline -> Azure
- Monitoring: Log Analytics -> Microsoft Sentinel

Speaker notes:
Explain each component in plain terms: the front-end is static files served to users, the backend is small functions that run on demand, and Cosmos DB stores data. CI/CD means changes go from GitHub to live automatically, and monitoring captures logs and alerts for security and reliability.

Slide 5 — What’s working today
- Public website is live and reachable
- Backend runs on Azure and connects to Cosmos DB
- Local development workflow validated with Static Web Apps tooling
- CI/CD pipeline deploys changes automatically
- Basic security monitoring/logging enabled

Speaker notes:
Reassure stakeholders that the core pieces are in place and tested: live site, functioning backend, automated deployments, and monitoring. These are the key deliverables for an initial production-like environment.

Slide 6 — Risks & Mitigations
- Risk: Credentials and access misconfiguration
  - Mitigation: Enforce least-privilege and rotate credentials; enable MFA
- Risk: No production backups or SLA on free-tier
  - Mitigation: Move to paid Azure subscription and enable Cosmos DB backups
- Risk: Limited automated testing
  - Mitigation: Add unit and smoke tests to CI pipeline before larger releases

Speaker notes:
Be candid about key risks and quick mitigations. Explain that the current setup used free-tier features for cost-savings during development; moving to production requires paid services, backups, and improved testing.

Slide 7 — Business benefits
- Faster updates via automated deployments
- Lower ops overhead using serverless and managed DB
- Better visibility into incidents through monitoring
- Collaboration enabled via GitHub and branching

Speaker notes:
Frame the technical work in business terms: faster time-to-update, lower operational cost, and improved reliability and responsiveness to incidents. These are the business-value outcomes stakeholders care about.

Slide 8 — Recommended next steps (short)
- Move to paid Azure subscription and set billing/ownership
- Add custom domain and SSL
- Implement backups and retention policies
- Add automated tests to CI/CD
- Define monitoring alerts and on-call responsibilities

Speaker notes:
Prioritize moving to a paid subscription for SLA and backups, then secure the site with a custom domain and SSL. Add tests and alerting to reduce operational risk. Recommend assigning owners for monitoring and incident response.

Slide 9 — Links & who to contact
- Technical docs: AZURE_DEPLOYMENT_GUIDE.md | SWA_COSMOS_STARTER_GUIDE.md | AZURE_STATIC_COSMOS_DEPLOYMENT.md
- Repo and presentation: PRESENTATION.md
- Contact: (add team lead / technical contact here)

Speaker notes:
Point stakeholders to the technical documents for deep dives and add a named contact for follow-up. Offer to schedule a short demo to walk through the live site.
