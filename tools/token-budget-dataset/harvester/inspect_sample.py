"""Milestone runner: locate -> parse(agent sample) -> join, and REPORT.
Inspect the join quality BEFORE scaling. Writes nothing. Read-only.

Run:  python -m harvester.inspect_sample [N]   (from tools/token-budget-dataset/)
"""
import collections
import sys

from . import locate, parse_transcripts, parse_outcomes, join


def main(n=150):
    print("=== locate.summary() ===")
    for k, v in locate.summary().items():
        print(f"  {k}: {v}")

    swarm = parse_outcomes.load_swarm_outcomes()
    idx = join.build_swarm_index(swarm)
    print(f"\n=== swarm outcomes loaded: {len(swarm)} agent_runs ===")
    print("  repos covered by swarm DB:", sorted({r['repo_base'] for r in swarm}))
    print("  outcome distribution:", dict(collections.Counter(r['outcome'] for r in swarm)))
    print("  domains:", sorted({r['domain_name'] for r in swarm})[:20])

    files = locate.agent_transcripts()
    sample = files[:: max(1, len(files) // n)][:n]
    print(f"\n=== parsing {len(sample)} sampled agent transcripts ===")

    disp_repos = collections.Counter()
    conf_dist = collections.Counter()
    outcome_dist = collections.Counter()
    examples = []
    parsed = 0
    for fp in sample:
        d = parse_transcripts.parse_agent_transcript(fp)
        if not d:
            continue
        parsed += 1
        disp_repos[_repo_base(d.get("cwd"))] += 1
        jr = join.join_dispatch(d, idx)
        conf_dist[jr["join_confidence"]] += 1
        outcome_dist[jr["outcome"]] += 1
        if jr["join_confidence"] in ("exact", "probable") and len(examples) < 5:
            examples.append((d, jr))

    print(f"  parsed ok: {parsed}/{len(sample)}")
    print("  dispatch repos (top 12):", dict(disp_repos.most_common(12)))
    print("  JOIN CONFIDENCE distribution:", dict(conf_dist))
    print("  joined OUTCOME distribution:", dict(outcome_dist))

    print("\n=== example confident joins (task preview redacted to 80 chars) ===")
    for d, jr in examples:
        print(f"  dispatch={d['dispatch_id'][:18]} repo={_repo_base(d.get('cwd'))} "
              f"role={d.get('role')} sig={d['complexity_signals']}")
        print(f"     tokens_used={d['tokens_used']} ctx={d['context_tokens']} "
              f"peak={d['peak_context_tokens']} tier={d['tier_used']} stop={d['final_stop_reason']}")
        print(f"     -> outcome={jr['outcome']} conf={jr['join_confidence']} matched={jr['matched']}")
        print(f"     task: {d['task_text'][:80]!r}")

    # repo overlap: how many dispatch repos exist in the swarm DB at all
    swarm_repos = {r['repo_base'] for r in swarm}
    overlap = [r for r in disp_repos if r in swarm_repos]
    print(f"\n=== repo overlap (dispatch repo also in swarm DB): {overlap} ===")
    print("  (no overlap => fuzzy join cannot fire; expected for non-swarm dispatches)")


def _repo_base(path):
    if not path:
        return None
    return path.replace("\\", "/").rstrip("/").split("/")[-1]


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 150)
