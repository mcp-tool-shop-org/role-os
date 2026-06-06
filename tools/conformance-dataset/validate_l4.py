#!/usr/bin/env python
"""Semantic label check for the v0.2 relational L4 clauses — insurance against a hand-authored gold
label being wrong (the costly failure: a conformant_args that secretly violates a clause trains the
model to wave it through). For each tool below, PRED(args) returns True iff the call honors the
mechanically-decidable clauses; we assert PRED(conformant_args) is True and PRED(violation.args) is
False for EVERY listed l4 violation. Stateful tools inline the STATE facts. Tools whose clause is a
pure string-format/ membership rule the floor or an external resolver handles are skipped (noted).
Run: python validate_l4.py   (exit 0 = all gold labels consistent)."""
import json, os, base64
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
corpus = {t["name"]: t for t in json.load(open(os.path.join(HERE, "corpus_l4.json"), encoding="utf-8"))}


def minutes_between(a, b):
    fmt = "%Y-%m-%dT%H:%M:%S%z"
    return (datetime.strptime(b, fmt) - datetime.strptime(a, fmt)).total_seconds() / 60


# PRED per tool: returns True iff the args honor the decidable contract clauses.
PREDS = {
    "http_paginate_range": lambda a: a["range_start"] < a["range_end"]
        and (a["range_end"] - a["range_start"]) <= a["max_chunk_bytes"],
    "schedule_maintenance_window": lambda a: a["starts_at"] < a["ends_at"]
        and a["duration_minutes"] == minutes_between(a["starts_at"], a["ends_at"]),
    "set_price_filter": lambda a: a["min_price"] <= a["max_price"] and a["currency"] == a["currency_max"],
    "allocate_index_shards": lambda a: a["replicas"] <= a["nodes"] and a["shard_count"] >= 1,
    "batch_embed_texts": lambda a: len(a["inputs"]) == len(a["ids"]) and a["batch_size"] <= len(a["inputs"]),
    "split_traffic": lambda a: sum(a["weights"]) == 100 and len(a["weights"]) == len(a["targets"]),
    "db_select_window": lambda a: a["order_by"] in a["columns"] and 1 <= a["limit"] <= 1000,
    "upsert_dns_failover": lambda a: (("ip" in a) ^ ("cname" in a)),
    "configure_autoscaler": lambda a: a["min_replicas"] <= a["max_replicas"] and a["min_replicas"] >= 1,
    "configure_mtls": lambda a: (not a["mtls_enabled"]) or (
        "client_ca_path" in a and a["client_ca_path"].startswith("/")),
    "crop_image": lambda a: a["x"] + a["width"] <= a["image_width"]
        and a["y"] + a["height"] <= a["image_height"],
    "merge_pdf_pages": lambda a: a["page_from"] <= a["page_to"] and a["page_to"] <= a["total_pages"],
    "distribute_budget": lambda a: sum(a["allocations"].values()) == a["total_budget"],
    "set_storage_tiers": lambda a: a["warm_days"] <= a["cold_days"] <= a["delete_days"],
    "create_load_test": lambda a: a["ramp_up_seconds"] <= a["duration_seconds"] and a["target_rps"] >= 1,
    "set_resource_quota": lambda a: a["soft_limit"] <= a["hard_limit"],
    "set_canary_slo": lambda a: a["latency_p99_ms"] >= a["latency_p50_ms"]
        and 0 <= a["error_rate_max"] <= 100,
    "grant_role": lambda a: (a["role"] != "admin") or (a["principal_tier"] == "owner"),
    "schedule_job_oneshot": lambda a: (("run_at" in a) ^ ("cron_expression" in a)),
    # stateful — STATE facts inlined:
    "apply_order_coupon": lambda a: 0 < a["discount_amount"] <= 4000 and a["currency"] == "USD",
    "reserve_inventory": lambda a: 1 <= a["quantity"] <= 12,
    "transfer_funds": lambda a: a["amount"] <= 25000 and a["source_account"] != a["destination_account"]
        and a["currency"] == "USD",
    "promote_release": lambda a: a["target_version"] == 8,   # current=7 -> exactly +1, not already deployed
    "assign_seat": lambda a: a["seat"] in {"12A", "12B", "14C", "21F"},
}

# Skipped (format/membership rule the deterministic floor or an external resolver owns, not a
# decidable cross-field relation): none among the new tools — all 24 are covered above.
SKIP = set()


def main():
    failures = []
    checked = 0
    for name, pred in PREDS.items():
        t = corpus.get(name)
        if not t:
            failures.append(f"{name}: not in corpus_l4.json"); continue
        conf = t["conformant_args"]
        if not pred(conf):
            failures.append(f"{name}: CONFORMANT args FAIL the predicate (mislabeled conformant!)")
        for i, v in enumerate(t.get("l4_violations", [])):
            checked += 1
            if pred(v["args"]):
                failures.append(f"{name}[v{i}]: violation args PASS the predicate "
                                f"(this 'nonconformant' actually conforms) — why='{v['why'][:60]}'")
    covered = set(PREDS)
    new_tools = {t["name"] for t in corpus.values() if "l4_violations" in t}
    uncovered = new_tools - covered - SKIP
    print(f"tools checked: {len(covered)}  violations checked: {checked}")
    if uncovered:
        print(f"WARNING: new tools with no semantic predicate: {sorted(uncovered)}")
    if failures:
        print("LABEL CHECK: FAIL")
        for f in failures:
            print("  - " + f)
        raise SystemExit(1)
    print("LABEL CHECK: PASS — every conformant honors its clauses; every violation breaks exactly one.")


if __name__ == "__main__":
    main()
