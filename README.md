# zoom-sms-worker — Outbound SMS Worker

A Cloudflare Worker that sends outbound SMS messages via the Zoom Contact Centre API. Includes a simple web UI for composing and sending messages during demos.

**Deployed at:** `api.eno.solutions/sms`

## What it does

- Serves a branded web UI for sending an SMS to any phone number
- Accepts SMS send requests and proxies them to the Zoom Contact Centre messaging API
- Authenticates to Zoom using Server-to-Server OAuth with in-memory token caching
- Can also be called programmatically (e.g. from a ZCC flow tool — see `TOOLS/TOOL 03`)

## How it works

1. The worker serves an HTML form at `GET /sms`
2. Submitting the form posts to `POST /sms`
3. The worker fetches a Zoom OAuth token (cached until expiry)
4. It calls the ZCC outbound messaging API to send the SMS from the configured sender number
5. Returns a success/error response to the UI

## Secrets required

Set via `wrangler secret put` or the Cloudflare dashboard:

| Secret | Description |
|---|---|
| `ZOOM_ACCOUNT_ID` | Zoom account ID |
| `ZOOM_CLIENT_ID` | Server-to-Server OAuth app client ID |
| `ZOOM_CLIENT_SECRET` | Server-to-Server OAuth app client secret |

## Required Zoom OAuth scopes

- `contact_center_flow:read:admin`
- `contact_center_messaging:write:admin`

## Development & deployment

```bash
wrangler dev       # local dev server
wrangler deploy    # deploy to Cloudflare
```

No npm dependencies — single `worker.js` file.
