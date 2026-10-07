// Static label check for download links. Image-only links receive their name
// from the image's alternative text; Cheerio's text() does not include it.
export function downloadLinkLabel($, element) {
  const normalize = (value) => String(value || '').replace(/\s+/gu, ' ').trim();
  const explicit = normalize($(element).attr('aria-label'));
  if (explicit) return explicit;

  const content = $(element).clone();
  content.find('[hidden], [aria-hidden="true"], script, style').remove();
  content.find('img').each((_, image) => {
    const imageNode = $(image);
    const decorative = ['presentation', 'none'].includes(imageNode.attr('role'));
    imageNode.replaceWith($('<span>').text(decorative ? '' : imageNode.attr('alt') || ''));
  });
  return normalize(content.text()) || normalize($(element).attr('title'));
}
