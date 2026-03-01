"""Document Parser — handles any file type for RAG ingestion."""
import os
import io
from typing import List, Tuple

# PDF
import fitz  # PyMuPDF

# OCR
try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

# PPTX
try:
    from pptx import Presentation
    PPTX_AVAILABLE = True
except ImportError:
    PPTX_AVAILABLE = False

# DOCX
try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

# CSV / Excel
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

# HTML / XML
try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False

# RTF
try:
    from striprtf.striprtf import rtf_to_text
    RTF_AVAILABLE = True
except ImportError:
    RTF_AVAILABLE = False

# EPUB
try:
    import ebooklib
    from ebooklib import epub
    EPUB_AVAILABLE = True
except ImportError:
    EPUB_AVAILABLE = False


def chunk_text(text: str, chunk_size: int = 250, overlap: int = 30) -> List[str]:
    """Split text into overlapping chunks.
    
    250 words ≈ 325 tokens — safely under mxbai-embed-large's 512-token limit.
    """
    words = text.split()
    chunks = []
    step = chunk_size - overlap
    for i in range(0, len(words), step):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk.strip())
    return chunks or [text.strip()]


def parse_pdf(file_path: str) -> Tuple[str, int]:
    """Extract text from PDF. Falls back to OCR if text layer is empty."""
    doc = fitz.open(file_path)
    pages = []
    for page in doc:
        text = page.get_text("text").strip()
        if text:
            pages.append(text)
        elif OCR_AVAILABLE:
            # OCR fallback for scanned pages
            pix = page.get_pixmap(dpi=200)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            ocr_text = pytesseract.image_to_string(img)
            pages.append(ocr_text.strip())
    return "\n\n".join(pages), len(pages)


def parse_pptx(file_path: str) -> Tuple[str, int]:
    if not PPTX_AVAILABLE:
        return "", 0
    prs = Presentation(file_path)
    slides_text = []
    for slide in prs.slides:
        slide_parts = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                slide_parts.append(shape.text.strip())
        if slide_parts:
            slides_text.append("\n".join(slide_parts))
    return "\n\n".join(slides_text), len(slides_text)


def parse_docx(file_path: str) -> Tuple[str, int]:
    if not DOCX_AVAILABLE:
        return "", 0
    d = docx.Document(file_path)
    paragraphs = [p.text.strip() for p in d.paragraphs if p.text.strip()]
    return "\n\n".join(paragraphs), len(paragraphs)


def parse_txt(file_path: str) -> Tuple[str, int]:
    try:
        import chardet
        with open(file_path, "rb") as f:
            raw = f.read()
        enc = chardet.detect(raw)["encoding"] or "utf-8"
        text = raw.decode(enc, errors="ignore")
    except Exception:
        with open(file_path, encoding="utf-8", errors="ignore") as f:
            text = f.read()
    lines = [l for l in text.splitlines() if l.strip()]
    return text, len(lines)


def parse_image(file_path: str) -> Tuple[str, int]:
    if not OCR_AVAILABLE:
        return "", 0
    img = Image.open(file_path)
    text = pytesseract.image_to_string(img)
    return text.strip(), 1


def parse_csv(file_path: str) -> Tuple[str, int]:
    if not PANDAS_AVAILABLE:
        return "", 0
    try:
        df = pd.read_csv(file_path, encoding_errors="ignore")
        text = df.to_string(index=False)
        return text, len(df)
    except Exception:
        return "", 0


def parse_excel(file_path: str) -> Tuple[str, int]:
    if not PANDAS_AVAILABLE:
        return "", 0
    try:
        sheets = pd.read_excel(file_path, sheet_name=None)
        parts = []
        total_rows = 0
        for name, df in sheets.items():
            parts.append(f"[Sheet: {name}]\n{df.to_string(index=False)}")
            total_rows += len(df)
        return "\n\n".join(parts), total_rows
    except Exception:
        return "", 0


def parse_html(file_path: str) -> Tuple[str, int]:
    if not BS4_AVAILABLE:
        with open(file_path, encoding="utf-8", errors="ignore") as f:
            return f.read(), 1
    with open(file_path, encoding="utf-8", errors="ignore") as f:
        soup = BeautifulSoup(f.read(), "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator="\n", strip=True)
    lines = [l for l in text.splitlines() if l.strip()]
    return "\n".join(lines), len(lines)


def parse_rtf(file_path: str) -> Tuple[str, int]:
    if not RTF_AVAILABLE:
        return "", 0
    with open(file_path, encoding="utf-8", errors="ignore") as f:
        content = f.read()
    text = rtf_to_text(content)
    lines = [l for l in text.splitlines() if l.strip()]
    return text, len(lines)


def parse_epub(file_path: str) -> Tuple[str, int]:
    if not EPUB_AVAILABLE or not BS4_AVAILABLE:
        return "", 0
    book = epub.read_epub(file_path)
    parts = []
    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        soup = BeautifulSoup(item.get_content(), "html.parser")
        text = soup.get_text(separator="\n", strip=True)
        if text.strip():
            parts.append(text)
    text = "\n\n".join(parts)
    return text, len(parts)


def parse_json(file_path: str) -> Tuple[str, int]:
    import json
    with open(file_path, encoding="utf-8", errors="ignore") as f:
        data = json.load(f)
    text = json.dumps(data, indent=2, ensure_ascii=False)
    return text, 1


def parse_markdown(file_path: str) -> Tuple[str, int]:
    with open(file_path, encoding="utf-8", errors="ignore") as f:
        text = f.read()
    # Strip markdown syntax for cleaner embedding
    import re
    text = re.sub(r"#{1,6}\s*", "", text)          # headings
    text = re.sub(r"\*\*|__|\*|_|`{1,3}", "", text) # bold/italic/code
    text = re.sub(r"!?\[.*?\]\(.*?\)", "", text)    # links/images
    text = re.sub(r"^[-*+>]\s+", "", text, flags=re.M) # lists/blockquotes
    lines = [l for l in text.splitlines() if l.strip()]
    return "\n".join(lines), len(lines)


def parse_file(file_path: str) -> Tuple[str, int, List[str]]:
    """
    Parse any file and return (full_text, page_count, chunks).
    Unknown formats are read as plain text with encoding detection.
    """
    ext = os.path.splitext(file_path)[-1].lower()
    if ext == ".pdf":
        text, pages = parse_pdf(file_path)
    elif ext in (".pptx", ".ppt"):
        text, pages = parse_pptx(file_path)
    elif ext in (".docx", ".doc"):
        text, pages = parse_docx(file_path)
    elif ext in (".xlsx", ".xls", ".xlsm"):
        text, pages = parse_excel(file_path)
    elif ext == ".csv":
        text, pages = parse_csv(file_path)
    elif ext in (".html", ".htm", ".xml"):
        text, pages = parse_html(file_path)
    elif ext == ".rtf":
        text, pages = parse_rtf(file_path)
    elif ext == ".epub":
        text, pages = parse_epub(file_path)
    elif ext == ".json":
        text, pages = parse_json(file_path)
    elif ext in (".md", ".markdown"):
        text, pages = parse_markdown(file_path)
    elif ext in (".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp", ".gif"):
        text, pages = parse_image(file_path)
    else:
        # Fallback: try to read as plain text (handles .log, .yaml, .toml, .ini, etc.)
        text, pages = parse_txt(file_path)

    chunks = chunk_text(text) if text.strip() else []
    return text, pages, chunks
