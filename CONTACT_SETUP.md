# Contact form setup

Three steps: Turnstile, Worker, deploy.

---

## 1. Create a Turnstile widget (5 min)

1. Cloudflare dashboard → **Turnstile** (left sidebar)
2. Click **Add widget**
3. Name it `Oryn contact`
4. Under **Domains**, add `oryn.network`
5. Widget type: **Managed** (invisible challenge, no checkbox)
6. Click **Create**
7. Copy the **Site Key** and **Secret Key** — you need both

In `contact.html`, find this line and replace the placeholder:
```
data-sitekey="0x4AAAAAAA_REPLACE_WITH_YOUR_SITEKEY"
```
Replace with your actual site key.

---

## 2. Configure the Worker (5 min)

1. Cloudflare dashboard → **Workers & Pages**
2. Open your existing Worker: `docs.nedbaynepowell.workers.dev`
3. Go to **Settings → Variables**
4. Add these environment variables (use **Encrypt** for the secret):

| Variable name      | Value                              |
|--------------------|------------------------------------|
| `TURNSTILE_SECRET` | Your Turnstile secret key          |
| `TO_EMAIL`         | Where you want messages delivered  |
| `FROM_EMAIL`       | A verified sender on your domain   |

5. Go to **Edit code**
6. Replace the existing Worker code with the contents of `worker.js`
7. Click **Deploy**

---

## 3. Verify your sending domain (5 min)

MailChannels requires your domain to be authorised to send email. Add this DNS record in Cloudflare:

| Type | Name | Value                              |
|------|------|------------------------------------|
| TXT  | `@`  | `v=spf1 include:relay.mailchannels.net ~all` |

If you already have an SPF record, add `include:relay.mailchannels.net` to it rather than replacing it.

Also add a MailChannels DKIM DNS record (optional but improves deliverability):

| Type  | Name                         | Value                                    |
|-------|------------------------------|------------------------------------------|
| CNAME | `mailchannels._domainkey`    | `mailchannels.net`                       |

DNS changes take a few minutes to propagate.

---

## 4. Test it

1. Open `contact.html` in your browser
2. Fill in the form and submit
3. Check the inbox for `TO_EMAIL`
4. Check the Worker logs in Cloudflare (Workers → your Worker → **Logs**) if anything goes wrong

---

## 5. Add the contact link to your other doc pages

In `docs.html`, `examples.html`, and `troubleshooting.html`, add this to the sidebar nav under the **More** group:

```html
<div class="sb-group">
  <div class="sb-group-label">More</div>
  <a href="contact.html" class="sb-link">Contact</a>
  <a href="index.html" class="sb-link">Homepage ↗</a>
</div>
```

---

## Troubleshooting the Worker

**Form submits but no email arrives**
- Check Worker logs for MailChannels errors
- Confirm `FROM_EMAIL` is on a domain with the SPF record above
- MailChannels occasionally rejects sends from domains without SPF — the SPF record is required

**Turnstile fails**
- Make sure the site key in `contact.html` matches the widget you created
- Make sure the secret key in the Worker env matches the same widget
- Turnstile in dark mode requires the `data-theme="dark"` attribute — already set

**CORS errors in the browser console**
- Add your domain to `ALLOWED_ORIGINS` at the top of `worker.js` if you're testing from a different origin
- For local testing, add `http://localhost:your-port` to the array temporarily

---

## Files summary

| File            | What it does                                      |
|-----------------|---------------------------------------------------|
| `contact.html`  | The contact page — deploy to your Pages site      |
| `worker.js`     | Paste into your Cloudflare Worker                 |
| This file       | Setup instructions                                |