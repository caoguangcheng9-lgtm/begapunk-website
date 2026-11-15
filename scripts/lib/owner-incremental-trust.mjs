// Extend the existing pinned-evidence trust model; these are not signatures.
// Only a separately reviewed owner authorization may append a decision pin.
// Changing candidate status/evidence or supplying an environment variable never
// grants authority. Do not rewrite a proposal or a previously pinned decision.
export const INCREMENTAL_PROPOSALS = Object.freeze([Object.freeze({"path":"audit/approvals/incremental/phase8f-social-css-proposal.json","algorithm":"sha256-lf-text-v1","sha256":"abe9169ccd566613fc3d12de10c42b2a9fd415bde5feae5d48dfe95dada266b9"})]);
export const OWNER_INCREMENTAL_DECISIONS = Object.freeze([Object.freeze({"path":"audit/approvals/incremental/2026-11-15-phase8f-social-css-owner-decision.json","algorithm":"sha256-lf-text-v1","sha256":"429529af76af3f412c3b62c42fc08702821852e54352fb262fef0a1f7ca059cd","proposalSha256":"abe9169ccd566613fc3d12de10c42b2a9fd415bde5feae5d48dfe95dada266b9","ownerEvidencePath":"audit/approvals/incremental/2026-11-15-phase8f-social-css-owner-evidence.json","ownerEvidenceSha256":"f3d8b7b329597d9a23e0ed810e55c1ee96737235f2c8e22c57757be807725137"})]);

// A pending composite baseline never grants deployment or owner approval.
export const LEGACY_COMPOSITE_PROPOSALS = Object.freeze([{"path": "audit/approvals/legacy-composite/20261111-proposal.json", "sha256": "5ec013bb325f55bf3e89910cef44e81653c18fd190f1b97af6d0efb22eb0963a", "algorithm": "sha256-lf-text-v1"}]);
export const OWNER_COMPOSITE_BASELINE_DECISIONS = Object.freeze([Object.freeze({"path":"audit/approvals/legacy-composite/20261115-owner-decision.json","algorithm":"sha256-lf-text-v1","sha256":"83e3b1cf664df2e4c8056f84e6e51ac95b785c7d4694c74bf99cff6d6378a39c","proposalSha256":"5ec013bb325f55bf3e89910cef44e81653c18fd190f1b97af6d0efb22eb0963a","ownerEvidencePath":"audit/approvals/legacy-composite/20261115-owner-evidence.json","ownerEvidenceSha256":"3a5a12db823223516216c1d83cc53401ae71ea3cbb0d7e9081709da287a04838"})]);
