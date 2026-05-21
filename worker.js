/**
 * Zoom Contact Centre – Outbound SMS Worker
 * Hosted at: api.eno.solutions/sms
 *
 * Required Cloudflare Worker secrets (set via `wrangler secret put`):
 *   ZOOM_ACCOUNT_ID
 *   ZOOM_CLIENT_ID
 *   ZOOM_CLIENT_SECRET
 *
 * Required Zoom OAuth scopes:
 *   contact_center_flow:read:admin
 *   contact_center_messaging:write:admin
 */

// ─── HTML UI ────────────────────────────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zoom Contact Centre · SMS</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #EFF2F7;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 32px rgba(0, 0, 0, 0.10);
      padding: 40px 44px;
      width: 100%;
      max-width: 500px;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 36px;
      border-bottom: 1.5px solid #F0F1F3;
      padding-bottom: 28px;
    }
    .logo {
      width: 44px;
      height: 44px;
      background: #0B5CFF;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .logo svg { width: 26px; height: 26px; }
    .header-text h1 {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.3px;
    }
    .header-text p {
      font-size: 13px;
      color: #6B7280;
      margin-top: 2px;
    }

    /* ── Form ── */
    .form-group { margin-bottom: 22px; }

    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 7px;
    }
    label .required { color: #EF4444; margin-left: 2px; }

    select, input[type="tel"], textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      color: #111827;
      background: #fff;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      appearance: none;
      -webkit-appearance: none;
    }
    select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 36px;
      cursor: pointer;
    }
    select:focus, input[type="tel"]:focus, textarea:focus {
      border-color: #0B5CFF;
      box-shadow: 0 0 0 3px rgba(11, 92, 255, 0.12);
    }
    select:disabled {
      background-color: #F9FAFB;
      color: #9CA3AF;
      cursor: not-allowed;
    }
    textarea {
      resize: vertical;
      min-height: 110px;
      line-height: 1.5;
      font-family: inherit;
    }

    .field-hint {
      font-size: 12px;
      color: #9CA3AF;
      margin-top: 5px;
    }

    .char-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 5px;
    }
    .char-hint { font-size: 12px; color: #9CA3AF; }
    .char-count { font-size: 12px; font-weight: 600; color: #9CA3AF; transition: color 0.15s; }
    .char-count.warn  { color: #F59E0B; }
    .char-count.over  { color: #EF4444; }

    /* ── Send button ── */
    .btn-send {
      width: 100%;
      padding: 13px;
      background: #0B5CFF;
      color: #fff;
      border: none;
      border-radius: 9px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: 0.1px;
      transition: background 0.15s, opacity 0.15s, transform 0.1s;
      margin-top: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .btn-send:hover:not(:disabled) { background: #0047D0; }
    .btn-send:active:not(:disabled) { transform: scale(0.99); }
    .btn-send:disabled { opacity: 0.55; cursor: not-allowed; }

    /* ── Status banner ── */
    .status {
      margin-top: 22px;
      padding: 13px 16px;
      border-radius: 9px;
      font-size: 14px;
      line-height: 1.5;
      display: none;
      animation: fadeIn 0.2s ease;
    }
    .status.success {
      display: block;
      background: #ECFDF5;
      color: #065F46;
      border: 1.5px solid #A7F3D0;
    }
    .status.error {
      display: block;
      background: #FEF2F2;
      color: #991B1B;
      border: 1.5px solid #FECACA;
    }
    .status.loading {
      display: block;
      background: #EFF6FF;
      color: #1E40AF;
      border: 1.5px solid #BFDBFE;
    }
    .status .msg-id {
      font-size: 12px;
      color: #047857;
      margin-top: 5px;
      font-family: monospace;
    }

    /* ── Spinner ── */
    .spinner {
      width: 16px;
      height: 16px;
      border: 2.5px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.55s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

    /* ── Footer ── */
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #9CA3AF;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">
        <!-- Camera/video icon representing Zoom -->
        <svg viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="7" width="15" height="12" rx="2.5" fill="white"/>
          <path d="M17 11.2L24 8v10l-7-3.2V11.2z" fill="white"/>
        </svg>
      </div>
      <div class="header-text">
        <h1>Contact Centre SMS</h1>
        <p>Send an outbound SMS message</p>
      </div>
    </div>

    <form id="smsForm" novalidate>

      <!-- From CLI -->
      <div class="form-group">
        <label for="from">From (outgoing number)<span class="required">*</span></label>
        <select id="from" name="from" required disabled>
          <option value="">Loading numbers…</option>
        </select>
      </div>

      <!-- To -->
      <div class="form-group">
        <label for="to">To (destination)<span class="required">*</span></label>
        <input
          type="tel"
          id="to"
          name="to"
          placeholder="+447700900000"
          autocomplete="off"
          required
        />
        <p class="field-hint">E.164 format — country code + number, no spaces (e.g. +447700900000)</p>
      </div>

      <!-- Message body -->
      <div class="form-group">
        <label for="message">Message<span class="required">*</span></label>
        <textarea
          id="message"
          name="message"
          maxlength="140"
          placeholder="Type your message here…"
          required
        ></textarea>
        <div class="char-row">
          <span class="char-hint">Plain text only</span>
          <span class="char-count" id="charCount">0 / 140</span>
        </div>
      </div>

      <button type="submit" class="btn-send" id="sendBtn" disabled>
        Send SMS
      </button>
    </form>

    <div class="status" id="status" role="alert" aria-live="polite"></div>
  </div>

  <p class="footer">Zoom Contact Centre · api.eno.solutions/sms</p>

  <script>
    const fromSelect  = document.getElementById('from');
    const toInput     = document.getElementById('to');
    const messageArea = document.getElementById('message');
    const charCount   = document.getElementById('charCount');
    const sendBtn     = document.getElementById('sendBtn');
    const statusDiv   = document.getElementById('status');
    const form        = document.getElementById('smsForm');

    // ── Load SMS CLI numbers ──────────────────────────────────────────────────
    async function loadNumbers() {
      try {
        const res = await fetch('/sms/api/numbers');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const numbers = await res.json();

        fromSelect.innerHTML = '';
        if (!Array.isArray(numbers) || numbers.length === 0) {
          fromSelect.innerHTML = '<option value="">No SMS numbers found</option>';
          return;
        }
        numbers.forEach(n => {
          const opt = document.createElement('option');
          opt.value = n.number;
          opt.dataset.flowId = n.flowId ?? '';
          opt.textContent = n.label;
          fromSelect.appendChild(opt);
        });
        fromSelect.disabled = false;
        sendBtn.disabled = false;
      } catch (err) {
        fromSelect.innerHTML = '<option value="">Failed to load — reload to retry</option>';
        showStatus('error', 'Could not load SMS numbers: ' + err.message);
      }
    }

    // ── Character counter ─────────────────────────────────────────────────────
    messageArea.addEventListener('input', () => {
      const len = messageArea.value.length;
      charCount.textContent = len + ' / 140';
      charCount.className = 'char-count' + (len >= 140 ? ' over' : len >= 110 ? ' warn' : '');
    });

    // ── E.164 client-side validation ──────────────────────────────────────────
    function isE164(val) {
      return /^\\+[1-9]\\d{7,14}$/.test(val.trim());
    }

    // ── Status helper ─────────────────────────────────────────────────────────
    function showStatus(type, html) {
      statusDiv.className = 'status ' + type;
      statusDiv.innerHTML = html;
    }

    // ── Form submit ───────────────────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const from    = fromSelect.value;
      const flowId  = fromSelect.selectedOptions[0]?.dataset.flowId ?? '';
      const to      = toInput.value.trim();
      const message = messageArea.value.trim();

      if (!from) { showStatus('error', 'Please select an outgoing number.'); return; }
      if (!isE164(to)) { showStatus('error', 'Destination must be in E.164 format (e.g. +447700900000).'); toInput.focus(); return; }
      if (!message)    { showStatus('error', 'Please enter a message.'); messageArea.focus(); return; }

      sendBtn.disabled = true;
      showStatus('loading', '<span class="spinner"></span>&nbsp; Sending…');

      try {
        const res = await fetch('/sms/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to, message, flowId }),
        });

        const data = await res.json();

        if (res.ok) {
          showStatus('success',
            '&#10003;&nbsp; Message sent successfully!' +
            (data.message_id   ? '<div class="msg-id">Message ID: '    + data.message_id   + '</div>' : '') +
            (data.engagement_id ? '<div class="msg-id">Engagement ID: ' + data.engagement_id + '</div>' : '') +
            (data.opt_in_required ? '<div class="msg-id" style="color:#92400E">⚠ Recipient has not opted in — an opt-in invitation was sent instead.</div>' : '')
          );
          messageArea.value = '';
          charCount.textContent = '0 / 140';
          charCount.className = 'char-count';
        } else {
          const errMsg = data?.error?.message
            || (typeof data?.error === 'string' ? data.error : null)
            || JSON.stringify(data.error || data);
          showStatus('error', '&#10007;&nbsp; ' + errMsg);
        }
      } catch (err) {
        showStatus('error', '&#10007;&nbsp; Network error: ' + err.message);
      } finally {
        sendBtn.disabled = false;
      }
    });

    // ── Boot ──────────────────────────────────────────────────────────────────
    loadNumbers();
  </script>
</body>
</html>`;

// ─── Zoom API helpers ────────────────────────────────────────────────────────

const ZOOM_API   = 'https://api.zoom.us/v2';
const TOKEN_URL  = 'https://zoom.us/oauth/token';

/**
 * Obtain a Server-to-Server OAuth access token.
 */
async function getZoomToken(env) {
  const credentials = btoa(`${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`);
  const res = await fetch(
    `${TOKEN_URL}?grant_type=account_credentials&account_id=${encodeURIComponent(env.ZOOM_ACCOUNT_ID)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom token request failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error('No access_token in Zoom OAuth response');
  return data.access_token;
}

/**
 * Fetch all SMS-capable flow entry numbers by paginating /contact_center/flows.
 * Returns an array of { number, label } objects.
 */
async function getSMSNumbers(token) {
  const numbers = [];
  let pageToken = '';

  do {
    const url = new URL(`${ZOOM_API}/contact_center/flows`);
    url.searchParams.set('page_size', '100');
    if (pageToken) url.searchParams.set('next_page_token', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to list flows (${res.status}): ${body}`);
    }
    const data = await res.json();

    for (const flow of data.flows ?? []) {
      // Only SMS-sourced messaging flows
      if (flow.channel_source !== 'sms') continue;
      if (!Array.isArray(flow.entry_points)) continue;

      for (const ep of flow.entry_points) {
        if (!ep.entry_number) continue;
        numbers.push({
          number: ep.entry_number,
          label:  `${flow.flow_name} — ${ep.entry_number}`,
          flowId: flow.flow_id,
        });
      }
    }

    pageToken = data.next_page_token ?? '';
  } while (pageToken);

  return numbers;
}

/**
 * Send an outbound SMS via POST /contact_center/messages.
 * Always creates a Contact Centre engagement.
 * If flowId is provided it is passed as flow_id so inbound replies
 * are routed through that flow.
 */
async function sendSMS(token, from, to, message, flowId) {
  const payload = {
    from,
    to,
    sms_message: { type: 'text', value: message },
    create_engagement: true,
  };
  if (flowId) payload.flow_id = flowId;

  const res = await fetch(`${ZOOM_API}/contact_center/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return res;
}

// ─── CORS headers ────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// ─── Main handler ────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const { method } = request;
    const { pathname } = new URL(request.url);

    // Pre-flight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // ── GET /sms  →  Serve UI ──────────────────────────────────────────────
    if ((pathname === '/sms' || pathname === '/sms/') && method === 'GET') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ── GET /sms/api/numbers  →  List SMS CLIs ─────────────────────────────
    if (pathname === '/sms/api/numbers' && method === 'GET') {
      try {
        const token   = await getZoomToken(env);
        const numbers = await getSMSNumbers(token);
        return jsonResponse(numbers);
      } catch (err) {
        console.error('numbers error:', err);
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // ── POST /sms/api/send  →  Send SMS ────────────────────────────────────
    if (pathname === '/sms/api/send' && method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
      }

      const { from, to, message, flowId } = body ?? {};

      // Validate
      if (!from || !to || !message) {
        return jsonResponse({ error: 'Missing required fields: from, to, message' }, 400);
      }
      if (!/^\+[1-9]\d{7,14}$/.test(to)) {
        return jsonResponse({ error: 'to must be a valid E.164 phone number' }, 400);
      }
      if (message.length > 140) {
        return jsonResponse({ error: 'message exceeds 140 characters' }, 400);
      }

      try {
        const token   = await getZoomToken(env);
        const zoomRes = await sendSMS(token, from, to, message, flowId);
        const data   = await zoomRes.json();

        if (!zoomRes.ok) {
          return jsonResponse({ error: data }, zoomRes.status);
        }
        return jsonResponse(data);
      } catch (err) {
        console.error('send error:', err);
        return jsonResponse({ error: err.message }, 500);
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
