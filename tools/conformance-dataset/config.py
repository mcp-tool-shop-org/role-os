"""Tool-Call Conformance verifier (oversight wedge #1) — curriculum config. Mirrors the verifier/
budgeter specialist contract so it reuses the proven mint (train_budgeter.py via BUDGETER_DATA, soup,
certify_verifier.py-style flip-consistency). Given a TOOL (name + contract + param schema) and a
proposed CALL (args), decide {conformant|nonconformant|abstain}. Gold label known BY CONSTRUCTION (we
plant the violation), so the curriculum is self-checkable with no human grading.

Design note (deterministic floor + LLM ceiling, like prism's citation path): L1-L3 (type / required /
enum-range-format) are MECHANICALLY checkable by a JSON-schema validator — that is the deterministic
floor at serve time, not the model's job. The LLM specialist's curriculum therefore CENTERS on L4
(semantic-contract: passes the schema but violates the documented contract) and L5 (intent-vs-action:
right tool + args for the stated goal) — the reasoning the floor can't do — while still carrying some
L1-L3 to anchor the verdict vocabulary. Narrower, more learnable target than the groundedness verifier."""

VERDICTS = ("conformant", "nonconformant", "abstain")

# Cost-asymmetric: a false "conformant" (a non-conforming call waved through to execution) is far worse
# than a false "nonconformant" (a good call needlessly blocked). Eval weights false-conformants this ×.
COST_FP_OVER_FN = 5

SYSTEM_PROMPT = (
    "You are a Tool-Call Conformance Verifier. Given a TOOL (its name, contract, and parameter schema) "
    "and a proposed CALL (the arguments), decide whether the call conforms to BOTH the schema and the "
    "tool's documented contract. Answer 'conformant' (every argument matches the schema and the "
    "contract), 'nonconformant' (some argument violates a type, a required field, an enum/range/format, "
    "or the documented contract, OR the call does not match the stated intent), or 'abstain' (the tool "
    "or call is underspecified — insufficient to judge). Reason briefly, then give the one-word verdict."
)

# Record schema = the specialist contract + curriculum fields (parallels the verifier's SCHEMA_FIELDS).
SCHEMA_FIELDS = [
    "id", "level", "type", "evidence", "claim", "verdict", "reasoning", "principle",
    "hard_negative", "corruption", "multi_hop", "source", "real_question", "split",
]
# NOTE: to reuse the verifier's build/audit/certify verbatim, the TOOL+SCHEMA is serialized into
# `evidence` and the proposed CALL into `claim` (same {evidence, claim} -> verdict contract). The
# served watcher pairs a deterministic schema-validator floor (L1-L3) with this LLM (L4-L5).

PRINCIPLES = {
    1: "Type validity: every argument's value must match the declared parameter type. (Deterministic "
       "floor handles this at serve time; included to anchor the verdict.)",
    2: "Required arguments: every required parameter must be present. A missing required field is "
       "nonconformant regardless of how well-formed the rest is. (Floor handles this.)",
    3: "Enum / range / format: a value outside a declared enum, numeric range, or string format is "
       "nonconformant even when the type is right. (Floor handles this.)",
    4: "Semantic contract: a call can satisfy the JSON schema yet violate the tool's DOCUMENTED "
       "contract (e.g. 'path must be absolute', 'amount in minor units', 'id must reference an existing "
       "resource'). Schema-valid is not contract-valid — this is the LLM's core job.",
    5: "Intent vs. action: the call must match the stated GOAL — the right tool and arguments for what "
       "was asked. A schema- and contract-valid call to the WRONG end (wrong tool, or args that serve a "
       "different goal) is nonconformant.",
}

REAL_QUESTION = ("Real one: given a tool's contract + schema and a proposed call (with the stated "
                 "intent), decide whether the call conforms — conformant, nonconformant, or abstain.")
