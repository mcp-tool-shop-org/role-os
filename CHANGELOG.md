# Changelog

## 1.0.2

### Fixed
- Fix double-nested `.claude/.claude/` directory created by `roleos init` — `starter-pack/.claude/workflows/full-treatment.md` moved to `starter-pack/workflows/`
- Read VERSION from `package.json` at runtime instead of hardcoded constant — prevents version drift between CLI and package metadata

### Added
- `roleos init --force` — update canonical scaffolded files while always protecting user-filled `context/` files
- 4 regression tests: no double-nesting, correct workflow placement, version sync, --force context protection

## 1.0.0

### Added
- `roleos init` — scaffold Role OS starter pack into `.claude/`
- `roleos packet new <type>` — create feature, integration, or identity packets
- `roleos route <packet-file>` — recommend smallest valid role chain with dependency verification
- `roleos review <packet-file> <verdict>` — record accept/reject/blocked verdicts
- Full starter pack: 8 role contracts, 3 schemas, 4 policies, 3 workflows
- Guided context templates with inline prompts
- 3 canonical example packets (feature, integration, identity)
- Adoption handbook
