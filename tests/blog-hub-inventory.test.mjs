import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from 'cheerio';
import { blogHubInventoryMatches, publishedBlogRoutes } from '../scripts/lib/blog-hub-inventory.mjs';
const cards = routes => load(routes.map(r => `<article class="blog-card"><h3><a href="${r}">Guide</a></h3></article>`).join(''));
test('new guide cards follow the declared inventory instead of a fixed count', () => {
  const routes = ['old.html', 'new.html'];
  assert.equal(blogHubInventoryMatches(cards(routes), routes), true);
  for (const invalid of [['old.html'], ['old.html','old.html'], ['old.html','other.html'], [...routes,'extra.html']])
    assert.equal(blogHubInventoryMatches(cards(invalid), routes), false);
  assert.equal(blogHubInventoryMatches(cards(['old.html','old.html']), ['old.html','old.html']), false);
});

test('canonical blog inventory rejects unknown, duplicate, external and missing posts', () => {
  const routes = ['old.html', 'new.html'];
  const origin = 'https://www.begapunk.com';
  const document = (urls, cardRoutes = routes) => {
    const $ = cards(cardRoutes);
    $('body').append(`<script type="application/ld+json">${JSON.stringify({
      '@type': 'Blog', blogPost: urls.map(url => ({ '@type': 'BlogPosting', url })),
    })}</script>`);
    return $;
  };
  const urls = routes.map(route => `${origin}/${route}`);
  assert.deepEqual(publishedBlogRoutes(document(urls), routes, origin), routes);
  for (const invalid of [[urls[0]], [urls[0], urls[0]], [urls[0], `${origin}/unknown.html`],
    [urls[0], 'https://example.com/new.html'], [urls[0], `${urls[1]}?preview=true`]]) {
    assert.throws(() => publishedBlogRoutes(document(invalid), routes, origin));
  }
  assert.throws(() => publishedBlogRoutes(document(urls, ['old.html']), routes, origin));
});
