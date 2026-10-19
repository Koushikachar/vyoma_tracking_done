# Vyoma Route: feature-completion matrix

Legend: ✅ built (code complete) · 🟡 partly built · 🔌 built but needs outside accounts or approval to work · ❌ not built

**Verification status:** the database schema passes Prisma validation, the whole project type-checks against the real generated Prisma types, and 74 automated tests pass (including the original security tests). Nothing has yet been run against a real database, a browser, Razorpay, WhatsApp or a courier, so treat every "built" item as "needs your testing".

## Master prompt features
| # | Feature | Status | Notes |
|---|---|---|---|
| 1 | Unified dashboard | 🟡 | Orders, CSV import/export, filters, search, status refresh. No server-side pagination (loads latest 500), no Order/Shipment/OrderItem split, no bulk actions, no shipping-cost KPI. |
| 2 | Courier integrations and tracking | 🟡 | Tracking adapters (Ship24, Delhivery, DHL, FedEx, UPS, test carrier), health and caching. No rate/serviceability/booking/label/cancel/settlement APIs. |
| 3 | Smart courier recommendation | 🟡 | Compares couriers from the seller's OWN rate cards (cost, ETA, eligibility, real delivery history with sample size). No courier rate/serviceability APIs and no booking. |
| 4 | RTO risk scoring | 🟡 | Explainable rules, labels. Missing: versioned/configurable rules, review queue with overrides, outcome evaluation. |
| 5 | NDR management | 🟡 | Cases, customer reply page, inbox, Delhivery action. Missing: full status set, deadlines/escalation, event history, manual tasks, carrier webhooks. |
| 6 | WhatsApp COD verification | 🔌 | Send + reply capture. Missing: queue/retries, delivery receipts, consent/opt-out, expiry. |
| 7 | Branded tracking page | 🟡 | Name, colour, logo, support, private token link. Missing: token revocation/expiry, custom domain, analytics. |
| 8 | Customer notifications | 🔌 | Status-change event log, opt-in consent, STOP opt-out, queued WhatsApp sends with retries. Needs an approved template. Delivery receipts update message status; monthly cap and usage count. No cost reporting (Meta bills per message). |
| 9 | Courier analytics | 🟡 | Rates, transit time, sample-size label, CSV. Missing: lane/warehouse filters, median, spend. |
| 10 | COD reconciliation | 🟡 | CSV match and variance report. Matching runs in the browser; issues can be saved with a status and notes (Scale plan). No bank receipts or adjustments ledger. |
| 11 | Weight discrepancy | 🟡 | Calculator and invoice compare. Disputes can be saved with a status and notes (Scale plan). No contract versions or evidence files. |
| 12 | Vyoma Intelligence | 🟡 | Rule-based action list. No owners, due dates or resolution tracking. |

## Platform requirements
| Area | Status | Notes |
|---|---|---|
| Multi-user workspaces, roles, invitations | 🟡 | Owner plus teammates with their own logins, 4 roles (Admin, Operations, Finance, Read-only), email invitations, seat limits per plan, role checks on the server. Missing: several workspaces per person, custom roles, seller MFA. |
| Onboarding wizard, pickup locations | 🟡 | Pickup locations are saved (not yet used when booking) and a setup checklist guides new sellers. No step-by-step wizard. |
| Email verification, password reset | ✅ | Over your existing SMTP. |
| Seller MFA | 🟡 | Authenticator-app codes and one-time recovery codes for owners and teammates, with admin and owner reset. The setup key is typed in (no QR code image). |
| Admin console | ✅ | Plus Sellers page. Includes Sellers, Plans (editable prices and limits) and Jobs pages. Missing: import-error review, support tickets. |
| Plans and Razorpay billing | 🔌 | Missing: invoices, failed-payment handling, downgrade/cancel, usage metering. |
| Server-side plan limits | 🟡 | Order cap, branding, links, logo are enforced. Analytics, COD, weight, action list are display-locked only (client-side tools). |
| Public pages | ✅ | Home, features, pricing, integrations, about, contact, track, privacy, terms, cookies. Legal pages need review by a lawyer. |
| Background jobs | 🟡 | Job table, retry with backoff, cron worker, optional automatic tracking refresh, admin Jobs page with retry/cancel. No dedicated queue service. |
| Versioned `/api/v1` | 🟡 | Orders list, create and get with API keys (Growth plan), pagination, per-key rate limit, request ids, safe retries. No shipments or webhook endpoints, no OpenAPI file. See `docs/API_V1.md`. |
| Seller audit log | 🟡 | Key seller and team actions are logged and shown to admins. Owners and admins can see it in Team & setup. It records what happened, not which person did it. |
| CSV formula-injection protection | ✅ | |
| Automated tests | 🟡 | 26 logic tests pass. Playwright starter added but not run; no integration tests. |
| CI | ✅ | Type-check and tests in `.github/workflows/ci.yml`. |
| Sentry monitoring | ✅ | Already configured in the project. |

## Suggested next steps, in order
1. Run `npm run build` and the manual checks, and fix what breaks.
2. Save COD reconciliation and weight disputes in the database.
3. Seller audit log and server-side-only data for locked tabs.
4. Multi-user workspaces with roles (needs a careful data migration).
5. Background jobs, then event-driven notifications.
