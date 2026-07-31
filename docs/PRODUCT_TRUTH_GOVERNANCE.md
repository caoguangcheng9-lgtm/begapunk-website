# Begapunk Product Truth Governance

Version: 1.2

Baseline date: 2026-07-31

Decision owner for unresolved engineering facts: `laocao`

## 1. Purpose

This specification defines how Begapunk product facts are inventoried, compared, traced to evidence, and held for engineering review. It does not select authoritative values and does not authorize changes to public product content.

The Phase 1A baseline is an observation layer. It records what each source says, but it does not turn repeated website text, translations, search indexes, or an untracked local catalog into engineering truth.

## 2. Product fact record

Every normalized product fact must be representable with these fields:

| Field | Meaning |
| --- | --- |
| `model` | Normalized Begapunk model identifier. |
| `field` | Canonical field name. |
| `normalized_value` | Comparison-safe value without discarding the original observation. |
| `unit` | Canonical unit, or `null` for unitless/text facts. |
| `language` | Source language, such as `en`, `de`, `ja`, or `ru`. |
| `source_path` | Repository-relative or approved local read-only path. |
| `source_type` | How the source participates in the publishing or evidence chain. |
| `source_hash` | SHA-256 of the exact source file. |
| `evidence_level` | Evidence classification defined below. |
| `verification_status` | Current verification state. |
| `observation_status` | Whether the value was re-read from a current source or retained only as a historical/manual lead. |
| `public_claim_level` | Whether the observation may be stated publicly. |
| `last_checked_at` | Deterministic audit date in `YYYY-MM-DD` format. |
| `decision_owner` | Person responsible for an unresolved engineering decision. |
| `notes` | Source limitations, qualifiers, or other audit context. |

The original source value must always be retained next to the normalized value in an audit observation. Normalization is for comparison only and must not silently rewrite a public fact.

## 3. Evidence levels

Evidence levels describe source position, not automatic approval:

- `engineering-primary`: engineering drawing, CAD, controlled measurement, or another primary engineering artifact.
- `approved-datasheet`: formally approved technical datasheet.
- `controlled-catalog`: controlled catalog or product master maintained under an approval process.
- `website-generated`: English website content, product tables, product cards, or JSON-LD generated for publication.
- `translated-content`: localized content derived from another language or translation source.
- `search-or-ai-index`: search index, sitemap-oriented text, `llms.txt`, or another discovery derivative.
- `local-untracked-source`: local material outside Git tracking that is permitted for read-only comparison.
- `unknown`: provenance or approval state cannot be established.

Engineering drawings or approved formal technical materials are the highest evidence sources for engineering parameters, but Codex has no authority to independently declare that a specific file has been approved.

A filename, PDF title, local `VERIFIED` label, repeated website value, or translation does not prove formal approval.

## 4. Verification status

- `verified`: evidence and approval status are both established.
- `unverified`: an observation exists but its authority has not been established.
- `conflict`: two or more current observations disagree.
- `manual-review-required`: engineering or business judgment is required.
- `missing-evidence`: a public observation has no traceable primary or approved supporting fact.
- `not-applicable`: the field does not apply to the model or source.

Phase 1A defaults conflicts to `conflict`/`unresolved` and assigns the decision to `laocao`. The audit script must finish successfully when business conflicts are found; only parsing failures, damaged required structures, or program errors are blocking failures.

Observation status is separate from approval status:

- `current-observed`: the value was re-read from a current source with field-aware parsing.
- `historical-unverified`: a prior audit statement is retained as history and is corroborated by a separately parsed current source, but the historical record itself is not evidence.
- `stale-reference`: a prior audit statement points to a path or location where the value is no longer present, or the referenced path no longer exists.
- `source-identity-mismatch`: a binary or controlled artifact exists, but its internal model identity does not match the target model. The artifact remains inventoried but cannot classify field values for that target.
- `parser-ambiguous`: the current text cannot be assigned to the field without guessing.
- `manual-review-required`: the referenced current artifact exists but requires visual, engineering, or other manual review.

Only `current-observed` values may participate in an active conflict. The other statuses remain visible as findings and must not independently create a current conflict.

## 5. Public claim levels

- `public-verified`: approved evidence supports the exact public claim and scope.
- `public-with-qualification`: publication may be acceptable only with explicit conditions or limits.
- `internal-only`: retain for internal comparison; do not publish as a product fact.
- `prohibited-until-verified`: do not publish or propagate until the decision owner confirms the supporting engineering evidence.

No Phase 1A conflict is promoted to `public-verified`.

## 6. Canonical fields

The baseline normalizes common labels into these canonical fields:

- `model`
- `passages`
- `channel_configuration`
- `port_thread`
- `maximum_pressure`
- `maximum_speed`
- `operating_temperature`
- `body_material`
- `seal_material`
- `compatible_media`
- `mounting_style`
- `stator_mounting_pattern`
- `rotor_mounting_pattern`
- `unassigned_mounting_pattern`
- `weight`
- `protection_rating`
- `friction_torque`
- `warranty`
- `test_pressure`

Additional fields may be added only when their meaning and unit are unambiguous. Translated labels map to the same canonical field, but translated wording alone must not create a winning engineering value.

## 7. Model normalization

- Trim whitespace and convert model identifiers to uppercase.
- Normalize spaces and underscores used as separators to hyphens.
- Preserve meaningful segments and leading zeroes.
- Do not merge similar-looking models unless an approved cross-reference exists.
- Treat document-title mismatches as identity conflicts, not as automatic aliases.

## 8. Conflict rules

An `active_conflict` exists only when all of these conditions are met:

1. The observations use the same normalized model.
2. The observations use the same canonical field.
3. At least two different normalized values remain.
4. Every compared value was re-read from a current source.
5. No compared parse is ambiguous.
6. Units were normalized before comparison.

For every conflict:

1. Retain every observed raw value.
2. Retain source path, type, hash, language, and evidence level.
3. Set `status` to `unresolved`.
4. Set `decision_owner` to `laocao`.
5. State which engineering material should be checked.
6. Record whether the conflict reaches public HTML, JSON-LD, search, or AI indexes.
7. Do not write a `correct_value`, `winner`, or equivalent field.

For multi-value interface-thread observations, normalize every listed interface in stable order (for example, `G1/4 and G1/8 ports` becomes `g1/4|g1/8`). When one current observation is a strict subset of another and neither source claims exclusivity, classify the result as `coverage-difference`; do not treat broader information coverage as a mutually exclusive active conflict.

Historical values are preserved, not deleted. They are reported separately as historical findings, stale references, parser ambiguities, or manual-review items. A historical record never becomes current evidence by repetition; a separate current-source parse must establish the current observation.

Field parsing must use field semantics. For example, `4 passages with Ø30 mm hollow bore` means four passages; the bore diameter must never be captured as the passage count. If the parser cannot distinguish the concepts, it records `parser-ambiguous` and excludes the observation from active conflict counting.

Mounting facts are structured by meaning:

- `port_thread` records media-interface threads such as G1/8, G1/4, NPT, or BSP.
- `mounting_style` records the general installation form, such as flange or threaded mount.
- `stator_mounting_pattern` and `rotor_mounting_pattern` record their respective hole patterns.
- A hole pattern without a reliable stator or rotor assignment is retained as `unassigned_mounting_pattern` with manual review, not as a `mounting_style` ambiguity.
- Thread depth is a dimension of a threaded hole; it does not establish a `threaded` mounting style.
- A general flange style and a detailed flange hole pattern are complementary, not mutually exclusive values.

Before a visually reviewed binary artifact can classify a field, its internal model identity must match the target model. A mismatch produces `source-identity-mismatch`; no field conclusion may be derived from that artifact for the target model. Reports count unique mismatched documents separately from the number of observations affected by those documents; all affected observations remain traceable.

## 8.1 Evidence domains

Missing evidence must match the fact domain:

- `engineering`: pressure, speed, temperature, weight, materials, seals, media compatibility, and mounting dimensions.
- `business-policy`: warranty, refund, lead time, and payment terms.
- `controlled-product-master`: model identity, SKU, and product name.
- `legal-compliance`: certifications and regulatory claims.
- `order-specific`: custom configurations and order-confirmed parameters.

An engineering drawing is not a universal evidence requirement. For example, warranty requires an approved business policy, while model identity requires a controlled product master or a formally controlled drawing with a matching internal model.

## 9. Automatic versus manual verification

May be automated:

- file existence, Git tracking state, SHA-256, and parseability;
- model and field-name normalization;
- numeric unit conversion used only for comparison;
- cross-source equality and difference detection;
- presence of a model or claim in public, structured, search, and AI sources;
- deterministic report generation.

Requires manual engineering verification:

- approval status and revision applicability of drawings, PDFs, CAD, DXF, spreadsheets, or datasheets;
- the correct value when sources disagree;
- whether values apply to a complete assembly, subassembly, optional shroud, or order-specific configuration;
- media compatibility, IP/protection level, mounting pattern, pressure, speed, temperature, material, and mass when evidence is incomplete;
- whether a translated or marketing description preserves the approved engineering scope.

## 10. Binary engineering files

PDF, DXF, DWG, STEP, STP, IGES, IGS, XLS, and XLSX files are inventoried by:

- path;
- file type;
- SHA-256;
- model references inferable from the filename;
- Git tracking state;
- `manual-engineering-verification-required`.

Phase 1A does not use OCR to guess parameters and does not treat unverified extracted text as an approved fact.

## 11. Local untracked sources

`catalog-project/` is read-only:

- it may be hashed and compared;
- its files remain `local-untracked-source`;
- it must not be edited, staged, committed, deleted, or copied wholesale into Git;
- only necessary differences, paths, and hashes may appear in tracked audit reports.

## 12. Change control

Resolving a conflict is a later task and requires:

1. the exact model and field;
2. the approved engineering source and applicable revision;
3. an explicit decision from `laocao`;
4. a declared scope covering HTML, JSON-LD, translations, search, AI indexes, downloads, and generated sources;
5. independent validation and review before merge or deployment.

This governance document does not authorize product fact changes, PR merge, or production deployment.
