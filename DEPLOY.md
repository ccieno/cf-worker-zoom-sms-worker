# Zoom CC SMS — Deployment Guide

## What this is

A Cloudflare Worker that serves a web UI at `api.eno.solutions/sms`.  
It authenticates to Zoom using **Server-to-Server OAuth**, fetches your SMS-capable  
Contact Centre flow numbers as CLI options, and sends outbound SMS via  
`POST /contact_center/messages`.

---

## Step 1 — Create a Zoom Server-to-Server OAuth app

1. Go to [marketplace.zoom.us](https://marketplace.zoom.us) → **Develop → Build App**
2. Choose **Server-to-Server OAuth** → name it (e.g. `CC SMS Sender`)
3. Under **Scopes**, add:
   - `contact_center_flow:read:admin`
   - `contact_center_messaging:write:admin`
4. **Activate** the app
5. Note down your:
   - **Account ID**
   - **Client ID**
   - **Client Secret**

---

## Step 2 — Install Wrangler and log in

```bash
npm install -g wrangler
wrangler login
```

---

## Step 3 — Set secrets

Run each of the following and paste the value when prompted:

```bash
wrangler secret put ZOOM_ACCOUNT_ID
wrangler secret put ZOOM_CLIENT_ID
wrangler secret put ZOOM_CLIENT_SECRET
```

---

## Step 4 — Deploy

From the `zoom-sms-worker/` folder:

```bash
wrangler deploy
```

Wrangler will deploy the Worker and attach it to the route  
`api.eno.solutions/sms*` on your `eno.solutions` zone.

> **Note:** Your Cloudflare account must own the `eno.solutions` zone,  
> and the zone must be active in Cloudflare (not just registered).

---

## Step 5 — Verify

Open **https://api.eno.solutions/sms** in a browser.  
The From dropdown will populate with your SMS-enabled Contact Centre flows.  
Enter a destination in E.164 format (e.g. `+447700900000`), write your  
message (up to 140 chars), and hit **Send SMS**.

---

## API endpoints (used internally by the UI)

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/sms` | Serves the HTML UI |
| `GET`  | `/sms/api/numbers` | Returns available SMS CLIs as JSON |
| `POST` | `/sms/api/send` | Sends the SMS via Zoom CC API |

### POST /sms/api/send payload

```json
{
  "from": "+16052052430",
  "to":   "+447700900000",
  "message": "Hello from Zoom Contact Centre!"
}
```

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Dropdown says "No SMS numbers found" | No published flows with `channel_source: sms` in your ZCC account |
| 401 from Zoom | Wrong Client ID / Secret, or app not activated |
| 403 from Zoom | Missing scopes — re-check the OAuth app scope list |
| 1019 error | Contact Centre messaging feature flag not enabled on your account |
| opt_in_required notice | Recipient hasn't opted in; Zoom sends them an opt-in invite automatically |
