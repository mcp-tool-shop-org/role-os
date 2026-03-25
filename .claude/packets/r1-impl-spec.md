## Acceptance Criteria
AC-1: `roleos artifacts` with no args lists all roles with contracts (20 roles)
AC-2: `roleos artifacts show <role>` displays contract fields: type, required sections, optional sections, evidence, consumers, completion rule
AC-3: `roleos artifacts show` with unknown role outputs structured error with hint
AC-4: `roleos artifacts validate <role> <file>` reads file, runs validateArtifact, shows pass/fail with missing sections
AC-5: `roleos artifacts validate` with missing file outputs structured error
AC-6: `roleos artifacts chain <pack>` shows pack handoff flow with role → artifact → consumer chain
AC-7: `roleos artifacts chain` with unknown pack outputs structured error with hint

## Edge Cases
- Role name with spaces ("Product Strategist") vs slug ("product-strategist") — accept both
- Validate against a file that has all sections but is very thin (< 5 lines) — should warn
- Chain for a pack where not all roles have contracts (e.g., Dependency Auditor in security pack has a metadata-audit contract from Metadata Curator role, not its own) — show the gap

## Interface Spec
- New file: src/artifacts-cmd.mjs
- New command in bin/roleos.mjs: case "artifacts"
- Uses: getArtifactContract, validateArtifact, getHandoffContract, formatArtifactValidation, formatPackChain from artifacts.mjs
- Error shape: { code, message, hint, retryable: false } matching existing pattern
