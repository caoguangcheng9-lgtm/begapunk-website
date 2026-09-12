from __future__ import annotations

import argparse
import hashlib
import os
import tempfile
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject, NameObject


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = ROOT / "downloads"
TEMP_DIR = ROOT / "tmp" / "pdfs" / "metadata-rewrite"
AUTHOR = "Ningbo Begapunk Pneumatic Components Co., Ltd."

TITLES = {
    "Begapunk-Rotary-Joint-Catalog-2026.pdf": "Begapunk Rotary Joint Product Catalog 2026",
    "Begapunk_Rotary_Joint_Installation_Manual.pdf": "Begapunk Pneumatic Rotary Union Installation Manual",
    "BP-1P-0003.pdf": "BP-1P-0003 Pneumatic Rotary Union Engineering Drawing",
    "BP-1P-0006.pdf": "BP-1P-0006 Pneumatic Rotary Union Engineering Drawing",
    "BP-2P-0001.pdf": "BP-2P-0001 Pneumatic Rotary Union Engineering Drawing",
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
}

FORBIDDEN_PDF_KEYS = {
    "/AA",
    "/Collection",
    "/EmbeddedFile",
    "/EmbeddedFiles",
    "/EF",
    "/GoToE",
    "/GoToR",
    "/ImportData",
    "/JavaScript",
    "/JS",
    "/Launch",
    "/Movie",
    "/OpenAction",
    "/Rendition",
    "/RichMedia",
    "/Sound",
    "/SubmitForm",
    "/XFA",
}


def forbidden_pdf_features(reader: PdfReader) -> list[str]:
    findings: set[str] = set()
    visited_indirect: set[tuple[int, int]] = set()

    def visit(value: object, object_path: str) -> None:
        if isinstance(value, IndirectObject):
            identity = (value.idnum, value.generation)
            if identity in visited_indirect:
                return
            visited_indirect.add(identity)
            value = value.get_object()

        if isinstance(value, DictionaryObject):
            for raw_key, child in value.items():
                key = str(raw_key)
                child_path = f"{object_path}/{key.removeprefix('/')}"
                if key in FORBIDDEN_PDF_KEYS:
                    findings.add(child_path)
                visit(child, child_path)
        elif isinstance(value, ArrayObject):
            for index, child in enumerate(value):
                visit(child, f"{object_path}[{index}]")
        elif isinstance(value, NameObject) and str(value) in FORBIDDEN_PDF_KEYS:
            # PDF actions such as /S /Launch and annotations such as
            # /Subtype /RichMedia express the dangerous feature as a name
            # value, not necessarily as a dictionary key.
            findings.add(f"{object_path}={value}")

    visit(reader.trailer.get("/Root"), "Root")
    return sorted(findings)


def assert_safe_pdf(reader: PdfReader, file_name: str) -> None:
    if reader.is_encrypted:
        raise RuntimeError(f"PDF safety check failed for {file_name}: encrypted PDFs are forbidden")
    findings = forbidden_pdf_features(reader)
    if findings:
        raise RuntimeError(
            f"PDF safety check failed for {file_name}: active or embedded content at {findings}"
        )


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


def metadata_mismatches(
    pdf_path: Path, reader: PdfReader | None = None
) -> dict[str, tuple[object, str]]:
    reader = reader or PdfReader(str(pdf_path))
    metadata = reader.metadata or {}
    expected = expected_metadata(pdf_path.name)
    return {
        key: (metadata.get(key), value)
        for key, value in expected.items()
        if metadata.get(key) != value
    }


def check_pdf(pdf_path: Path) -> None:
    reader = PdfReader(str(pdf_path))
    assert_safe_pdf(reader, pdf_path.name)
    # Reading every page proves the document structure is traversable rather
    # than merely accepting a valid header and end marker.
    page_fingerprint(reader)
    mismatches = metadata_mismatches(pdf_path, reader)
    if mismatches:
        raise RuntimeError(f"Metadata check failed for {pdf_path.name}: {mismatches}")


def rewrite_pdf(pdf_path: Path) -> bool:
    source_reader = PdfReader(str(pdf_path))
    assert_safe_pdf(source_reader, pdf_path.name)
    if not metadata_mismatches(pdf_path, source_reader):
        return False

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
    return True


def run_safety_self_test() -> None:
    with tempfile.TemporaryDirectory(prefix="begapunk-pdf-safety-") as temporary:
        temporary_root = Path(temporary)
        safe_path = temporary_root / "safe.pdf"
        javascript_path = temporary_root / "javascript.pdf"
        launch_path = temporary_root / "launch.pdf"
        attachment_path = temporary_root / "attachment.pdf"

        safe_writer = PdfWriter()
        safe_writer.add_blank_page(width=72, height=72)
        with safe_path.open("wb") as stream:
            safe_writer.write(stream)
        assert_safe_pdf(PdfReader(str(safe_path)), safe_path.name)

        active_writer = PdfWriter()
        active_writer.add_blank_page(width=72, height=72)
        active_writer.add_js("app.alert('fixture');")
        with javascript_path.open("wb") as stream:
            active_writer.write(stream)

        launch_writer = PdfWriter()
        launch_writer.add_blank_page(width=72, height=72)
        launch_writer.root_object[NameObject("/FixtureAction")] = DictionaryObject(
            {NameObject("/S"): NameObject("/Launch")}
        )
        with launch_path.open("wb") as stream:
            launch_writer.write(stream)

        attachment_writer = PdfWriter()
        attachment_writer.add_blank_page(width=72, height=72)
        attachment_writer.add_attachment("fixture.txt", b"fixture")
        with attachment_path.open("wb") as stream:
            attachment_writer.write(stream)

        for unsafe_path, label in [
            (javascript_path, "JavaScript"),
            (launch_path, "Launch action"),
            (attachment_path, "embedded attachment"),
        ]:
            try:
                assert_safe_pdf(PdfReader(str(unsafe_path)), unsafe_path.name)
            except RuntimeError as error:
                if "active or embedded content" not in str(error):
                    raise
            else:
                raise RuntimeError(f"PDF safety self-test failed: {label} fixture was accepted")

    print("PDF safety self-test passed: safe PDF accepted; JavaScript, Launch action, and embedded attachment fixtures rejected.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply or verify SEO metadata on public Begapunk PDFs.")
    parser.add_argument("--write", action="store_true", help="Rewrite PDFs in place after invariant checks.")
    parser.add_argument("--self-test", action="store_true", help="Run isolated positive and negative PDF safety fixtures.")
    args = parser.parse_args()

    if args.self_test:
        run_safety_self_test()
        return

    pdfs = validate_inventory()
    if args.write:
        updated = 0
        for pdf_path in pdfs:
            updated += int(rewrite_pdf(pdf_path))
        try:
            TEMP_DIR.rmdir()
            TEMP_DIR.parent.rmdir()
            TEMP_DIR.parent.parent.rmdir()
        except OSError:
            pass
        unchanged = len(pdfs) - updated
        print(f"Updated metadata for {updated} PDFs; {unchanged} already matched. Verified all {len(pdfs)} PDFs.")
    else:
        for pdf_path in pdfs:
            check_pdf(pdf_path)
        print(f"Verified metadata for {len(pdfs)} PDFs.")


if __name__ == "__main__":
    main()
