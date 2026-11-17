# Bing Japanese title review and legacy drawing alias

reviewedAt: 2026-09-09T08:39:33.186Z
reviewedByRole: Codex AI technical-localization reviewer
reviewMethod: AI-assisted review of all three changed Japanese titles against the current Japanese article bodies; combined original-baseline-to-final review of metadata and X/WhatsApp share text; exact-diff and decoded URL checks
reviewType: ai-assisted-target-market-semantic-review
semanticReviewPerformed: true
nativeSpeakerReviewPerformed: false
referenceUrls: ["https://www.begapunk.com/ja/blog-rotary-joint-materials.html","https://www.begapunk.com/ja/blog-rotary-joint-selection.html","https://www.begapunk.com/ja/blog-rotary-union-seal-types.html"]
referenceAccessDates: ["2026-09-09","2026-09-09","2026-09-09"]
terminologyDecisions: ["Keep ロータリージョイント as the product entity; describe material selection with アルミ・ステンレス・黄銅 already discussed in the article.","Use 流路数・圧力・回転数など5項目 without implying these three are all five criteria; media compatibility and mounting remain in the article.","Keep Oリング・リップシール・ばね式PTFE as the three compared seal families, without claiming any is universally superior."]
searchIntentDecisions: ["Titles explicitly identify material comparison, pneumatic selection, and seal comparison respectively; add Begapunk attribution.","Do not pad Japanese titles to an English-character minimum, change article headings or descriptions, or introduce numerical performance claims."]
unresolvedIssues: []
blockingIssues: []
reviewedArtifactPaths: ["ja/blog-rotary-joint-materials.html","ja/blog-rotary-joint-selection.html","ja/blog-rotary-union-seal-types.html"]
reviewedArtifactTransitions: [{"path":"ja/blog-rotary-joint-materials.html","beforeSemanticSha256":"af4ea4d5a26d37fac1910b83da7d5b4f347805b1f77846b1c501ce23eb95762c","afterSemanticSha256":"19bce50983b6bb5db1f6a3a27b97ed74d75a90e71a2dadc96d45cfdf43e1cde1","beforeMechanicalSha256":"cc5de274d8a04f70f926d9e9817595f9cb333de5df278244399d5b720c95dd9b","afterMechanicalSha256":"754edee133b659caee99ad58baea2f7a523e0b273f380763bb77226872b3099e"},{"path":"ja/blog-rotary-joint-selection.html","beforeSemanticSha256":"7bdaf45d2bef37de45984769d2b6112b629d041f76b1ea081f38b45a84253180","afterSemanticSha256":"7d8a057f5df763b97dcef6ee72755ff9c47fc46e58cf3f18911f9e3e7576b1f0","beforeMechanicalSha256":"7854be7b1805d43f3e5c9994faba49b1168a736272d017933987cf984cfb99da","afterMechanicalSha256":"ed9362046e865c275109f1c5553209c2456e693155c38b20828914381c2cd77e"},{"path":"ja/blog-rotary-union-seal-types.html","beforeSemanticSha256":"53cae418570c6001856c8140363af9b2af3a2d8b86e709ede8a42b1274aac56d","afterSemanticSha256":"9c2d7d700018db5cdf3dec3f30432c558c3910c0699d7890c9ca0511456f276c","beforeMechanicalSha256":"be7777f732e9f95a25a706a817374e62cd952d197a565058c51a31ccd20b355b","afterMechanicalSha256":"d048119e5ac0ab70a58c5217392c5f598703e9974a40e890db99df7fd45b7250"}]

## Scope and evidence

The owner authorized the title-remediation plan on September 9, 2026. This is a narrow AI-assisted title review, not a new full-site review or native-speaker certification. Article text, headings, parameters, drawings and descriptions are unchanged. HTML title, Open Graph title, Twitter title and WebPage name are synchronized with i18n/seo/ja.json. Search and llms indexes carry the same titles. The two existing X/WhatsApp share pairs now encode the current title and unchanged canonical URL. These transitions cover the original approved page through the final title-plus-share candidate in one hop, not just the intermediate title-only version. A comparison against HEAD confirmed that only the reviewed title substitutions, these four share href values, and final-newline normalization changed; article prose, button labels, target, rel, layout and other links are unchanged. No social post or message was sent.

Bing supplied 12 distinct URLs under "title too short": three Japanese HTML pages and nine PDF URLs. On September 9, the eight non-retired online PDFs already had descriptive English metadata identical to local files. The current BP-2P-95-0005 PDF also had descriptive metadata. No PDF binary was rewritten. The PDF skill's inspection workflow was used; its authoring and rendering steps are not applicable because there are no PDF edits.

The exact old /downloads/BP-2P-95-0001.pdf URL returned 404. Current facts and audit/localization/2026-08-27-commercial-product-fact-review.md identify 0001 as a historical entry error and 0005 as the correct production model. Existing server policy already maps the corresponding HTML alias. Add only the exact PDF alias to the current PDF; do not redirect STEP, unrelated models or missing URLs indiscriminately.

## Verification and release boundary

- Localized metadata/structured-data verifier: 188 pages, four languages, four search indexes and four llms indexes passed.
- Search-index check: five language indexes passed.
- PDF metadata and passive-content checks: all 18 public PDFs passed; binaries unchanged.
- Selection-article checks: five languages passed.
- Targeted Japanese title/redirect/share regression tests: six passed after the share-link follow-up. The release-policy and 22-page long-title suite also passed (41 tests in the combined run).
- Snapshot refresh was attempted and refused because the existing working manifest differs from the trusted HEAD baseline. This pre-existing schema migration must be reviewed and committed by an authorized workflow before this record can refresh the three changed snapshots. No baseline was overwritten and no guard was bypassed. Editorial verification therefore still flags these three changed pages (six semantic/mechanical mismatch findings); this is not a release-ready result.
- No production deployment, server reload, Git commit/push, or search-engine submission was performed.
- The privileged Nginx helper's exact policy allowlist also changes; a later authorized deployment must update the trusted installed helper through the established administrator workflow before staging the new policy. Do not loosen that allowlist.
- Bing's crawl time and title-selection source remain unknown. No promise is made that its recommendation disappears immediately after deployment.
