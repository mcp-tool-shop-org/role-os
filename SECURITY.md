# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |
| < 2.0   | No        |

## Reporting a Vulnerability

Email: **64996768+mcp-tool-shop@users.noreply.github.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Version affected
- Potential impact

### Response timeline

| Action | Target |
|--------|--------|
| Acknowledge report | 48 hours |
| Assess severity | 7 days |
| Release fix | 30 days |

## Scope

Role OS is a CLI that scaffolds role contracts, routes work, and runs persistent multi-step missions in a repository. By default it operates on the **local filesystem only**.

- **Data touched (default):** Local filesystem only — copies markdown templates into the `.claude/` directory; creates packet, verdict, run, manifest, and hook files
- **No network egress by default** — default operation makes no network requests
- **No secrets handling** — does not read, store, or transmit credentials
- **No telemetry** is collected or sent

### Opt-in network paths

Three features perform network egress when explicitly enabled. All are **off by default** and fail open to local deterministic behavior:

| Feature | How enabled | What is transmitted, and where |
|---------|-------------|--------------------------------|
| Citation gate (`roleos verify-citations`) | Running the command (requires the external `prism` CLI) | Citation identifiers/URLs from the artifact, resolved against public arXiv/Crossref APIs by `prism` |
| Specialist tier | Registering a specialist with a `backend_url` in `.role-os/specialists.json` | Dispatch prompts/step context POSTed to the configured `backend_url` (typically a local model endpoint) |
| Budget / conformance consult | `ROLEOS_BUDGET_CONSULT=1` / `ROLEOS_CONFORMANCE_CONSULT=1` | Step or tool-call context sent over HTTP to the configured local model endpoint for an advisory verdict |

Vulnerability reports for these paths (the HTTP client in `src/specialist/`, the `prism` shell-out in `src/verify-citations.mjs`, and the consult endpoints) are in scope.
