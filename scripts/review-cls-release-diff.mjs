// Read-only evidence materialization for the explicitly reviewed release scope.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { load } from 'cheerio';
import { createArtifactSnapshot, verifiedLegacyArtifactSnapshots } from './lib/editorial-artifact-snapshot.mjs';
const baseline = '1df9f815143055992dcdf32850206b080831069a';
const reviewedContent = '3f215df1e69088a2c23cc325eb2e92457777fb0c';
const git = (ref, file) => execFileSync('git', ['show', `${ref}:${file}`], { maxBuffer: 16 * 1024 * 1024 });
const legacy = JSON.parse(git(baseline, 'audit/localization/current-localized-artifacts.json'));
const snapshots = verifiedLegacyArtifactSnapshots(legacy, file => git(baseline, file));
const transitions = [];
const closeLabels = { de: 'Menü schließen', fr: 'Fermer le menu', ja: 'メニューを閉じる', ru: 'Закрыть меню' };
for (const before of snapshots) {
  const source = fs.readFileSync(before.path);
  const old = load(git(reviewedContent, before.path));
  const current = load(source);
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  for (const selector of ['main', 'title', 'h1']) {
    if (norm(old(selector).html()) !== norm(current(selector).html())) throw new Error(`${before.path}: unreviewed ${selector} difference`);
  }
  if (old('meta[name=description]').attr('content') !== current('meta[name=description]').attr('content')) throw new Error('Unexpected description change');
  if (old('link[rel=canonical]').attr('href') !== current('link[rel=canonical]').attr('href')) throw new Error('Unexpected canonical change');
  const close = current('#mainNav > .nav-close');
  if (close.length !== 1 || close.attr('href') !== '#mobileToggle' || close.text() !== closeLabels[before.path.split('/')[0]]) throw new Error('Unreviewed close-menu translation or target');
  if (!current('#mobileToggle').is('a') || current('#mobileToggle').attr('href') !== '#mainNav') throw new Error('Invalid native menu target');
  const after = createArtifactSnapshot(before.path, source);
  if (before.semanticSha256 !== after.semanticSha256) transitions.push({ path: before.path,
    beforeSemanticSha256: before.semanticSha256, afterSemanticSha256: after.semanticSha256,
    beforeMechanicalSha256: before.mechanicalSha256, afterMechanicalSha256: after.mechanicalSha256 });
}
console.log(JSON.stringify({ baseline, reviewedContent, reviewedArtifactPaths: transitions.map(t => t.path), reviewedArtifactTransitions: transitions, verifiedPages: snapshots.length }));
