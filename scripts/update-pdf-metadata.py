from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path

from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = ROOT / "downloads"
TEMP_DIR = ROOT / "tmp" / "pdfs" / "metadata-rewrite"
AUTHOR = "Ningbo Begapunk Pneumatic Components Co., Ltd."

TITLES = {
    "Begapunk-Rotary-Joint-Catalog-2026.pdf": "Begapunk Rotary Joint Product Catalog 2026",
    "Begapunk_Rotary_Joint_Installation_Manual.pdf": "Begapunk Pneumatic Rotary Union Installation Manual",
    "BP-1P-0003.pdf": "BP-1P-0003 Pneumatic Rotary Union Engineering Drawing",
    "BP-1P-0006.pdf": "BP-1P-0006 Pneumatic Rotary Union Engineering Drawing",
    "BP-200-0001-view.pdf": "BP-200-0001 Rotary Union Assembly View Drawing",
    "BP-200-0001.pdf": "BP-200-0001 Rotary Union Engineering Drawing",
    "BP-2P-0001.pdf": "BP-2P-0001 Pneumatic Rotary Union Engineering Drawing",
    "BP-2P-0001_draft.pdf": "BP-2P-0001 Pneumatic Rotary Union Draft Drawing",
    "BP-2P-0002.pdf": "BP-2P-0002 Pneumatic Rotary Union Engineering Drawing",
    "BP-2P-08-0001.pdf": "BP-2P-08-0001 Through-Bore Rotary Union Engineering Drawing",
    "BP-2P-130-0001.pdf": "BP-2P-130-0001 High-Pressure Rotary Union Engineering Drawing",
    "BP-2P-16-0001.pdf": "BP-2P-16-0001 Through-Bore Rotary Union Engineering Drawing",
    "BP-2P-30-0001.pdf": "BP-2P-30-0001 Through-Bore Rotary Union Engineering Drawing",
    "BP-2P-50-0001.pdf": "BP-2P-50-0001 Rotary Union Engineering Drawing",
    "BP-2P-95-0005.pdf": "BP-2P-95-0005 2-Passage Pneumatic Rotary Union Engineering Drawing",
    "BP-3P-0004.pdf": "BP-3P-0004 Pneumatic Rotary Union Engineering Drawing",
    "BP-3P-0006.pdf": "BP-3P-0006 Pneumatic Rotary Union Engineering Drawing",
    "BP-3P-0007.pdf": "BP-3P-0007 Pneumatic Rotary Union Engineering Drawing",
    "BP-3P-S06-0001.pdf": "BP-3P-S06-0001 Pneumatic-Electric Rotary Union Drawing",
    "BP-4P-30-0001.pdf": "BP-4P-30-0001 Through-Bore Rotary Union Engineering Drawing",
    "BP-8P-0001.pdf": "BP-8P-0001 Eight-Passage Rotary Union Engineering Drawing",
    "SJ10-06.pdf": "SJ10-06 Rotary Union Engineering Drawing",
}


def page_fingerprint(reader: PdfReader) -> list[tuple[str, tuple[float, float, float, float]]]:
    fingerprints = []
    for page in reader.pages:
        text_hash = hashlib.sha256((page.extract_text() or "").encode("utf-8")).hexdigest()
        box = page.mediabox
        dimensions = tuple(float(value) for value in (box.left, box.bottom, box.right, box.top))
        fingerprints.append((text_hash, dimensions))
    return fingerprints


def expected_metadata(file_name: str) -> dict[str, str]:
    title = TITLES[file_name]
    model = file_name.removesuffix(".pdf").replace("_draft", "").replace("-view", "")
    if file_name == "Begapunk-Rotary-Joint-Catalog-2026.pdf":
        subject = "Pneumatic rotary unions, rotary joints, specifications and model selection"
        keywords = "Begapunk, rotary union catalog, rotary joint catalog, pneumatic rotary union"
    elif file_name == "Begapunk_Rotary_Joint_Installation_Manual.pdf":
        subject = "Installation, alignment, filtration and maintenance guidance for pneumatic rotary unions"
        keywords = "Begapunk, rotary union installation, rotary joint maintenance, pneumatic rotary union"
    else:
        subject = f"Engineering drawing and technical dimensions for Begapunk {model}"
        keywords = f"Begapunk, {model}, pneumatic rotary union, rotary joint, engineering drawing, dimensions"
    return {
        "/Title": title,
        "/Author": AUTHOR,
        "/Subject": subject,
        "/Keywords": keywords,
        "/Creator": "Begapunk Engineering",
        "/Producer": "Begapunk PDF Metadata Pipeline",
    }


def validate_inventory() -> list[Path]:
    pdfs = sorted(DOWNLOADS.glob("*.pdf"))
    actual = {pdf.name for pdf in pdfs}
    expected = set(TITLES)
    if actual != expected:
        missing = sorted(expected - actual)
        unconfigured = sorted(actual - expected)
        raise RuntimeError(f"PDF inventory mismatch; missing={missing}, unconfigured={unconfigured}")
    return pdfs


def check_pdf(pdf_path: Path) -> None:
    reader = PdfReader(str(pdf_path))
    metadata = reader.metadata or {}
    expected = expected_metadata(pdf_path.name)
    mismatches = {
        key: (metadata.get(key), value)
        for key, value in expected.items()
        if metadata.get(key) != value
    }
    if mismatches:
        raise RuntimeError(f"Metadata check failed for {pdf_path.name}: {mismatches}")


def rewrite_pdf(pdf_path: Path) -> None:
    source_reader = PdfReader(str(pdf_path))
    source_fingerprint = page_fingerprint(source_reader)

    writer = PdfWriter()
    writer.clone_document_from_reader(source_reader)
    writer.add_metadata(expected_metadata(pdf_path.name))

    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    output_path = TEMP_DIR / pdf_path.name
    with output_path.open("wb") as stream:
        writer.write(stream)

    output_reader = PdfReader(str(output_path))
    if len(output_reader.pages) != len(source_reader.pages):
        raise RuntimeError(f"Page count changed for {pdf_path.name}")
    if page_fingerprint(output_reader) != source_fingerprint:
        raise RuntimeError(f"Page text or dimensions changed for {pdf_path.name}")

    os.replace(output_path, pdf_path)
    check_pdf(pdf_path)


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply or verify SEO metadata on public Begapunk PDFs.")
    parser.add_argument("--write", action="store_true", help="Rewrite PDFs in place after invariant checks.")
    args = parser.parse_args()

    pdfs = validate_inventory()
    if args.write:
        for pdf_path in pdfs:
            rewrite_pdf(pdf_path)
        try:
            TEMP_DIR.rmdir()
            TEMP_DIR.parent.rmdir()
            TEMP_DIR.parent.parent.rmdir()
        except OSError:
            pass
        print(f"Updated and verified metadata for {len(pdfs)} PDFs.")
    else:
        for pdf_path in pdfs:
            check_pdf(pdf_path)
        print(f"Verified metadata for {len(pdfs)} PDFs.")


if __name__ == "__main__":
    main()
