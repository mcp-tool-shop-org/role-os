/**
 * Reverted-red: OOD floor proof used to print `must be 0` then exit 0 on fpConf>0.
 *
 * Run: node test_ood_floor_gate.mjs   (from tools/conformance-dataset/)
 * Exit 0 = gate holds; non-zero = fpConf>0 / empty input still look like a pass.
 */
import { proofFailReason } from "./ood_floor_gate.mjs";

let fails = 0;
const check = (name, cond) => {
  console.log((cond ? "  PASS " : "  FAIL ") + name);
  if (!cond) fails += 1;
};

check("fpConf>0 fails", proofFailReason({ nCases: 49, atRisk: 83, fpConf: 1 }) != null);
check("fpConf>0 names must be 0", /must be 0/.test(proofFailReason({ nCases: 49, atRisk: 83, fpConf: 2 }) || ""));
check("empty cases fail", proofFailReason({ nCases: 0, atRisk: 0, fpConf: 0 }) != null);
check("empty at-risk fail", proofFailReason({ nCases: 10, atRisk: 0, fpConf: 0 }) != null);
check("clean proof passes", proofFailReason({ nCases: 49, atRisk: 83, fpConf: 0 }) == null);

if (fails) {
  console.error(`FAILED (${fails})`);
  process.exit(1);
}
console.log("ALL PASS");
