import test from 'node:test';
import assert from 'node:assert/strict';
import { createArtifactSnapshot, verifiedLegacyArtifactSnapshots, assertReviewedBaselineTransition } from '../scripts/lib/editorial-artifact-snapshot.mjs';
const html = '<html lang="fr"><head><title>Produit</title></head><body><h1>Produit</h1></body></html>';
const before = createArtifactSnapshot('fr/index.html', html);
const manifest = { schemaVersion: 1, algorithm: 'sha256-bytes-v1', capturedAt: '2026-09-04T00:00:00Z', artifacts: [{ path: before.path, sha256: before.mechanicalSha256 }] };
const changed = createArtifactSnapshot(before.path, html.replace('Produit</h1>', 'Produit précis</h1>'));
const approved = () => ({ ...changed,
  semanticProvenance: { kind: 'ai-assisted-reviewed-semantic-change', semanticReviewPerformed: true, nativeSpeakerReviewPerformed: false, recordedAt: '2026-09-12T00:00:00Z', beforeSemanticSha256: before.semanticSha256, afterSemanticSha256: changed.semanticSha256 },
  mechanicalProvenance: { kind: 'semantic-review-artifact-capture', recordedAt: '2026-09-12T00:00:00Z', beforeMechanicalSha256: before.mechanicalSha256, afterMechanicalSha256: changed.mechanicalSha256 }
});
test('derive semantic baseline only from sealed Git bytes; LF portable', () => {
  assert.deepEqual(verifiedLegacyArtifactSnapshots(manifest, () => html), [before]);
  assert.throws(() => verifiedLegacyArtifactSnapshots(manifest, () => html + 'x'), /seal/);
  assert.throws(() => verifiedLegacyArtifactSnapshots({ ...manifest, artifacts: [...manifest.artifacts, ...manifest.artifacts] }, () => html), /duplicate/);
  assert.throws(() => verifiedLegacyArtifactSnapshots({ ...manifest, artifacts: [{ path: '../secret', sha256: before.mechanicalSha256 }] }, () => html), /unsafe/);
});
test('unchanged schema migration and exactly reviewed transition pass', () => {
  assert.doesNotThrow(() => assertReviewedBaselineTransition(before, before, manifest.capturedAt));
  assert.doesNotThrow(() => assertReviewedBaselineTransition(before, approved(), manifest.capturedAt));
});
test('unreviewed, rehashed, wrong-parent and stale transitions fail closed', () => {
  assert.throws(() => assertReviewedBaselineTransition(before, changed, manifest.capturedAt), /semantic/);
  for (const mutate of [
    a => a.semanticProvenance.beforeSemanticSha256 = '0'.repeat(64),
    a => a.semanticProvenance.semanticReviewPerformed = false,
    a => a.semanticProvenance.recordedAt = manifest.capturedAt,
    a => a.mechanicalProvenance.beforeMechanicalSha256 = '0'.repeat(64),
    a => a.mechanicalProvenance.afterMechanicalSha256 = before.mechanicalSha256,
    a => a.mechanicalProvenance.recordedAt = 'not a date',
  ]) { const a = approved(); mutate(a); assert.throws(() => assertReviewedBaselineTransition(before, a, manifest.capturedAt)); }
});
