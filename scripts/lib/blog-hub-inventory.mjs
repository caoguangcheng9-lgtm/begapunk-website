export function publishedBlogRoutes(document, configuredPages, origin) {
  const schemas = document('script[type="application/ld+json"]').toArray()
    .map(element => JSON.parse(document(element).text()));
  const blogs = schemas.filter(node => node['@type'] === 'Blog');
  if (blogs.length !== 1 || !Array.isArray(blogs[0].blogPost)) throw new Error('Expected one Blog with a post inventory.');
  const routes = blogs[0].blogPost.map(post => {
    const url = new URL(post.url);
    const route = url.pathname.slice(1);
    if (post['@type'] !== 'BlogPosting' || url.origin !== origin || url.search || url.hash
      || !configuredPages.includes(route)) throw new Error('Invalid or unconfigured blog post URL.');
    return route;
  });
  if (!blogHubInventoryMatches(document, routes)) throw new Error('Blog cards and structured inventory must agree exactly.');
  return routes;
}

export function blogHubInventoryMatches(document, routes) {
  if (!Array.isArray(routes) || !routes.length || new Set(routes).size !== routes.length) return false;
  const cards = document('.blog-card').toArray();
  const actual = cards.map(card => document(card).find('h3 a[href]').attr('href'));
  return cards.length === routes.length && new Set(actual).size === actual.length
    && actual.every(route => routes.includes(route));
}
