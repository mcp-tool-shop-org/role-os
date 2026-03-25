# Pack vs Free Routing + Misfit Honesty — Final Verdicts

**Date:** 2026-03-25

---

## Pass 1: Pack vs Free Routing (7 comparisons)

| Task | Pack | Verdict | Why |
|------|------|---------|-----|
| Feature build (`roleos diff`) | Feature | **Pack wins** | Strategist + Spec Writer prevent Backend Engineer escalation on ambiguous scope |
| Bugfix (`status --json` empty) | Bugfix | **Free routing wins** | Clear scope, Orchestrator adds no value. Free routing correctly drops it. |
| Security review (`init --force` traversal) | Security | **Free routing wins (narrow)** | Single-domain, Orchestrator is overhead. Same 3-role chain minus one step. |
| Docs (troubleshooting page) | Docs | **Free routing wins** | Task needs triage interpretation first — pack opens with wrong role |
| Launch (v1.1.0 announcement) | Launch | **Tie (marginal pack edge)** | Pack proven for this exact task. Free routing produces equivalent chain. |
| Research (add `execute` command?) | Research | **Free routing wins (small)** | Task needs Product Strategist framing first, pack opens with UX Researcher |
| Treatment (pre-release audit) | Treatment | **Free routing wins** | Pack omits Security Reviewer. Free routing adds the security pass. |

**Score: Pack wins 1, Free routing wins 4, Ties 1, Narrow pack loss 1**

### The Pattern

**Packs win when:** The task has genuine scope ambiguity or cross-functional handoffs that free routing's keyword scoring would underweight. The Feature pack's value is in the Product Strategist and Spec Writer — roles that prevent downstream escalation.

**Free routing wins when:** The task is clearly scoped to a single domain OR requires an upstream step the pack didn't anticipate. Free routing's dynamic scoring correctly drops Orchestrator on single-specialist tasks and adds roles the pack missed.

**The Orchestrator problem:** Every pack includes Orchestrator by default. For clearly scoped tasks (bugfix, security, docs), this adds a decomposition step that produces obvious output. Free routing's "Do Not Use When" rules correctly gate Orchestrator — packs do not.

---

## Pass 2: Misfit Honesty (7 wrong-pack trials)

| Pack | Wrong Task | First Role Catches? | Suggests Alt? | Verdict |
|------|-----------|---------------------|--------------|---------|
| Feature → security task | Partial | No | **PARTIAL BLUFF** |
| Bugfix → launch task | Yes | No | **HONEST FAIL** |
| Security → docs task | Yes | No | **HONEST FAIL** |
| Docs → research task | Partial | No | **PARTIAL BLUFF** |
| Launch → bugfix task | Yes | No | **HONEST FAIL** |
| Research → feature build | Yes | Partial | **PARTIAL BLUFF** |
| Treatment → launch copy | No | No | **FULL BLUFF** |

**Score: 3 honest fails, 3 partial bluffs, 1 full bluff**

### The Structural Gap

**No pack has a mechanism to suggest alternatives.** When a role detects a mismatch, it escalates to the user — but never says "use the Launch pack instead." The gap between "this isn't my work" and "here's who should do it" is entirely unstructured.

**The most dangerous misfits produce the most output.** Treatment on launch copy runs 7 roles and produces zero of what was requested. Docs on research creates structural artifacts for an unmade decision. Both are worse than Security on docs, which fails cleanly and early.

---

## Verdicts Per Pack

### Feature Pack — TRUE DEFAULT
- Wins its comparison against free routing
- Value is in preventing scope-ambiguity escalations
- Partial bluff on misfit (would try to "build" a security review)
- **Recommendation:** Keep as default for multi-role feature work. Add mismatch guard.

### Bugfix Pack — ACCELERATOR, not default
- Loses to free routing on its home turf (Orchestrator overhead)
- Honest fail on misfit
- **Recommendation:** Make Orchestrator conditional. For clear bugs, free routing is better.

### Security Pack — ACCELERATOR, not default
- Narrow loss to free routing (same chain minus Orchestrator)
- Honest fail on misfit
- **Recommendation:** Make Orchestrator conditional. The 3-role core chain is the real value.

### Docs Pack — NEEDS RETUNING
- Loses to free routing (wrong opening role for tasks needing upstream triage)
- Partial bluff on misfit
- **Recommendation:** Add a "does this task need upstream synthesis?" gate before Docs Architect.

### Launch Pack — TRUE DEFAULT (marginal)
- Ties/marginal win against free routing on its home turf
- Honest fail on misfit
- Proven in v1.1.0 launch trial (I-5)
- **Recommendation:** Keep as default. Smallest pack, cleanest pipeline.

### Research Pack — NEEDS RETUNING
- Loses to free routing (opens with UX Researcher when Product Strategist should frame first)
- Partial bluff on misfit (accidentally useful)
- **Recommendation:** Reorder: Product Strategist framing before research roles.

### Treatment Pack — NEEDS RETUNING (highest priority)
- Loses to free routing (omits Security Reviewer on repo with known HIGH findings)
- **FULL BLUFF on misfit** — runs 7 roles and produces zero of what was requested
- **Recommendation:** Add Security Reviewer to default lineup. Add mismatch detection at Repo Researcher.

---

## Should "Start From a Pack" Be the Main Product Path?

**No — not yet.**

The evidence says:
- Packs win **1 of 7** comparisons cleanly
- Free routing wins **4 of 7**
- Packs produce **1 full bluff** and **3 partial bluffs** on misfit tasks
- No pack has a mechanism to suggest alternatives

**Packs are accelerators, not defaults.** They're useful when:
1. The operator knows their task type (feature/bugfix/security/etc.)
2. The task cleanly matches the pack's assumptions
3. The operator doesn't need to think about role selection

**Free routing is the better default** because:
1. It respects "Do Not Use When" rules that packs ignore
2. It dynamically adjusts chain composition to task content
3. It adds roles packs miss (Security Reviewer in treatment)
4. It drops roles packs include unnecessarily (Orchestrator on clear tasks)

**The right product path:**
1. **Default: free routing** — `roleos route <packet>` remains the primary entry
2. **Packs as suggestions:** `roleos route` output includes "Suggested pack: feature (high confidence)" when the task matches a pack
3. **Packs as shortcuts:** `roleos route --pack feature` for operators who know their task type
4. **Pack mismatch guards:** Each pack's first role should carry a "if this is actually X, use Y instead" clause

### What Would Make Packs True Defaults

1. **Conditional Orchestrator** — only include when the task is genuinely multi-role and ambiguous
2. **Mismatch detection** — first role in each pack checks fit before executing
3. **Alternative suggestion** — mismatch detection names the correct pack, not just "escalate"
4. **Security-aware treatment** — Treatment pack must include Security Reviewer by default
5. **Research framing** — Research pack should open with Product Strategist, not UX Researcher
