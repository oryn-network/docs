// Oryn contact form Worker
// Paste this into your Worker at docs.nedbaynepowell.workers.dev
// Set these environment variables in the Worker settings:
//   TURNSTILE_SECRET  — your Cloudflare Turnstile secret key
//   TO_EMAIL          — the address you want contact messages sent to
//   FROM_EMAIL        — a verified sender address on your domain (e.g. hello@oryn.network)

const ALLOWED_ORIGINS = [
  'https://oryn.network',
  'https://www.oryn.network',
];

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, request);
    }

    const url = new URL(request.url);

    // Only handle POST /contact
    if (request.method !== 'POST' || url.pathname !== '/contact') {
      return corsResponse(JSON.stringify({ error: 'Not found' }), 404, request);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Invalid JSON' }), 400, request);
    }

    const { name, email, subject, message, turnstileToken } = body;

    // Basic validation
    if (!name || !email || !message) {
      return corsResponse(JSON.stringify({ error: 'Missing required fields' }), 400, request);
    }

    if (!isValidEmail(email)) {
      return corsResponse(JSON.stringify({ error: 'Invalid email' }), 400, request);
    }

    // Verify Turnstile token
    const turnstileValid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, request);
    if (!turnstileValid) {
      return corsResponse(JSON.stringify({ error: 'Turnstile verification failed' }), 403, request);
    }

    // Send email via MailChannels
    const subjectLabels = {
      integration: 'SDK integration question',
      bug: 'Bug or unexpected behaviour',
      enterprise: 'Enterprise / high-volume use',
      partnership: 'Partnership or collaboration',
      other: 'General enquiry',
    };

    const subjectLine = `[Oryn] ${subjectLabels[subject] || 'Contact form'}`;

    const emailBody = `Name: ${name}
Email: ${email}
Topic: ${subjectLabels[subject] || subject}

${message}

---
Sent via oryn.network/contact.html`;

    try {
      const mailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: env.TO_EMAIL }],
            reply_to: { email, name },
          }],
          from: { email: env.FROM_EMAIL, name: 'Oryn Contact Form' },
          subject: subjectLine,
          content: [{ type: 'text/plain', value: emailBody }],
        }),
      });

      if (!mailRes.ok) {
        const errText = await mailRes.text();
        console.error('MailChannels error:', errText);
        return corsResponse(JSON.stringify({ error: 'Failed to send email' }), 500, request);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      return corsResponse(JSON.stringify({ error: 'Internal error' }), 500, request);
    }

    return corsResponse(JSON.stringify({ ok: true }), 200, request);
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function corsResponse(body, status, request) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
    },
  });
}

async function verifyTurnstile(token, secret, request) {
  if (!token || !secret) return false;
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const data = await res.json();
  return data.success === true;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}