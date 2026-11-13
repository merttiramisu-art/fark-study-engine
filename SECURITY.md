# Security Policy

**FARK Study Engine** is a zero-dependency, offline-first library and browser lab. By design:

- Core modules collect no telemetry, make no network requests, and store no credentials or student PII.
- Optional CSV export provides `{ escapeFormulas: true }` (`--escape-formulas` on the CLI) to neutralize spreadsheet formula injection (`=`, `+`, `-`, `@`, tab, CR).
- The local demo server (`examples/serve-web.js`) binds only to `127.0.0.1`, serves an explicit allowlist of static files, and sets `Content-Security-Policy` headers blocking external origins and `connect-src 'none'`.
- All deck parsers (`portable`, `csv`, `markdown`, `interchange` TSV) enforce strict size bounds (`PORTABLE_LIMITS`) and schema validation.

## Reporting a Vulnerability

If you discover a security issue—such as path traversal in `examples/serve-web.js`, prototype pollution or denial-of-service in deck parsers, XSS in the browser UI/Web Component, or unsafe input handling in `fark mcp`—please do **not** publish exploit details on a public issue first.

Instead:
1. Open a private GitHub Security Advisory via **Security → Advisories → Report a vulnerability** in this repository, or
2. Include a minimal reproduction, affected version, Node.js version, and expected vs actual behavior.

Supported version line: current minor series (`0.5.x`).
