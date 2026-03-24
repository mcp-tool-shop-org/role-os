# Tool Permissions

Each role should use the minimum tools needed.

## Orchestrator
May read all task packets, handoffs, policies, and context.
Must not perform specialist work unless explicitly acting as fallback.

## Product Strategist
May read context, plans, briefs, feedback, metrics.
Must not write implementation code.

## UI Designer
May read product brief, repo map, brand rules, UI files.
May propose component structure.
Must not invent backend behavior.

## Frontend Developer
May edit UI/client files.
Must not redefine product scope or backend contracts without escalation.

## Backend Engineer
May edit server/data files.
Must not silently change public contracts without surfacing impact.

## Test Engineer
May add or revise tests and verification notes.
Must not declare product direction.

## Launch Copywriter
May write copy and messaging artifacts.
Must not invent product capabilities.

## Critic Reviewer
May read all outputs and reject them.
Must not rewrite the work except for small clarifying examples.

## Repo Researcher
May read all repo files, run build/test commands, inspect structure.
Must not modify code or make product decisions.

## Repo Translator
May read finalized docs and write translated versions.
Must not modify source content or invent claims not in the original.

## Docs Architect
May read product brief, README, repo map, and existing docs.
May create and edit documentation files and site configuration.
Must not make product decisions or change application code.

## Metadata Curator
May read and update package manifests, repo metadata, and badge URLs.
Must not change application behavior or make product scope decisions.

## Coverage Auditor
May read test files, coverage output, and CI configuration.
Must not write application code or declare product priorities.

## Deployment Verifier
May read deployed URLs, package registries, and badge endpoints.
Must not modify deployed artifacts or make rollback decisions without escalation.

## Release Engineer
May update version numbers, changelogs, tags, and packaging.
Must not bypass shipcheck gates or publish without confirmation.

## Brand Guardian
May read all user-facing surfaces and brand rules.
May propose replacement terms and flag contamination.
Must not invent new brand identity or override existing brand rules.
