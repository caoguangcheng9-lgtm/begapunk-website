import assert from 'node:assert/strict';

// BEGAPUNK's strict subset of https://llmstxt.org/#format (v2):
// H1, short quoted summary, heading-free preamble, then H2 file lists.
export function assertLlmsV2Structure(text) {
  assert.ok(text.startsWith('# BEGAPUNK\n\n> '), 'H1 must be followed immediately by the quoted company summary');
  assert.equal((text.match(/^# /gm) || []).length, 1, 'Exactly one H1');
  assert.doesNotMatch(text, /^#{3,}\s/m, 'Use H2 file lists, not H3 navigation');
  assert.doesNotMatch(text, /\r|\u0000|\uFFFD/u, 'UTF-8 / LF content');
  assert.ok(text.endsWith('\n'), 'Final LF required');
  const start = text.indexOf('\n## ');
  assert.ok(start > 0, 'At least one H2 file list is required for this index');
  const preamble = text.slice(0, start);
  const summary = preamble.split('\n')[2];
  assert.ok(summary.startsWith('> ') && summary.length > 20, 'Company summary required');
  assert.ok(preamble.indexOf('For LLMs and agents:') > preamble.indexOf(summary), 'Agent purpose follows summary');
  assert.ok(preamble.includes('**Legal Entity & Registration**'), 'Core identity belongs in the preamble');
  assert.ok(preamble.includes('**Business contact**'), 'Business contact belongs in the preamble');
  assert.doesNotMatch(preamble.slice('# BEGAPUNK\n'.length), /^#+ /m, 'No preamble headings');
  assert.match(preamble, /^> Use the current model PDF for installation\./m, 'Document boundary uses a Markdown quote');
  const headings = new Set();
  let links = 0;
  for (const section of text.slice(start + 1).split(/^## /m).filter(Boolean)) {
    const [heading, ...lines] = section.split('\n');
    assert.ok(heading.trim() && !headings.has(heading), 'Unique nonempty H2');
    headings.add(heading);
    const entries = lines.filter(line => line.trim());
    assert.ok(entries.length > 0, `${heading}: no empty file lists`);
    for (const line of entries) {
      assert.match(line, /^- \[[^\]\n]+\]\((?:https?:\/\/|mailto:)[^\s)]+\): \S.*$/u,
        `${heading}: every entry needs [Title](URL): description`);
      links++;
    }
  }
  for (const match of text.matchAll(/\[[^\]\n]+\]\([^\s)]+\)/g)) {
    assert.ok(text.slice(match.index + match[0].length).startsWith(': '), 'Every hyperlink has a colon and description');
  }
  assert.equal((text.match(/\]\(https:\/\/www\.begapunk\.com\/fr\/llms\.txt\)/g)||[]).length, 1, 'French index appears once');
  assert.doesNotMatch(text, /llms-full\.txt/u, 'Do not invent an unverified full-text index');
  return {headingCount: headings.size, fileListEntries: links};
}
