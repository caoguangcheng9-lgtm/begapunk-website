import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { COMPANY_IDENTITY } from './company-identity.mjs';

export function readProtectedHoseState(html) {
  const $=load(html);
  const scripts=$('script[type="application/ld+json"]').toArray();
  assert.equal(scripts.length,1,'Protected article must have one JSON-LD graph');
  const data=JSON.parse($(scripts[0]).html());
  const article=data['@graph']?.find(n=>n['@type']==='TechArticle');
  const breadcrumb=data['@graph']?.find(n=>n['@type']==='BreadcrumbList');
  assert.equal(article?.author?.['@type'],'Organization');
  assert.ok(breadcrumb,'Protected breadcrumb missing');
  return structuredClone({author:article.author,breadcrumb});
}

export function assertProtectedHoseOutput(current, generated, file='article') {
  const mask=html=>{
    const $=load(html,{sourceCodeLocationInfo:true});
    const nodes=$('script[type="application/ld+json"]').toArray();
    assert.equal(nodes.length,1,`${file}: JSON-LD graph count changed`);
    const data=JSON.parse($(nodes[0]).html());
    const author=data['@graph'].find(n=>n['@type']==='TechArticle').author;
    author.sameAs='__ONLY_ALLOWED_AUTHOR_SOCIAL_CHANGE__';
    const loc=nodes[0].sourceCodeLocation;
    return {schema:data,html:html.slice(0,loc.startTag.endOffset)+'__JSON_LD__'+html.slice(loc.endTag.startOffset)};
  };
  try {
    assert.deepEqual(readProtectedHoseState(generated).author.sameAs,[...COMPANY_IDENTITY.brandSocialProfiles],'Author must use shared approved five accounts');
    const a=mask(current),b=mask(generated);
    assert.deepEqual(b.schema,a.schema,'Non-social Schema fields changed');
    if (b.html!==a.html) {
      let at=0;while(at<Math.min(a.html.length,b.html.length)&&a.html[at]===b.html[at])at++;
      throw new Error(`Non-social HTML bytes changed at offset ${at}`);
    }
  } catch(error) { throw new Error(`${file}: ${error.message}`,{cause:error}); }
}
