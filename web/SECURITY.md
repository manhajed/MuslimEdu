# Security notes for web/

What's applied in `login.html` / `register.html` themselves, what has to be
added when these are actually deployed behind a real web server, and what
depends on the backend. None of this makes the app "unhackable" — it closes
off specific, real attack classes. New ones get found in frameworks and
libraries on an ongoing basis; that's normal and permanent, not a gap in
this pass.

## Applied in the HTML/JS (verified with Playwright — see commit history)

- **Content-Security-Policy** (`<meta http-equiv>` in both pages):
  - `script-src 'self'` — only same-origin `.js` files run. No inline
    `<script>`, no inline `onclick=`/`oninput=` attributes, no `eval`.
    Verified: an injected `<script>` tag does not execute.
  - `connect-src 'self' https://manhaje.com` — `fetch`/XHR can only reach
    the app's own origin and the real API. Verified: a simulated
    token-exfiltration `fetch()` to an arbitrary domain is blocked by the
    browser before the request leaves the page.
  - `default-src 'none'` plus explicit `img-src`/`font-src`/`style-src` —
    nothing loads unless it's on the allowlist.
  - `form-action 'none'` / `base-uri 'none'` — blocks two classic injection
    tricks (silently redirecting a form submit, or a `<base>` tag hijack).
- **Referrer-Policy: strict-origin-when-cross-origin** — the full URL
  (which never contains the token, but could contain other query data)
  isn't leaked to third-party resources.
- **Cache-Control: no-store** — browser/proxy caches don't keep a copy of
  the signed-in page.
- **All server/user data rendered via `textContent`**, never `innerHTML` —
  a malicious name/email/role in an API response can't inject HTML/JS.
- **Idle auto-logout** (`login.js`, `IDLE_LOGOUT_MS`) — an unattended signed-in
  tab logs itself out after 15 minutes, bounding how long a stolen token
  sitting in browser storage stays a live session.
- **Password dropped from memory right after use** — `currentPassword` is
  cleared as soon as the login request that needed it completes.

## What a `<meta>` tag *cannot* do (needs real HTTP headers)

Browsers ignore `frame-ancestors`, `sandbox`, and `report-to`/`report-uri`
when delivered via `<meta>` — only an actual HTTP response header enforces
them. Whatever ends up serving these files (nginx, Apache, Cloudflare
Pages, S3+CloudFront, etc.) needs to add:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: frame-ancestors 'none'
Permissions-Policy: geolocation=(), camera=(), microphone=()
```

nginx example:
```nginx
location ~ \.(html|js)$ {
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Permissions-Policy "geolocation=(), camera=(), microphone=()" always;
}
```

## Known, accepted tradeoff: token storage

The auth token lives in `localStorage`/`sessionStorage` (picked by
"Remember me"), not an httpOnly cookie. That's weaker than the RN app's
Keychain, which JavaScript can't read at all. The CSP above is what makes
this acceptable: with `script-src 'self'` and a locked `connect-src`, there's
no way for injected code to run *or* to phone the token to an attacker's
server, even if an XSS bug were found. The strongest fix — the backend
setting the token as an `httpOnly; Secure; SameSite=Strict` cookie on login,
instead of returning it in the JSON body — is a backend change, not
something fixable from these static pages.

## Needs the backend (not visible/fixable from this repo)

This session only has `manhajed/muslimedu` (the RN/PWA frontend) attached.
The layers below live in `manhaje.com`'s API and can't be verified or
applied from here — attach that repo to actually review/harden them:

- Rate limiting + brute-force lockout on `/login` and `/school_registration_submit`
- CORS allowlist scoped to the real deployed origin(s), not `*`
- Password hashing algorithm (bcrypt/argon2), token expiry + rotation
- Authorization checks on every endpoint (role can't be trusted from the client)
- Input validation/sanitization server-side (client-side checks here are UX only)
- File upload validation (ID/selfie in registration) — content-type sniffing,
  size limits, path traversal, virus scanning
- SQL injection surface — parameterized queries / ORM usage
- Secrets management (`.env` not exposed, not committed)
- WAF / DDoS protection at the edge
- Dependency CVE scanning, patch SLAs
- Audit logging + alerting for auth events
