"""Reverted-red: certify receipts with FC>bar must not look like a ship pin.

Run:  python test_certify_ship_stamp.py    (from tools/conformance-dataset/)
Exit 0 = stamps + pin gate hold; non-zero = an FC>bar file still reads as a pin.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import certify_conformance as C
import config

FAILS = []


def check(name, cond):
    print(("  PASS " if cond else "  FAIL ") + name)
    if not cond:
        FAILS.append(name)


def test_is_ship_pin_requires_ship_true():
    print("test_is_ship_pin_requires_ship_true")
    check("missing ship is not a pin", C.is_ship_pin({
        "label": "s4c2", "overall": 0.972, "query_errors": 0,
        "false_conformant_total": 1,
    }) is False)
    check("ship false is not a pin", C.is_ship_pin({
        "ship": False, "status": "andon", "ship_bar": 0,
        "false_conformant_total": 1, "scored": True,
    }) is False)
    check("status andon is not a pin", C.is_ship_pin({
        "ship": True, "status": "andon", "ship_bar": 0,
        "false_conformant_total": 0, "scored": True,
    }) is False)
    check("FC>bar is not a pin", C.is_ship_pin({
        "ship": True, "status": "ship", "ship_bar": 0,
        "false_conformant_total": 1, "scored": True,
    }) is False)
    check("unscored is not a pin", C.is_ship_pin({
        "ship": True, "status": "ship", "ship_bar": 0,
        "false_conformant_total": 0, "scored": False,
    }) is False)
    check("ship true at bar is a pin", C.is_ship_pin({
        "ship": True, "status": "ship", "ship_bar": 0,
        "false_conformant_total": 0, "scored": True,
    }) is True)


def test_stamp_receipt_andon_on_fc():
    print("test_stamp_receipt_andon_on_fc")
    andon = C.stamp_receipt({"label": "x", "false_conformant_total": 1}, 1)
    check("FC>bar ship false", andon["ship"] is False)
    check("FC>bar status andon", andon["status"] == "andon")
    check("FC>bar ship_bar is MAX", andon["ship_bar"] == config.MAX_FALSE_CONFORMANT)
    check("FC>bar is not a pin", C.is_ship_pin(andon) is False)
    ok = C.stamp_receipt({"label": "y", "false_conformant_total": 0}, 0)
    check("0 FC ship true", ok["ship"] is True and ok["status"] == "ship")
    check("0 FC is a pin", C.is_ship_pin(ok) is True)


def test_committed_certify_files_are_not_pins():
    print("test_committed_certify_files_are_not_pins")
    certify_dir = os.path.join(HERE, "certify")
    files = [n for n in os.listdir(certify_dir) if n.endswith(".json")]
    check("certify dir has receipts", len(files) > 0)
    for name in files:
        rec = json.load(open(os.path.join(certify_dir, name), encoding="utf-8"))
        fc = rec.get("false_conformant_total", 0)
        check(f"{name} has ship_bar", "ship_bar" in rec)
        check(f"{name} has ship field", "ship" in rec)
        check(f"{name} has status", "status" in rec)
        if fc > config.MAX_FALSE_CONFORMANT:
            check(f"{name} FC>bar ship false", rec.get("ship") is False)
            check(f"{name} FC>bar status andon", rec.get("status") == "andon")
            check(f"{name} label prefixed ANDON", str(rec.get("label", "")).startswith("ANDON:"))
            check(f"{name} is not a pin", C.is_ship_pin(rec) is False)


def main():
    for t in (test_is_ship_pin_requires_ship_true, test_stamp_receipt_andon_on_fc,
              test_committed_certify_files_are_not_pins):
        t()
    print()
    if FAILS:
        print(f"FAILED ({len(FAILS)}): {FAILS}")
        sys.exit(1)
    print("ALL PASS")


if __name__ == "__main__":
    main()
