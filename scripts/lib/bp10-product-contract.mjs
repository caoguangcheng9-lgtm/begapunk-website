import assert from 'node:assert/strict';

// Owner-approved BP-10P configuration. It deliberately does not inherit the
// legacy 16-model contract's PTFE seal, continuous-speed or pricing assumptions.
export function assertBp10ProductContract($, locale, label) {
  label = label.replaceAll('\\', '/');
  const values = $('.spec-table tr').toArray().map(e => $(e).find('td').text().trim());
  const labels = $('.spec-table tr').toArray().map(e => $(e).find('th').text().trim());
  const copy = {
    en: ['Compressed air', 'intermittent', 'O-ring', 'None', 'Approximate', '1 year from shipment'],
    de: ['Druckluft', 'intermittierende', 'O-Ring', 'Keine', 'Ungefähres', '1 Jahr ab Versand'],
    fr: ['Air comprimé', 'intermittente', 'Joint torique', 'Aucun', 'approximative', '1 an à compter de l’expédition'],
    ja: ['圧縮空気', '間欠', 'Oリング', 'なし', '概算', '出荷日から1年間'],
    ru: ['Сжатый воздух', 'прерывистое', 'Кольцо круглого сечения O-ring', 'Нет', 'Ориентировочная', '1 год с даты отгрузки'],
  }[locale];
  assert.ok(copy, `${label}: unsupported locale`);
  assert.equal(values.length, 17, `${label}: specification scope`);
  assert.equal(values[0], 'BP-10P-0001', label);
  assert.equal(values[1], '10', label);
  assert.equal(values[2], copy[0], `${label}: compressed-air-only configuration`);
  assert.match(values[3], /^1 (MPa|МПа) /u, `${label}: pressure`);
  assert.match(values[4], /^100 /u, `${label}: speed`);
  assert.ok(values[4].includes(copy[1]), `${label}: intermittent duty must be explicit`);
  assert.match(values[5], /0[–−-]80.*°C/u, `${label}: temperature`);
  assert.match(values[6], /6061/u, `${label}: body material`);
  assert.equal(values[7], copy[2], `${label}: O-ring, no inherited PTFE specification`);
  assert.match(values[8], /20 × G1\/8|G1\/8 × 20/u, `${label}: ports`);
  assert.equal((values[8].match(/10/g) || []).length, 2, `${label}: inlet/outlet counts`);
  assert.equal((values[9].match(/10/g) || []).length, 2, `${label}: fitting counts`);
  assert.match(values[9], /8\s*(mm|мм)/u, `${label}: fitting tube diameter`);
  assert.equal(values[10], copy[3], `${label}: no through bore`);
  assert.match(values[11], /[ØφΦ]80\s*×\s*217/u, `${label}: body dimensions`);
  assert.match(values[12], /217 × 117[.,]5 × 115[.,]8/u, `${label}: fitted envelope`);
  assert.match(values[13], /10 × M5 × 0[.,]8.*[ØφΦ]66.*12|PCD Ø66 mm上にM5 × 0.8を10か所、完全ねじ部深さ12 mm/u, `${label}: rotor mounting`);
  assert.match(values[14], /10 × M5 × 0[.,]8.*[ØφΦ]68.*10|PCD Ø68 mm上にM5 × 0.8を10か所、完全ねじ部深さ10 mm/u, `${label}: stator mounting`);
  assert.match(values[15], /^(?:継手込み約)?3[.,]4\s*(kg|кг)/u, `${label}: approximate weight`);
  assert.ok(labels[15].toLowerCase().includes(copy[4].toLowerCase()), `${label}: weight qualification`);
  assert.match(values[16], /^1\b/u, `${label}: MOQ`);
  assert.ok($('.pd-key-specs').text().includes(copy[5]), `${label}: one-year-from-shipment warranty`);
  assert.equal($('.pd-key-specs .pd-key-spec').length || $('.pd-key-specs > div').length, 6, `${label}: six commercial fields`);
  const graph = JSON.parse($('script[type="application/ld+json"]').text())['@graph'];
  const product = graph.find(n => n['@type'] === 'Product');
  assert.deepEqual(product.additionalProperty.map(p => [p.name, p.value]), labels.map((l, i) => [l, values[i]]), `${label}: visible/schema parity`);
  assert.equal(product.offers, undefined, `${label}: no unsupported price`);
  const faqs = graph.find(n => n['@type'] === 'FAQPage').mainEntity;
  const visibleFaqs = $('.faq-item').toArray().map(e => [$(e).find('summary').text().trim(), $(e).find('.faq-answer').text().trim()]);
  assert.equal(visibleFaqs.length, 5, `${label}: FAQ scope`);
  assert.deepEqual(faqs.map(q => [q.name, q.acceptedAnswer.text]), visibleFaqs, `${label}: FAQ/schema parity`);
  for (const ext of ['pdf', 'step']) assert.ok($(`a[href$="downloads/BP-10P-0001.${ext}"]`).length, `${label}: direct ${ext} download`);
  for (const id of ['panel-specs', 'panel-compat', 'panel-install', 'panel-downloads', 'mainNav', 'siteFooter']) assert.equal($(`#${id}`).length, 1, `${label}: ${id}`);
  const links = $('main a[href^="contact.html?"]').toArray();
  assert.ok(links.length > 0, `${label}: inquiry entry`);
  for (const e of links) {
    const url = new URL($(e).attr('href'), 'https://www.begapunk.com/');
    assert.equal(url.searchParams.get('model'), 'BP-10P-0001', `${label}: RFQ model`);
    assert.equal(url.searchParams.get('source'), label, `${label}: RFQ source`);
    assert.equal(url.searchParams.get('product'), $('h1').text().trim(), `${label}: localized RFQ label`);
    assert.equal(url.searchParams.get('request'), 'quote', `${label}: quote request`);
    assert.equal(url.hash, '#quoteForm', `${label}: quote form anchor`);
  }
}
