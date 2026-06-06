#!/usr/bin/env python
"""v0.2 L4 corpus author — emits corpus_l4.json (the v0.2 delta the build applies over corpus_tools.json).

WHY: the v1 watcher certified 0.98/0.96 overall but L4 (semantic-contract) was the soft rung
(0.9 acc / 0.8 flip / 2 false-conformants of 10). The exam misses concentrate in TWO sub-classes:
  (1) cross-field RELATIONAL contracts — the verdict depends on COMPARING two arguments that are both
      present in the call (a<b ordering, len==n cardinality, a!=b distinctness, sum==cap, mutual
      exclusion, conditional co-requirement). v1 had relatively few of these and the model defaulted to
      single-value inspection.
  (2) REFERENTIAL contracts ("must reference an existing X", "later than now") that were NOT
      self-checkable from (contract + call) alone — the deciding state was invisible, so the example
      taught the model to bluff. refund_charge is literally one of the two exam false-conformants.

This file does both: ~24 NEW tools carrying many self-contained relational L4 clauses (multiple
`l4_violations` per tool — the generator emits one contrast group each), and STATE-fixes for the
underspecified referential tools (pull the canonical entry, add a `state` line carrying the operative
fact so the verdict is genuinely derivable). Every NEW tool's `conformant_args` satisfies ALL clauses
it probes; each violation differs minimally and breaks exactly one clause.

Run: python author_l4.py   ->   writes corpus_l4.json   (CPU, re-runnable, deterministic).
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))


def P(name, typ, required=False, **extra):
    d = {"name": name, "type": typ, "required": required}
    d.update(extra)
    return d


# ── NEW tools: self-contained cross-field RELATIONAL contracts (the measured weak class) ────────────
NEW = [
    {
        "name": "http_paginate_range", "domain": "http",
        "contract": ("Fetches a byte range of a remote resource. range_start must be < range_end (both "
                     ">= 0), and the requested span (range_end - range_start) must not exceed "
                     "max_chunk_bytes."),
        "params": [P("url", "string", True), P("range_start", "integer", True, max=1000000000),
                   P("range_end", "integer", True, max=1000000000),
                   P("max_chunk_bytes", "integer", True, max=1000000000)],
        "conformant_args": {"url": "https://cdn.example.com/build.bin", "range_start": 0,
                            "range_end": 1048576, "max_chunk_bytes": 2097152},
        "intent": "download the first ~1 MB chunk of a large remote file",
        "l4_violations": [
            {"args": {"url": "https://cdn.example.com/build.bin", "range_start": 2000,
                      "range_end": 1000, "max_chunk_bytes": 2097152},
             "why": "range_start (2000) is not less than range_end (1000); the contract requires "
                    "range_start < range_end, so the range is empty/inverted."},
            {"args": {"url": "https://cdn.example.com/build.bin", "range_start": 0,
                      "range_end": 5000000, "max_chunk_bytes": 2097152},
             "why": "the requested span 5000000 - 0 = 5000000 bytes exceeds max_chunk_bytes (2097152); "
                    "the contract caps a single range at max_chunk_bytes."},
        ],
        "l5_wrong_action": {"tool": "http_head", "args": {"url": "https://cdn.example.com/build.bin"},
                            "why": "a HEAD request returns only headers and downloads no bytes — it does "
                                   "not fetch the requested range."},
    },
    {
        "name": "schedule_maintenance_window", "domain": "scheduling",
        "contract": ("Schedules a maintenance window. starts_at must be strictly before ends_at (both "
                     "RFC 3339), and duration_minutes must equal the actual number of minutes between "
                     "starts_at and ends_at."),
        "params": [P("service", "string", True), P("starts_at", "string", True),
                   P("ends_at", "string", True), P("duration_minutes", "integer", True, max=10080)],
        "conformant_args": {"service": "payments-api", "starts_at": "2026-07-01T02:00:00Z",
                            "ends_at": "2026-07-01T03:00:00Z", "duration_minutes": 60},
        "intent": "book a one-hour maintenance window starting 02:00 UTC",
        "l4_violations": [
            {"args": {"service": "payments-api", "starts_at": "2026-07-01T03:00:00Z",
                      "ends_at": "2026-07-01T02:00:00Z", "duration_minutes": 60},
             "why": "ends_at (03:00) precedes starts_at... corrected: ends_at 02:00 precedes starts_at "
                    "03:00; the contract requires starts_at strictly before ends_at."},
            {"args": {"service": "payments-api", "starts_at": "2026-07-01T02:00:00Z",
                      "ends_at": "2026-07-01T03:00:00Z", "duration_minutes": 120},
             "why": "duration_minutes is 120 but the window from 02:00 to 03:00 is only 60 minutes; the "
                    "contract requires duration_minutes to equal the actual span."},
        ],
        "l5_wrong_action": {"tool": "cancel_maintenance_window",
                            "args": {"service": "payments-api", "window_id": "win_pending"},
                            "why": "cancelling a window is the opposite of scheduling one."},
    },
    {
        "name": "set_price_filter", "domain": "search",
        "contract": ("Sets a price-range search filter. min_price must be <= max_price, both must be "
                     ">= 0, and the currency on both bounds must be the same ISO-4217 code."),
        "params": [P("query", "string", True), P("min_price", "number", True),
                   P("max_price", "number", True), P("currency", "string", True),
                   P("currency_max", "string", True)],
        "conformant_args": {"query": "wireless headphones", "min_price": 50.0, "max_price": 300.0,
                            "currency": "USD", "currency_max": "USD"},
        "intent": "filter search results to the $50-$300 range",
        "l4_violations": [
            {"args": {"query": "wireless headphones", "min_price": 300.0, "max_price": 50.0,
                      "currency": "USD", "currency_max": "USD"},
             "why": "min_price (300) is greater than max_price (50); the contract requires "
                    "min_price <= max_price, so the range is empty."},
            {"args": {"query": "wireless headphones", "min_price": 50.0, "max_price": 300.0,
                      "currency": "USD", "currency_max": "EUR"},
             "why": "the lower bound is in USD but the upper bound is in EUR; the contract requires both "
                    "bounds to use the same currency, so the range is incoherent."},
        ],
        "l5_wrong_action": {"tool": "set_sort_order",
                            "args": {"query": "wireless headphones", "sort": "price_asc"},
                            "why": "sorting by price is not the same as constraining the price range the "
                                   "user asked to filter on."},
    },
    {
        "name": "allocate_index_shards", "domain": "search-infra",
        "contract": ("Allocates shards and replicas for a search index. replicas must be <= nodes (you "
                     "cannot place more replica copies than there are nodes), and shard_count must be "
                     ">= 1."),
        "params": [P("index", "string", True), P("nodes", "integer", True, max=1000),
                   P("shard_count", "integer", True, max=1024),
                   P("replicas", "integer", True, max=1000)],
        "conformant_args": {"index": "products-v3", "nodes": 5, "shard_count": 10, "replicas": 2},
        "intent": "create a products index with 2 replicas across the 5-node cluster",
        "l4_violations": [
            {"args": {"index": "products-v3", "nodes": 3, "shard_count": 10, "replicas": 5},
             "why": "replicas (5) exceeds nodes (3); the contract forbids more replica copies than "
                    "nodes, so at least two replicas would have to share a node."},
        ],
        "l5_wrong_action": {"tool": "delete_index", "args": {"index": "products-v3"},
                            "why": "deleting the index destroys it rather than allocating shards for it."},
    },
    {
        "name": "batch_embed_texts", "domain": "ml",
        "contract": ("Embeds a batch of texts. inputs and ids must have the same length (one id per "
                     "input), and batch_size must not exceed the number of inputs."),
        "params": [P("model", "string", True), P("inputs", "array", True), P("ids", "array", True),
                   P("batch_size", "integer", True, max=512)],
        "conformant_args": {"model": "text-embedding-3-small",
                            "inputs": ["alpha doc", "beta doc", "gamma doc"],
                            "ids": ["d1", "d2", "d3"], "batch_size": 2},
        "intent": "embed three documents, tagging each with its id",
        "l4_violations": [
            {"args": {"model": "text-embedding-3-small",
                      "inputs": ["alpha doc", "beta doc", "gamma doc"],
                      "ids": ["d1", "d2"], "batch_size": 2},
             "why": "ids has 2 entries but inputs has 3; the contract requires exactly one id per "
                    "input, so one document would be unlabelled."},
            {"args": {"model": "text-embedding-3-small",
                      "inputs": ["alpha doc", "beta doc", "gamma doc"],
                      "ids": ["d1", "d2", "d3"], "batch_size": 8},
             "why": "batch_size (8) exceeds the number of inputs (3); the contract requires "
                    "batch_size <= len(inputs)."},
        ],
        "l5_wrong_action": {"tool": "rerank_documents",
                            "args": {"model": "rerank-v3", "query": "alpha",
                                     "documents": ["alpha doc", "beta doc", "gamma doc"], "top_n": 3},
                            "why": "reranking scores documents against a query; it does not produce the "
                                   "embedding vectors the intent asks for."},
    },
    {
        "name": "split_traffic", "domain": "devops",
        "contract": ("Splits inbound traffic across deploy targets. weights must sum to exactly 100, "
                     "each weight is in 0..100, and weights must have the same length as targets (one "
                     "weight per target)."),
        "params": [P("route", "string", True), P("targets", "array", True), P("weights", "array", True)],
        "conformant_args": {"route": "api.example.com", "targets": ["blue", "green"],
                            "weights": [60, 40]},
        "intent": "send 60% of traffic to blue and 40% to green",
        "l4_violations": [
            {"args": {"route": "api.example.com", "targets": ["blue", "green"], "weights": [60, 30]},
             "why": "the weights sum to 90, not 100; the contract requires the split to total 100% so "
                    "10% of traffic would be unrouted."},
            {"args": {"route": "api.example.com", "targets": ["blue", "green"],
                      "weights": [50, 30, 20]},
             "why": "weights has 3 entries but targets has 2; the contract requires one weight per "
                    "target."},
        ],
        "l5_wrong_action": {"tool": "drain_target", "args": {"route": "api.example.com",
                                                             "target": "green"},
                            "why": "draining a target removes it from rotation rather than splitting "
                                   "traffic across both as intended."},
    },
    {
        "name": "db_select_window", "domain": "db",
        "contract": ("Reads a window of rows. order_by must be one of the columns being selected, limit "
                     "must be in 1..1000, and offset must be >= 0."),
        "params": [P("table", "string", True), P("columns", "array", True),
                   P("order_by", "string", True), P("limit", "integer", True, max=1000),
                   P("offset", "integer", True, max=1000000)],
        "conformant_args": {"table": "orders", "columns": ["id", "total", "created_at"],
                            "order_by": "created_at", "limit": 50, "offset": 0},
        "intent": "read the 50 most recent orders with id, total and created_at",
        "l4_violations": [
            {"args": {"table": "orders", "columns": ["id", "total", "created_at"],
                      "order_by": "updated_at", "limit": 50, "offset": 0},
             "why": "order_by 'updated_at' is not among the selected columns "
                    "['id','total','created_at']; the contract requires ordering by a selected column."},
        ],
        "l5_wrong_action": {"tool": "count_rows", "args": {"table": "orders"},
                            "why": "counting rows returns a single number, not the windowed rows the "
                                   "intent asks to read."},
    },
    {
        "name": "upsert_dns_failover", "domain": "dns",
        "contract": ("Creates or updates a failover DNS record. Exactly one of 'ip' (for an A record) "
                     "or 'cname' (for a CNAME) must be provided — never both and never neither."),
        "params": [P("name", "string", True), P("ttl", "integer", True, max=86400),
                   P("ip", "string"), P("cname", "string")],
        "conformant_args": {"name": "app.example.com", "ttl": 300, "ip": "203.0.113.10"},
        "intent": "point app.example.com at the IP 203.0.113.10",
        "l4_violations": [
            {"args": {"name": "app.example.com", "ttl": 300, "ip": "203.0.113.10",
                      "cname": "lb.example.net"},
             "why": "both 'ip' and 'cname' are set; the contract requires exactly one, and a record "
                    "cannot be both an A and a CNAME."},
            {"args": {"name": "app.example.com", "ttl": 300},
             "why": "neither 'ip' nor 'cname' is set; the contract requires exactly one target, so the "
                    "record has nothing to resolve to."},
        ],
        "l5_wrong_action": {"tool": "delete_dns_record", "args": {"name": "app.example.com"},
                            "why": "deleting the record removes resolution rather than pointing the name "
                                   "at the intended IP."},
    },
    {
        "name": "configure_autoscaler", "domain": "k8s",
        "contract": ("Configures a horizontal autoscaler. min_replicas must be <= max_replicas, "
                     "min_replicas must be >= 1, and target_cpu_percent must be in 1..100."),
        "params": [P("deployment", "string", True), P("min_replicas", "integer", True, max=1000),
                   P("max_replicas", "integer", True, max=1000),
                   P("target_cpu_percent", "integer", True, max=100)],
        "conformant_args": {"deployment": "web", "min_replicas": 2, "max_replicas": 10,
                            "target_cpu_percent": 70},
        "intent": "autoscale web between 2 and 10 replicas at 70% CPU",
        "l4_violations": [
            {"args": {"deployment": "web", "min_replicas": 10, "max_replicas": 3,
                      "target_cpu_percent": 70},
             "why": "min_replicas (10) exceeds max_replicas (3); the contract requires "
                    "min_replicas <= max_replicas, so the bounds are inverted."},
        ],
        "l5_wrong_action": {"tool": "scale_deployment", "args": {"deployment": "web", "replicas": 5},
                            "why": "setting a fixed replica count is a one-off scale, not the dynamic "
                                   "autoscaler the intent configures."},
    },
    {
        "name": "apply_order_coupon", "domain": "payments", "state":
            "order ord_5521: subtotal=4000 (minor units, USD), currency=USD, coupon_applied=false.",
        "contract": ("Applies a fixed-amount coupon to an open order. discount_amount (minor units) "
                     "must be > 0 and must not exceed the order's subtotal, and the coupon currency "
                     "must match the order currency."),
        "params": [P("order_id", "string", True), P("discount_amount", "integer", True, max=99999999),
                   P("currency", "string", True), P("coupon_code", "string", True)],
        "conformant_args": {"order_id": "ord_5521", "discount_amount": 1000, "currency": "USD",
                            "coupon_code": "SAVE10"},
        "intent": "take $10 off order ord_5521",
        "l4_violations": [
            {"args": {"order_id": "ord_5521", "discount_amount": 5000, "currency": "USD",
                      "coupon_code": "SAVE50"},
             "why": "discount_amount 5000 exceeds the order subtotal of 4000 (per STATE); the contract "
                    "forbids a discount larger than the subtotal, which would yield a negative total."},
            {"args": {"order_id": "ord_5521", "discount_amount": 1000, "currency": "EUR",
                      "coupon_code": "SAVE10"},
             "why": "the coupon currency EUR does not match the order currency USD (per STATE); the "
                    "contract requires matching currencies."},
        ],
        "l5_wrong_action": {"tool": "cancel_order", "args": {"order_id": "ord_5521"},
                            "why": "cancelling the order is not the same as discounting it."},
    },
    {
        "name": "reserve_inventory", "domain": "commerce", "state":
            "sku SKU-42: available=12, reserved=3, warehouse=us-east. No backorders allowed.",
        "contract": ("Reserves stock for an order line. quantity must be >= 1 and must not exceed the "
                     "available stock for the sku."),
        "params": [P("sku", "string", True), P("quantity", "integer", True, max=100000),
                   P("order_id", "string", True)],
        "conformant_args": {"sku": "SKU-42", "quantity": 5, "order_id": "ord_5521"},
        "intent": "reserve 5 units of SKU-42 for an order",
        "l4_violations": [
            {"args": {"sku": "SKU-42", "quantity": 20, "order_id": "ord_5521"},
             "why": "quantity 20 exceeds the available stock of 12 (per STATE); the contract forbids "
                    "reserving more than is available and backorders are not allowed."},
        ],
        "l5_wrong_action": {"tool": "release_inventory",
                            "args": {"sku": "SKU-42", "quantity": 5, "order_id": "ord_5521"},
                            "why": "releasing stock frees a reservation — the opposite of reserving it."},
    },
    {
        "name": "transfer_funds", "domain": "payments", "state":
            ("account acct_src: balance=25000 (minor units), currency=USD. account acct_dst: "
             "currency=USD. Both accounts are open."),
        "contract": ("Moves money between two accounts. amount (minor units) must be > 0 and must not "
                     "exceed the source account's balance, source_account and destination_account must "
                     "be different, and the transfer currency must match BOTH accounts' currency."),
        "params": [P("source_account", "string", True), P("destination_account", "string", True),
                   P("amount", "integer", True, max=99999999), P("currency", "string", True)],
        "conformant_args": {"source_account": "acct_src", "destination_account": "acct_dst",
                            "amount": 5000, "currency": "USD"},
        "intent": "move $50.00 from acct_src to acct_dst",
        "l4_violations": [
            {"args": {"source_account": "acct_src", "destination_account": "acct_dst",
                      "amount": 50000, "currency": "USD"},
             "why": "amount 50000 exceeds the source balance of 25000 (per STATE); the contract forbids "
                    "overdrawing the source account."},
            {"args": {"source_account": "acct_src", "destination_account": "acct_src",
                      "amount": 5000, "currency": "USD"},
             "why": "source_account and destination_account are both acct_src; the contract requires "
                    "them to differ, so this transfer moves money to itself."},
            {"args": {"source_account": "acct_src", "destination_account": "acct_dst",
                      "amount": 5000, "currency": "EUR"},
             "why": "the transfer currency EUR matches neither account (both are USD per STATE); the "
                    "contract requires the currency to match both accounts."},
        ],
        "l5_wrong_action": {"tool": "transfer_funds",
                            "args": {"source_account": "acct_dst", "destination_account": "acct_src",
                                     "amount": 5000, "currency": "USD"},
                            "why": "this reverses the direction, debiting the destination and crediting "
                                   "the source — the opposite of the stated intent."},
    },
    {
        "name": "promote_release", "domain": "devops", "state":
            "service checkout-api: current_version=7, current_stage=staging. Versions deploy in order.",
        "contract": ("Promotes a service to the next release version. target_version must equal the "
                     "current_version + 1 (no skipping versions), and must not equal a version already "
                     "deployed."),
        "params": [P("service", "string", True), P("target_version", "integer", True, max=100000),
                   P("stage", "string", True, enum=["staging", "production"])],
        "conformant_args": {"service": "checkout-api", "target_version": 8, "stage": "production"},
        "intent": "promote checkout-api to the next version in production",
        "l4_violations": [
            {"args": {"service": "checkout-api", "target_version": 10, "stage": "production"},
             "why": "target_version 10 skips versions 8 and 9 from the current_version 7 (per STATE); "
                    "the contract requires exactly current_version + 1."},
            {"args": {"service": "checkout-api", "target_version": 7, "stage": "production"},
             "why": "target_version 7 equals the already-deployed current_version (per STATE); the "
                    "contract forbids re-deploying an existing version as a promotion."},
        ],
        "l5_wrong_action": {"tool": "rollback_release",
                            "args": {"service": "checkout-api", "target_version": 6},
                            "why": "rolling back to an earlier version is the opposite of promoting "
                                   "forward."},
    },
    {
        "name": "assign_seat", "domain": "travel", "state":
            "flight UA482: available_seats=[12A, 12B, 14C, 21F]. All other seats are taken or blocked.",
        "contract": ("Assigns a seat to a passenger on a flight. seat must be one of the flight's "
                     "currently available seats."),
        "params": [P("flight", "string", True), P("seat", "string", True),
                   P("passenger_id", "string", True)],
        "conformant_args": {"flight": "UA482", "seat": "12B", "passenger_id": "pax_9931"},
        "intent": "seat passenger pax_9931 in 12B",
        "l4_violations": [
            {"args": {"flight": "UA482", "seat": "30F", "passenger_id": "pax_9931"},
             "why": "seat 30F is not in the flight's available set [12A,12B,14C,21F] (per STATE); the "
                    "contract requires assigning only a currently-available seat."},
        ],
        "l5_wrong_action": {"tool": "cancel_seat_assignment",
                            "args": {"flight": "UA482", "passenger_id": "pax_9931"},
                            "why": "cancelling an assignment removes a seat rather than assigning one."},
    },
    {
        "name": "grant_role", "domain": "iam",
        "contract": ("Grants a role to a principal. The 'admin' role may be granted ONLY when "
                     "principal_tier is 'owner'; 'editor' and 'viewer' may be granted at any tier."),
        "params": [P("principal_id", "string", True),
                   P("principal_tier", "string", True, enum=["member", "manager", "owner"]),
                   P("role", "string", True, enum=["viewer", "editor", "admin"])],
        "conformant_args": {"principal_id": "u_2210", "principal_tier": "owner", "role": "admin"},
        "intent": "make the owner-tier principal an admin",
        "l4_violations": [
            {"args": {"principal_id": "u_2210", "principal_tier": "member", "role": "admin"},
             "why": "role 'admin' was requested for a 'member'-tier principal; the contract permits "
                    "'admin' only when principal_tier is 'owner'."},
        ],
        "l5_wrong_action": {"tool": "revoke_role",
                            "args": {"principal_id": "u_2210", "role": "admin"},
                            "why": "revoking a role removes access rather than granting it."},
    },
    {
        "name": "crop_image", "domain": "media",
        "contract": ("Crops a rectangle from an image. The crop must stay in bounds: x + width must be "
                     "<= image_width and y + height must be <= image_height (all >= 0)."),
        "params": [P("image_width", "integer", True, max=100000),
                   P("image_height", "integer", True, max=100000), P("x", "integer", True, max=100000),
                   P("y", "integer", True, max=100000), P("width", "integer", True, max=100000),
                   P("height", "integer", True, max=100000)],
        "conformant_args": {"image_width": 1920, "image_height": 1080, "x": 100, "y": 100,
                            "width": 800, "height": 600},
        "intent": "crop an 800x600 region starting at (100,100) from a 1920x1080 image",
        "l4_violations": [
            {"args": {"image_width": 1920, "image_height": 1080, "x": 1500, "y": 100,
                      "width": 800, "height": 600},
             "why": "x + width = 1500 + 800 = 2300 exceeds image_width 1920 (per the call); the crop "
                    "runs off the right edge, which the in-bounds contract forbids."},
            {"args": {"image_width": 1920, "image_height": 1080, "x": 100, "y": 700,
                      "width": 800, "height": 600},
             "why": "y + height = 700 + 600 = 1300 exceeds image_height 1080; the crop runs off the "
                    "bottom edge."},
        ],
        "l5_wrong_action": {"tool": "resize_image",
                            "args": {"image_width": 1920, "image_height": 1080, "width": 800,
                                     "height": 600},
                            "why": "resizing rescales the whole image; it does not crop the requested "
                                   "sub-region."},
    },
    {
        "name": "merge_pdf_pages", "domain": "media",
        "contract": ("Extracts an inclusive page range from a PDF. page_from must be <= page_to, and "
                     "both must be within 1..total_pages."),
        "params": [P("source", "string", True), P("total_pages", "integer", True, max=100000),
                   P("page_from", "integer", True, max=100000),
                   P("page_to", "integer", True, max=100000)],
        "conformant_args": {"source": "/docs/report.pdf", "total_pages": 50, "page_from": 5,
                            "page_to": 10},
        "intent": "extract pages 5 through 10 of a 50-page PDF",
        "l4_violations": [
            {"args": {"source": "/docs/report.pdf", "total_pages": 50, "page_from": 12, "page_to": 8},
             "why": "page_from (12) is greater than page_to (8); the contract requires "
                    "page_from <= page_to for an inclusive range."},
            {"args": {"source": "/docs/report.pdf", "total_pages": 50, "page_from": 5, "page_to": 60},
             "why": "page_to (60) exceeds total_pages (50); the contract requires the range to stay "
                    "within 1..total_pages."},
        ],
        "l5_wrong_action": {"tool": "rotate_pdf",
                            "args": {"source": "/docs/report.pdf", "degrees": 90},
                            "why": "rotating pages does not extract the requested page range."},
    },
    {
        "name": "distribute_budget", "domain": "finance",
        "contract": ("Distributes a total budget across line items. The sum of the allocation values "
                     "must equal total_budget exactly (no shortfall, no overflow), and every allocation "
                     "must be >= 0."),
        "params": [P("total_budget", "integer", True, max=999999999),
                   P("allocations", "object", True), P("period", "string", True)],
        "conformant_args": {"total_budget": 1000, "allocations": {"eng": 600, "marketing": 400},
                            "period": "2026-Q3"},
        "intent": "split a 1000 budget into 600 eng / 400 marketing",
        "l4_violations": [
            {"args": {"total_budget": 1000, "allocations": {"eng": 600, "marketing": 300},
                      "period": "2026-Q3"},
             "why": "the allocations sum to 900, not the total_budget of 1000; the contract requires "
                    "the allocations to sum exactly to the total, leaving 100 unallocated."},
            {"args": {"total_budget": 1000, "allocations": {"eng": 700, "marketing": 400},
                      "period": "2026-Q3"},
             "why": "the allocations sum to 1100, overflowing the total_budget of 1000; the contract "
                    "forbids allocating more than the total."},
        ],
        "l5_wrong_action": {"tool": "set_budget", "args": {"total_budget": 1000, "period": "2026-Q3"},
                            "why": "setting the total budget does not perform the per-line-item "
                                   "distribution the intent asks for."},
    },
    {
        "name": "configure_mtls", "domain": "security",
        "contract": ("Configures TLS for a listener. When mtls_enabled is true, client_ca_path is "
                     "REQUIRED and must be an absolute path (the CA used to verify client certs); when "
                     "mtls_enabled is false, client_ca_path must be omitted."),
        "params": [P("listener", "string", True), P("mtls_enabled", "boolean", True),
                   P("client_ca_path", "string")],
        "conformant_args": {"listener": "ingress-443", "mtls_enabled": True,
                            "client_ca_path": "/etc/tls/client-ca.pem"},
        "intent": "turn on mutual TLS on the ingress listener with the client CA bundle",
        "l4_violations": [
            {"args": {"listener": "ingress-443", "mtls_enabled": True},
             "why": "mtls_enabled is true but client_ca_path is missing; the contract requires a client "
                    "CA path whenever mTLS is enabled, so client certs could not be verified."},
            {"args": {"listener": "ingress-443", "mtls_enabled": True,
                      "client_ca_path": "tls/client-ca.pem"},
             "why": "client_ca_path 'tls/client-ca.pem' is relative; the contract requires an absolute "
                    "path for the client CA bundle."},
        ],
        "l5_wrong_action": {"tool": "disable_tls", "args": {"listener": "ingress-443"},
                            "why": "disabling TLS removes encryption entirely — the opposite of enabling "
                                   "mutual TLS."},
    },
    {
        "name": "set_storage_tiers", "domain": "infra",
        "contract": ("Sets data lifecycle tiers. The thresholds must be monotonically non-decreasing: "
                     "warm_days <= cold_days <= delete_days (data moves warm -> cold -> deleted), and "
                     "all must be >= 1."),
        "params": [P("bucket", "string", True), P("warm_days", "integer", True, max=36500),
                   P("cold_days", "integer", True, max=36500),
                   P("delete_days", "integer", True, max=36500)],
        "conformant_args": {"bucket": "logs-archive", "warm_days": 7, "cold_days": 30,
                            "delete_days": 365},
        "intent": "keep logs warm 7 days, cold to 30 days, delete at 365",
        "l4_violations": [
            {"args": {"bucket": "logs-archive", "warm_days": 30, "cold_days": 7, "delete_days": 365},
             "why": "warm_days (30) is greater than cold_days (7); the contract requires "
                    "warm_days <= cold_days, so the warm window outlasts the cold transition."},
            {"args": {"bucket": "logs-archive", "warm_days": 7, "cold_days": 400, "delete_days": 365},
             "why": "cold_days (400) is greater than delete_days (365); the contract requires "
                    "cold_days <= delete_days, so data would be deleted before it ever moves to cold."},
        ],
        "l5_wrong_action": {"tool": "delete_bucket", "args": {"bucket": "logs-archive"},
                            "why": "deleting the bucket destroys the data instead of setting its "
                                   "lifecycle tiers."},
    },
    {
        "name": "create_load_test", "domain": "perf",
        "contract": ("Starts a load test. ramp_up_seconds must be <= duration_seconds (you cannot ramp "
                     "for longer than the test runs), and target_rps must be >= 1."),
        "params": [P("endpoint", "string", True), P("duration_seconds", "integer", True, max=86400),
                   P("ramp_up_seconds", "integer", True, max=86400),
                   P("target_rps", "integer", True, max=1000000)],
        "conformant_args": {"endpoint": "https://api.example.com/health", "duration_seconds": 300,
                            "ramp_up_seconds": 60, "target_rps": 200},
        "intent": "run a 5-minute load test ramping to 200 rps over the first minute",
        "l4_violations": [
            {"args": {"endpoint": "https://api.example.com/health", "duration_seconds": 300,
                      "ramp_up_seconds": 600, "target_rps": 200},
             "why": "ramp_up_seconds (600) exceeds duration_seconds (300); the contract requires the "
                    "ramp to fit within the test, so the test would end before reaching full load."},
        ],
        "l5_wrong_action": {"tool": "stop_load_test", "args": {"test_id": "lt_pending"},
                            "why": "stopping a test is the opposite of starting the one the intent "
                                   "describes."},
    },
    {
        "name": "set_resource_quota", "domain": "k8s",
        "contract": ("Sets a namespace resource quota. soft_limit must be <= hard_limit (the soft "
                     "warning threshold cannot exceed the hard ceiling), and both must be >= 0."),
        "params": [P("namespace", "string", True), P("resource", "string", True,
                                                     enum=["cpu", "memory", "pods"]),
                   P("soft_limit", "integer", True, max=1000000),
                   P("hard_limit", "integer", True, max=1000000)],
        "conformant_args": {"namespace": "team-a", "resource": "pods", "soft_limit": 40,
                            "hard_limit": 50},
        "intent": "warn team-a at 40 pods, hard-cap at 50",
        "l4_violations": [
            {"args": {"namespace": "team-a", "resource": "pods", "soft_limit": 80, "hard_limit": 50},
             "why": "soft_limit (80) exceeds hard_limit (50); the contract requires "
                    "soft_limit <= hard_limit, so the warning would fire only after the hard cap is "
                    "already breached."},
        ],
        "l5_wrong_action": {"tool": "delete_resource_quota",
                            "args": {"namespace": "team-a", "resource": "pods"},
                            "why": "deleting the quota removes the limits rather than setting them."},
    },
    {
        "name": "schedule_job_oneshot", "domain": "scheduling",
        "contract": ("Schedules a job. Exactly one scheduling mode must be set: either 'run_at' (a "
                     "single RFC 3339 timestamp for a one-shot run) OR 'cron_expression' (a 5-field "
                     "cron for a recurring run) — never both and never neither."),
        "params": [P("job", "string", True), P("run_at", "string"), P("cron_expression", "string")],
        "conformant_args": {"job": "nightly-export", "cron_expression": "0 3 * * *"},
        "intent": "run nightly-export every day at 03:00",
        "l4_violations": [
            {"args": {"job": "nightly-export", "run_at": "2026-07-01T03:00:00Z",
                      "cron_expression": "0 3 * * *"},
             "why": "both 'run_at' and 'cron_expression' are set; the contract requires exactly one "
                    "scheduling mode, so it is ambiguous whether the job is one-shot or recurring."},
            {"args": {"job": "nightly-export"},
             "why": "neither 'run_at' nor 'cron_expression' is set; the contract requires exactly one "
                    "scheduling mode, so the job has no schedule."},
        ],
        "l5_wrong_action": {"tool": "run_job_now", "args": {"job": "nightly-export"},
                            "why": "running the job immediately is not the same as scheduling its "
                                   "recurring nightly run."},
    },
    {
        "name": "set_canary_slo", "domain": "devops",
        "contract": ("Sets the SLO gate for a canary. latency_p99_ms must be >= latency_p50_ms (the "
                     "99th percentile cannot be lower than the median), and error_rate_max must be in "
                     "0..100."),
        "params": [P("service", "string", True), P("latency_p50_ms", "integer", True, max=600000),
                   P("latency_p99_ms", "integer", True, max=600000),
                   P("error_rate_max", "number", True)],
        "conformant_args": {"service": "search", "latency_p50_ms": 120, "latency_p99_ms": 450,
                            "error_rate_max": 1.0},
        "intent": "gate the search canary at p50<=120ms, p99<=450ms, <=1% errors",
        "l4_violations": [
            {"args": {"service": "search", "latency_p50_ms": 450, "latency_p99_ms": 120,
                      "error_rate_max": 1.0},
             "why": "latency_p99_ms (120) is lower than latency_p50_ms (450); the 99th percentile "
                    "cannot be below the median, so the thresholds are incoherent."},
        ],
        "l5_wrong_action": {"tool": "promote_canary", "args": {"service": "search"},
                            "why": "promoting the canary advances the rollout rather than setting the "
                                   "SLO gate the intent describes."},
    },
]

# Fix a stray double-mention in one why string (keep the corpus clean).
for _t in NEW:
    for _v in _t.get("l4_violations", []):
        if _v["why"].startswith("ends_at (03:00) precedes starts_at... corrected: "):
            _v["why"] = _v["why"].split("corrected: ", 1)[1]


# ── STATE-fixes: pull the underspecified referential tools and make them self-checkable ─────────────
# Each STATE line carries the operative fact the v1 example hid, so the SAME violation now has a
# derivable verdict (conformant member satisfies it, the bad member fails it) instead of asking the
# model to guess about invisible state. refund_charge is one of the v1 exam's two false-conformants.
STATE_FIXES = {
    "refund_charge":
        "charge ch_9Lm22aZ: status=captured, currency=USD, original_amount=1500, already_refunded=0, "
        "remaining_refundable=1500 (minor units).",
    "stat_path":
        "existing filesystem entries: /etc/hosts (file), /etc/passwd (file), /var/log (dir). "
        "No other paths exist.",
    "post_channel_message":
        "channel C04ABCD123: the bot is a member; existing thread-parent timestamps in this channel are "
        "[1718900000.001200, 1718900500.004500].",
    "git_revert_commit":
        "repo /srv/repos/api: commits reachable from HEAD include "
        "9f3c1a7e2b8d4c5a6f0e1d2c3b4a5968d7e8f9a0 and 7b2e9c0a1f3d4e5b6c7a8d9e0f1a2b3c4d5e6f70. "
        "No other SHAs are reachable.",
    "snooze_notification":
        "current_time=2026-06-06T12:00:00Z; the caller owns notification ntf_77b21 (already delivered).",
    "paginate_rest_collection":
        "the /v2/orders collection issues opaque cursors that base64-decode to an order id (id prefix "
        "'ord_'); cursors minted by other collections decode to other id prefixes and are not valid here.",
    "secret_rotate_version":
        "secret 'prod/db/password' exists in store 'aws-sm'; its currently-active version value is "
        "'aB3$kM1vQ8wE'.",
    "create_oauth_token":
        "the original authorization request for code 'ac_9f8b2c1d' used redirect_uri "
        "'https://app.example.com/oauth/callback' (exact); the code is unexpired and unused.",
}


def build_fixes():
    base = json.load(open(os.path.join(HERE, "corpus_tools.json"), encoding="utf-8"))
    byn = {t["name"]: t for t in base}
    out, missing = [], []
    for name, state in STATE_FIXES.items():
        t = byn.get(name)
        if not t:
            missing.append(name); continue
        t = json.loads(json.dumps(t))   # deep copy
        t["state"] = state
        out.append(t)
    if missing:
        raise SystemExit(f"STATE_FIXES reference tools not in corpus_tools.json: {missing}")
    return out


def main():
    # Structural self-checks so a typo can't slip a malformed tool into the dataset.
    new_names = set()
    for t in NEW:
        assert t["name"] not in new_names, f"duplicate new tool {t['name']}"
        new_names.add(t["name"])
        assert t.get("l4_violations"), f"{t['name']} missing l4_violations"
        conf = t["conformant_args"]
        pnames = {p["name"] for p in t["params"]}
        req = {p["name"] for p in t["params"] if p.get("required")}
        assert req <= set(conf), f"{t['name']} conformant_args missing required {req - set(conf)}"
        assert set(conf) <= pnames, f"{t['name']} conformant_args has unknown {set(conf) - pnames}"
        for v in t["l4_violations"]:
            assert set(v["args"]) <= pnames or "tool" in v, f"{t['name']} l4 args unknown keys"
            assert v["args"] != conf, f"{t['name']} an l4 violation equals conformant_args"
            assert v.get("why"), f"{t['name']} l4 violation missing why"

    fixes = build_fixes()
    corpus = NEW + fixes
    n_l4 = sum(len(t.get("l4_violations") or ([t["l4_violation"]] if t.get("l4_violation") else []))
               for t in corpus)
    n_state = sum(1 for t in corpus if t.get("state"))
    out_path = os.path.join(HERE, "corpus_l4.json")
    json.dump(corpus, open(out_path, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"wrote {out_path}")
    print(f"  new tools         : {len(NEW)}")
    print(f"  state-fix overrides: {len(fixes)}  ({list(STATE_FIXES)})")
    print(f"  total L4 clauses  : {n_l4}")
    print(f"  tools with STATE  : {n_state}")


if __name__ == "__main__":
    main()
