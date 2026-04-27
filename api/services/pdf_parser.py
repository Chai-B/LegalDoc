"""PDF text extraction — adapted from existing implementation."""
import io
import logging
import zipfile
import xml.etree.ElementTree as ET
from typing import Optional

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF bytes. Returns extracted text or error message."""
    if not file_content:
        return ""

    try:
        import pypdf
        pdf_file = io.BytesIO(file_content)
        reader = pypdf.PdfReader(pdf_file)

        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                return "This PDF is password-protected. Please provide an unprotected version."

        text_parts: list[str] = []
        max_pages = min(len(reader.pages), 15)

        for page_num in range(max_pages):
            try:
                page_text = reader.pages[page_num].extract_text()
                if page_text and page_text.strip():
                    cleaned = ' '.join(page_text.split())
                    if len(cleaned) > 30:
                        text_parts.append(cleaned)
                        if len('\n\n'.join(text_parts)) > 50_000:
                            break
            except Exception as e:
                logger.warning(f"Failed to extract page {page_num + 1}: {e}")
                continue

        if not text_parts:
            return "No text could be extracted. The PDF may contain only images or be scanned without OCR."

        return '\n\n'.join(text_parts)

    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return f"Error reading PDF: {str(e)[:100]}"


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract visible paragraph text from DOCX bytes without persisting the file."""
    if not file_content:
        return ""

    try:
        with zipfile.ZipFile(io.BytesIO(file_content)) as docx:
            xml_bytes = docx.read("word/document.xml")

        root = ET.fromstring(xml_bytes)
        namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        paragraphs: list[str] = []

        for paragraph in root.findall(".//w:p", namespace):
            parts = [
                node.text
                for node in paragraph.findall(".//w:t", namespace)
                if node.text and node.text.strip()
            ]
            text = " ".join(parts).strip()
            if text:
                paragraphs.append(text)

        if not paragraphs:
            return "No text could be extracted from this DOCX file."

        return "\n\n".join(paragraphs)
    except KeyError:
        return "This DOCX file does not contain a readable document body."
    except zipfile.BadZipFile:
        return "This file is not a valid DOCX document."
    except Exception as e:
        logger.error(f"DOCX extraction error: {e}")
        return f"Error reading DOCX: {str(e)[:100]}"
