import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from 'cheerio';
import { downloadLinkLabel } from '../scripts/lib/download-link-label.mjs';

function label(html) {
  const $ = load(html);
  return downloadLinkLabel($, $('a')[0]);
}

test('download labels include image alternative text and preserve ordinary text', () => {
  assert.equal(label('<a href="drawing.pdf"><img alt="BP-10P-0001 outline drawing"></a>'), 'BP-10P-0001 outline drawing');
  assert.equal(label('<a href="drawing.pdf"> Download <strong>PDF</strong> </a>'), 'Download PDF');
  assert.equal(label('<a href="drawing.pdf" aria-label="Open drawing"><img alt="Product"></a>'), 'Open drawing');
  assert.equal(label('<a href="drawing.pdf" title="Open drawing"><img alt=""></a>'), 'Open drawing');
});

test('unnamed, decorative and hidden images cannot satisfy the download label gate', () => {
  for (const content of ['<img>', '<img alt="">', '<img alt="  ">', '<img role="presentation" alt="Decorative">', '<img role="none" alt="Decorative">', '<img hidden alt="Hidden">', '<span aria-hidden="true"><img alt="Hidden"></span>']) {
    assert.equal(label(`<a href="drawing.pdf">${content}</a>`), '', content);
  }
  assert.equal(label('<a href="drawing.pdf" aria-label=" "><img alt="Drawing"></a>'), 'Drawing');
});
