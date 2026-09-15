import test from 'node:test';
import assert from 'node:assert/strict';
import { enrollmentScope, enrolledStatus, validReviewBefore } from '../scripts/lib/editorial-page-enrollment.mjs';

const beforeConfig = { activeLanguageCodes: ['fr'], pages: ['old.html'] };
const config = { activeLanguageCodes: ['fr'], pages: ['old.html', 'new.html'] };
const digest = 'a'.repeat(64);
function fixture() {
  return { beforeConfig, config, baselineRef: 'b'.repeat(40),
    baselineStatus: { reviewedArtifactSnapshot: { pagesPerLanguage: 1 },
      languages: { fr: { reviewed: [], inProgress: ['old.html'], remaining: 1 } },
      seoGeo: { fr: { reviewed: 0, total: 1 } },
      renderQa: { pagesPerLanguage: 1, viewportsPerPage: 2, checkedViewports: 2 } },
    artifacts: [{ path: 'fr/new.html', mechanicalSha256: digest }],
    evidence: { baselineRef: 'b'.repeat(40), paths: ['fr/new.html'],
      renderChecks: [390, 1440].map(width => ({ path: 'fr/new.html', width, height: 900,
        browser: 'fixture', result: 'PASS', mechanicalSha256: digest })) } };
}
test('enrollment increments only new-page readiness, preserving preexisting debt', () => {
  const f = fixture(); const result = enrolledStatus(f);
  assert.deepEqual(result.languages.fr, { reviewed: ['new.html'], inProgress: ['old.html'], remaining: 1 });
  assert.equal(result.renderQa.checkedViewports, 4);
  assert.deepEqual(f.baselineStatus.languages.fr.reviewed, []);
});
test('enrollment refuses scope deletion, duplicates, unsafe paths and language changes', () => {
  for (const invalid of [{ ...config, pages: ['new.html'] }, { ...config, pages: ['old.html', 'old.html'] },
    { ...config, pages: ['old.html', '../new.html'] }, { ...config, activeLanguageCodes: ['de'] }])
    assert.throws(() => enrollmentScope(beforeConfig, invalid));
});
test('enrollment refuses forged baseline, missing/duplicate/wrong-hash render evidence and failed QA', () => {
  for (const mutate of [f => f.evidence.baselineRef = 'c'.repeat(40), f => f.evidence.paths.push('fr/new.html'),
    f => f.evidence.renderChecks.pop(), f => f.evidence.renderChecks[0].result = 'FAIL',
    f => f.evidence.renderChecks[0].mechanicalSha256 = 'c'.repeat(64),
    f => f.evidence.renderChecks[0].width = 1440]) {
    const f = fixture(); mutate(f); assert.throws(() => enrolledStatus(f));
  }
});
test('absence is an explicit null pair; partial nulls and empty hashes are invalid', () => {
  assert.equal(validReviewBefore({ beforeSemanticSha256: null, beforeMechanicalSha256: null }), true);
  assert.equal(validReviewBefore({ beforeSemanticSha256: null, beforeMechanicalSha256: digest }), false);
  assert.equal(validReviewBefore({}), false);
});
