# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

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

This tool operates **locally only**. It scaffolds markdown files into a repository.

- **Data touched:** Local filesystem only — copies markdown templates into `.claude/` directory, creates packet and verdict files
- **No network egress** — all operations are local file copies and writes
- **No secrets handling** — does not read, store, or transmit credentials
- **No telemetry** is collected or sent
