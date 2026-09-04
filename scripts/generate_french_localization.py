#!/usr/bin/env python3
"""Generate the governed French localization draft from the English source.

This is an intentionally one-language utility.  It uses a locally installed
Argos Translate en->fr model, protects Begapunk product facts and identifiers,
and creates the bulk translation resources needed before the normal Node build
and verification pipeline takes ownership.
"""

from __future__ import annotations

import argparse
import copy
import html as html_module
import json
import os
import re
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parents[1]
I18N = ROOT / "i18n"
FR_DIR = ROOT / "fr"


argos_translate = None
etree = None
html = None


def load_argos() -> None:
    global argos_translate
    if argos_translate is not None:
        return
    try:
        from argostranslate.translate import translate as translator
        argos_translate = translator
        return
    except ImportError:
        pass
    fallback = Path(os.environ.get("LOCALAPPDATA", "")) / "Temp" / "begapunk-argos-runtime-1.11.0"
    if fallback.is_dir():
        sys.path.insert(0, str(fallback))
    try:
        from argostranslate.translate import translate as translator
        argos_translate = translator
    except ImportError as exc:
        raise SystemExit(
            "Argos Translate is unavailable. Install argostranslate 1.11.0 and the en->fr model first."
        ) from exc

def load_lxml() -> None:
    """Load the HTML parser only for actions that actually need it."""
    global etree, html
    if etree is not None and html is not None:
        return
    try:
        from lxml import etree as etree_module, html as html_module
    except ImportError as exc:
        raise SystemExit(
            "lxml is unavailable. Install lxml before generating or editing French HTML pages."
        ) from exc
    etree = etree_module
    html = html_module


GLOSSARY = {
    "custom pneumatic rotary unions": "raccords tournants pneumatiques sur mesure",
    "custom pneumatic rotary union": "raccord tournant pneumatique sur mesure",
    "custom air rotary unions": "raccords tournants pneumatiques sur mesure",
    "custom air rotary union": "raccord tournant pneumatique sur mesure",
    "pneumatic rotary unions": "raccords tournants pneumatiques",
    "pneumatic rotary union": "raccord tournant pneumatique",
    "pneumatic rotary joints": "raccords tournants pneumatiques",
    "pneumatic rotary joint": "raccord tournant pneumatique",
    "air rotary unions": "raccords tournants pneumatiques",
    "air rotary union": "raccord tournant pneumatique",
    "air rotary joints": "raccords tournants pneumatiques",
    "air rotary joint": "raccord tournant pneumatique",
    "hydraulic rotary unions": "raccords tournants hydrauliques",
    "hydraulic rotary union": "raccord tournant hydraulique",
    "hydraulic rotary joints": "raccords tournants hydrauliques",
    "hydraulic rotary joint": "raccord tournant hydraulique",
    "custom rotary unions": "raccords tournants sur mesure",
    "custom rotary union": "raccord tournant sur mesure",
    "custom rotary joints": "raccords tournants sur mesure",
    "custom rotary joint": "raccord tournant sur mesure",
    "rotary unions": "raccords tournants",
    "rotary union": "raccord tournant",
    "rotary joints": "raccords tournants",
    "rotary joint": "raccord tournant",
    "swivel joints": "raccords tournants",
    "swivel joint": "raccord tournant",
    "air swivels": "raccords tournants pneumatiques",
    "air swivel": "raccord tournant pneumatique",
    "pneumatic tools": "outils pneumatiques",
    "pneumatic tool": "outil pneumatique",
    "hoses": "flexibles",
    "hose": "flexible",
    "compressed air": "air comprimé",
    "shop air": "air comprimé d’atelier",
    "engineering drawing": "plan technique",
    "engineering drawings": "plans techniques",
    "2D engineering drawing": "plan technique 2D",
    "verified drawing": "plan vérifié",
    "approved drawing": "plan approuvé",
    "drawings": "plans",
    "drawing": "plan",
    "engineering review": "examen technique",
    "engineering support": "assistance technique",
    "engineering team": "équipe technique",
    "application review": "étude de l’application",
    "selection review": "validation de la sélection",
    "custom engineering": "conception sur mesure",
    "custom designs": "conceptions sur mesure",
    "custom design": "conception sur mesure",
    "custom": "sur mesure",
    "request for quotation": "demande de devis",
    "quotation": "devis",
    "quote": "devis",
    "working pressure": "pression de service",
    "maximum speed": "vitesse de rotation maximale",
    "speed rating": "vitesse nominale",
    "speed ratings": "vitesses nominales",
    "pressure rating": "pression nominale",
    "pressure ratings": "pressions nominales",
    "passage count": "nombre de passages",
    "passages": "passages",
    "passage": "passage",
    "ports": "orifices",
    "port": "orifice",
    "media": "fluides",
    "medium": "fluide",
    "multi-passage": "multipassage",
    "single passage": "un passage",
    "dual passage": "deux passages",
    "through-bore": "à alésage traversant",
    "through bore": "alésage traversant",
    "flange mount": "montage à bride",
    "flange-mounted": "monté sur bride",
    "threaded mount": "montage fileté",
    "thread sealant": "produit d’étanchéité pour filetages",
    "thread specification": "spécification du filetage",
    "thread standard": "norme de filetage",
    "threaded connections": "raccordements filetés",
    "threaded connection": "raccordement fileté",
    "threads": "filetages",
    "thread": "filetage",
    "anti-rotation": "anti-rotation",
    "seal kit": "kit de joints",
    "seal kits": "kits de joints",
    "skeleton oil seal": "joint à lèvre à armature",
    "non-contact clearance seal": "étanchéité à jeu sans contact",
    "non-contact seal": "étanchéité sans contact",
    "clearance seal": "étanchéité à jeu",
    "spring-energized seal": "joint à ressort",
    "face seal": "étanchéité frontale",
    "rotary sealing": "étanchéité rotative",
    "rotary seal": "joint rotatif",
    "sealing surfaces": "surfaces d’étanchéité",
    "sealing surface": "surface d’étanchéité",
    "seal lands": "portées de joints",
    "seal land": "portée de joint",
    "sealing": "étanchéité",
    "sealed": "étanche",
    "seals": "joints",
    "seal": "joint",
    "O-rings": "joints toriques",
    "O-ring": "joint torique",
    "lip seals": "joints à lèvre",
    "lip seal": "joint à lèvre",
    "seal material": "matériau des joints",
    "seal life": "durée de vie des joints",
    "seal replacement": "remplacement des joints",
    "spring-energized carbon-filled PTFE": "PTFE chargé de carbone à ressort",
    "spring-energized PTFE": "PTFE à ressort",
    "end-of-arm tooling": "outillage en bout de bras",
    "robot end-of-arm tooling": "outillage robotique en bout de bras",
    "indexing tables": "tables d’indexage",
    "rotary table": "table rotative",
    "test fixtures": "montages d’essai",
    "test fixture": "montage d’essai",
    "request a quote": "demander un devis",
    "request quote": "demander un devis",
    "get a quote": "obtenir un devis",
    "selection guide": "guide de sélection",
    "model comparison": "comparaison des modèles",
    "technical specifications": "caractéristiques techniques",
    "technical specs": "caractéristiques techniques",
    "food-grade": "compatible avec les applications alimentaires",
    "washdown": "lavage industriel",
    "dust-proof": "protégé contre la poussière",
    "water-soluble coolant": "liquide de refroidissement hydrosoluble",
    "hydraulic oil": "huile hydraulique",
    "coolant": "liquide de refroidissement",
    "wetted materials": "matériaux en contact avec le fluide",
    "operating conditions": "conditions de service",
    "working conditions": "conditions de service",
    "service life": "durée de vie",
    "lead time": "délai de fabrication",
    "cross-port leakage": "fuite entre passages",
    "cross-port": "entre passages",
    "leak testing": "contrôle d’étanchéité",
    "leak test": "contrôle d’étanchéité",
    "leakage": "fuite",
    "leak": "fuite",
    "misalignment": "désalignement",
    "runout": "faux-rond",
    "anti-twist": "anti-torsion",
    "web converting": "transformation de bandes",
    "web-processing": "transformation de bandes",
    "shaft": "arbre",
    "housing": "corps",
    "body": "corps",
}

PROTECTED_PATTERNS = [
    r"\bBP-[A-Z0-9-]+\b",
    r"\b(?:AL6061|PTFE|NPT|BSPP|BSPT|CAD|STEP|STP|IGES|IGS|DWG|DXF|PDF|JPG|JPEG|PNG|EOAT|OEM|RFQ|FKM|NBR|EPDM|FDA|ISO|DIN)\b",
    r"\b[A-Z]\d+(?:\.\d+)?(?:\s*[x×]\s*[A-Z]?\d+(?:\.\d+)?)?\b",
    r"\b\d+(?:[.,]\d+)?\s*(?:MPa|bar|psi|RPM|min[⁻−-]?¹|mm|cm|m|kg|N|Nm|V|A|°C|µm|MB|GB|%)\b",
    r"\b\d{4}-\d{2}-\d{2}\b",
    r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b",
    r"https?://[^\s<>\"']+",
    r"\{[A-Za-z_][A-Za-z0-9_]*\}",
    r"&(?:[A-Za-z][A-Za-z0-9]+|#\d+|#x[0-9A-Fa-f]+);",
]

TRANSLATABLE_ATTRIBUTES = ("alt", "title", "aria-label", "placeholder", "data-label", "data-no-file")
SKIP_TAGS = {"script", "style", "noscript", "svg", "code", "pre", "template"}
SKIP_CLASSES = {"notranslate", "icon", "arrow", "team-avatar", "team-person-name", "share-btn"}
PRODUCT_PAGE_RE = re.compile(r"^BP-[A-Z0-9-]+\.html$")
TAG_RE = re.compile(r"(<[A-Za-z!/][^>]*>)", re.S)
ATTRIBUTE_RE = re.compile(
    r"(?P<prefix>\b(?:alt|title|aria-label|placeholder|data-label|data-no-file)\s*=\s*)(?P<quote>[\"'])(?P<value>.*?)(?P=quote)",
    re.I | re.S,
)


_translation_memory: dict[str, str] = {}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def placeholder(index: int) -> str:
    return f"ZXPH{index:04d}QZ"


def protect_text(value: str) -> tuple[str, dict[str, str]]:
    replacements: dict[str, str] = {}

    def reserve(original: str, restored: str | None = None) -> str:
        token = placeholder(len(replacements))
        replacements[token] = restored if restored is not None else original
        return token

    result = value
    for source, target in sorted(GLOSSARY.items(), key=lambda item: len(item[0]), reverse=True):
        result = re.sub(
            rf"(?<![A-Za-z]){re.escape(source)}(?![A-Za-z])",
            lambda match, target=target: reserve(match.group(0), target),
            result,
            flags=re.I,
        )
    for pattern in PROTECTED_PATTERNS:
        result = re.sub(pattern, lambda match: reserve(match.group(0)), result)
    return result, replacements


def normalize_french(value: str) -> str:
    substitutions = [
        (r"\bde l['’]union rotative\b", "du raccord tournant"),
        (r"\bdes unions rotatives\b", "des raccords tournants"),
        (r"\bunion rotatoire pneumatique\b", "raccord tournant pneumatique"),
        (r"\bunions rotatoires pneumatiques\b", "raccords tournants pneumatiques"),
        (r"\bunion rotatoire\b", "raccord tournant"),
        (r"\bunions rotatoires\b", "raccords tournants"),
        (r"\bunions? rotatives?\b", lambda m: "raccords tournants" if m.group(0).lower().endswith("s") else "raccord tournant"),
        (r"\bjoints? rotatifs?\b", lambda m: "raccords tournants" if m.group(0).lower().startswith("joints") else "raccord tournant"),
        (r"\barticulations? rotatives?\b", lambda m: "raccords tournants" if m.group(0).lower().startswith("articulations") else "raccord tournant"),
        (r"\bjoint tournant pneumatique\b", "raccord tournant pneumatique"),
        (r"\bjoints tournants pneumatiques\b", "raccords tournants pneumatiques"),
        (r"\bunion pneumatique rotative\b", "raccord tournant pneumatique"),
        (r"\bunions pneumatiques rotatives\b", "raccords tournants pneumatiques"),
        (r"\bdessin d’ingénierie\b", "plan technique"),
        (r"\bdessin d'ingénierie\b", "plan technique"),
        (r"\bdessins d’ingénierie\b", "plans techniques"),
        (r"\bdessins d'ingénierie\b", "plans techniques"),
        (r"\btypes? de phoques?\b", "types de joints"),
        (r"\bphoques?\b", "joints"),
        (r"\bsceaux?\b", "joints"),
        (r"\bscellement\b", "étanchéité"),
        (r"\bsceller\b", "assurer l’étanchéité"),
        (r"\bmédias\b", "fluides"),
        (r"\bHoses\b", "flexibles"),
        (r"\bHose\b", "flexible"),
        (r"\bRPM\b", "tr/min"),
    ]
    result = value
    for pattern, replacement in substitutions:
        result = re.sub(pattern, replacement, result, flags=re.I)
    # Replace any domain term the model elected to leave in English. Longest
    # matches win so "pneumatic rotary union" is handled before "rotary union".
    for source, target in sorted(GLOSSARY.items(), key=lambda item: len(item[0]), reverse=True):
        result = re.sub(
            rf"(?<![A-Za-z]){re.escape(source)}(?![A-Za-z])",
            target,
            result,
            flags=re.I,
        )
    result = re.sub(r"\s+([:;?!])", "\u00a0\\1", result)
    return result


def preserves_critical_facts(source: str, translated: str) -> bool:
    for pattern in (
        r"\bBP-[A-Z0-9-]+\b",
        r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b",
        r"https?://[^\s<>\"']+",
    ):
        for token in re.findall(pattern, source):
            if token not in translated:
                return False
    source_numbers = [token.replace(",", ".") for token in re.findall(r"\d+(?:[.,]\d+)?", source)]
    translated_numbers = [token.replace(",", ".") for token in re.findall(r"\d+(?:[.,]\d+)?", translated)]
    remaining = list(translated_numbers)
    for number in source_numbers:
        if number not in remaining:
            return False
        remaining.remove(number)
    return True


def translate_with_protected_fragments(value: str) -> str:
    protected, replacements = protect_text(value)
    translated_parts = []
    for part in re.split(r"(ZXPH\d{4}QZ)", protected):
        if not part:
            continue
        if part in replacements:
            translated_parts.append(replacements[part])
        elif re.search(r"[A-Za-z]", part):
            leading = re.match(r"^\s*", part).group(0)
            trailing = re.search(r"\s*$", part).group(0)
            core = part[len(leading): len(part) - len(trailing) if trailing else len(part)]
            translated_parts.append(leading + argos_translate(core, "en", "fr") + trailing)
        else:
            translated_parts.append(part)
    return "".join(translated_parts)


def translate_core(value: str) -> str:
    load_argos()
    if value in _translation_memory:
        return _translation_memory[value]
    translated = argos_translate(value, "en", "fr")
    if not preserves_critical_facts(value, translated):
        translated = translate_with_protected_fragments(value)
    translated = normalize_french(translated)
    _translation_memory[value] = translated
    return translated


def translate_text(value: str) -> str:
    if not value or not re.search(r"[A-Za-z]", value):
        return value
    leading = re.match(r"^\s*", value).group(0)
    trailing = re.search(r"\s*$", value).group(0)
    core = value[len(leading): len(value) - len(trailing) if trailing else len(value)]
    if not core:
        return value
    # Argos can treat title separators as an end-of-segment marker and omit the
    # protected phrase after them. Translate each title/breadcrumb part while
    # preserving the original separator verbatim.
    if re.search(r"\s(?:\||·|›|→)\s", core):
        parts = re.split(r"(\s(?:\||·|›|→)\s)", core)
        return leading + "".join(
            part if re.fullmatch(r"\s(?:\||·|›|→)\s", part) else translate_text(part)
            for part in parts
        ) + trailing
    # The Argos package is sentence-oriented. Feeding multiple sentences to a
    # single model call can silently return only the first sentence, so retain
    # the inter-sentence whitespace and translate each sentence independently.
    sentence_parts = re.split(r"((?<=[.!?])\s+)", core)
    if len(sentence_parts) > 1:
        return leading + "".join(
            part if re.fullmatch(r"\s+", part) else translate_text(part)
            for part in sentence_parts
        ) + trailing
    if len(core) <= 700:
        return leading + translate_core(core) + trailing
    chunks = re.split(r"(?<=[.!?])(?=\s+)", core)
    translated_chunks = []
    for chunk in chunks:
        if len(chunk) <= 700:
            translated_chunks.append(translate_core(chunk))
            continue
        translated_chunks.extend(translate_core(piece) for piece in re.split(r"(?<=;)\s+", chunk) if piece)
    return leading + " ".join(part.strip() for part in translated_chunks) + trailing


def translate_tag_attributes(tag: str) -> str:
    if re.match(r"</|<!", tag):
        return tag

    def replace(match: re.Match) -> str:
        value = html_module.unescape(match.group("value"))
        translated = html_module.escape(translate_text(value), quote=True)
        return f"{match.group('prefix')}{match.group('quote')}{translated}{match.group('quote')}"

    return ATTRIBUTE_RE.sub(replace, tag)


def translate_catalog_value(value: str) -> str:
    if not TAG_RE.search(value):
        return translate_text(value)
    parts = TAG_RE.split(value)
    translated = []
    skip_depth = 0
    for part in parts:
        if not part:
            continue
        if part.startswith("<"):
            closing = bool(re.match(r"</", part))
            tag_match = re.match(r"</?\s*([A-Za-z0-9:-]+)", part)
            tag_name = tag_match.group(1).lower() if tag_match else ""
            if closing and tag_name in SKIP_TAGS:
                skip_depth = max(0, skip_depth - 1)
            translated.append(translate_tag_attributes(part) if not skip_depth else part)
            if not closing and tag_name in SKIP_TAGS and not part.rstrip().endswith("/>"):
                skip_depth += 1
        else:
            translated.append(part if skip_depth else translate_text(part))
    return "".join(translated)


def generate_cache() -> None:
    catalog = read_json(I18N / "source-catalog.json")
    translations = {}
    total = len(catalog["entries"])
    for index, entry in enumerate(catalog["entries"], 1):
        translations[entry["id"]] = translate_catalog_value(entry["source"])
        if index % 100 == 0 or index == total:
            print(f"cache {index}/{total}", flush=True)
    write_json(
        I18N / "cache" / "fr.json",
        {
            "language": "fr",
            "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "engine": "argos-en_fr-1_9-with-begapunk-terminology",
            "translations": translations,
        },
    )


def meta_content(document, name: str, *, property_name: bool = False) -> str:
    attribute = "property" if property_name else "name"
    values = document.xpath(f"//meta[translate(@{attribute}, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='{name.lower()}']/@content")
    return values[0].strip() if values else ""


def compact_text(element) -> str:
    if element is None:
        return ""
    return " ".join(element.text_content().split())


def extract_source_seo(page_name: str) -> dict[str, str]:
    load_lxml()
    source = html.fromstring((ROOT / page_name).read_text(encoding="utf-8-sig"))
    title = compact_text(source.xpath("//title")[0]) if source.xpath("//title") else ""
    description = meta_content(source, "description")
    h1 = compact_text(source.xpath("//h1")[0]) if source.xpath("//h1") else title
    return {
        "title": translate_text(title),
        "description": translate_text(description),
        "h1": translate_text(h1),
    }


CURATED_SEO = {
    "index.html": {
        "title": "Raccord tournant pneumatique | Standard et sur mesure | Begapunk",
        "description": "Raccords tournants pneumatiques pour machines OEM : 1 à 8 passages, modèles standard ou sur mesure, plans 2D et fichiers STEP pour vérifier l’intégration.",
        "h1": "Raccord tournant pneumatique pour machines industrielles",
    },
    "products.html": {
        "title": "Raccords tournants pneumatiques | Catalogue Begapunk",
        "description": "Sélectionnez un raccord tournant pneumatique par nombre de passages, pression, vitesse, alésage et montage. Plans 2D et fichiers STEP disponibles sur les pages des modèles.",
        "h1": "Raccords tournants pneumatiques pour air comprimé",
    },
    "product-comparison.html": {
        "title": "Comparer les raccords tournants pneumatiques | Begapunk",
        "description": "Comparez 16 raccords tournants pneumatiques Begapunk par passages, pression, vitesse, montage, matière et application type.",
        "h1": "Comparer les raccords tournants pneumatiques",
    },
    "contact.html": {
        "title": "Demande de devis | Raccord tournant pneumatique | Begapunk",
        "description": "Envoyez une référence, une photo, un plan ou les conditions connues pour obtenir un devis ou une recommandation de raccord tournant pneumatique.",
        "h1": "Décrivez-nous votre besoin",
    },
    "privacy.html": {
        "title": "Politique de confidentialité | Begapunk",
        "description": "Informations sur la collecte, l’utilisation, la conservation et la protection des données personnelles sur le site Begapunk.",
        "h1": "Politique de confidentialité",
    },
    "thank-you.html": {
        "title": "Demande reçue | Begapunk",
        "description": "Votre demande a bien été reçue. Notre équipe technique va maintenant l’examiner.",
        "h1": "Merci, votre demande a bien été reçue",
    },
    "custom-hydraulic-rotary-unions.html": {
        "title": "Raccord tournant hydraulique sur mesure | Begapunk",
        "description": "Étude de raccords tournants hydrauliques sur mesure pour huile, eau et liquide de refroidissement, à partir de vos interfaces, pression, vitesse et cycle de service.",
        "h1": "Raccords tournants hydrauliques sur mesure",
    },
}

# Search metadata is reviewed separately from the bulk MT cache because it is
# both user-visible in results and the strongest signal of French search intent.
CURATED_SEO.update({
    "about.html": {
        "title": "À propos de Begapunk | Fabricant de raccords tournants",
        "description": "Découvrez Begapunk, fabricant basé à Ningbo de raccords tournants pneumatiques standard et sur mesure pour l’automatisation industrielle et les machines tournantes.",
        "h1": "À propos de Begapunk",
    },
    "manufacturing-quality.html": {
        "title": "Fabrication et qualité des raccords tournants | Begapunk",
        "description": "Découvrez les rotors anodisés durs, les corps de stator anodisés et les contrôles d’épaisseur de revêtement appliqués aux raccords tournants à joints toriques basse vitesse.",
        "h1": "Fabrication et qualité des raccords tournants pneumatiques",
    },
    "production-inspection-testing.html": {
        "title": "Contrôle d’étanchéité passage par passage | Begapunk",
        "description": "Chaque raccord tournant pneumatique est contrôlé passage par passage à l’air comprimé à 1,0 MPa après l’assemblage final, avant emballage et stockage.",
        "h1": "Contrôle d’étanchéité à 100 % passage par passage",
    },
    "applications.html": {
        "title": "Applications des raccords tournants pneumatiques | Begapunk",
        "description": "Explorez les applications des raccords tournants pneumatiques : tables rotatives, emballage, découpe laser, serrage CNC, robotique, soudage, impression et bancs d’essai.",
        "h1": "Applications des raccords tournants",
    },
    "application-automation-rotary-tables.html": {
        "title": "Raccord tournant pour tables rotatives d’automatisation | Begapunk",
        "description": "Sélectionnez un raccord tournant pneumatique pour table rotative en associant les circuits de serrage, desserrage et soufflage au cycle de la machine.",
        "h1": "Raccord tournant pneumatique pour tables rotatives d’automatisation",
    },
    "application-bottle-filling-capping.html": {
        "title": "Raccord tournant pour remplissage et bouchage | Begapunk",
        "description": "Découvrez l’intégration du BP-2P-16-0001 sur une tête de bouchage : deux passages d’air indépendants commandent le serrage et le desserrage d’un mandrin à trois mors.",
        "h1": "Raccord tournant pneumatique pour machines de remplissage et de bouchage",
    },
    "application-cnc-pneumatic-clamping.html": {
        "title": "Raccord tournant pour serrage pneumatique CNC | Begapunk",
        "description": "Sélectionnez un raccord tournant pneumatique pour dispositifs de serrage CNC, tables rotatives, montages d’indexage et systèmes automatisés d’usinage.",
        "h1": "Raccord tournant pneumatique pour dispositifs de serrage CNC",
    },
    "application-electronics-battery-test-fixtures.html": {
        "title": "Raccord tournant pour montages d’essai de batteries | Begapunk",
        "description": "Guide de sélection pour les bancs d’essai électroniques et batteries, les postes d’inspection automatisés et les interfaces rotatives pneumatiques-électriques.",
        "h1": "Raccord tournant pour montages d’essai électroniques et batteries",
    },
    "application-laser-tube-cutting.html": {
        "title": "Raccord tournant pour découpe laser de tubes | Begapunk",
        "description": "Comparez les raccords tournants pneumatiques à deux et trois passages pour alimenter un mandrin arrière en air comprimé sur une machine de découpe laser de tubes.",
        "h1": "Raccord tournant pneumatique pour découpe laser de tubes",
    },
    "application-packaging-machinery.html": {
        "title": "Raccord tournant pour machines d’emballage | Begapunk",
        "description": "Définissez les circuits de serrage, desserrage et soufflage d’un carrousel d’emballage, puis comparez les raccords tournants pneumatiques à deux passages.",
        "h1": "Raccord tournant pneumatique pour machines d’emballage",
    },
    "application-pneumatic-tools-hose-anti-twist.html": {
        "title": "Raccord tournant pour outils pneumatiques et flexibles | Begapunk",
        "description": "Choisissez un raccord tournant pneumatique anti-torsion selon le mouvement de l’outil, le débit d’air et le filetage. Comparez les modèles catalogue à un passage.",
        "h1": "Raccord tournant pneumatique pour outils et flexibles anti-torsion",
    },
    "application-robot-end-of-arm-tooling.html": {
        "title": "Raccord tournant pour outillage robotique EOAT | Begapunk",
        "description": "Définissez les passages pneumatiques, les circuits électriques optionnels, le mouvement du poignet et la charge utile pour choisir un raccord tournant robotique.",
        "h1": "Raccord tournant pour outillage robotique en bout de bras",
    },
    "application-steel-dusty-environments.html": {
        "title": "Raccord tournant pour environnements poussiéreux | Begapunk",
        "description": "Sélectionnez un raccord tournant pneumatique protégé pour la sidérurgie, la manutention de poudres et les environnements abrasifs exposés à la poussière et aux vibrations.",
        "h1": "Raccords tournants pour la sidérurgie et les environnements poussiéreux",
    },
    "application-textile-printing-converting.html": {
        "title": "Raccord tournant pour impression et transformation | Begapunk",
        "description": "Sélectionnez un raccord tournant pour machines d’impression, textile et transformation selon le fluide, la pression, la vitesse, les passages et l’alésage traversant.",
        "h1": "Raccord tournant pour machines d’impression et de transformation",
    },
    "application-vacuum-packaging-machines.html": {
        "title": "Raccord tournant pour emballage sous vide | Begapunk",
        "description": "Guide des raccords tournants pneumatiques et sous vide pour remplisseuses de sachets, têtes de scellage et postes rotatifs d’emballage.",
        "h1": "Raccord tournant pour machines d’emballage sous vide",
    },
    "application-welding-positioners.html": {
        "title": "Raccord tournant pour positionneurs de soudage | Begapunk",
        "description": "Sélectionnez un raccord tournant pneumatique pour positionneurs, tables rotatives de soudage, montages robotisés et vireurs de tubes à serrage pneumatique.",
        "h1": "Raccord tournant pneumatique pour positionneurs de soudage",
    },
    "installation.html": {
        "title": "Installation d’un raccord tournant | Guide Begapunk",
        "description": "Guide pas à pas pour installer un raccord tournant : montage, raccordements, dispositif anti-rotation, filtration, lubrification et maintenance.",
        "h1": "Instructions d’installation d’un raccord tournant",
    },
    "blog.html": {
        "title": "Guides techniques sur les raccords tournants | Begapunk",
        "description": "Guides pratiques sur la sélection, l’installation, les joints, la maintenance, les applications réelles et les contrôles de production des raccords tournants.",
        "h1": "Guides de sélection, d’installation et d’étanchéité",
    },
    "blog-non-contact-clearance-seal-rotary-union.html": {
        "title": "Raccord tournant à étanchéité sans contact | Begapunk",
        "description": "Comprenez comment un raccord tournant à étanchéité sans contact transfère le fluide à grande vitesse et pourquoi un jeu radial unilatéral de 0,003 mm est déterminant.",
        "h1": "Fonctionnement d’un raccord tournant à étanchéité sans contact",
    },
    "blog-rotary-joint-installation-mistakes.html": {
        "title": "Installation d’un raccord tournant : 7 erreurs | Begapunk",
        "description": "Évitez sept erreurs courantes liées à l’alignement, aux efforts de tuyauterie, à la filtration, à l’étanchéité des filetages, au rodage et au contrôle des fuites.",
        "h1": "Installer un raccord tournant pneumatique : 7 erreurs à éviter",
    },
    "blog-rotary-joint-leaking.html": {
        "title": "Raccord tournant qui fuit ? Guide de diagnostic | Begapunk",
        "description": "Localisez la fuite, distinguez un défaut de montage d’un défaut d’étanchéité rotative et contrôlez l’alignement avant de remplacer des composants.",
        "h1": "Raccord tournant qui fuit ? Diagnostic pour la maintenance",
    },
    "blog-rotary-joint-materials.html": {
        "title": "Matériaux des raccords tournants : aluminium, inox ou laiton ?",
        "description": "Comparez les corps en aluminium, acier inoxydable et laiton selon la masse et l’environnement, puis vérifiez le matériau publié pour le modèle retenu.",
        "h1": "Aluminium, acier inoxydable ou laiton pour un raccord tournant",
    },
    "blog-rotary-joint-selection.html": {
        "title": "Choisir un raccord tournant pneumatique : 5 critères | Begapunk",
        "description": "Choisissez un raccord tournant pneumatique selon le nombre de passages, la pression de service, la vitesse, la compatibilité du fluide et le montage.",
        "h1": "Choisir un raccord tournant pneumatique : 5 critères essentiels",
    },
    "blog-rotary-union-seal-types.html": {
        "title": "Joints de raccord tournant : joint torique, lèvre ou PTFE",
        "description": "Comparez les joints toriques, joints à lèvre et joints PTFE à ressort selon la pression, la vitesse, le fluide, le frottement et les fuites.",
        "h1": "Types de joints pour raccords tournants",
    },
    "blog-seal-replacement.html": {
        "title": "Remplacement des joints d’un raccord tournant | Begapunk",
        "description": "Déterminez s’il faut remplacer les joints ou le raccord complet après inspection de l’arbre, des portées d’étanchéité et de l’emplacement de la fuite.",
        "h1": "Remplacement des joints d’un raccord tournant : guide pas à pas",
    },
    "blog-threaded-vs-flange.html": {
        "title": "Raccord tournant fileté ou à bride : comment choisir ?",
        "description": "Choisissez un montage fileté ou à bride selon l’encombrement, l’alignement, l’anti-rotation et l’accès pour la maintenance.",
        "h1": "Montage fileté ou à bride pour un raccord tournant",
    },
    "case-studies.html": {
        "title": "Cas d’application de raccords tournants | Begapunk",
        "description": "Découvrez trois installations documentées par photo et deux exemples de sélection technique, dont des mandrins pneumatiques pour machines de découpe laser.",
        "h1": "Cas d’application et exemples de sélection",
    },
    "case-bp-2p-95-pneumatic-chuck-integration.html": {
        "title": "BP-2P-95-0005 sur mandrin pneumatique | Begapunk",
        "description": "Cette installation client montre le BP-2P-95-0005 transférant l’air comprimé de la partie fixe vers un mandrin pneumatique rotatif.",
        "h1": "Intégration du BP-2P-95-0005 sur un mandrin pneumatique",
    },
    "case-bp-3p-s06-sensor-monitored-chuck.html": {
        "title": "BP-3P-S06-0001 sur mandrin avec capteurs | Begapunk",
        "description": "Cas documenté par photo : le BP-3P-S06-0001 transfère trois circuits d’air comprimé et des signaux de capteurs via une interface rotative.",
        "h1": "Transfert pneumatique et de signaux avec le BP-3P-S06-0001",
    },
    "faq.html": {
        "title": "FAQ technique sur les raccords tournants | Begapunk",
        "description": "27 réponses sur la sélection, les fluides, la conception sur mesure, le montage, les contrôles d’étanchéité, la traçabilité et les conditions commerciales.",
        "h1": "FAQ technique sur les raccords tournants",
    },
    "search.html": {
        "title": "Rechercher un raccord tournant | Begapunk",
        "description": "Recherchez les produits, applications, guides et ressources Begapunk par modèle, caractéristique technique ou type de machine.",
        "h1": "Trouver le raccord tournant adapté",
    },
    "terms.html": {
        "title": "Conditions générales | Begapunk",
        "description": "Conditions applicables aux achats de produits Begapunk : garantie, retours, expédition, paiement et limites de responsabilité.",
        "h1": "Conditions générales",
    },
    "404.html": {
        "title": "Page introuvable | Begapunk",
        "description": "La page demandée n’existe pas. Consultez les raccords tournants, les applications et les guides techniques Begapunk ou contactez notre équipe.",
        "h1": "Page introuvable",
    },
})

PRODUCT_SEO_FACTS = {
    "BP-1P-0003.html": ("BP-1P-0003", 1, "1 MPa (10 bar)", "500 tr/min", "air, huile et eau"),
    "BP-1P-0006.html": ("BP-1P-0006", 1, "1 MPa (10 bar)", "300 tr/min", "air"),
    "BP-2P-0001.html": ("BP-2P-0001", 2, "1 MPa (10 bar)", "200 tr/min", "air"),
    "BP-2P-0002.html": ("BP-2P-0002", 2, "1 MPa (10 bar)", "300 tr/min", "air"),
    "BP-2P-08-0001.html": ("BP-2P-08-0001", 2, "1 MPa (10 bar)", "200 tr/min", "air"),
    "BP-2P-130-0001.html": ("BP-2P-130-0001", 2, "5 MPa (50 bar)", "80 tr/min", "air"),
    "BP-2P-16-0001.html": ("BP-2P-16-0001", 2, "1 MPa (10 bar)", "200 tr/min", "air"),
    "BP-2P-30-0001.html": ("BP-2P-30-0001", 2, "1 MPa (10 bar)", "150 tr/min", "air"),
    "BP-2P-50-0001.html": ("BP-2P-50-0001", 2, "1 MPa (10 bar)", "100 tr/min", "air"),
    "BP-3P-0004.html": ("BP-3P-0004", 3, "1 MPa (10 bar)", "200 tr/min", "air"),
    "BP-3P-0006.html": ("BP-3P-0006", 3, "1 MPa (10 bar)", "200 tr/min", "air"),
    "BP-3P-0007.html": ("BP-3P-0007", 3, "1 MPa (10 bar)", "200 tr/min", "air"),
    "BP-4P-30-0001.html": ("BP-4P-30-0001", 4, "1 MPa (10 bar)", "200 tr/min", "air"),
    "BP-8P-0001.html": ("BP-8P-0001", 8, "1 MPa (10 bar)", "200 tr/min", "air"),
}

for product_page, (model, passages, pressure, speed, media) in PRODUCT_SEO_FACTS.items():
    passage_label = "1 passage" if passages == 1 else f"{passages} passages"
    CURATED_SEO[product_page] = {
        "title": f"{model} · Raccord tournant pneumatique {passage_label} | Begapunk",
        "description": f"{model} : raccord tournant pneumatique {passage_label}, pression maximale {pressure}, vitesse maximale {speed} ; fluides indiqués : {media}. Fichier STEP AP214 disponible.",
        "h1": f"{model} · Raccord tournant pneumatique {passage_label}",
    }

CURATED_SEO["BP-2P-95-0005.html"] = {
    "title": "BP-2P-95-0005 · Raccord tournant pneumatique | Begapunk",
    "description": "BP-2P-95-0005 : raccord tournant pneumatique 2 entrées / 4 sorties pour serrage et desserrage, 1 MPa (10 bar), 200 tr/min, air. Fichier STEP AP214 disponible.",
    "h1": "BP-2P-95-0005 · Raccord tournant 2 entrées / 4 sorties",
}

CURATED_SEO["BP-3P-S06-0001.html"] = {
    "title": "BP-3P-S06-0001 · Raccord pneumatique-électrique | Begapunk",
    "description": "BP-3P-S06-0001 : raccord tournant avec 3 passages pneumatiques et 6 fils électriques, 1 MPa (10 bar), 200 tr/min ; cotes électriques selon spécification.",
    "h1": "BP-3P-S06-0001 · Raccord tournant pneumatique-électrique",
}


def generate_seo() -> None:
    config = read_json(I18N / "config.json")
    seo = {
        "_site": {
            "heading": "Raccords tournants Begapunk",
            "description": "Begapunk conçoit et fabrique des raccords tournants pneumatiques pour transférer de manière fiable des fluides entre les parties fixes et rotatives des machines.",
            "organizationDescription": "Fabricant de raccords tournants pneumatiques et multipassages sur mesure pour les machines et l’automatisation industrielles.",
        }
    }
    for index, page_name in enumerate(config["pages"], 1):
        seo[page_name] = (
            copy.deepcopy(CURATED_SEO[page_name])
            if page_name in CURATED_SEO
            else extract_source_seo(page_name)
        )
        if index % 10 == 0:
            print(f"seo {index}/{len(config['pages'])}", flush=True)
    seo["products-p2.html"] = {
        "title": "Raccords tournants : autres modèles | Begapunk",
        "description": "Autres raccords tournants à un ou plusieurs passages, avec montage fileté ou à bride et options à alésage traversant.",
        "h1": "Autres raccords tournants",
    }
    write_json(I18N / "seo" / "fr.json", seo)


def generate_base_resources() -> None:
    write_json(
        I18N / "overrides" / "fr.json",
        {
            "Blog &amp; Guides": "Blog et guides",
            "Object to processing or request restriction": "Vous opposer au traitement ou demander sa limitation",
        },
    )
    write_json(
        I18N / "editorial" / "fr.json",
        {
            "*": {},
            "contact.html": {
                "_supportLanguageDisclosure": "Cette page est en français. Les échanges techniques et commerciaux qui suivent sont actuellement traités en anglais ; vous pouvez néanmoins envoyer votre besoin en français pour examen."
            },
        },
    )
    glossary_path = I18N / "glossary.json"
    glossary = read_json(glossary_path)
    source_terms = list(glossary.get("preferredTerms", {}).get("de", {}).keys())
    french_terms = {term: translate_text(term).strip() for term in source_terms}
    french_terms.update(GLOSSARY)
    glossary.setdefault("preferredTerms", {})["fr"] = french_terms
    write_json(glossary_path, glossary)


def generate_contact_contract() -> None:
    load_lxml()
    path = I18N / "manual" / "contact-rfq-copy.json"
    contract = read_json(path)
    old_fr = html.fromstring((FR_DIR / "contact.html").read_text(encoding="utf-8-sig"))
    nodes = old_fr.xpath("//script[@id='contact-rfq-copy']")
    if len(nodes) != 1 or not nodes[0].text:
        raise RuntimeError("Existing French Contact RFQ contract is missing.")
    french_copy = json.loads(nodes[0].text)
    contract.setdefault("copies", {})["fr"] = french_copy
    targets = set(contract.get("review", {}).get("targetLanguages", []))
    targets.add("fr")
    contract["review"]["targetLanguages"] = [code for code in ("de", "fr", "ja", "ru") if code in targets]
    contract["review"]["scope"] = (
        "Dynamic Contact RFQ prompts, validation, attachment feedback, and warm submission-state copy "
        "in German, French, Japanese, and Russian."
    )
    contract["review"]["priorReview"] = "audit/localization/2026-09-04-french-commercial-funnel-review.md"
    write_json(path, contract)


FAQ_FACT_ANSWERS = {
    "faq-07": "Pas automatiquement. Les valeurs maximales de pression, de vitesse et de température indiquées sur une page produit sont des limites distinctes ; ne supposez pas qu’elles s’appliquent simultanément. Si votre machine exige plusieurs valeurs élevées en même temps, envoyez le fluide, la pression, la vitesse ainsi que les températures maximales du fluide et de l’environnement. Nous les examinerons ensemble et établirons un devis pour une configuration techniquement adaptée.",
    "faq-10": "Begapunk possède une expérience de projet avec l’air comprimé, l’eau, certains liquides de refroidissement hydrosolubles contenant des additifs et l’huile hydraulique. Cela ne signifie pas que chaque modèle est compatible avec tous ces fluides. Pour une nouvelle application, indiquez le nom du fluide, sa composition principale et ses additifs, la température et la pression afin que Begapunk puisse vérifier la compatibilité et choisir les matériaux en contact avec le fluide ainsi que les joints appropriés.",
    "faq-11": "Les modèles pneumatiques standard sont conçus pour fonctionner avec de l’air comprimé lubrifié préparé par une unité complète en trois éléments : filtre à particules, séparateur d’eau et lubrificateur à brouillard d’huile. Si la machine doit utiliser de l’air sans huile, précisez-le avant la sélection ; une configuration de joints résistante à l’usure et adaptée au fonctionnement sans huile est disponible.",
    "faq-22": "Le contrôle d’étanchéité standard en production utilise de l’air comprimé à 1,0 MPa. Chaque passage est mis sous pression pendant environ une seconde, puis maintenu pendant environ quatre secondes tandis que l’équipement fait tourner le produit. Tous les autres passages restent ouverts et sans pression afin de contrôler les fuites externes et les fuites entre passages. L’unité est acceptée uniquement lorsque l’instrument affiche PASS. Ce contrôle de production ne démontre ni la durée de vie ni l’aptitude à un autre fluide, une autre pression, une autre vitesse ou d’autres conditions de service.",
    "faq-23": "Dans un raccord tournant multipassage, chaque passage est mis sous pression séparément tandis que tous les autres restent ouverts et sans pression. L’équipement compare le résultat à la pression, au temps de maintien et aux critères d’acceptation définis. Si une fuite entre passages est détectée, l’unité est classée NG. Elle n’est acceptée que si l’équipement ne détecte aucune fuite entre passages au-dessus du seuil de détection défini dans les conditions d’essai spécifiées.",
    "faq-24": "Oui. Chaque raccord tournant possède un numéro de traçabilité individuel lié à son rapport d’inspection. Envoyez-nous ce numéro pour demander le rapport correspondant. Si ce rapport doit accompagner la commande ou respecter un format ou un critère d’acceptation particulier, précisez-le avant la commande.",
    "faq-25": "Certains raccords tournants peuvent être réparés ; des dommages importants peuvent nécessiter un remplacement. La garantie standard est d’un an à compter de la date d’expédition, sous réserve du devis, de la commande acceptée et des conditions de garantie écrites. En cas de problème, envoyez le modèle, le numéro de traçabilité, un résumé des conditions de service, les symptômes et les photos ou vidéos utiles. Si Begapunk confirme un défaut de fabrication couvert, la solution standard est un remplacement sans frais, les coûts de retour et d’expédition du remplacement étant traités comme convenu par écrit. Dans les autres cas, nous recommanderons une réparation ou un remplacement après inspection.",
    "faq-26": "La quantité minimale de commande est d’une unité pour les produits catalogue comme pour les produits sur mesure. La fabrication des modèles catalogue prend généralement environ 20 jours calendaires. Les produits sur mesure sont réalisés dans un délai de 30 jours calendaires. Le délai de production commence à réception du paiement et n’inclut pas le transport international.",
    "faq-28": "Non. Nous n’utilisons pas vos demandes ni vos plans à des fins de marketing et nous ne les publions pas.",
}


def class_xpath(class_name: str) -> str:
    return f"contains(concat(' ', normalize-space(@class), ' '), ' {class_name} ')"


def generate_faq_contract() -> None:
    load_lxml()
    document = html.fromstring((ROOT / "faq.html").read_text(encoding="utf-8-sig"))
    title = compact_text(document.xpath("//title")[0])
    description = meta_content(document, "description")
    h1 = compact_text(document.xpath("//h1")[0])
    hero = document.xpath(f"//*[ {class_xpath('faq-hero')} ]//p".replace("[ ", "[").replace(" ]", "]"))[0]
    jump_title = document.xpath(f"//*[ {class_xpath('faq-jump-title')} ]".replace("[ ", "[").replace(" ]", "]"))[0]
    jump_nav = document.xpath(f"//*[ {class_xpath('faq-jump-nav')} ]".replace("[ ", "[").replace(" ]", "]"))[0]
    sections = []
    for section in document.xpath(f"//*[ {class_xpath('faq-section')} ]".replace("[ ", "[").replace(" ]", "]")):
        section_id = section.get("id")
        heading_nodes = section.xpath(f".//*[{class_xpath('faq-category')}]")
        nav_nodes = document.xpath(f"//a[@href='#{section_id}']")
        heading = compact_text(heading_nodes[0]) if heading_nodes else section_id
        nav = compact_text(nav_nodes[0]) if nav_nodes else heading
        sections.append({"id": section_id, "navLabel": translate_text(nav), "heading": translate_text(heading)})
    questions = []
    related = []
    for item in document.xpath(f"//*[ {class_xpath('faq-item')} ]".replace("[ ", "[").replace(" ]", "]")):
        faq_id = item.get("id")
        question_node = item.xpath(f".//*[{class_xpath('faq-question')}]//span[1]")[0]
        answer_nodes = item.xpath(f".//*[{class_xpath('faq-answer')}]/p[not({class_xpath('faq-related-link')})]")
        answer_source = " ".join(compact_text(node) for node in answer_nodes)
        answer = FAQ_FACT_ANSWERS.get(faq_id, translate_text(answer_source))
        questions.append({"id": faq_id, "question": translate_text(compact_text(question_node)), "answer": answer})
        related_nodes = item.xpath(f".//*[{class_xpath('faq-related-link')}]//a")
        if related_nodes:
            link = related_nodes[0]
            href = link.get("href", "").replace("source=faq.html", "source=fr/faq.html")
            related.append({"faqId": faq_id, "text": translate_text(compact_text(link)), "href": href})
    cta = document.xpath(f"//*[ {class_xpath('faq-cta')} ]".replace("[ ", "[").replace(" ]", "]"))[0]
    data = {
        "language": "fr",
        "meta": {
            "title": translate_text(title),
            "description": translate_text(description),
            "h1": translate_text(h1),
            "heroIntro": translate_text(compact_text(hero)),
            "jumpTitle": translate_text(compact_text(jump_title)),
            "jumpAria": translate_text(jump_nav.get("aria-label", "FAQ categories")),
        },
        "sections": sections,
        "questions": questions,
        "relatedLinks": related,
        "cta": {
            "heading": translate_text(compact_text(cta.xpath(".//h2")[0])),
            "body": translate_text(compact_text(cta.xpath(".//p")[0])),
            "button": translate_text(compact_text(cta.xpath(".//a")[0])),
        },
        "review": {
            "method": "AI-assisted target-market line-by-line localization review",
            "nativeHumanSignoff": False,
            "unresolvedIssues": [],
            "officialTerminologySources": [
                {"name": "DEUBLIN France – Joints tournants, raccords tournants", "url": "https://www.deublin.eu/joints-tournants-raccords-tournants"},
                {"name": "SCHUNK France – Joint tournant DDF 2", "url": "https://schunk.com/fr/fr/technologie-d-automatisation/joint-tournant/c/PUB_8326"},
                {"name": "Festo France – Fonctionnement d’une unité de traitement d’air", "url": "https://www.festo.com/fr/fr/e/blog/in-practice/comment-fonctionne-une-unite-de-traitement-d-air-id_4074291"},
            ],
        },
    }
    data["meta"].update(
        {
            "title": "FAQ technique sur les raccords tournants | Begapunk",
            "description": "27 réponses techniques sur le fonctionnement, la sélection, les fluides, la conception sur mesure, le montage, les contrôles d’étanchéité et la traçabilité des raccords tournants.",
            "h1": "FAQ technique sur les raccords tournants",
        }
    )
    write_json(I18N / "manual" / "faq-fr.json", data)


def should_skip_element(element) -> bool:
    current = element
    while current is not None and isinstance(current.tag, str):
        if current.tag.lower() in SKIP_TAGS:
            return True
        if current.get("data-no-translate") is not None or current.get("translate", "").lower() == "no":
            return True
        classes = set((current.get("class") or "").split())
        if classes & SKIP_CLASSES:
            return True
        current = current.getparent()
    return False


def translate_jsonld_value(value, key=""):
    if isinstance(value, list):
        return [translate_jsonld_value(item, key) for item in value]
    if isinstance(value, dict):
        return {child_key: translate_jsonld_value(child, child_key) for child_key, child in value.items()}
    if not isinstance(value, str):
        return value
    if key == "inLanguage":
        return "fr"
    if key.startswith("@") or key in {"url", "sameAs", "image", "logo", "sku", "mpn", "productID", "datePublished", "dateModified", "availability", "itemCondition"}:
        return value
    return translate_text(value)


def localized_relative(value: str, page_names: set[str], current_page: str) -> str:
    if not value or value.startswith(("#", "mailto:", "tel:", "data:", "javascript:", "//")):
        return value
    if re.match(r"^[a-z][a-z0-9+.-]*:", value, re.I):
        return value
    split = urlsplit(value)
    path_value = split.path
    if path_value.startswith("/"):
        base = path_value.lstrip("/")
        if base in page_names:
            path_value = f"/fr/{base}" if base != "index.html" else "/fr/"
    else:
        clean = path_value.removeprefix("./")
        if clean in page_names or (not clean and split.fragment):
            path_value = clean
        elif clean and not clean.startswith("../"):
            path_value = "../" + clean
    query = parse_qsl(split.query, keep_blank_values=True)
    query = [(key, f"fr/{val}" if key == "source" and val in page_names else val) for key, val in query]
    return urlunsplit((split.scheme, split.netloc, path_value, urlencode(query), split.fragment))


def add_hreflang(document, page_name: str) -> None:
    head_nodes = document.xpath("//head")
    if not head_nodes:
        return
    head = head_nodes[0]
    for node in document.xpath("//link[@rel='alternate' and @hreflang]"):
        node.getparent().remove(node)
    canonical_url = f"https://www.begapunk.com/fr/{'' if page_name == 'index.html' else page_name}"
    canonical_nodes = document.xpath("//link[@rel='canonical']")
    if canonical_nodes:
        canonical_nodes[0].set("href", canonical_url)
    else:
        node = etree.Element("link", rel="canonical", href=canonical_url)
        head.append(node)
    insertion = canonical_nodes[0] if canonical_nodes else None
    alternates = [
        ("en", f"https://www.begapunk.com/{'' if page_name == 'index.html' else page_name}"),
        ("de", f"https://www.begapunk.com/de/{'' if page_name == 'index.html' else page_name}"),
        ("fr", canonical_url),
        ("ja", f"https://www.begapunk.com/ja/{'' if page_name == 'index.html' else page_name}"),
        ("ru", f"https://www.begapunk.com/ru/{'' if page_name == 'index.html' else page_name}"),
        ("x-default", f"https://www.begapunk.com/{'' if page_name == 'index.html' else page_name}"),
    ]
    for code, href in alternates:
        node = etree.Element("link", rel="alternate", hreflang=code, href=href)
        if insertion is not None:
            insertion.addprevious(node)
        else:
            head.append(node)


def translate_document(page_name: str) -> str:
    load_lxml()
    source_text = (ROOT / page_name).read_text(encoding="utf-8-sig")
    parser = html.HTMLParser(encoding="utf-8")
    document = html.document_fromstring(source_text.encode("utf-8"), parser=parser)
    document.set("lang", "fr")
    for element in document.iter():
        if not isinstance(element.tag, str):
            continue
        skipped = should_skip_element(element)
        if element.text and not skipped:
            element.text = translate_text(element.text)
        if element.tail and element.getparent() is not None and not should_skip_element(element.getparent()):
            element.tail = translate_text(element.tail)
        if not skipped:
            for attribute in TRANSLATABLE_ATTRIBUTES:
                if element.get(attribute):
                    element.set(attribute, translate_text(element.get(attribute)))
    for script in document.xpath("//script[@type='application/ld+json']"):
        if not script.text:
            continue
        try:
            script.text = json.dumps(translate_jsonld_value(json.loads(script.text)), ensure_ascii=False, separators=(",", ":"))
        except json.JSONDecodeError:
            pass
    page_names = set(read_json(I18N / "config.json")["pages"])
    for element in document.xpath("//*[@href or @src or @poster or @action]"):
        for attribute in ("href", "src", "poster", "action"):
            if element.get(attribute):
                element.set(attribute, localized_relative(element.get(attribute), page_names, page_name))
    add_hreflang(document, page_name)
    for node in document.xpath("//meta[@property='og:url']"):
        node.set("content", f"https://www.begapunk.com/fr/{'' if page_name == 'index.html' else page_name}")
    for node in document.xpath("//meta[@property='og:locale']"):
        node.set("content", "fr_FR")
    seo = CURATED_SEO.get(page_name)
    if seo:
        title_nodes = document.xpath("//title")
        if title_nodes:
            title_nodes[0].text = seo["title"]
        h1_nodes = document.xpath("//h1")
        if h1_nodes:
            h1_nodes[0].text = seo["h1"]
        for node in document.xpath("//meta[@name='description']"):
            node.set("content", seo["description"])
    return html.tostring(document, encoding="unicode", method="html", doctype="<!DOCTYPE html>") + "\n"


def generate_seed_pages() -> None:
    config = read_json(I18N / "config.json")
    pages = list(config["manualLocalizedPages"])
    pages.extend(page for page in config["translationManagedPages"] if PRODUCT_PAGE_RE.match(page))
    FR_DIR.mkdir(parents=True, exist_ok=True)
    for index, page_name in enumerate(pages, 1):
        (FR_DIR / page_name).write_text(translate_document(page_name), encoding="utf-8")
        print(f"seed {index}/{len(pages)} {page_name}", flush=True)


def apply_curated_seo_to_french_manual_pages() -> None:
    load_lxml()
    config = read_json(I18N / "config.json")
    seo = read_json(I18N / "seo" / "fr.json")
    for page_name in config["manualLocalizedPages"]:
        target = FR_DIR / page_name
        document = html.document_fromstring(target.read_bytes(), parser=html.HTMLParser(encoding="utf-8"))
        entry = seo[page_name]
        title_nodes = document.xpath("//title")
        h1_nodes = document.xpath("//h1")
        if len(title_nodes) != 1 or len(h1_nodes) != 1:
            raise RuntimeError(f"{page_name}: expected exactly one title and one h1")
        title_nodes[0].text = entry["title"]
        for child in list(h1_nodes[0]):
            h1_nodes[0].remove(child)
        h1_nodes[0].text = entry["h1"]
        selectors = {
            "description": ("//meta[@name='description']", entry["description"]),
            "og:title": ("//meta[@property='og:title']", entry["title"]),
            "og:description": ("//meta[@property='og:description']", entry["description"]),
            "twitter:title": ("//meta[@name='twitter:title']", entry["title"]),
            "twitter:description": ("//meta[@name='twitter:description']", entry["description"]),
        }
        for label, (xpath, value) in selectors.items():
            nodes = document.xpath(xpath)
            if len(nodes) != 1:
                raise RuntimeError(f"{page_name}: expected one {label}, found {len(nodes)}")
            nodes[0].set("content", value)
        target.write_text(
            html.tostring(document, encoding="unicode", method="html", doctype="<!DOCTYPE html>") + "\n",
            encoding="utf-8",
        )
        print(f"manual SEO {page_name}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--only",
        choices=("all", "cache", "seo", "resources", "contact", "faq", "pages", "apply-seo"),
        default="all",
    )
    args = parser.parse_args()
    actions = {
        "cache": generate_cache,
        "seo": generate_seo,
        "resources": generate_base_resources,
        "contact": generate_contact_contract,
        "faq": generate_faq_contract,
        "pages": generate_seed_pages,
        "apply-seo": apply_curated_seo_to_french_manual_pages,
    }
    if args.only == "all":
        for action in actions.values():
            action()
    else:
        actions[args.only]()
    print(f"French localization generation complete ({args.only}); translation-memory entries: {len(_translation_memory)}")


if __name__ == "__main__":
    main()
