/** Fail-closed reasons for the v0.3 OOD floor proof. fpConf>0 / empty input is not a pass. */

export function proofFailReason({ nCases, atRisk, fpConf }) {
  if (!nCases) return "empty cases — OOD proof UNSCORED, not a pass";
  if (!atRisk) return "empty at-risk — OOD proof vacuous, not a pass";
  if (fpConf > 0) return `CONFORMANT false-positives ${fpConf} (must be 0)`;
  return null;
}
