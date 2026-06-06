"""Tool-call conformance contrast-group generator. Emits CONTRAST GROUPS (flip-consistency unit): each
group fixes the TOOL and varies the CALL — a conformant call vs a surface-near nonconformant twin — so
length/fluency can't predict the verdict, only the actual conformance check can. Mirrors the verifier's
puzzles.py shape and serializes (tool, call) into the proven {evidence, claim} -> verdict contract.

Rungs:
  L1 type        — wrong type for a declared param            (mechanical from schema)
  L2 required    — a required param dropped                   (mechanical)
  L3 enum/range  — value outside a declared enum/range/format (mechanical, when the tool declares one)
  L4 contract    — schema-valid but violates the DOCUMENTED contract  (hand-authored per tool — the core)
  L5 intent      — schema+contract-valid but wrong tool/args for the stated INTENT (hand-authored)
Gold labels known by construction; L1-L3 also handled by the deterministic floor at serve time."""
import json
import config


def _tool_evidence(t, *, with_intent=False):
    schema = {p["name"]: {k: v for k, v in p.items() if k != "name"} for p in t["params"]}
    ev = (f"TOOL: {t['name']}\nCONTRACT: {t['contract']}\n"
          f"PARAMS (JSON schema): {json.dumps(schema)}")
    # Optional resource STATE — what the runtime knows about the referenced resources at call time.
    # This makes referential contracts ("must reference an existing charge", "amount <= remaining
    # balance") SELF-CHECKABLE from (contract + state + call) alone, instead of asking the model to
    # bluff about state it cannot see. Rendered for every rung of the tool; only L4 actually needs it.
    if t.get("state"):
        ev += f"\nSTATE: {t['state']}"
    if with_intent and t.get("intent"):
        ev += f"\nINTENT: {t['intent']}"
    return ev


def _call(name, args):
    return f"CALL: {name}({json.dumps(args)})"


def _rec(level, type_, evidence, claim, verdict, reasoning, *, pair_id, contrast, corruption,
         hard_negative, source="synthetic-rule"):
    return {
        "level": level, "type": type_, "evidence": evidence, "claim": claim, "verdict": verdict,
        "reasoning": reasoning, "principle": config.PRINCIPLES[level], "hard_negative": hard_negative,
        "corruption": corruption, "multi_hop": False, "source": source,
        "real_question": config.REAL_QUESTION, "pair_id": pair_id, "contrast": contrast,
    }


# ── mechanical L1-L3 (derive a planted violation from the schema) ───────────────────────────────────
_WRONGTYPE = {"string": 42, "integer": "lots", "number": "many", "boolean": "yes", "array": "a,b",
              "object": "x"}


def type_group(t, pair_id):
    ev = _tool_evidence(t)
    good = _call(t["name"], t["conformant_args"])
    # corrupt the first param that has a known type
    bad_args = dict(t["conformant_args"])
    desc = None
    for p in t["params"]:
        if p["name"] in bad_args and p["type"] in _WRONGTYPE:
            bad_args[p["name"]] = _WRONGTYPE[p["type"]]
            desc = f"'{p['name']}' should be {p['type']}"
            break
    if desc is None:
        return None
    return [
        _rec(1, "type", ev, good, "conformant",
             "Every argument matches its declared type and the contract; conformant.",
             pair_id=pair_id, contrast=False, corruption="none (conformant)", hard_negative=False),
        _rec(1, "type", ev, _call(t["name"], bad_args), "nonconformant",
             f"Type violation: {desc}. A wrong-typed argument is nonconformant regardless of the rest.",
             pair_id=pair_id, contrast=True, corruption=desc, hard_negative=True),
    ]


def required_group(t, pair_id):
    req = [p["name"] for p in t["params"] if p.get("required") and p["name"] in t["conformant_args"]]
    if not req:
        return None
    ev = _tool_evidence(t)
    drop = req[0]
    bad = {k: v for k, v in t["conformant_args"].items() if k != drop}
    return [
        _rec(2, "required", ev, _call(t["name"], t["conformant_args"]), "conformant",
             "All required parameters are present and well-formed; conformant.",
             pair_id=pair_id, contrast=False, corruption="none (conformant)", hard_negative=False),
        _rec(2, "required", ev, _call(t["name"], bad), "nonconformant",
             f"Required parameter '{drop}' is missing; a missing required field is nonconformant.",
             pair_id=pair_id, contrast=True, corruption=f"dropped required '{drop}'", hard_negative=True),
    ]


def enum_group(t, pair_id):
    # find a param with an enum or a numeric range to violate
    ev = _tool_evidence(t)
    for p in t["params"]:
        if p["name"] not in t["conformant_args"]:
            continue
        bad = dict(t["conformant_args"])
        if p.get("enum"):
            bad[p["name"]] = "__not_in_enum__"
            desc = f"'{p['name']}' not in enum {p['enum']}"
        elif "max" in p:
            bad[p["name"]] = p["max"] + 1000
            desc = f"'{p['name']}' exceeds max {p['max']}"
        else:
            continue
        return [
            _rec(3, "enum-range", ev, _call(t["name"], t["conformant_args"]), "conformant",
                 "Declared enum/range/format constraints are satisfied; conformant.",
                 pair_id=pair_id, contrast=False, corruption="none (conformant)", hard_negative=False),
            _rec(3, "enum-range", ev, _call(t["name"], bad), "nonconformant",
                 f"Constraint violation: {desc}. Right type, but the value is out of the declared set.",
                 pair_id=pair_id, contrast=True, corruption=desc, hard_negative=True),
        ]
    return None


# ── hand-authored L4 (semantic contract) and L5 (intent vs action) — the LLM's core job ─────────────

def contract_group(t, pair_id):
    """L4: calls that PASS the schema but VIOLATE the documented contract vs the conformant call.

    A tool may declare MULTIPLE contract clauses worth probing. `l4_violations` (a list of
    {args, why}) emits one flip-consistency contrast group PER clause (each its own pair_id), so a
    rich-contract tool teaches several distinct contract-reasoning patterns. `l4_violation` (singular)
    is the back-compat single-clause form. The conformant member is repeated per group so every group
    is independently flip-ready."""
    viols = list(t.get("l4_violations") or ([t["l4_violation"]] if t.get("l4_violation") else []))
    if not viols:
        return None
    ev = _tool_evidence(t)
    out = []
    for k, v in enumerate(viols):
        pid = f"{pair_id}-{k}"
        out.append(_rec(4, "semantic-contract", ev, _call(t["name"], t["conformant_args"]), "conformant",
                        "The call satisfies the schema and honors the documented contract; conformant.",
                        pair_id=pid, contrast=False, corruption="none (conformant)", hard_negative=False))
        out.append(_rec(4, "semantic-contract", ev, _call(t["name"], v["args"]), "nonconformant",
                        f"Schema-valid but contract-violating: {v['why']}. Passing the JSON schema is not "
                        "enough — the documented contract is also binding.",
                        pair_id=pid, contrast=True, corruption=v["why"], hard_negative=True))
    return out


def intent_group(t, pair_id):
    """L5: with the INTENT stated, the conformant call (serves the intent) vs a schema+contract-valid
    call that serves the WRONG end (wrong tool, or args for a different goal)."""
    w = t.get("l5_wrong_action")
    if not w or not t.get("intent"):
        return None
    ev = _tool_evidence(t, with_intent=True)
    return [
        _rec(5, "intent-action", ev, _call(t["name"], t["conformant_args"]), "conformant",
             "The tool and arguments match the stated intent; conformant.",
             pair_id=pair_id, contrast=False, corruption="none (conformant)", hard_negative=False),
        _rec(5, "intent-action", ev, _call(w.get("tool", t["name"]), w["args"]), "nonconformant",
             f"Wrong action for the intent: {w['why']}. A schema- and contract-valid call to the wrong "
             "end does not conform to what was asked.",
             pair_id=pair_id, contrast=True, corruption=w["why"], hard_negative=True),
    ]


def to_sft(p):
    user = f"EVIDENCE:\n{p['evidence']}\n\nCLAIM:\n{p['claim']}"
    assistant = f"<think>\n{p['reasoning']}\n</think>\n\n{p['verdict']}"
    return {"messages": [
        {"role": "system", "content": config.SYSTEM_PROMPT},
        {"role": "user", "content": user},
        {"role": "assistant", "content": assistant},
    ]}
