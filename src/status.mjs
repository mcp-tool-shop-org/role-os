import { existsSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { readFileSafe, writeFileSafe } from "./fs-utils.mjs";

// --- Parsers ---

function parsePacket(filePath) {
  const content = readFileSafe(filePath);
  if (!content) return null;

  const get = (heading) => {
    const re = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |\\n---|$)`);
    const m = content.match(re);
    return m ? m[1].trim() : null;
  };

  const taskId = get("Task ID");
  const title = get("Title");
  const type = get("Packet Type");
  const openQuestions = get("Open Questions");
  const assignedRole = get("Assigned Role");

  const hasContent = taskId || title;
  if (!hasContent) return { malformed: true, file: basename(filePath) };

  // Check for companion verdict
  const verdictPath = filePath.replace(/\.md$/, ".verdict.md");
  const verdict = parseVerdict(verdictPath);

  const hasBlockers = openQuestions &&
    !openQuestions.startsWith("<!--") &&
    openQuestions.length > 0;

  return {
    file: basename(filePath),
    taskId: taskId || basename(filePath, ".md"),
    title: title || "(untitled)",
    type: type || "unknown",
    assignedRole: assignedRole && !assignedRole.startsWith("<!--") ? assignedRole : null,
    openQuestions: hasBlockers ? openQuestions : null,
    verdict,
    status: verdict ? (verdict.verdict === "accept" || verdict.verdict === "accept-with-notes" ? "completed" : verdict.verdict) : "active",
  };
}

function parseVerdict(filePath) {
  const content = readFileSafe(filePath);
  if (!content) return null;

  const get = (heading) => {
    const re = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`);
    const m = content.match(re);
    return m ? m[1].trim() : null;
  };

  const verdict = get("Verdict");
  const reviewer = get("Reviewer");
  const why = get("Why");
  const taskId = get("Task ID");
  const nextOwner = get("Next Owner");

  if (!verdict) return { malformed: true, file: basename(filePath) };

  return {
    file: basename(filePath),
    taskId,
    verdict,
    reviewer: reviewer || "unknown",
    why: why || "",
    nextOwner: nextOwner || null,
  };
}

// --- Data collection ---

function collectPackets(claudeDir) {
  const packetsDir = join(claudeDir, "packets");
  if (!existsSync(packetsDir)) return [];

  const files = readdirSync(packetsDir)
    .filter((f) => f.endsWith(".md") && !f.endsWith(".verdict.md"))
    .sort();

  return files
    .map((f) => parsePacket(join(packetsDir, f)))
    .filter(Boolean);
}

function checkContextHealth(claudeDir) {
  const contextFiles = [
    "context/product-brief.md",
    "context/repo-map.md",
    "context/current-priorities.md",
    "context/brand-rules.md",
  ];

  return contextFiles.map((f) => ({
    file: f,
    exists: existsSync(join(claudeDir, f)),
  }));
}

function checkSpineHealth(claudeDir) {
  const checks = [
    "agents/core/orchestrator.md",
    "agents/core/critic-reviewer.md",
    "schemas/task-packet.md",
    "policy/done-definition.md",
    "workflows/ship-feature.md",
  ];

  return checks.map((f) => ({
    file: f,
    exists: existsSync(join(claudeDir, f)),
  }));
}

// --- Health warnings ---

function getWarnings(packets, contextHealth, spineHealth) {
  const warnings = [];

  // Missing context files
  for (const c of contextHealth) {
    if (!c.exists) warnings.push(`Missing context: ${c.file}`);
  }

  // Missing spine files
  for (const s of spineHealth) {
    if (!s.exists) warnings.push(`Missing spine: ${s.file}`);
  }

  // Malformed packets
  for (const p of packets) {
    if (p.malformed) warnings.push(`Malformed packet: ${p.file}`);
  }

  // Active packets with no review
  const active = packets.filter((p) => !p.malformed && p.status === "active");
  if (active.length > 3) {
    warnings.push(`${active.length} active packets — consider reviewing before adding more`);
  }

  // Verdicts for missing packets (orphaned verdict files)
  const packetsDir = join(".", ".claude", "packets");
  if (existsSync(packetsDir)) {
    const verdictFiles = readdirSync(packetsDir).filter((f) => f.endsWith(".verdict.md"));
    for (const vf of verdictFiles) {
      const packetFile = vf.replace(".verdict.md", ".md");
      if (!existsSync(join(packetsDir, packetFile))) {
        warnings.push(`Orphaned verdict: ${vf} (no matching packet)`);
      }
    }
  }

  // No work at all
  if (packets.length === 0) {
    warnings.push("No packets found — create one with 'roleos packet new feature'");
  }

  return warnings;
}

// --- Output formatters ---

function formatTerminal(data) {
  const lines = [];
  lines.push("roleos status\n");

  // Active packets
  const active = data.packets.filter((p) => !p.malformed && p.status === "active");
  lines.push(`Active packets: ${active.length}`);
  if (active.length > 0) {
    for (const p of active) {
      const role = p.assignedRole ? ` [${p.assignedRole}]` : "";
      lines.push(`  - ${p.title} (${p.type})${role}`);
      if (p.openQuestions) {
        lines.push(`    Open: ${p.openQuestions.split("\n")[0].slice(0, 80)}`);
      }
    }
  }
  lines.push("");

  // Blocked/rejected
  const blocked = data.packets.filter((p) => !p.malformed && (p.status === "blocked" || p.status === "reject"));
  if (blocked.length > 0) {
    lines.push(`Blocked/rejected: ${blocked.length}`);
    for (const p of blocked) {
      const why = p.verdict?.why ? ` — ${p.verdict.why.split("\n")[0].slice(0, 60)}` : "";
      lines.push(`  - ${p.title}${why}`);
    }
    lines.push("");
  }

  // Recent verdicts
  const withVerdicts = data.packets.filter((p) => !p.malformed && p.verdict && !p.verdict.malformed);
  if (withVerdicts.length > 0) {
    lines.push(`Recent verdicts: ${withVerdicts.length}`);
    const recent = withVerdicts.slice(-5);
    for (const p of recent) {
      const v = p.verdict;
      lines.push(`  - ${p.title}: ${v.verdict} (${v.reviewer})`);
    }
    lines.push("");
  }

  // Completed
  const completed = data.packets.filter((p) => !p.malformed && p.status === "completed");
  if (completed.length > 0) {
    lines.push(`Completed: ${completed.length}`);
    lines.push("");
  }

  // Context health
  const missingContext = data.contextHealth.filter((c) => !c.exists);
  if (missingContext.length > 0) {
    lines.push(`Context: ${data.contextHealth.length - missingContext.length}/${data.contextHealth.length} present`);
  } else {
    lines.push(`Context: all ${data.contextHealth.length} files present`);
  }
  lines.push("");

  // Warnings
  if (data.warnings.length > 0) {
    lines.push("Warnings:");
    for (const w of data.warnings) {
      lines.push(`  ! ${w}`);
    }
    lines.push("");
  }

  // Summary
  const total = data.packets.filter((p) => !p.malformed).length;
  lines.push(`Total: ${total} packet(s) — ${active.length} active, ${completed.length} completed, ${blocked.length} blocked/rejected`);

  return lines.join("\n");
}

function formatMarkdown(data) {
  const lines = [];
  const ts = new Date().toISOString().replace("T", " ").split(".")[0] + " UTC";
  lines.push(`# Status\n`);
  lines.push(`Generated: ${ts}\n`);

  // Active
  const active = data.packets.filter((p) => !p.malformed && p.status === "active");
  lines.push(`## Active Packets`);
  if (active.length === 0) {
    lines.push("None\n");
  } else {
    for (const p of active) {
      const role = p.assignedRole ? ` — ${p.assignedRole}` : "";
      lines.push(`- **${p.title}** (${p.type})${role}`);
      if (p.openQuestions) {
        lines.push(`  - Open: ${p.openQuestions.split("\n")[0]}`);
      }
    }
    lines.push("");
  }

  // Blockers
  const blocked = data.packets.filter((p) => !p.malformed && (p.status === "blocked" || p.status === "reject"));
  lines.push(`## Blockers`);
  if (blocked.length === 0) {
    lines.push("None\n");
  } else {
    for (const p of blocked) {
      const why = p.verdict?.why ? `: ${p.verdict.why.split("\n")[0]}` : "";
      lines.push(`- **${p.title}**${why}`);
    }
    lines.push("");
  }

  // Recent verdicts
  const withVerdicts = data.packets.filter((p) => !p.malformed && p.verdict && !p.verdict.malformed);
  lines.push(`## Recent Verdicts`);
  if (withVerdicts.length === 0) {
    lines.push("None\n");
  } else {
    for (const p of withVerdicts.slice(-5)) {
      lines.push(`- **${p.title}**: ${p.verdict.verdict} (${p.verdict.reviewer})`);
    }
    lines.push("");
  }

  // Completed
  const completed = data.packets.filter((p) => !p.malformed && p.status === "completed");
  lines.push(`## Completed`);
  if (completed.length === 0) {
    lines.push("None\n");
  } else {
    for (const p of completed) {
      lines.push(`- ${p.title} (${p.type})`);
    }
    lines.push("");
  }

  // Context health
  lines.push(`## Context Health`);
  for (const c of data.contextHealth) {
    lines.push(`- ${c.exists ? "+" : "!"} ${c.file}`);
  }
  lines.push("");

  // Warnings
  if (data.warnings.length > 0) {
    lines.push(`## Warnings`);
    for (const w of data.warnings) {
      lines.push(`- ${w}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// --- Command ---

export async function statusCommand(args) {
  const claudeDir = join(".", ".claude");

  if (!existsSync(claudeDir)) {
    const err = new Error("No .claude/ directory found. Run 'roleos init' first.");
    err.exitCode = 1;
    err.hint = "Run 'roleos init' to scaffold Role OS.";
    throw err;
  }

  const packets = collectPackets(claudeDir);
  const contextHealth = checkContextHealth(claudeDir);
  const spineHealth = checkSpineHealth(claudeDir);
  const warnings = getWarnings(packets, contextHealth, spineHealth);

  const data = { packets, contextHealth, spineHealth, warnings };

  const isJson = args.includes("--json");
  const isWrite = args.includes("--write");

  if (isJson) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(formatTerminal(data));

  if (isWrite) {
    const statusDir = join(claudeDir, "status");
    const indexPath = join(statusDir, "index.md");
    writeFileSafe(indexPath, formatMarkdown(data), { force: true });
    console.log(`\nWritten: .claude/status/index.md`);
  }
}
