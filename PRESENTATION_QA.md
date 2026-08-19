# MySp0tify Presentation — Anticipated Q&A

Companion to `PRESENTATION.md`. Skim this right before presenting; questions
are grouped by theme in the rough order they tend to come up.

---

## Framing, ethics, and intent

**Q: Is this an actual phishing attack, or is it simulated?**
A: It's a controlled simulation — a Spotify-styled site used to demonstrate
how credential/card-harvesting pages work and, more importantly, how they can
be *detected and logged* using Azure's monitoring stack (Application Insights,
Log Analytics, Sentinel, Defender for Cloud). It's not distributed to the
public with intent to defraud anyone.

**Q: What happens to the data people submit?**
A: Card details are masked client-side before they ever leave the browser —
only brand, last 4 digits, and expiry are transmitted and stored. Full card
numbers and CVVs are never persisted. This is enforced in the subscribe modal
component and again in `api/validation.js` server-side.

**Q: Who has access to the captured data?**
A: Whoever has access to the Cosmos DB account and the Log Analytics
Workspace in this Azure subscription — the same people who'd have access to
any other resource in the resource group. There's no separate/hidden export
path.

**Q: Is this legal to run?**
A: Running a phishing simulation against your own users/environment for
security-awareness training is a standard, widely used practice (many
enterprise security teams run tools like this, e.g. KnowBe4, GoPhish). The
key requirement is scope and authorization — it should only be pointed at
consenting/authorized targets (e.g., an internal training exercise), not the
general public.

---

## Architecture & hosting

**Q: Why two hostnames — Netlify and (eventually) eu.org? Isn't that
confusing?**
A: They're not competing — Netlify is a *free, fast, zero-approval* front
door we stood up immediately; the eu.org domain is the *permanent, branded*
one still going through manual registration review. Both can point at the
same Azure backend simultaneously, and switching between them requires zero
code changes since Netlify only does a reverse-proxy rewrite.

**Q: Does Netlify actually host any of our files?**
A: No. `netlify.toml` contains a single wildcard redirect rule with
`status = 200` and `force = true`, which makes Netlify rewrite (not redirect)
every request straight to the Azure Static Web App. Netlify has zero copies
of our HTML/CSS/JS.

**Q: If Netlify is just a proxy, why not skip it and use Azure's default
hostname directly?**
A: We could — `nice-pond-03e938600.7.azurestaticapps.net` works today too.
Netlify's value is purely cosmetic/UX: a shorter, more presentable hostname
(`kamoteq.netlify.app`) while the real custom domain is pending.

**Q: What happens to visitor IP logging when a proxy sits in front of Azure?**
A: Without any fix, the Azure Function would only ever see Netlify's edge IP,
not the real visitor's. We addressed this by reading the `X-Forwarded-For`
header (which Netlify sets automatically) in a small `getClientIp()` helper
in `api/index.js`, falling back to Azure's own `x-azure-clientip` header when
accessed directly (no proxy in the path).

**Q: Does the Netlify proxy affect Application Insights telemetry (page
views, geo, browser info)?**
A: No — the Application Insights Web SDK runs entirely client-side and sends
telemetry directly from the visitor's browser to Azure's ingestion endpoint.
It never routes through Netlify at all, so that data is unaffected regardless
of which front door is in use.

**Q: Why did the Netlify deploy fail the first time?**
A: Not a code problem — Netlify's plan enforces that only commits authored by
a "recognized" linked GitHub identity are auto-deployed to a connected
private repo. Once the git commit authorship was corrected to match the
GitHub account actually linked to the Netlify site, deploys succeeded.

**Q: Why Azure Static Web Apps instead of a VM, App Service, or containers?**
A: Static Web Apps is free at this scale, includes a managed Functions API
tier at no extra hosting cost, auto-issues TLS certificates, integrates
natively with GitHub Actions, and requires zero OS/server management. A VM or
container approach (see the `Dockerfile`/`k8s-manifests.yaml` in the repo,
kept as an alternate deployment path) would add real infrastructure to
patch, scale, and secure for no functional benefit at this traffic level.

---

## Backend & data

**Q: Why Cosmos DB instead of a traditional SQL database?**
A: Cosmos DB is serverless-friendly (no server to provision or patch), scales
automatically, and has an official first-party Node.js SDK
(`@azure/cosmos`) that pairs naturally with Azure Functions. Point reads/
writes partitioned by `/email` are also very low latency for this access
pattern (look up or create one subscription record per email+plan).

**Q: What stops someone from submitting the same email/plan twice and
creating duplicate records?**
A: `findSubscription(email, plan)` is checked before every insert; if a
matching record already exists, the API returns `200 {alreadySubscribed:
true}` instead of creating a new row — the operation is idempotent by
design.

**Q: What happens if Cosmos DB is unreachable or the write fails?**
A: The error is caught, logged via `context.error` (never logging the
submitted personal data itself, only the failure and visitor IP), and the
API returns a generic `500` to the client. A `DEBUG_ERRORS=1` app setting can
optionally include the raw error code/message in the response for
troubleshooting — off by default so production never leaks internals.

**Q: Why Node.js instead of PHP/LAMP?**
A: Azure Functions' and Cosmos DB's official SDKs are Node-first, the
frontend was already JavaScript (so one language end-to-end), and Node's
event-loop model suits short-lived, I/O-bound serverless invocations better
than a traditional per-request process model like PHP-FPM/Apache.

**Q: Is there a build step or framework (React, Vue, etc.)?**
A: No — the frontend is plain HTML/CSS/vanilla JS plus a couple of
hand-written Web Components (`<pay-plan>`, `<subscribe-modal>`) using native
Custom Elements and event bubbling. No bundler, no framework, deploys as flat
files.

---

## Monitoring & security

**Q: What exactly does Microsoft Sentinel add on top of Application
Insights?**
A: Application Insights and Function logs both land in the same Log
Analytics Workspace. Sentinel reads from that workspace to build correlation
rules, generate alerts, and manage incidents/workbooks — it's the layer that
turns raw logs into "here's a suspicious pattern, here's an incident to
investigate," rather than just individual log lines.

**Q: Does this cost extra given the free-trial credits?**
A: Application Insights, Log Analytics, and Cosmos DB all have consumption-
based free tiers/allowances suitable for this scale of traffic; Sentinel
bills per GB ingested into the workspace, which stays low for a small
training project. The full free-trial credit budget was scoped around this
in earlier planning.

**Q: What does Defender for Cloud actually monitor here?**
A: It scans the resource group for security posture issues — misconfigured
resources, missing recommended settings — independent of application-level
logs. It's a complementary, infrastructure-level check rather than an
app-behavior one.

**Q: Can we see who changed a resource (e.g., who updated the Function
code or a setting) after the fact?**
A: Yes — Azure's Activity Log records control-plane changes (resource
edits, deployments, permission changes) with the identity that made them,
independent of the application's own logging.

---

## CI/CD & delivery

**Q: What triggers a deployment?**
A: Any push to the `main` branch, via
`.github/workflows/azure-static-web-apps-nice-pond-03e938600.yml`. Pull
requests also get a temporary staging deployment (via the same workflow)
that's automatically torn down when the PR closes.

**Q: Does the team need Azure CLI access to deploy?**
A: No — the workflow authenticates using a deployment token
(`AZURE_STATIC_WEB_APPS_API_TOKEN_...`) stored as a GitHub Actions secret,
generated once when the Static Web App resource was created. A normal
`git push` is the only action required.

**Q: If we finish the eu.org domain, does the pipeline need to change?**
A: No — the pipeline deploys to the Azure Static Web App resource regardless
of which hostname currently points at it (Netlify proxy, Azure's default
hostname, or the eventual `my.sp0tify.eu.org`). Domain changes are purely a
DNS/proxy-layer concern, not a deployment concern.

---

## Anticipated "gotcha" questions

**Q: What if someone finds `sp0tify.netlify.app` or `sp0t1fy.netlify.app` —
aren't those confusing/risky?**
A: Neither is this project. `sp0tify.netlify.app` is a *different, unrelated*
Netlify site, verified directly (different response headers/content, no Azure
security headers, no Application Insights script tag). `sp0t1fy.netlify.app`
was an earlier working name for our own site and no longer resolves at all
(it returns 404) because renaming a Netlify site moves the hostname rather
than aliasing it. The one and only project hostname is
`kamoteq.netlify.app`, which shows our Azure-origin security headers, the
Azure `X-Ms-Middleware-Request-Id` on API calls, and the telemetry script
when inspected.

**Q: Could a real attacker reuse this exact setup maliciously?**
A: The individual pieces (static hosting, serverless API, Cosmos DB, a
reverse proxy) are all standard, publicly documented Azure/Netlify features —
there's nothing proprietary being taught here that isn't already public
knowledge. The value of this project is in demonstrating the *defensive*
side: how such a setup gets detected and logged, which is the actual point of
the exercise.

**Q: What's the plan if eu.org never approves the domain?**
A: Nothing is blocked on it — Netlify's free hostname already works today,
and if eu.org stalls indefinitely, a low-cost paid domain (Cloudflare
Registrar, Namecheap, Porkbun) could be purchased and pointed at the same
Azure backend with no code changes, same as switching Netlify was.
