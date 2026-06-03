# PRODUCT.md — Xayma.sh

> **Status:** First draft, written from observable context (CLAUDE.md, DESIGN.md, code). The strategic principles and tone here are *inferred* — review and sharpen them, especially the voice section.

---

## Register

`product` — Xayma is a management app. Design *serves* the product. This file applies to `app.xayma.sh` (the Vue 3 SPA management surface). The marketing site at `xayma.sh` is a separate brand surface and would have its own PRODUCT.md if and when it ships.

---

## What Xayma is

A credit-based SaaS for deploying web applications, built for West African SMEs. Customers pay in FCFA via Wave, Orange Money, or PayTech. Each deployed instance burns credits per 15-minute interval until the partner tops up. Resellers manage portfolios of customers; Sales tracks commissions; Admin runs the platform.

Backend is Supabase + a workflow engine (n8n today, abstracted) + Kafka for credit events + Docker + Traefik on Hetzner. The Vue app is fire-and-forget: it triggers workflows and listens to Supabase Realtime for state.

---

## Users

Five roles. Each has a different reason for opening the app.

**Customer** — SME owner or technical lead, primary user. Comes in to deploy a service, top up credits, or check that nothing is suspended. **Mental model:** "Did my deployment burn out yet, and do I still have enough credits to make it to Friday?" They are payment-anxious and infrastructure-curious but not infrastructure-fluent. They want certainty more than features.

**Reseller** — agency, integrator, or distributor selling Xayma to their own customer base. Manages a credit pool that funds multiple customer accounts. **Mental model:** "Where am I leaking money, who's about to churn, how much commission am I owed?" Power user. Density-tolerant. Wants tables, filters, totals.

**Admin** — Xayma platform operator (us, today). Configures services, bundles, payment gateways, control nodes. Runs settings. Sees everything. **Mental model:** "Is the platform healthy, who needs attention, what's the next breaking thing?" High keyboard fluency.

**Sales** — internal commercial role. Tracks customer portfolio, renewal risk, commission earned. Read-mostly. **Mental model:** "Am I hitting my number, and which customer should I call this week?"

**Support** — read access for triage. Lowest-power role. (Currently sparse — placeholder until support workflows mature.)

The same app surface serves all five via role-gated routes + RLS. The challenge: design that feels intentional for each, not a feature soup that ignores who's looking.

---

## Product Purpose

Make infrastructure deployment **boring** for a market where infrastructure is rarely boring. The competition for these customers' attention isn't Vercel or AWS; it's an unanswered WhatsApp message to a dev who promised to "fix the server tomorrow."

Xayma wins when:
- A customer tops up at 8pm, gets back to bed, and forgets the platform exists until they need it again.
- A reseller renews a customer in two clicks because the credit math was already correct on screen.
- An admin adds a bundle and the change is live in 30 seconds without grep'ing a config file.

Xayma loses when:
- A user has to think "is this number FCFA or USD?" — currency is non-negotiable visible context.
- A status badge says "active" when the deployment is actually unreachable (trust gap).
- A payment flow ends with the user not knowing whether their credits arrived.

---

## Tone & Voice

Spoken by an unflappable operations engineer, not a startup. Reads like a competent colleague telling you what happened, not a product trying to delight you.

**Do:**
- Plain, declarative copy. "5,000 credits added." not "🎉 Boom! Credits incoming!"
- Lead with the noun. "Partners" beats "Manage your partners." (Customers don't browse for verbs; they browse for nouns.)
- Use **imperative** for primary CTAs ("Create deployment", "Top up", "Suspend partner"). Use **noun** for page titles ("Partners", "Vouchers", "Audit log").
- Numbers in IBM Plex Mono. Always. Credit balances, FCFA amounts, transaction IDs, timestamps. The font carries the precision the copy doesn't have to.
- French is the default for marketing-adjacent surfaces. English is the default for the management app today (most admin users prefer it). Both work at parity.

**Don't:**
- Emoji. Anywhere. Status icons handle the affective layer.
- Em dashes (—). Use commas, colons, or periods.
- Marketing intensifiers. No "powerful", "blazing", "seamless", "robust", "easy".
- Apology copy. If something failed, name what failed and what to do, in that order. Don't say "oops".
- Cute empty states. "No partners yet — let's add your first one!" is forbidden; "No partners" + a Create button is enough.

**Headlines should pass the silence test.** If you read the page title alone, in a meeting, with no UI around it, does it tell you what page this is? "Partners" passes. "Manage your customer relationships" fails.

---

## Anti-references

What Xayma is **not** trying to be:

- **Not Stripe** — Stripe is the cathedral of admin UX. Xayma doesn't have Stripe's resources, and West African SMEs aren't browsing for elegance; they're checking the balance.
- **Not Vercel** — Vercel sells delight. Xayma sells reliability. Polish, yes; show-off polish, no.
- **Not Wave's own app** — Wave is consumer-grade and emoji-heavy. Xayma's user is making a business decision, not sending pocket money.
- **Not a generic SaaS dashboard.** No hero metric template, no big-number-small-label stat grids that say nothing. Stats earn their place by being acted upon (top up, suspend, restart).

---

## Strategic principles

1. **Trust > features.** Every dashboard number must be the same number the customer would calculate by hand. Drift = death.
2. **Status is sacred.** A deployment marked `active` must be reachable. If it's not, the badge changes before the user notices.
3. **Money is exact.** Every amount is FCFA-rounded, monospace-rendered, and matches the receipt. Never approximate, never abbreviate.
4. **Realtime over refresh.** If the user is on the page, the page is live. If something changed in n8n or Kafka, the page reflects it without a reload.
5. **Empty is honest.** Zero rows is a real state and gets a real treatment. "No data" with a centred icon and an action beats a blank table every time.
6. **Errors point at recovery, not blame.** "Failed to load partners" is incomplete. "Failed to load partners — Retry" is complete.
7. **No surface without a why.** If a section exists, name what the user is supposed to do with it. Sections that are "for context" should be inline, not their own block.
8. **Density is a respect signal for power users.** Tables for Resellers/Admins are dense on purpose. Customer-facing surfaces breathe more.

---

## Design system register

Restrained palette. Tinted neutrals + one primary accent (the dark navy `#00288e`). Secondary container (orange) is reserved for warnings and payment moments. Tertiary container (mint) for success. Errors in their own family.

No drenching. No gradient text. No glassmorphism. No bento grids except where the information is genuinely heterogeneous (Settings).

Typography: Inter for UI, IBM Plex Mono for data. Hierarchy via scale + weight, not colour.

Motion: ease-out, 150–350ms. State transitions, never decoration.

See `DESIGN.md` for the full system. PRODUCT.md owns voice and strategy; DESIGN.md owns visual implementation.

---

## What's still TBD

- **Sales portfolio voice.** Sales users are internal, not customers. Their tone could lean more "CRM-functional" than the rest of the app. Untested.
- **Support workflows.** Role exists, but no journey defined.
- **Marketing site brand layer.** Will require its own document. Likely much bolder than the management app — Committed or Drenched colour strategy, not Restrained.
- **Voice for system-generated notifications** (suspension, credit alerts). Currently they're transactional. Could be warmer. Customer interviews would tell us.

This document is a working draft. Sharpen the parts that don't ring true.
