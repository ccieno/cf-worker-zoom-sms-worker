/**
 * Zoom Contact Centre – SMS & Email Worker
 *
 * SMS:   api.eno.solutions/sms
 * Email: api.eno.solutions/email
 *
 * Required Cloudflare Worker secrets (set via `wrangler secret put`):
 *   ZOOM_ACCOUNT_ID
 *   ZOOM_CLIENT_ID
 *   ZOOM_CLIENT_SECRET
 *
 * Required wrangler.toml [vars]:
 *   WORK_ITEM_TYPES   JSON array of {id, name} — fill in IDs from ZCC Preferences
 *
 * Required Zoom OAuth scopes:
 *   contact_center_flow:read:admin
 *   contact_center_messaging:write:admin
 *   contact_center_engagement:write:admin
 */

// ─── SMS HTML UI ─────────────────────────────────────────────────────────────

const SMS_HTML = `<!DOCTYPE html>
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
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
      padding: 40px 44px;
      width: 100%;
      max-width: 500px;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 36px;
      border-bottom: 1.5px solid #F0F1F3;
      padding-bottom: 28px;
    }
    .logo {
      width: 44px; height: 44px;
      background: #0B5CFF;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .logo svg { width: 26px; height: 26px; }
    .header-text h1 { font-size: 18px; font-weight: 700; color: #111827; letter-spacing: -0.3px; }
    .header-text p  { font-size: 13px; color: #6B7280; margin-top: 2px; }
    .form-group { margin-bottom: 22px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 7px; }
    label .required { color: #EF4444; margin-left: 2px; }
    select, input[type="tel"], textarea {
      width: 100%; padding: 10px 14px;
      border: 1.5px solid #D1D5DB; border-radius: 8px;
      font-size: 14px; color: #111827; background: #fff;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      appearance: none; -webkit-appearance: none;
    }
    select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; cursor: pointer;
    }
    select:focus, input[type="tel"]:focus, textarea:focus {
      border-color: #0B5CFF; box-shadow: 0 0 0 3px rgba(11,92,255,0.12);
    }
    select:disabled { background-color: #F9FAFB; color: #9CA3AF; cursor: not-allowed; }
    textarea { resize: vertical; min-height: 110px; line-height: 1.5; font-family: inherit; }
    .field-hint { font-size: 12px; color: #9CA3AF; margin-top: 5px; }
    .char-row { display: flex; justify-content: space-between; align-items: center; margin-top: 5px; }
    .char-hint { font-size: 12px; color: #9CA3AF; }
    .char-count { font-size: 12px; font-weight: 600; color: #9CA3AF; transition: color 0.15s; }
    .char-count.warn { color: #F59E0B; }
    .char-count.over { color: #EF4444; }
    .btn-send {
      width: 100%; padding: 13px;
      background: #0B5CFF; color: #fff; border: none; border-radius: 9px;
      font-size: 15px; font-weight: 700; cursor: pointer; letter-spacing: 0.1px;
      transition: background 0.15s, opacity 0.15s, transform 0.1s;
      margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-send:hover:not(:disabled) { background: #0047D0; }
    .btn-send:active:not(:disabled) { transform: scale(0.99); }
    .btn-send:disabled { opacity: 0.55; cursor: not-allowed; }
    .status {
      margin-top: 22px; padding: 13px 16px; border-radius: 9px;
      font-size: 14px; line-height: 1.5; display: none; animation: fadeIn 0.2s ease;
    }
    .status.success { display: block; background: #ECFDF5; color: #065F46; border: 1.5px solid #A7F3D0; }
    .status.error   { display: block; background: #FEF2F2; color: #991B1B; border: 1.5px solid #FECACA; }
    .status.loading { display: block; background: #EFF6FF; color: #1E40AF; border: 1.5px solid #BFDBFE; }
    .status .msg-id { font-size: 12px; color: #047857; margin-top: 5px; font-family: monospace; }
    .spinner {
      width: 16px; height: 16px;
      border: 2.5px solid currentColor; border-right-color: transparent;
      border-radius: 50%; animation: spin 0.55s linear infinite; flex-shrink: 0;
    }
    @keyframes spin    { to { transform: rotate(360deg); } }
    @keyframes fadeIn  { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    .footer { margin-top: 24px; font-size: 12px; color: #9CA3AF; text-align: center; }
    .page-toggle {
      display: flex; gap: 8px; margin-bottom: 20px;
      background: #E8EDFB; border-radius: 10px; padding: 4px;
    }
    .page-toggle a {
      flex: 1; text-align: center; padding: 8px 0;
      border-radius: 7px; font-size: 13px; font-weight: 600;
      text-decoration: none; color: #6B7280;
      transition: background 0.15s, color 0.15s;
    }
    .page-toggle a.active {
      background: #fff; color: #0B5CFF;
      box-shadow: 0 1px 4px rgba(0,0,0,0.10);
    }
    .page-toggle a:not(.active):hover { color: #374151; }
  </style>
</head>
<body>
  <div class="card">
    <nav class="page-toggle">
      <a href="/sms" class="active">&#128172; SMS</a>
      <a href="/email">&#9993; Email</a>
    </nav>
    <div class="header">
      <div class="logo">
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
      <div class="form-group">
        <label for="from">From (outgoing number)<span class="required">*</span></label>
        <select id="from" name="from" required disabled>
          <option value="">Loading numbers…</option>
        </select>
      </div>
      <div class="form-group">
        <label for="to">To (destination)<span class="required">*</span></label>
        <input type="tel" id="to" name="to" placeholder="+447700900000" autocomplete="off" required />
        <p class="field-hint">E.164 format — country code + number, no spaces (e.g. +447700900000)</p>
      </div>
      <div class="form-group">
        <label for="message">Message<span class="required">*</span></label>
        <textarea id="message" name="message" maxlength="140" placeholder="Type your message here…" required></textarea>
        <div class="char-row">
          <span class="char-hint">Plain text only</span>
          <span class="char-count" id="charCount">0 / 140</span>
        </div>
      </div>
      <button type="submit" class="btn-send" id="sendBtn" disabled>Send SMS</button>
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

    async function loadNumbers() {
      try {
        const res = await fetch('/sms/api/numbers');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const numbers = await res.json();
        fromSelect.innerHTML = '';
        if (!Array.isArray(numbers) || numbers.length === 0) {
          fromSelect.innerHTML = '<option value="">No SMS numbers found</option>'; return;
        }
        numbers.forEach(n => {
          const opt = document.createElement('option');
          opt.value = n.number;
          opt.dataset.flowId = n.flowId || '';
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

    messageArea.addEventListener('input', () => {
      const len = messageArea.value.length;
      charCount.textContent = len + ' / 140';
      charCount.className = 'char-count' + (len >= 140 ? ' over' : len >= 110 ? ' warn' : '');
    });

    function isE164(val) { return /^\\+[1-9]\\d{7,14}$/.test(val.trim()); }

    function showStatus(type, html) {
      statusDiv.className = 'status ' + type;
      statusDiv.innerHTML = html;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const from    = fromSelect.value;
      const flowId  = fromSelect.selectedOptions[0]?.dataset.flowId || '';
      const to      = toInput.value.trim();
      const message = messageArea.value.trim();
      if (!from)        { showStatus('error', 'Please select an outgoing number.'); return; }
      if (!isE164(to))  { showStatus('error', 'Destination must be in E.164 format (e.g. +447700900000).'); toInput.focus(); return; }
      if (!message)     { showStatus('error', 'Please enter a message.'); messageArea.focus(); return; }
      sendBtn.disabled = true;
      showStatus('loading', '<span class="spinner"></span>&nbsp; Sending…');
      try {
        const res = await fetch('/sms/api/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to, message, flowId }),
        });
        const data = await res.json();
        if (res.ok) {
          showStatus('success',
            '&#10003;&nbsp; Message sent successfully!' +
            (data.message_id    ? '<div class="msg-id">Message ID: '    + data.message_id    + '</div>' : '') +
            (data.engagement_id ? '<div class="msg-id">Engagement ID: ' + data.engagement_id + '</div>' : '') +
            (data.opt_in_required ? '<div class="msg-id" style="color:#92400E">&#9888; Recipient has not opted in — an opt-in invitation was sent instead.</div>' : '')
          );
          messageArea.value = '';
          charCount.textContent = '0 / 140';
          charCount.className = 'char-count';
        } else {
          const errMsg = data?.error?.message || (typeof data?.error === 'string' ? data.error : null) || JSON.stringify(data.error || data);
          showStatus('error', '&#10007;&nbsp; ' + errMsg);
        }
      } catch (err) {
        showStatus('error', '&#10007;&nbsp; Network error: ' + err.message);
      } finally {
        sendBtn.disabled = false;
      }
    });

    loadNumbers();
  </script>
</body>
</html>`;

// ─── EMAIL HTML UI ────────────────────────────────────────────────────────────

const EMAIL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zoom Contact Centre · Email</title>
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
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
      padding: 40px 44px;
      width: 100%;
      max-width: 560px;
    }
    .header {
      display: flex; align-items: center; gap: 14px;
      margin-bottom: 32px; border-bottom: 1.5px solid #F0F1F3; padding-bottom: 24px;
    }
    .logo {
      width: 44px; height: 44px; background: #0B5CFF; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .logo svg { width: 24px; height: 24px; }
    .header-text h1 { font-size: 18px; font-weight: 700; color: #111827; letter-spacing: -0.3px; }
    .header-text p  { font-size: 13px; color: #6B7280; margin-top: 2px; }

    /* section dividers */
    .section-label {
      font-size: 11px; font-weight: 700; letter-spacing: 0.6px;
      text-transform: uppercase; color: #9CA3AF;
      margin: 24px 0 14px;
    }
    .section-label:first-of-type { margin-top: 0; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    label .required { color: #EF4444; margin-left: 2px; }
    label .optional { font-size: 11px; font-weight: 400; color: #9CA3AF; margin-left: 4px; }

    select, input[type="text"], input[type="email"], textarea {
      width: 100%; padding: 10px 14px;
      border: 1.5px solid #D1D5DB; border-radius: 8px;
      font-size: 14px; color: #111827; background: #fff;
      outline: none; transition: border-color 0.15s, box-shadow 0.15s;
      appearance: none; -webkit-appearance: none;
    }
    select {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; cursor: pointer;
    }
    select:focus, input:focus, textarea:focus {
      border-color: #0B5CFF; box-shadow: 0 0 0 3px rgba(11,92,255,0.12);
    }
    select:disabled { background-color: #F9FAFB; color: #9CA3AF; cursor: not-allowed; }
    textarea { resize: vertical; line-height: 1.5; font-family: inherit; min-height: 130px; }

    .btn-send {
      width: 100%; padding: 13px;
      background: #0B5CFF; color: #fff; border: none; border-radius: 9px;
      font-size: 15px; font-weight: 700; cursor: pointer; letter-spacing: 0.1px;
      transition: background 0.15s, transform 0.1s;
      margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-send:hover:not(:disabled) { background: #0047D0; }
    .btn-send:active:not(:disabled) { transform: scale(0.99); }
    .btn-send:disabled { opacity: 0.55; cursor: not-allowed; }

    .status {
      margin-top: 22px; padding: 13px 16px; border-radius: 9px;
      font-size: 14px; line-height: 1.5; display: none; animation: fadeIn 0.2s ease;
    }
    .status.success { display: block; background: #ECFDF5; color: #065F46; border: 1.5px solid #A7F3D0; }
    .status.error   { display: block; background: #FEF2F2; color: #991B1B; border: 1.5px solid #FECACA; }
    .status.loading { display: block; background: #EFF6FF; color: #1E40AF; border: 1.5px solid #BFDBFE; }
    .status .msg-id { font-size: 12px; color: #047857; margin-top: 5px; font-family: monospace; }

    .spinner {
      width: 16px; height: 16px;
      border: 2.5px solid currentColor; border-right-color: transparent;
      border-radius: 50%; animation: spin 0.55s linear infinite; flex-shrink: 0;
    }
    @keyframes spin   { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    .footer { margin-top: 24px; font-size: 12px; color: #9CA3AF; text-align: center; }
    .divider { border: none; border-top: 1.5px solid #F0F1F3; margin: 4px 0 20px; }
    .page-toggle {
      display: flex; gap: 8px; margin-bottom: 20px;
      background: #E8EDFB; border-radius: 10px; padding: 4px;
    }
    .page-toggle a {
      flex: 1; text-align: center; padding: 8px 0;
      border-radius: 7px; font-size: 13px; font-weight: 600;
      text-decoration: none; color: #6B7280;
      transition: background 0.15s, color 0.15s;
    }
    .page-toggle a.active {
      background: #fff; color: #0B5CFF;
      box-shadow: 0 1px 4px rgba(0,0,0,0.10);
    }
    .page-toggle a:not(.active):hover { color: #374151; }
  </style>
</head>
<body>
  <div class="card">
    <nav class="page-toggle">
      <a href="/sms">&#128172; SMS</a>
      <a href="/email" class="active">&#9993; Email</a>
    </nav>
    <div class="header">
      <div class="logo">
        <!-- envelope icon -->
        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>
      <div class="header-text">
        <h1>Contact Centre Email</h1>
        <p>Create an outbound email engagement</p>
      </div>
    </div>

    <form id="emailForm" novalidate>

      <!-- Routing -->
      <p class="section-label">Routing</p>
      <div class="form-group">
        <label for="flowEntry">Work Item Flow<span class="required">*</span></label>
        <select id="flowEntry" name="flowEntry" required disabled>
          <option value="">Loading flows…</option>
        </select>
      </div>
      <div class="form-group">
        <label for="workItemType">Work Item Type<span class="required">*</span></label>
        <select id="workItemType" name="workItemType" required disabled>
          <option value="">Loading types…</option>
        </select>
      </div>

      <hr class="divider" />

      <!-- Consumer -->
      <p class="section-label">Customer</p>
      <div class="form-row">
        <div class="form-group">
          <label for="consumerName">Full Name<span class="required">*</span></label>
          <input type="text" id="consumerName" placeholder="Jane Smith" required />
        </div>
        <div class="form-group">
          <label for="consumerEmail">Email Address<span class="required">*</span></label>
          <input type="email" id="consumerEmail" placeholder="jane@example.com" required />
        </div>
      </div>
      <div class="form-group">
        <label for="consumerExternalId">External / Customer ID<span class="optional">(optional)</span></label>
        <input type="text" id="consumerExternalId" placeholder="e.g. CRM-12345" />
      </div>

      <hr class="divider" />

      <!-- Work item -->
      <p class="section-label">Work Item</p>
      <div class="form-row">
        <div class="form-group">
          <label for="workItemName">Work Item Name<span class="required">*</span></label>
          <input type="text" id="workItemName" placeholder="e.g. Info request: order #78432" required />
        </div>
        <div class="form-group">
          <label for="referenceId">Reference / Order ID<span class="optional">(optional)</span></label>
          <input type="text" id="referenceId" placeholder="e.g. ORD-2026-78432" />
        </div>
      </div>
      <div class="form-group">
        <label for="workItemDesc">Work Item Description<span class="optional">(optional)</span></label>
        <input type="text" id="workItemDesc" placeholder="Brief internal description for agents" />
      </div>

      <hr class="divider" />

      <!-- Message -->
      <p class="section-label">Message</p>
      <div class="form-group">
        <label for="messageBody">Message Body<span class="required">*</span></label>
        <textarea id="messageBody" placeholder="Enter the email message body that will be sent to the customer…" required></textarea>
      </div>

      <button type="submit" class="btn-send" id="sendBtn" disabled>
        Send Email
      </button>
    </form>

    <div class="status" id="status" role="alert" aria-live="polite"></div>
  </div>
  <p class="footer">Zoom Contact Centre · api.eno.solutions/email</p>

  <script>
    const flowSelect    = document.getElementById('flowEntry');
    const typeSelect    = document.getElementById('workItemType');
    const sendBtn       = document.getElementById('sendBtn');
    const statusDiv     = document.getElementById('status');
    const form          = document.getElementById('emailForm');

    function showStatus(type, html) {
      statusDiv.className = 'status ' + type;
      statusDiv.innerHTML = html;
    }

    // load flows and work item types in parallel
    async function loadSelectors() {
      const [flowsRes, typesRes] = await Promise.all([
        fetch('/email/api/flows'),
        fetch('/email/api/work-item-types'),
      ]);

      // flows
      try {
        if (!flowsRes.ok) throw new Error('HTTP ' + flowsRes.status);
        const flows = await flowsRes.json();
        flowSelect.innerHTML = '';
        if (!Array.isArray(flows) || flows.length === 0) {
          flowSelect.innerHTML = '<option value="">No work item flows found</option>';
        } else {
          flows.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.entryId;
            opt.textContent = f.label;
            flowSelect.appendChild(opt);
          });
          flowSelect.disabled = false;
        }
      } catch (err) {
        flowSelect.innerHTML = '<option value="">Failed to load flows</option>';
        showStatus('error', 'Could not load flows: ' + err.message);
      }

      // work item types
      try {
        if (!typesRes.ok) throw new Error('HTTP ' + typesRes.status);
        const types = await typesRes.json();
        typeSelect.innerHTML = '';
        if (!Array.isArray(types) || types.length === 0) {
          typeSelect.innerHTML = '<option value="">No types configured</option>';
        } else {
          types.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            typeSelect.appendChild(opt);
          });
          typeSelect.disabled = false;
        }
      } catch (err) {
        typeSelect.innerHTML = '<option value="">Failed to load types</option>';
      }

      // enable send only when both loaded successfully
      if (!flowSelect.disabled && !typeSelect.disabled) sendBtn.disabled = false;
    }

    function val(id) { return document.getElementById(id).value.trim(); }

    function isEmail(v) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v); }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const entryId           = flowSelect.value;
      const workItemTypeId    = typeSelect.value;
      const consumerName      = val('consumerName');
      const consumerEmail     = val('consumerEmail');
      const consumerExternalId = val('consumerExternalId');
      const workItemName      = val('workItemName');
      const workItemDesc      = val('workItemDesc');
      const referenceId       = val('referenceId');
      const messageBody       = val('messageBody');

      if (!entryId)        { showStatus('error', 'Please select a work item flow.'); return; }
      if (!workItemTypeId) { showStatus('error', 'Please select a work item type.'); return; }
      if (!consumerName)   { showStatus('error', 'Please enter the customer name.'); document.getElementById('consumerName').focus(); return; }
      if (!isEmail(consumerEmail)) { showStatus('error', 'Please enter a valid email address.'); document.getElementById('consumerEmail').focus(); return; }
      if (!workItemName)   { showStatus('error', 'Please enter a work item name.'); document.getElementById('workItemName').focus(); return; }
      if (!messageBody)    { showStatus('error', 'Please enter a message body.'); document.getElementById('messageBody').focus(); return; }

      sendBtn.disabled = true;
      showStatus('loading', '<span class="spinner"></span>&nbsp; Creating engagement…');

      try {
        const res = await fetch('/email/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entryId, workItemTypeId,
            consumerName, consumerEmail, consumerExternalId,
            workItemName, workItemDesc, referenceId, messageBody,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showStatus('success',
            '&#10003;&nbsp; Engagement created — email will be sent by the flow.' +
            (data.engagement_id ? '<div class="msg-id">Engagement ID: ' + data.engagement_id + '</div>' : '') +
            (data.session_id    ? '<div class="msg-id">Session ID: '    + data.session_id    + '</div>' : '')
          );
          form.querySelectorAll('input[type="text"], input[type="email"], textarea').forEach(el => el.value = '');
        } else {
          const errMsg = data?.error?.message || (typeof data?.error === 'string' ? data.error : null) || JSON.stringify(data.error || data);
          showStatus('error', '&#10007;&nbsp; ' + errMsg);
        }
      } catch (err) {
        showStatus('error', '&#10007;&nbsp; Network error: ' + err.message);
      } finally {
        sendBtn.disabled = false;
      }
    });

    loadSelectors();
  </script>
</body>
</html>`;

// ─── Zoom API helpers ────────────────────────────────────────────────────────

const ZOOM_API  = 'https://api.zoom.us/v2';
const TOKEN_URL = 'https://zoom.us/oauth/token';

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
 * Returns an array of { number, label, flowId } objects.
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

  return fetch(`${ZOOM_API}/contact_center/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch all work-item flows (channel_source = api) by paginating /contact_center/flows.
 * Returns an array of { entryId, label, flowId } objects.
 */
async function getWorkItemFlows(token) {
  const flows = [];
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
      if (flow.channel !== 'work_item') continue;
      if (!Array.isArray(flow.entry_points)) continue;
      for (const ep of flow.entry_points) {
        if (!ep.entry_id) continue;
        flows.push({
          entryId: ep.entry_id,
          label:   flow.flow_name,
          flowId:  flow.flow_id,
        });
      }
    }

    pageToken = data.next_page_token ?? '';
  } while (pageToken);

  return flows;
}

/**
 * Start a work-item engagement via POST /contact_center/engagement.
 */
async function createEngagement(token, {
  entryId, workItemTypeId,
  consumerName, consumerEmail, consumerExternalId,
  workItemName, workItemDesc, referenceId, messageBody,
}) {
  const payload = {
    channels: [{ channel: 'work_item', channel_source: 'API' }],
    flow: { flow_entry_id: entryId },
    language_code: 'en-GB',
    consumers: [{
      consumer_display_name: consumerName,
      consumer_email:        consumerEmail,
      ...(consumerExternalId ? { consumer_external_id: consumerExternalId } : {}),
    }],
    work_item_variables: {
      work_item_name:    workItemName,
      work_item_type_id: workItemTypeId,
      work_item_origin:  'Web Platform',
      work_item_priority: 2,
      ...(workItemDesc  ? { work_item_desc: workItemDesc }   : {}),
      ...(referenceId   ? { work_item_id:   referenceId }    : {}),
    },
    variables: [
      { name: 'global_custom.default.message_body',   value: messageBody },
      { name: 'global_custom.default.consumer_name',  value: consumerName },
      { name: 'global_custom.default.consumer_email', value: consumerEmail },
      ...(referenceId ? [{ name: 'global_custom.default.reference_id', value: referenceId }] : []),
    ],
  };

  return fetch(`${ZOOM_API}/contact_center/engagement`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

// ─── CORS helpers ────────────────────────────────────────────────────────────

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

    if (method === 'OPTIONS') return new Response(null, { headers: CORS });

    // ── SMS: serve UI ──────────────────────────────────────────────────────
    if ((pathname === '/sms' || pathname === '/sms/') && method === 'GET') {
      return new Response(SMS_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ── SMS: list CLI numbers ──────────────────────────────────────────────
    if (pathname === '/sms/api/numbers' && method === 'GET') {
      try {
        const token   = await getZoomToken(env);
        const numbers = await getSMSNumbers(token);
        return jsonResponse(numbers);
      } catch (err) {
        console.error('sms/numbers error:', err);
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // ── SMS: send ──────────────────────────────────────────────────────────
    if (pathname === '/sms/api/send' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
      }
      const { from, to, message, flowId } = body ?? {};
      if (!from || !to || !message)
        return jsonResponse({ error: 'Missing required fields: from, to, message' }, 400);
      if (!/^\+[1-9]\d{7,14}$/.test(to))
        return jsonResponse({ error: 'to must be a valid E.164 phone number' }, 400);
      if (message.length > 140)
        return jsonResponse({ error: 'message exceeds 140 characters' }, 400);
      try {
        const token   = await getZoomToken(env);
        const zoomRes = await sendSMS(token, from, to, message, flowId);
        const data    = await zoomRes.json();
        return jsonResponse(data, zoomRes.ok ? 200 : zoomRes.status);
      } catch (err) {
        console.error('sms/send error:', err);
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // ── Email: serve UI ────────────────────────────────────────────────────
    if ((pathname === '/email' || pathname === '/email/') && method === 'GET') {
      return new Response(EMAIL_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ── Email: list work-item flows ────────────────────────────────────────
    if (pathname === '/email/api/flows' && method === 'GET') {
      try {
        const token = await getZoomToken(env);
        const flows = await getWorkItemFlows(token);
        return jsonResponse(flows);
      } catch (err) {
        console.error('email/flows error:', err);
        return jsonResponse({ error: err.message }, 500);
      }
    }

    // ── Email: list work-item types (from env var) ─────────────────────────
    if (pathname === '/email/api/work-item-types' && method === 'GET') {
      try {
        const types = JSON.parse(env.WORK_ITEM_TYPES ?? '[]');
        return jsonResponse(types);
      } catch (err) {
        return jsonResponse({ error: 'WORK_ITEM_TYPES env var is not valid JSON' }, 500);
      }
    }

    // ── Email: create engagement ───────────────────────────────────────────
    if (pathname === '/email/api/send' && method === 'POST') {
      let body;
      try { body = await request.json(); } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
      }
      const { entryId, workItemTypeId, consumerName, consumerEmail,
              consumerExternalId, workItemName, workItemDesc,
              referenceId, messageBody } = body ?? {};

      if (!entryId)     return jsonResponse({ error: 'Missing required field: entryId' }, 400);
      if (!workItemTypeId) return jsonResponse({ error: 'Missing required field: workItemTypeId' }, 400);
      if (!consumerName)   return jsonResponse({ error: 'Missing required field: consumerName' }, 400);
      if (!consumerEmail)  return jsonResponse({ error: 'Missing required field: consumerEmail' }, 400);
      if (!workItemName)   return jsonResponse({ error: 'Missing required field: workItemName' }, 400);
      if (!messageBody)    return jsonResponse({ error: 'Missing required field: messageBody' }, 400);

      try {
        const token   = await getZoomToken(env);
        const zoomRes = await createEngagement(token, {
          entryId, workItemTypeId, consumerName, consumerEmail,
          consumerExternalId, workItemName, workItemDesc,
          referenceId, messageBody,
        });
        const data = await zoomRes.json();
        return jsonResponse(data, zoomRes.ok ? 201 : zoomRes.status);
      } catch (err) {
        console.error('email/send error:', err);
        return jsonResponse({ error: err.message }, 500);
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
