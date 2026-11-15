import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertLlmsV2Structure } from '../scripts/lib/llms-v2-contract.mjs';
import { renderEnglishLlms, llmsIdentity } from '../scripts/lib/llms-document.mjs';

test('English source renders the exact published v2 file', () => {
  const actual = readFileSync(new URL('../llms.txt', import.meta.url), 'utf8');
  assert.equal(actual, renderEnglishLlms());
  const parsed = assertLlmsV2Structure(actual);
  assert.ok(parsed.headingCount > 5 && parsed.fileListEntries > 17);
});

const cases = [
  ['summary after H2', s=>s.replace('# BEGAPUNK\n\n', '# BEGAPUNK\n\n## Company Overview\n\n')],
  ['second H1', s=>s+'\n# Duplicate\n'],
  ['H3 navigation', s=>s.replace('## Optional', '### Optional')],
  ['unlinked H2 prose', s=>s.replace('## Product Catalog\n\n', '## Product Catalog\n\nPlain unlinked paragraph.\n')],
  ['link missing description', s=>s.replace(/^- \[Homepage\].+$/m, '- [Homepage](https://www.begapunk.com/)')],
  ['missing purpose', s=>s.replace('For LLMs and agents:', 'Unspecified purpose:')],
  ['unquoted document boundary', s=>s.replace('> Use the current model PDF', 'Use the current model PDF')],
  ['duplicate French index', s=>s+'\n- [French](https://www.begapunk.com/fr/llms.txt): Duplicate.\n'],
  ['invented llms-full', s=>s+'\n- [Full](https://www.begapunk.com/llms-full.txt): Unverified.\n'],
];
for (const [name, mutate] of cases) test(`v2 rejects ${name}`, () => {
  assert.throws(()=>assertLlmsV2Structure(mutate(renderEnglishLlms())));
});

test('English preamble preserves exact identity, establishment and business contacts', () => {
  const preamble = renderEnglishLlms().split('\n## ')[0];
  for (const value of [llmsIdentity.legalNameZh, llmsIdentity.externalNameEn, llmsIdentity.uscc,
    llmsIdentity.customsRegistration, llmsIdentity.registeredAddress, llmsIdentity.businessEmail,
    llmsIdentity.businessPhone, 'April 28, 2022', 'Monday–Friday, 08:30–17:30', 'UTC+08:00']) {
    assert.ok(preamble.includes(value), `Missing ${value}`);
  }
  assert.ok(preamble.includes('do not constitute independently verified company-specific records'));
  assert.ok(preamble.includes('Registered address:'));
  assert.ok(preamble.includes('do not imply 24-hour online service'));
  assert.equal(llmsIdentity.source.independentlyVerified, false);
});

test('engineering context links target existing full product content, with drawing links separately retained', () => {
  const text = renderEnglishLlms();
  for (const model of ['BP-2P-0002','BP-10P-0001']) {
    assert.ok(text.includes(`https://www.begapunk.com/${model}.html#main-content`));
    assert.ok(text.includes(`https://www.begapunk.com/downloads/${model}.pdf`));
    const html = readFileSync(new URL(`../${model}.html`, import.meta.url), 'utf8');
    assert.match(html, /id=["']main-content["']/);
  }
});
