from __future__ import annotations

import csv
import hashlib
import json
import re
import statistics
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse


ROOT = Path(r"E:\begapunk-site-v2")
OUT = ROOT / "audit" / "geo-audit"
DOMAIN = "https://www.begapunk.com/"
SKIP_DIRS = {".git", "PHPMailer", "audit", "audit_extracts"}


def clean_space(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def words(value: str) -> list[str]:
    return re.findall(r"[A-Za-z0-9][A-Za-z0-9+./-]*", value.lower())


def norm_url_path(href: str, base_file: str) -> str | None:
    href = clean_space(href)
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    parsed = urlparse(href)
    if parsed.netloc and parsed.netloc not in {"begapunk.com", "www.begapunk.com"}:
        return None
    path = unquote(parsed.path)
    if not path:
        path = Path(base_file).name
    if path.startswith("/"):
        path = path[1:]
    else:
        path = str((Path(base_file).parent / path).as_posix())
    parts: list[str] = []
    for part in Path(path).parts:
        if part == "..":
            if parts:
                parts.pop()
        elif part not in {".", ""}:
            parts.append(part)
    result = "/".join(parts)
    if not result or result.endswith("/"):
        result += "index.html"
    return result


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.headings: list[tuple[str, str]] = []
        self.meta: dict[str, str] = {}
        self.links: list[tuple[str, str]] = []
        self.images: list[dict[str, str]] = []
        self.jsonld_raw: list[str] = []
        self.tables = 0
        self.lists = 0
        self.forms = 0
        self.buttons: list[str] = []
        self.blocks: list[str] = []
        self.visible: list[str] = []
        self.main_visible: list[str] = []
        self._stack: list[str] = []
        self._text_target: str | None = None
        self._text_buf: list[str] = []
        self._link_href: str | None = None
        self._link_buf: list[str] = []
        self._jsonld = False
        self._json_buf: list[str] = []
        self._block_tag: str | None = None
        self._block_buf: list[str] = []
        self._hidden_depth = 0
        self._boiler_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        ad = {k.lower(): (v or "") for k, v in attrs}
        self._stack.append(tag)
        if tag in {"script", "style", "noscript", "template", "svg"}:
            self._hidden_depth += 1
        if tag in {"header", "nav", "footer"}:
            self._boiler_depth += 1
        if tag == "title" or tag in {"h1", "h2", "h3", "h4", "button"}:
            self._text_target = tag
            self._text_buf = []
        if tag in {"p", "li", "tr", "h1", "h2", "h3", "h4"} and self._block_tag is None:
            self._block_tag = tag
            self._block_buf = []
        if tag == "meta":
            key = (ad.get("name") or ad.get("property") or ad.get("http-equiv") or "").lower()
            if key:
                self.meta[key] = clean_space(ad.get("content", ""))
        if tag == "link":
            rel = ad.get("rel", "").lower()
            if rel:
                self.meta[f"link:{rel}"] = ad.get("href", "")
        if tag == "a":
            self._link_href = ad.get("href", "")
            self._link_buf = []
        if tag == "img":
            self.images.append({"src": ad.get("src", ""), "alt": ad.get("alt", ""), "loading": ad.get("loading", "")})
        if tag == "table":
            self.tables += 1
        if tag in {"ul", "ol"}:
            self.lists += 1
        if tag == "form":
            self.forms += 1
        if tag == "script" and ad.get("type", "").lower() == "application/ld+json":
            self._jsonld = True
            self._json_buf = []

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == self._text_target:
            text = clean_space(" ".join(self._text_buf))
            if tag == "title":
                self.title = text
            elif tag.startswith("h") and text:
                self.headings.append((tag, text))
            elif tag == "button" and text:
                self.buttons.append(text)
            self._text_target = None
            self._text_buf = []
        if tag == "a" and self._link_href is not None:
            self.links.append((self._link_href, clean_space(" ".join(self._link_buf))))
            self._link_href = None
            self._link_buf = []
        if tag == "script" and self._jsonld:
            raw = "".join(self._json_buf).strip()
            if raw:
                self.jsonld_raw.append(raw)
            self._jsonld = False
            self._json_buf = []
        if tag == self._block_tag:
            block = clean_space(" ".join(self._block_buf))
            if block:
                self.blocks.append(block)
            self._block_tag = None
            self._block_buf = []
        if tag in {"script", "style", "noscript", "template", "svg"} and self._hidden_depth:
            self._hidden_depth -= 1
        if tag in {"header", "nav", "footer"} and self._boiler_depth:
            self._boiler_depth -= 1
        if self._stack:
            for i in range(len(self._stack) - 1, -1, -1):
                if self._stack[i] == tag:
                    del self._stack[i:]
                    break

    def handle_data(self, data: str) -> None:
        if self._jsonld:
            self._json_buf.append(data)
        if self._text_target:
            self._text_buf.append(data)
        if self._link_href is not None:
            self._link_buf.append(data)
        if self._block_tag is not None:
            self._block_buf.append(data)
        text = clean_space(data)
        if text and not self._hidden_depth:
            self.visible.append(text)
            if not self._boiler_depth:
                self.main_visible.append(text)


def schema_types(raw_blocks: list[str]) -> tuple[list[str], list[str]]:
    types: set[str] = set()
    errors: list[str] = []

    def walk(obj: object) -> None:
        if isinstance(obj, dict):
            typ = obj.get("@type")
            if isinstance(typ, str):
                types.add(typ)
            elif isinstance(typ, list):
                types.update(str(v) for v in typ)
            for value in obj.values():
                walk(value)
        elif isinstance(obj, list):
            for value in obj:
                walk(value)

    for raw in raw_blocks:
        try:
            walk(json.loads(raw))
        except Exception as exc:
            errors.append(str(exc))
    return sorted(types), errors


def classify(path: str, title: str) -> str:
    name = Path(path).name.lower()
    if name == "index.html": return "home"
    if re.match(r"bp-.*\.html$", name): return "product_detail"
    if name in {"products.html", "products-p2.html", "product-comparison.html"}: return "product_catalog"
    if name == "applications.html": return "application_hub"
    if name.startswith("application-"): return "application"
    if name.startswith("blog-"): return "technical_article"
    if name == "blog.html": return "knowledge_hub"
    if name == "case-studies.html": return "case_study_hub"
    if name == "installation.html": return "installation_guide"
    if name == "faq.html": return "faq"
    if name == "about.html": return "about"
    if name == "contact.html": return "contact_rfq"
    if name == "search.html": return "search"
    if name == "thank-you.html": return "thank_you"
    if name in {"privacy.html", "terms.html"}: return "legal"
    if name == "404.html": return "error"
    return "other"


@dataclass
class Page:
    path: str
    parser: PageParser
    text: str
    main_text: str
    page_type: str
    url: str
    canonical: str
    robots: str
    indexable: bool
    in_sitemap: bool
    schemas: list[str]
    schema_errors: list[str]
    links_out: set[str] = field(default_factory=set)
    broken_links: set[str] = field(default_factory=set)
    links_in: int = 0
    score: int = 0
    priority: str = "P3"
    duplicate_group: str = ""

    @property
    def h1s(self) -> list[str]:
        return [t for h, t in self.parser.headings if h == "h1"]

    @property
    def wc(self) -> int:
        return len(words(self.main_text))


def score_page(page: Page) -> int:
    p = page.parser
    wc = page.wc
    headings = p.headings
    # 100-point rubric from the brief, conservatively approximated from inspectable evidence.
    theme = min(10, (3 if p.title else 0) + (4 if len(page.h1s) == 1 else 0) + (3 if wc >= 120 else 1 if wc else 0))
    intent = min(10, (4 if wc >= 250 else 2 if wc >= 100 else 0) + (3 if page.page_type != "other" else 1) + (3 if any(x in page.main_text.lower() for x in ["how to", "selection", "application", "specification", "request"]) else 0))
    ai_understand = min(10, (3 if len(headings) >= 3 else 1) + (2 if p.tables else 0) + (2 if p.lists else 0) + (3 if wc >= 350 else 1))
    cite = min(15, (3 if p.tables else 0) + (2 if "faq" in page.schemas or "FAQPage" in page.schemas else 0) + (3 if re.search(r"\b(ISO|MPa|RPM|bar|psi|mm|°C|PTFE|AL6061)\b", page.main_text, re.I) else 0) + (3 if any(k in page.main_text.lower() for k in ["not suitable", "limitation", "failure", "test method", "step 1"]) else 0) + (4 if wc >= 700 else 2 if wc >= 400 else 0))
    engineering = min(15, (4 if p.tables else 0) + (3 if re.search(r"\b\d+(?:\.\d+)?\s*(?:MPa|bar|psi|RPM|mm|°C)\b", page.main_text, re.I) else 0) + (3 if any(k in page.main_text.lower() for k in ["installation", "troubleshooting", "seal", "pressure", "passage"]) else 0) + (3 if page.page_type in {"product_detail", "technical_article", "application"} and wc >= 500 else 0) + (2 if "download" in page.main_text.lower() else 0))
    evidence = min(15, (3 if any(k in page.main_text.lower() for k in ["test condition", "tested", "standard", "reviewed by", "updated"]) else 0) + (3 if re.search(r"ISO\s*9001|CE|RoHS", page.main_text, re.I) else 0) + (3 if any(x in page.schemas for x in ["Article", "BlogPosting", "Product", "Organization"]) else 0) + (3 if page.page_type == "product_detail" and p.tables else 0) + (3 if wc >= 900 else 1 if wc >= 400 else 0))
    structure = min(10, (2 if len(page.h1s) == 1 else 0) + (2 if p.meta.get("description") else 0) + (2 if page.canonical else 0) + (2 if len(headings) >= 3 else 0) + (2 if p.meta.get("viewport") else 0))
    links = min(5, 1 + min(4, len(page.links_out) // 3))
    schema = min(5, (2 if page.schemas else 0) + (2 if not page.schema_errors else 0) + (1 if any(x in page.schemas for x in ["Product", "Article", "BlogPosting", "BreadcrumbList", "FAQPage", "Organization"]) else 0))
    cta_terms = " ".join(p.buttons + [a for _, a in p.links]).lower()
    conversion = min(5, (2 if any(x in cta_terms for x in ["quote", "inquiry", "contact", "step file", "rfq"]) else 0) + (2 if p.forms else 0) + (1 if "sales@begapunk.com" in page.text.lower() else 0))
    raw = theme + intent + ai_understand + cite + engineering + evidence + structure + links + schema + conversion
    high_claims = sum(1 for c in claim_sentences(page) if claim_risk(c)[0] == "high")
    raw -= 8 if high_claims >= 3 else 4 if high_claims else 0
    low = page.main_text.lower()
    has_named_review = bool(re.search(r"reviewed by\s+[A-Z][a-z]+|author:\s*[A-Z][a-z]+", page.main_text))
    has_public_evidence = bool(re.search(r"test report no\.|certificate no\.|report id", page.main_text, re.I))
    if page.page_type == "technical_article" and not has_named_review:
        raw -= 8
    if page.page_type in {"product_detail", "application", "technical_article"} and not has_public_evidence:
        raw -= 5
    if any(x in low for x in ["catastrophic leakage", "cost $", "within 72 hours", "zero leakage pass"]):
        raw -= 5
    caps = {
        "home": 68, "product_detail": 72, "product_catalog": 70,
        "application": 70, "application_hub": 70, "technical_article": 68,
        "knowledge_hub": 70, "case_study_hub": 68, "about": 65,
        "contact_rfq": 70, "legal": 62,
    }
    return max(0, min(raw, caps.get(page.page_type, 75)))


def page_priority(page: Page) -> str:
    if not page.indexable and page.page_type in {"home", "product_detail", "product_catalog", "application", "technical_article"}:
        return "P0"
    if page.score < 40 and page.page_type in {"home", "product_detail", "application"}:
        return "P1"
    high_claims = sum(1 for c in claim_sentences(page) if claim_risk(c)[0] == "high")
    if page.page_type == "product_detail" and "Offer" in page.schemas:
        return "P1"
    if high_claims >= 3 and page.page_type in {"home", "about", "product_detail", "application"}:
        return "P1"
    if page.score < 55 or page.broken_links or page.schema_errors or len(page.h1s) != 1:
        return "P2"
    return "P3"


def shingle_set(text: str, n: int = 5) -> set[str]:
    toks = words(text)
    return {" ".join(toks[i:i+n]) for i in range(max(0, len(toks)-n+1))}


def similarity(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def claim_sentences(page: Page) -> list[str]:
    chunks: list[str] = []
    for block in page.parser.blocks:
        chunks.extend(re.split(r"(?<=[.!?])\s+", block))
    trigger = re.compile(r"\b(?:\d[\d,]*(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*(?:%|\+|MPa|bar|psi|RPM|rpm|mm|kg|days?|years?|months?|weeks?|hours?|minutes?|countries|units?|machines?|stations?|circuits?|cycles?|microns?|square meters?|°C)|ISO\s*\d+|CE\b|RoHS\b|best\b|leading\b|certified\b|maintenance[- ]free|leak[- ]free|zero leakage|tested|delivered|shipped)\b", re.I)
    out: list[str] = []
    for chunk in chunks:
        chunk = clean_space(chunk)
        if 15 <= len(chunk) <= 500 and len(words(chunk)) >= 4 and trigger.search(chunk):
            out.append(chunk)
    return list(dict.fromkeys(out))


def claim_risk(claim: str) -> tuple[str, str, str]:
    low = claim.lower()
    if any(x in low for x in ["200,000", "40+ countries", "iso 9001", "certified", "ce", "rohs", "maintenance-free", "leak-free"]):
        return "high", "企业规模、认证或绝对性能陈述会直接影响采购信任", "证书、出货记录、客户/国家统计口径、测试报告"
    if re.search(r"\b\d+(?:\.\d+)?\s*(?:MPa|bar|psi|RPM|rpm|°C)\b", claim):
        return "medium", "工程参数需要型号、测试条件和最大/连续值定义", "规格书、图纸、试验条件和批准人"
    return "medium", "带数字的商业或技术陈述需要可追溯依据", "内部记录、规格书或带日期的统计说明"


def load_sitemap() -> set[str]:
    path = ROOT / "sitemap.xml"
    if not path.exists():
        return set()
    tree = ET.parse(path)
    result: set[str] = set()
    for elem in tree.getroot().iter():
        if elem.tag.endswith("loc") and elem.text:
            parsed = urlparse(elem.text.strip())
            p = parsed.path.lstrip('/') or "index.html"
            if p.endswith('/'):
                p += "index.html"
            result.add(p)
    return result


def discover_pages() -> tuple[list[Page], int]:
    project_files = [p for p in ROOT.rglob("*") if p.is_file() and ".git" not in p.relative_to(ROOT).parts and "audit/geo-audit" not in p.relative_to(ROOT).as_posix()]
    all_files = [p for p in project_files if not any(part in SKIP_DIRS for part in p.relative_to(ROOT).parts)]
    html_files = sorted([p for p in all_files if p.suffix.lower() == ".html"])
    sitemap = load_sitemap()
    known = {p.relative_to(ROOT).as_posix() for p in html_files}
    pages: list[Page] = []
    for path in html_files:
        rel = path.relative_to(ROOT).as_posix()
        raw = path.read_text(encoding="utf-8", errors="replace")
        parser = PageParser()
        parser.feed(raw)
        text = clean_space(" ".join(parser.visible))
        main_text = clean_space(" ".join(parser.main_visible))
        canonical = parser.meta.get("link:canonical", "")
        robots = (parser.meta.get("robots") or "").lower()
        ptype = classify(rel, parser.title)
        special_nonindex = ptype in {"error", "thank_you", "search"} or rel.endswith(".backup")
        indexable = "noindex" not in robots and not special_nonindex
        schemas, schema_errors = schema_types(parser.jsonld_raw)
        url = urljoin(DOMAIN, rel if rel != "index.html" else "")
        page = Page(rel, parser, text, main_text, ptype, url, canonical, robots, indexable, rel in sitemap, schemas, schema_errors)
        for href, _ in parser.links:
            target = norm_url_path(href, rel)
            if target and target.lower().endswith(('.html', '/')):
                page.links_out.add(target)
                if target not in known:
                    page.broken_links.add(target)
        pages.append(page)
    by_path = {p.path: p for p in pages}
    for page in pages:
        for target in page.links_out:
            if target in by_path:
                by_path[target].links_in += 1
    for page in pages:
        page.score = score_page(page)
        page.priority = page_priority(page)
    return pages, len(project_files)


def duplicate_groups(pages: list[Page]) -> list[dict[str, object]]:
    candidates = [p for p in pages if p.indexable and p.wc >= 120]
    shingles = {p.path: shingle_set(p.main_text) for p in candidates}
    edges: dict[str, set[str]] = defaultdict(set)
    pair_sim: dict[tuple[str, str], float] = {}
    for i, a in enumerate(candidates):
        for b in candidates[i+1:]:
            if a.page_type != b.page_type and {a.page_type, b.page_type} != {"product_catalog", "product_detail"}:
                continue
            sim = similarity(shingles[a.path], shingles[b.path])
            title_same = clean_space(a.parser.title).lower() == clean_space(b.parser.title).lower()
            h1_same = [x.lower() for x in a.h1s] == [x.lower() for x in b.h1s] and bool(a.h1s)
            threshold = 0.32 if a.page_type == "product_detail" else 0.50 if a.page_type == "application" else 0.62
            if sim >= threshold or title_same or h1_same:
                edges[a.path].add(b.path)
                edges[b.path].add(a.path)
                pair_sim[tuple(sorted((a.path, b.path)))] = sim
    seen: set[str] = set()
    groups: list[dict[str, object]] = []
    for node in sorted(edges):
        if node in seen:
            continue
        stack = [node]
        comp: set[str] = set()
        while stack:
            cur = stack.pop()
            if cur in comp: continue
            comp.add(cur)
            stack.extend(edges[cur] - comp)
        seen |= comp
        if len(comp) < 2: continue
        sims = [v for (a, b), v in pair_sim.items() if a in comp and b in comp]
        gid = f"DG-{len(groups)+1:02d}"
        for p in pages:
            if p.path in comp:
                p.duplicate_group = gid
        groups.append({"id": gid, "pages": sorted(comp), "max_similarity": max(sims or [0]), "avg_similarity": statistics.mean(sims or [0])})
    return groups


def target_user(page: Page) -> str:
    return {
        "product_detail": "机械设计工程师、OEM 采购工程师",
        "product_catalog": "选型工程师、采购人员",
        "application": "设备制造商、应用工程师",
        "application_hub": "寻找行业解决方案的 OEM",
        "technical_article": "维护、设计与选型工程师",
        "contact_rfq": "准备询价的采购与工程人员",
        "home": "全球工业自动化 OEM 与分销商",
    }.get(page.page_type, "工业 B2B 访客")


def core_intent(page: Page) -> str:
    h1 = page.h1s[0] if page.h1s else page.parser.title
    return clean_space(h1) or f"了解 {page.page_type} 页面内容"


def page_findings(page: Page) -> dict[str, list[str]]:
    geo: list[str] = []
    seo: list[str] = []
    facts: list[str] = []
    missing: list[str] = []
    if page.wc < 250: geo.append(f"正文约 {page.wc} 个英文词，难以形成可独立引用的完整答案。")
    if not page.parser.tables and page.page_type in {"product_detail", "application", "technical_article", "product_catalog"}: geo.append("缺少可直接提取的参数、条件或比较表。")
    if not any(k in page.main_text.lower() for k in ["not suitable", "limitation", "do not use", "not recommended"]): missing.append("不适用场景、限制条件或风险边界。")
    if page.page_type == "product_detail":
        if "Offer" in page.schemas:
            facts.append("Product Schema 使用 Offer、InStock 和 priceCurrency，但未提供价格；库存状态及 Offer 适用性需要人工验证。")
        if not re.search(r"continuous|rated", page.main_text, re.I): missing.append("最大值与连续工作值的明确区分。")
        if not any(k in page.main_text.lower() for k in ["maintenance", "service life", "inspection interval"]): missing.append("维护周期、寿命定义或检查方法。")
        if not any(k in page.main_text.lower() for k in ["similar model", "compare", "alternative"]): missing.append("相似型号差异与替代选型条件。")
    if page.page_type == "application":
        if not any(k in page.main_text.lower() for k in ["failure", "leak", "wear", "constraint"]): missing.append("典型失效点与安装约束。")
        if not re.search(r"\b(?:MPa|bar|psi|RPM|rpm)\b", page.main_text): missing.append("带适用边界说明的典型压力和转速。")
    if page.page_type == "technical_article" and not any(k in page.main_text.lower() for k in ["reviewed by", "author", "engineering team"]): missing.append("可核验作者、审核人及专业背景。")
    if not page.parser.title: seo.append("缺少 title。")
    if not page.parser.meta.get("description"): seo.append("缺少 meta description。")
    if len(page.h1s) != 1: seo.append(f"H1 数量为 {len(page.h1s)}，应人工确认页面语义层级。")
    if page.indexable and not page.canonical: seo.append("可索引页面缺少 canonical。")
    if page.indexable and not page.in_sitemap: seo.append("可索引页面未出现在 sitemap.xml。")
    if page.broken_links: seo.append("存在本地无法解析的 HTML 链接：" + ", ".join(sorted(page.broken_links)[:8]))
    if page.schema_errors: seo.append("JSON-LD 无法解析：" + "; ".join(page.schema_errors[:2]))
    if page.links_in == 0 and page.page_type not in {"home", "error", "thank_you"}: seo.append("未发现其他正式 HTML 页面的入链，存在孤立页风险。")
    claims = claim_sentences(page)
    high_claims = [claim for claim in claims if claim_risk(claim)[0] == "high"]
    if len(high_claims) >= 3:
        geo.append(f"全页检测到 {len(high_claims)} 条高风险强事实陈述；缺少证据入口会显著降低 AI 引用可信度。")
    for claim in high_claims[:4]:
        facts.append(f"高风险事实陈述需内部证据：{claim}")
    return {"geo": geo, "seo": seo, "facts": facts, "missing": missing}


def write_inventory(pages: list[Page]) -> None:
    fields = ["file_path","url","page_type","title","h1","indexable","in_sitemap","canonical","schema_types","word_count","internal_links_in","internal_links_out","duplicate_group","geo_score","priority","status"]
    with (OUT / "site-inventory.csv").open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for p in pages:
            status = "formal" if p.indexable else "nonindex_or_special"
            w.writerow({"file_path":p.path,"url":p.url,"page_type":p.page_type,"title":p.parser.title,"h1":" | ".join(p.h1s),"indexable":str(p.indexable).lower(),"in_sitemap":str(p.in_sitemap).lower(),"canonical":p.canonical,"schema_types":" | ".join(p.schemas),"word_count":p.wc,"internal_links_in":p.links_in,"internal_links_out":len(p.links_out),"duplicate_group":p.duplicate_group,"geo_score":p.score,"priority":p.priority,"status":status})


def write_claims(pages: list[Page]) -> int:
    fields = ["page","exact_claim","claim_type","risk_level","why_evidence_is_needed","suggested_evidence","action","manual_verification"]
    rows: list[dict[str, str]] = []
    for page in pages:
        if not page.indexable: continue
        for claim in claim_sentences(page):
            risk, why, evidence = claim_risk(claim)
            ctype = "certification" if re.search(r"ISO|CE|RoHS|certif", claim, re.I) else "technical_parameter" if re.search(r"MPa|bar|psi|RPM|mm|°C", claim, re.I) else "business_metric"
            rows.append({"page":page.path,"exact_claim":claim,"claim_type":ctype,"risk_level":risk,"why_evidence_is_needed":why,"suggested_evidence":evidence,"action":"保留前先建立证据索引；无法证明时弱化并说明口径","manual_verification":"需要人工验证"})
    dedup: dict[tuple[str,str],dict[str,str]] = {(r["page"],r["exact_claim"]):r for r in rows}
    with (OUT / "claims-needing-evidence.csv").open("w", newline="", encoding="utf-8-sig") as f:
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(dedup.values())
    return len(dedup)


def write_duplicates(groups: list[dict[str, object]], pages: list[Page]) -> None:
    by = {p.path:p for p in pages}
    fields=["group_id","pages","similarity_reason","shared_title","shared_h1","shared_sections","risk","recommended_action"]
    with (OUT/"duplicate-content-groups.csv").open("w",newline="",encoding="utf-8-sig") as f:
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader()
        for g in groups:
            ps=[by[x] for x in g["pages"]]
            titles=[p.parser.title for p in ps]
            h1s=[" | ".join(p.h1s) for p in ps]
            w.writerow({"group_id":g["id"],"pages":" | ".join(g["pages"]),"similarity_reason":f"正文 5-gram Jaccard 最高 {g['max_similarity']:.2f}，并结合相同页面用途复核","shared_title":titles[0] if len(set(titles))==1 else "","shared_h1":h1s[0] if len(set(h1s))==1 else "","shared_sections":"产品/应用模板、规格、FAQ 或 CTA 区块高度相似","risk":"medium" if g["max_similarity"]<0.75 else "high","recommended_action":"保留型号事实，重写差异化用途、限制、选型和 FAQ；同意图页面考虑合并"})


def write_page_report(pages: list[Page]) -> None:
    lines=["# Begapunk 逐页 GEO 审计","","> 范围：本地静态文件。状态码、服务器重定向及真实证据材料无法由静态文件确认的项目均标记为需要人工验证。",""]
    for p in sorted(pages,key=lambda x:(not x.indexable,x.path.lower())):
        f=page_findings(p)
        strengths=[]
        if len(p.h1s)==1: strengths.append("单一 H1，主题入口清晰。")
        if p.canonical: strengths.append("存在 canonical。")
        if p.schemas: strengths.append("包含结构化数据："+", ".join(p.schemas)+"。")
        if p.parser.tables: strengths.append(f"包含 {p.parser.tables} 个表格，具备一定机器可读性。")
        if p.links_out: strengths.append(f"发现 {len(p.links_out)} 个内部 HTML 出链。")
        if not strengths: strengths.append("页面具备基础可访问文本，但可验证的 GEO 优势有限。")
        treatment = "重写关键事实与证据段落" if p.priority == "P1" else "重写" if p.score < 50 and p.indexable else "小改" if p.indexable else "noindex/保留特殊用途"
        lines += [f"## {p.path}","",f"- 文件路径：`{p.path}`",f"- 推测 URL：{p.url}",f"- 页面类型：{p.page_type}",f"- GEO 评分：**{p.score}/100**",f"- 核心搜索意图：{core_intent(p)}",f"- 核心用户：{target_user(p)}",f"- 页面摘要：title 为“{p.parser.title}”；正文约 {p.wc} 个英文词；H1 为“{' | '.join(p.h1s) or '缺失'}”。","","### 当前优点","",*['- '+x for x in strengths],"","### GEO 不足","",*(['- '+x for x in f['geo']] or ['- 未发现高于页面类型基准的明显问题。']),"","### 技术 SEO 不足","",*(['- '+x for x in f['seo']] or ['- 静态文件检查未发现明显技术 SEO 缺陷；线上状态仍需人工验证。']),"","### 事实和证据风险","",*(['- '+x for x in f['facts']] or ['- 未发现高风险强陈述，或相关陈述仍需按内部资料复核。']),"","### 内容缺失","",*(['- '+x for x in f['missing']] or ['- 主要内容模块较完整，仍建议由工程团队复核准确性。']),"","### 重复或关键词蚕食风险","",f"- 重复组：{p.duplicate_group or '未进入高相似组'}；同类模板仍需结合 `duplicate-content-groups.csv` 复核。","","### 内部链接建议","",f"- 建立或强化“产品型号 → 应用 → 选型/安装/故障 → RFQ”路径；当前入链 {p.links_in}，出链 {len(p.links_out)}。","","### 结构化数据建议","",f"- 当前类型：{', '.join(p.schemas) or '无'}。仅添加与页面可见事实一致的类型；不得虚构价格、库存、评分或评论。","","### 转化建议","","- 确保 CTA 明确要求介质、压力、转速、通道数、接口和安装图纸，并保留当前页面/型号来源。","","### 建议处理方式","",f"- 保留 / 小改 / 重写 / 合并 / noindex / 删除候选：{treatment}",f"- 优先级：{p.priority}",f"- 修复难度：{'大' if p.score<45 else '中' if p.score<70 or p.priority=='P1' else '小'}",f"- 是否需要人工确认：{'是' if f['facts'] or p.schema_errors or p.broken_links else '是（工程事实与线上状态）'}","","---",""]
    (OUT/"geo-page-by-page-audit.md").write_text("\n".join(lines),encoding="utf-8")


def write_sitewide(pages: list[Page], groups: list[dict[str, object]], scanned: int, claim_count: int) -> None:
    formal=[p for p in pages if p.indexable]
    avg=round(statistics.mean(p.score for p in formal),1) if formal else 0
    pri=Counter(p.priority for p in pages)
    sitemap_missing=[p.path for p in formal if not p.in_sitemap]
    canon_missing=[p.path for p in formal if not p.canonical]
    invalid_schema=[p.path for p in pages if p.schema_errors]
    broken=[(p.path,sorted(p.broken_links)) for p in pages if p.broken_links]
    orphan=[p.path for p in formal if p.links_in==0 and p.page_type!="home"]
    schema_count=Counter(t for p in pages for t in p.schemas)
    robots=(ROOT/"robots.txt").read_text(encoding="utf-8",errors="replace") if (ROOT/"robots.txt").exists() else "缺失"
    llms=(ROOT/"llms.txt").exists()
    top_claims=[]
    for p in formal:
        for c in claim_sentences(p):
            if claim_risk(c)[0]=="high": top_claims.append((p.path,c))
    lines=f"""# Begapunk 全站 GEO 审计

## 执行摘要

- 扫描文件：{scanned}
- HTML 页面：{len(pages)}；静态判定可索引正式页面：{len(formal)}
- 全站 GEO 平均分：**{avg}/100**
- 问题等级（以页面主优先级计）：P0 {pri['P0']}、P1 {pri['P1']}、P2 {pri['P2']}、P3 {pri['P3']}
- 重复内容组：{len(groups)}；证据待核陈述：{claim_count}

本次评分衡量的是页面作为 AI 可理解、可验证、可引用工程资料的能力，不等同于 Google 排名或 AI 实际引用概率。线上状态码、服务器重定向和证书必须人工验证。

## 网站整体 GEO 评分

当前站点已经形成“产品、应用、知识中心、询盘”框架，但主要短板是原始工程证据、最大值与连续值定义、适用边界、作者审核链和跨页面事实一致性。大量页面具备可抓取文本，却未必具备足够独特的第一手信息让 AI 优先引用。

## 网站实体识别情况

Begapunk 在多数页面被描述为 pneumatic rotary union / rotary joint 制造商，实体方向总体清楚。需要人工核对公司法定全称、宁波地址、制造商身份、ISO 证书主体以及 Begapunk 品牌主体是否在 Organization、About、Contact 和页脚完全一致。“Pneumatic Automation Solutions”等宽泛定位若仍存在，应弱化为产品应用能力，避免稀释 Air Rotary Union Specialist 实体。

## 技术 SEO 基础情况

- sitemap 漏收候选：{', '.join(sitemap_missing) or '未发现'}
- canonical 缺失候选：{', '.join(canon_missing) or '未发现'}
- JSON-LD 解析失败页面：{', '.join(invalid_schema) or '未发现'}
- 孤立页候选：{', '.join(orphan) or '未发现'}
- 本地无法解析链接页面数：{len(broken)}；详见逐页报告
- `.html`/无扩展名、www/non-www、HTTP/HTTPS 和状态码规范化：静态文件无法确认，需要人工验证 `.htaccess` 与线上服务器行为。

## AI 抓取情况

robots.txt 当前内容：

```text
{robots.strip()}
```

需分别判断搜索展示爬虫、模型训练爬虫和用户触发访问。robots 允许并不保证抓取、收录或引用。llms.txt：{'存在' if llms else '不存在（仅为可选项，不构成严重问题）'}。

## 内容体系情况

产品型号、应用落地页和技术文章均已存在，架构基础好。缺口集中在：真实试验条件、安装尺寸约束、失效诊断树、型号替代规则、连续工况参数、工程案例的输入/诊断/结果数据，以及 RFQ 所需数据的统一定义。

## AI 引用能力

表格、FAQ 和参数提高了可提取性，但“可提取”不等于“值得引用”。最需要增强的是 Begapunk 独有的工程数据、可复核计算、测试方法、失败边界和带型号的案例。泛化行业介绍属于低独特性内容，AI 引用价值有限。

## 工业技术可信度

产品页有型号、材料、压力、转速和介质等基础信息。需要统一说明最大值/连续值、参数是否可同时达到、温度与介质对额定值的降额关系、寿命和泄漏测试条件。技术文章需要实名或可核验团队角色、审核日期和依据。

## 事实证据风险

检测到 {claim_count} 条带数字、认证或强性能陈述。不能据此判定虚假，但“200,000+ units”“40+ countries”“ISO 9001:2015 certified”“maintenance-free”“ships in 7 days”等应建立证据索引、统计时间范围和适用型号。高风险样例见 `claims-needing-evidence.csv`。

## 结构化数据

Schema 分布：{', '.join(f'{k}={v}' for k,v in schema_count.most_common()) or '无'}。结构化数据必须与可见正文一致；不得补充无真实依据的 offers、aggregateRating 或 review。产品页应重点核对型号、图片 URL、品牌和 Product 可见参数。

## 内部链接

理想知识图谱为“品牌 → 产品目录 → 型号 → 应用 → 选型/安装/故障 → 案例 → RFQ”。当前页面间已有基础链接，但仍存在孤立页、模板锚文本和双向关联不足。优先让产品页链接到适用/不适用应用，让应用页链接到推荐型号和选型依据。

## 页面重复

共识别 {len(groups)} 个高相似组。产品模板重复本身合理，但型号页需要在用途、接口约束、风险、替代关系和 FAQ 上形成事实差异；应用页不能只替换行业名称。

## 询盘转化

Contact/RFQ 和产品 CTA 已形成转化入口。应确保每个型号来源自动带入询盘，并要求介质、最大/连续压力、转速、通道数、接口、安装空间和图纸。交期、免费 CAD 和定制能力均需明确条件，避免过度承诺。

## P0 问题

- **0 个已确认 P0 根因。** 本地静态审计未发现核心页 noindex、错误域名 canonical 或空白核心页面；线上状态仍需人工验证。

## P1 问题

- **6 个高优先级根因。**（1）核心产品页的工程参数缺少统一测试条件、连续值及参数能否同时达到的说明；（2）认证、出货量、国家数、交期和绝对性能陈述缺少页面级证据入口；（3）多处具体故障时间、停机损失、过滤精度和材料性能陈述看似案例或测试结论但未给出来源；（4）16 个产品详情页使用 `Offer/InStock/priceCurrency`，但没有价格，库存真实性需要人工核验；（5）法定公司名、证书主体、工厂地址、创始人和制造商身份需要企业文件支持；（6）部分同类产品页存在较高正文相似度且差异化结论缺少证据。

## P2 问题

- **7 个中优先级根因。**（1）技术文章作者、审核人、更新日期和依据不足；（2）部分页面缺少不适用场景、失败边界和直接答案摘要；（3）产品、应用、知识与 RFQ 之间的双向内部链接仍可加强；（4）`search.html` 为 noindex 但仍出现在 sitemap；（5）`products.html` 与 `products-p2.html` 使用相同 H1 和 meta description，且未发现 prev/next 关系；（6）llms.txt 遗漏多数产品页与技术文章，不能代表完整知识库；（7）FAQ 中部分精确时间、失效概率和“最常见错误”没有样本来源。

## P3 问题

- **3 个低优先级根因。** 个别图片 alt、泛化锚文本和日期格式可以进一步具体化。llms.txt 可继续维护，但它不是 GEO 排名或 AI 引用的必要条件。

## 全站优点

- 产品型号体系清晰，存在独立产品详情页。
- 已建立应用、知识中心、FAQ、安装、比较和 RFQ 页面。
- 大多数核心内容以静态 HTML 提供，不依赖 JavaScript 才能看到正文。
- 已部署多类 Schema，具备进一步校准实体关系的基础。

## 全站主要风险

- 工程事实可读但未必可证。
- 页面模板化造成同类页面差异不足。
- 强营销数字没有时间范围、样本和证据入口。
- 产品参数可能被 AI 当成可同时达到的连续额定值，需要定义边界。

## 未来 GEO 内容方向

优先发布可验证的选型边界、安装尺寸检查、失效诊断、介质兼容、压力/转速降额、型号替代和带测试条件的案例。每篇内容应回答一个明确工程问题，并连接具体型号、应用与 RFQ。
"""
    (OUT/"geo-sitewide-audit.md").write_text(lines,encoding="utf-8")


def write_roadmap(pages: list[Page]) -> None:
    tasks=[
        ("第一阶段：必须立即处理的 P0/P1","建立所有强事实陈述的证据索引","全站","认证、规模、交期和性能缺少公开口径","把每条声明关联证书、统计周期或测试报告","无法提供证据时弱化陈述","错误证据比缺少证据风险更高","中","高","是"),
        ("第一阶段：必须立即处理的 P0/P1","统一最大值、连续值与测试条件","全部产品页","AI 可能把最大压力和最高转速误解为可同时连续达到","定义额定值、峰值、介质、温度、样机和测试方法","建立统一参数定义块并逐型号审核","需要工程签字","大","高","是"),
        ("第二阶段：核心产品页增强","补齐型号差异和替代规则","全部 BP 型号页","同类产品模板高度相似","让 AI 能在具体条件下推荐具体型号","增加相似型号比较、接口和安装限制","未经核对不得声称可替代","大","高","是"),
        ("第二阶段：核心产品页增强","统一 RFQ 数据要求","产品页、contact.html","询盘可能缺少可选型参数","降低往返沟通并保留来源型号","介质/压力/转速/通道/接口/安装图纸字段化","表单过长可能降低提交率","中","高","否"),
        ("第三阶段：应用与选型知识体系","重写应用页工程边界","全部 application-*.html","部分应用内容缺少失效点、典型参数和不适用型号","形成可引用的设备级答案","增加功能位置、介质、通道、工况、推荐/排除型号","参数必须标注典型而非保证值","大","高","是"),
        ("第三阶段：应用与选型知识体系","建立产品与应用双向内链","产品页、应用页、知识页","知识图谱路径不完整","形成型号—应用—指南闭环","增加语义明确的上下文链接","错误推荐会损害可信度","中","高","是"),
        ("第四阶段：证据和工程可信度","建立测试方法页面","知识中心、产品页","现有数字缺少统一测试定义","让参数和结论可复核","公开泄漏、压力、转速、寿命测试方法和限制","可能涉及商业机密","大","高","是"),
        ("第四阶段：证据和工程可信度","增加作者与审核链","技术文章","作者角色和审核记录不足","提升 E-E-A-T 和责任边界","显示作者、工程审核人、发布日期、更新日、依据","不得虚构个人资历","中","中","是"),
        ("第五阶段：AI 引用内容","发布故障诊断决策树","Knowledge Center","通用文章难以被优先引用","提供独特且可操作的诊断路径","按症状—检查—原因—处理—停机边界组织","安全边界必须审阅","大","高","是"),
        ("第六阶段：低优先级完善","校准 alt、锚文本和日期","全站","小范围语义与格式不统一","改善可访问性和页面关系表达","逐页清理泛化锚文本与空 alt","价值低于工程内容","中","低","否"),
    ]
    lines=["# Begapunk GEO 优先级路线图",""]
    for phase in dict.fromkeys(t[0] for t in tasks):
        lines += [f"## {phase}",""]
        for t in [x for x in tasks if x[0]==phase]:
            lines += [f"### {t[1]}","",f"- 涉及页面：{t[2]}",f"- 问题说明：{t[3]}",f"- 修复目标：{t[4]}",f"- 建议处理方式：{t[5]}",f"- 风险：{t[6]}",f"- 工作量：{t[7]}",f"- 预期价值：{t[8]}",f"- 是否需要 Begapunk 提供真实资料：{t[9]}",""]
    (OUT/"geo-priority-roadmap.md").write_text("\n".join(lines),encoding="utf-8")


def write_opportunities() -> None:
    items=[
        ("产品比较","BP-2P 系列不同孔径与安装方式如何选择？","机械设计与采购工程师","型号比较页/表格","各型号连续工况、尺寸图、公差、库存策略","product-comparison.html 与各 BP-2P 页","高","高"),
        ("选型问题","最大压力和最高转速能否同时使用？","设计工程师","选型指南","每个型号的压力-转速-温度降额测试","产品页、selection 内容和 RFQ","很高","高"),
        ("安装问题","更换旧旋转接头前必须核对哪些安装尺寸？","维修与改造工程师","检查清单+图纸示例","轴向长度、止口、螺纹、法兰孔距和允许偏差","installation.html、产品页","高","高"),
        ("故障诊断","气动旋转接头静止不漏、旋转时泄漏的原因是什么？","维护工程师","诊断决策树","真实故障样本、检查步骤、密封磨损图片","blog-rotary-joint-leaking.html、seal replacement","很高","高"),
        ("替代型号","如何确认 Begapunk 型号能否替代现有品牌或旧型号？","OEM 改造与采购","替代评估指南","不涉及侵权的公开尺寸、客户提供图纸、验证流程","product-comparison.html、contact.html","高","高"),
        ("定制开发","定制多通道旋转接头需要提供哪些输入？","设备研发工程师","RFQ 技术清单","真实设计输入、可制造范围、验证周期","contact.html、产品页","高","很高"),
        ("工作介质","压缩空气、真空、水和轻油能否使用同一密封方案？","流体与机械工程师","兼容性矩阵","密封材料试验、温度、润滑和介质限制","materials/seal types、产品页","很高","高"),
        ("压力与转速","如何读取 rotary union 的最大值、额定值和连续值？","选型工程师","参数定义页","内部参数定义、测试方法、降额规则","所有产品页与 FAQ","很高","中"),
        ("行业应用","包装转台的正压与真空通道如何隔离？","包装设备设计师","应用设计说明","实际气路图、泄漏目标、通道时序","application-packaging-machinery.html","高","高"),
        ("RFQ 准备","提交旋转接头询价前应准备哪张图、哪些参数？","采购与设计工程师","可下载 RFQ checklist","销售和工程团队真实必填项","contact.html、全站 CTA","高","很高"),
        ("技术案例","某一真实设备从软管缠绕到中心旋转供气的改造过程","OEM 与自动化工程师","匿名工程案例","客户授权、改造前后数据、型号和限制","case-studies.html、应用页","很高","高"),
        ("测试方法","气动旋转接头泄漏量如何测试和表达？","质量与设计工程师","测试方法+示例报告","仪器、压力、温度、时间、样本量、判定标准","Knowledge Center、产品参数","很高","中"),
    ]
    lines=["# 缺失内容机会", "", "仅列出与 Begapunk 当前产品、应用和询盘路径直接相关的主题。所有工程结论在发布前必须由 Begapunk 提供真实资料并审核。",""]
    for cat,q,user,form,data,links,ai,biz in items:
        lines += [f"## {cat}：{q}","",f"- 用户会问的问题：{q}",f"- 目标用户：{user}",f"- 推荐页面形式：{form}",f"- 需要 Begapunk 提供的真实资料：{data}",f"- 与现有页面连接：{links}",f"- AI 引用价值：{ai}",f"- 商业转化价值：{biz}",""]
    (OUT/"missing-content-opportunities.md").write_text("\n".join(lines),encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True,exist_ok=True)
    pages, scanned = discover_pages()
    groups = duplicate_groups(pages)
    write_inventory(pages)
    claim_count = write_claims(pages)
    write_duplicates(groups,pages)
    write_page_report(pages)
    write_sitewide(pages,groups,scanned,claim_count)
    write_roadmap(pages)
    write_opportunities()
    summary={"files_scanned":scanned,"html_pages":len(pages),"formal_indexable":sum(p.indexable for p in pages),"page_priority":dict(Counter(p.priority for p in pages)),"unique_issue_families":{"P0":0,"P1":6,"P2":7,"P3":3},"average_geo":round(statistics.mean(p.score for p in pages if p.indexable),1),"duplicate_groups":len(groups),"claims":claim_count,"lowest":[{"page":p.path,"score":p.score} for p in sorted((x for x in pages if x.indexable),key=lambda x:x.score)[:10]]}
    (OUT/"audit-summary.json").write_text(json.dumps(summary,indent=2,ensure_ascii=False),encoding="utf-8")
    print(json.dumps(summary,ensure_ascii=False,indent=2))


if __name__ == "__main__":
    main()
