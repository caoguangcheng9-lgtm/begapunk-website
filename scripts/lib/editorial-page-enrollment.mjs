import { isDeepStrictEqual } from 'node:util';

function requireCondition(condition, message) {
  if (!condition) throw new Error(`Page enrollment: ${message}`);
}

export function enrollmentScope(before, after) {
  const safePages = value => Array.isArray(value) && value.length > 0
    && value.every(p => typeof p === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*\.html$/.test(p))
    && new Set(value).size === value.length;
  requireCondition(safePages(before.pages) && safePages(after.pages), 'invalid or duplicate configured pages.');
  const languages = before.activeLanguageCodes;
  requireCondition(Array.isArray(languages) && languages.length > 0
    && new Set(languages).size === languages.length
    && languages.every(l => /^[a-z]{2}(?:-[A-Z]{2})?$/.test(l))
    && isDeepStrictEqual(languages, after.activeLanguageCodes), 'language scope must stay unchanged.');
  requireCondition(before.pages.every(p => after.pages.includes(p)), 'existing pages cannot be removed or renamed.');
  const addedPages = after.pages.filter(p => !before.pages.includes(p));
  return { addedPages, addedPaths: languages.flatMap(l => addedPages.map(p => `${l}/${p}`)).sort(), languages };
}

// A null/null before-state represents actual absence, never an invented old hash.
export function validReviewBefore(transition) {
  return (transition.beforeSemanticSha256 === null && transition.beforeMechanicalSha256 === null)
    || (/^[a-f0-9]{64}$/.test(transition.beforeSemanticSha256 ?? '')
      && /^[a-f0-9]{64}$/.test(transition.beforeMechanicalSha256 ?? ''));
}

export function enrolledStatus({ beforeConfig, config, baselineStatus, baselineRef, evidence, artifacts }) {
  const { addedPages, addedPaths, languages } = enrollmentScope(beforeConfig, config);
  requireCondition(addedPaths.length > 0, 'no new pages were configured.');
  requireCondition(/^[a-f0-9]{40}$/.test(baselineRef ?? '') && evidence.baselineRef === baselineRef,
    'evidence must bind the exact trusted baseline commit.');
  requireCondition(isDeepStrictEqual([...evidence.paths].sort(), addedPaths),
    'evidence paths must exactly cover every new localized page, without duplicates.');
  requireCondition(baselineStatus.reviewedArtifactSnapshot.pagesPerLanguage === beforeConfig.pages.length,
    'baseline snapshot scope is inconsistent.');
  const requiredViews = baselineStatus.renderQa.viewportsPerPage;
  requireCondition(Number.isInteger(requiredViews) && requiredViews >= 2, 'invalid baseline viewport requirement.');
  requireCondition(Array.isArray(evidence.renderChecks)
    && evidence.renderChecks.length === addedPaths.length * requiredViews, 'missing or extra render evidence.');
  const byPath = new Map(artifacts.map(a => [a.path, a]));
  for (const p of addedPaths) {
    const checks = evidence.renderChecks.filter(c => c.path === p);
    requireCondition(checks.length === requiredViews
      && new Set(checks.map(c => `${c.width}x${c.height}`)).size === requiredViews,
    `${p}: missing or duplicate viewport checks.`);
    requireCondition(checks.some(c => c.width <= 480) && checks.some(c => c.width >= 1024),
      `${p}: mobile and desktop evidence are both required.`);
    for (const check of checks) {
      requireCondition(Number.isInteger(check.width) && check.width > 0
        && Number.isInteger(check.height) && check.height > 0 && check.result === 'PASS'
        && typeof check.browser === 'string' && check.browser.trim().length > 0
        && /^[a-f0-9]{64}$/.test(check.mechanicalSha256 ?? '')
        && check.mechanicalSha256 === byPath.get(p)?.mechanicalSha256,
      `${p}: render evidence must bind the exact reviewed artifact and real browser result.`);
    }
  }
  const next = structuredClone(baselineStatus);
  for (const language of languages) {
    requireCondition(Array.isArray(next.languages?.[language]?.reviewed)
      && addedPages.every(p => !next.languages[language].reviewed.includes(p)), 'new page already in baseline readiness.');
    next.languages[language].reviewed.push(...addedPages);
    requireCondition(Number.isInteger(next.seoGeo?.[language]?.reviewed)
      && next.seoGeo[language].total === beforeConfig.pages.length, 'invalid baseline SEO count.');
    next.seoGeo[language].reviewed += addedPages.length;
    next.seoGeo[language].total += addedPages.length;
  }
  requireCondition(next.renderQa.pagesPerLanguage === beforeConfig.pages.length
    && next.renderQa.checkedViewports === beforeConfig.pages.length * languages.length * requiredViews,
  'invalid baseline render counts.');
  next.renderQa.pagesPerLanguage += addedPages.length;
  next.renderQa.checkedViewports += evidence.renderChecks.length;
  next.reviewedArtifactSnapshot.pagesPerLanguage = config.pages.length;
  return next;
}

export function readinessFields({ updatedAt, reviewedArtifactSnapshot, ...rest }) { return rest; }

export function assertEnrolledArtifact(artifact, enrollment, baselineAt) {
  const semantic = artifact?.semanticProvenance;
  const mechanical = artifact?.mechanicalProvenance;
  for (const provenance of [semantic, mechanical]) {
    requireCondition(provenance && provenance.record === enrollment.record
      && provenance.recordSha256 === enrollment.recordSha256
      && provenance.baselineManifestUpdatedAt === baselineAt
      && Date.parse(provenance.recordedAt) > Date.parse(baselineAt), 'new artifact provenance is not bound to enrollment evidence.');
  }
  requireCondition(semantic.kind === 'ai-assisted-reviewed-semantic-change'
    && semantic.semanticReviewPerformed === true && semantic.nativeSpeakerReviewPerformed === false
    && semantic.beforeSemanticSha256 === null && semantic.afterSemanticSha256 === artifact.semanticSha256
    && mechanical.kind === 'semantic-review-artifact-capture'
    && mechanical.beforeMechanicalSha256 === null && mechanical.afterMechanicalSha256 === artifact.mechanicalSha256,
  'new artifact requires a reviewed absence-to-content transition.');
}
