# zoom-sms-worker — Outbound SMS & Email Worker

A Cloudflare Worker serving two outbound messaging tools via Zoom Contact Centre. Both are accessible via a toggle on the page.

**SMS deployed at:** `api.eno.solutions/sms`  
**Email deployed at:** `api.eno.solutions/email`

---

## /sms — Outbound SMS

Sends outbound SMS via the ZCC `POST /contact_center/messages` API.

**What it does:**
- Serves a branded web UI at `GET /sms`
- Dynamically fetches available SMS CLI numbers from ZCC flows (`GET /contact_center/flows`, filtered to `channel_source: sms`)
- Accepts a destination number (E.164 format) and message body (up to 140 chars)
- Sends via `POST /contact_center/messages` with `create_engagement: true`
- Authenticates via Server-to-Server OAuth with in-memory token caching

**Status: ✅ Working**

---

## /email — Outbound Email Engagement

Creates a ZCC work item engagement via `POST /contact_center/engagement`, which triggers the **Email Sender** flow.

**What it does:**
- Serves a branded web UI at `GET /email`
- Pre-populates test defaults: Joe Bloggs / joe@eno.solutions, auto-incrementing order ID (ORD-050624+), matching work item name/description/message body
- Creates a ZCC work item engagement with consumer info, work item metadata, and custom variables
- The engagement appears in the ZCC agent interface with all variables correctly populated

**ZCC flow: Email Sender**
- Flow ID: `Vt0kUZVpTGefXPTpURrrsQ`
- Entry ID: `YXTDVVrETQ6OAfjnGld-0Q` (configured in `wrangler.toml` as `WORK_ITEM_FLOWS` — ZCC's flows API does not return entry IDs for work_item channel flows)
- Flow: Start → SendMedia (Email) → Sent/Failed → Route To queue

**Status: ⚠️ Engagement creation working. Email sending not yet working.**

The SendMedia widget in the ZCC flow consistently takes the `sendMediaFailed` path. Variables are correctly populated in the engagement (confirmed via ZCC agent interface). The issue is under investigation — possible causes:
- The `zoom.demo.se@gmail.com` email channel may need outbound sending explicitly enabled in ZCC Admin → Contact Center Management → Channels
- The SendMedia widget's To field variable resolution may behave differently for work_item/API flows vs. email channel flows
- There may be a ZCC account-level setting required to permit outbound email from work_item flows

Next diagnostic steps:
1. Hardcode the To address in the SendMedia node (remove variable) to rule out variable resolution
2. Check email channel settings in ZCC Admin for outbound/notification toggle
3. Review the SendMedia support article for work_item email prerequisites

---

## Architecture

```
api.eno.solutions/sms   → GET  /sms               — SMS UI
                        → GET  /sms/api/numbers    — fetch CLI numbers from ZCC
                        → POST /sms/api/send       — send SMS via ZCC

api.eno.solutions/email → GET  /email              — Email UI
                        → GET  /email/api/flows     — return WORK_ITEM_FLOWS from env var
                        → GET  /email/api/work-item-types — return WORK_ITEM_TYPES from env var
                        → POST /email/api/send      — create ZCC work item engagement
                        → GET  /email/api/debug-flows — raw flow debug (remove when done)
```

---

## Secrets required

Set via `wrangler secret put` or the Cloudflare dashboard:

| Secret | Description |
|---|---|
| `ZOOM_ACCOUNT_ID` | Zoom account ID |
| `ZOOM_CLIENT_ID` | Server-to-Server OAuth app client ID |
| `ZOOM_CLIENT_SECRET` | Server-to-Server OAuth app client secret |

## Vars (wrangler.toml)

| Var | Description |
|---|---|
| `WORK_ITEM_TYPES` | JSON array of `{id, name}` work item types from ZCC Admin → Preferences → Work Item Types |
| `WORK_ITEM_FLOWS` | JSON array of `{entryId, label, flowId}` — manually configured because ZCC's flows API doesn't return entry IDs for work_item channel flows |

## Required Zoom OAuth scopes

- `contact_center_flow:read:admin`
- `contact_center_messaging:write:admin`
- `contact_center_engagement:write:admin`

## Deployment

```bash
cd zoom-sms-worker
npx wrangler deploy
```

No npm dependencies — single `worker.js` file. All secrets managed via Cloudflare.

> **Note:** This worker lives alongside but does not affect the existing `api.eno.solutions/zoom/` worker. Routes are scoped to `/sms*` and `/email*` only.
