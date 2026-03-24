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
