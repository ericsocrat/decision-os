# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email the maintainers or use GitHub's private vulnerability reporting feature
3. Include a description of the vulnerability, steps to reproduce, and potential impact
4. Allow up to 72 hours for an initial response

## Security Practices

- **No secrets in code**: All sensitive values use environment variables
- **Input validation**: All user input is validated and sanitized before processing
- **Input sanitization**: Dedicated `sanitize.ts` module strips control characters, enforces length limits
- **No server-side data**: MVP uses localStorage only (client-side)
- **Dependencies**: We regularly audit dependencies with `npm audit` (0 vulnerabilities)
- **No external data fetching**: The app does not scrape or fetch external data
- **CSP headers**: Strict Content-Security-Policy with `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`
- **XSS prevention**: React's default escaping + input sanitization on import/share boundaries
- **Error handling**: Production error messages are generic (no stack trace leakage)
- **Security headers**: HSTS (2-year), X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy

## Security Audit

A comprehensive OWASP Top 10 security audit has been conducted. See [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) for the full report with findings, severity ratings, and remediation status.

## Dependency Updates

We use Dependabot (when configured) to keep dependencies up to date. Critical security patches are applied within 48 hours.
