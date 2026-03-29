/**
 * Tool Profiles — per-role tool sandboxing.
 *
 * Extracted to a shared module so that both dispatch.mjs and trial.mjs
 * can import it without creating a circular dependency.
 */

export const TOOL_PROFILES = {
  // Core
  "Orchestrator":         ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
  "Product Strategist":   ["Read", "Glob", "Grep", "Write"],
  "Critic Reviewer":      ["Read", "Glob", "Grep", "Bash"],

  // Design
  "UI Designer":          ["Read", "Glob", "Grep", "Write", "Edit"],
  "Brand Guardian":       ["Read", "Glob", "Grep"],

  // Engineering
  "Backend Engineer":     ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
  "Frontend Developer":   ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
  "Test Engineer":        ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
  "Performance Engineer": ["Read", "Glob", "Grep", "Bash"],
  "Refactor Engineer":    ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
  "Security Reviewer":    ["Read", "Glob", "Grep", "Bash"],
  "Dependency Auditor":   ["Read", "Glob", "Grep", "Bash"],

  // Treatment
  "Repo Researcher":      ["Read", "Glob", "Grep", "Bash"],
  "Repo Translator":      ["Read", "Glob", "Grep", "Write", "Edit"],
  "Docs Architect":       ["Read", "Glob", "Grep", "Write", "Edit"],
  "Metadata Curator":     ["Read", "Glob", "Grep", "Write", "Edit"],
  "Coverage Auditor":     ["Read", "Glob", "Grep", "Bash"],
  "Deployment Verifier":  ["Read", "Glob", "Grep", "Bash"],
  "Release Engineer":     ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],

  // Growth / Marketing
  "Launch Strategist":    ["Read", "Glob", "Grep", "Write"],
  "Content Strategist":   ["Read", "Glob", "Grep", "Write"],
  "Community Manager":    ["Read", "Glob", "Grep", "Write"],
  "Support Triage Lead":  ["Read", "Glob", "Grep", "Write"],
  "Launch Copywriter":    ["Read", "Glob", "Grep", "Write", "Edit"],

  // Product
  "Feedback Synthesizer": ["Read", "Glob", "Grep"],
  "Roadmap Prioritizer":  ["Read", "Glob", "Grep", "Write"],
  "Spec Writer":          ["Read", "Glob", "Grep", "Write", "Edit"],

  // Research
  "UX Researcher":        ["Read", "Glob", "Grep"],
  "Competitive Analyst":  ["Read", "Glob", "Grep"],
  "Trend Researcher":     ["Read", "Glob", "Grep"],
  "User Interview Synthesizer": ["Read", "Glob", "Grep"],

  // Brainstorm
  "Context Scout":        ["Read", "Glob", "Grep"],
  "User Value Scout":     ["Read", "Glob", "Grep"],
  "Creative Leap Scout":  ["Read", "Glob", "Grep"],
  "Normalizer":           ["Read", "Glob", "Grep"],
  "Synthesizer":          ["Read", "Glob", "Grep", "Write"],
  "Product Expander":     ["Read", "Glob", "Grep", "Write"],
  "Judge":                ["Read", "Glob", "Grep"],
  "Mechanics Scout":      ["Read", "Glob", "Grep"],
  "Market Scout":         ["Read", "Glob", "Grep"],
  "Contrarian Scout":     ["Read", "Glob", "Grep"],
  "Feasibility Scout":    ["Read", "Glob", "Grep"],
  "Quality Bar Scout":    ["Read", "Glob", "Grep"],
  "Scenario Expander":    ["Read", "Glob", "Grep", "Write"],
  "Moat Expander":        ["Read", "Glob", "Grep", "Write"],

  // Brainstorm v0.3 analysts
  "Context Analyst":      ["Read", "Glob", "Grep"],
  "User Value Analyst":   ["Read", "Glob", "Grep"],
  "Mechanics Analyst":    ["Read", "Glob", "Grep"],
  "Positioning Analyst":  ["Read", "Glob", "Grep"],
  "Contrarian Analyst":   ["Read", "Glob", "Grep"],

  // Deep Audit
  "Component Auditor":    ["Read", "Glob", "Grep"],
  "Seam Auditor":         ["Read", "Glob", "Grep"],
  "Test Truth Auditor":   ["Read", "Glob", "Grep"],
  "Audit Synthesizer":    ["Read", "Glob", "Grep", "Write"],

  // Dogfood Swarm
  "Swarm Coordinator":    ["Read", "Glob", "Grep", "Bash", "Write"],
  "Swarm Backend Agent":  ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
  "Swarm Bridge Agent":   ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
  "Swarm Tests Agent":    ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
  "Swarm Infra Agent":    ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
  "Swarm Frontend Agent": ["Read", "Glob", "Grep", "Bash", "Write", "Edit"],
  "Swarm Synthesizer":    ["Read", "Glob", "Grep", "Bash", "Write"],
};
