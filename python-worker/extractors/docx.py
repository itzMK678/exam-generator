from docx import Document
from docx.text.paragraph import Paragraph
from docx.table import Table
from io import BytesIO

# Target ~400 words per logical page if no hard page breaks exist
WORDS_PER_LOGICAL_PAGE = 400


def extract_docx(file_bytes: bytes):
    try:
        document = Document(BytesIO(file_bytes))
    except Exception as docx_err:
        raise ValueError(f"Failed to read Word (.docx) document: {str(docx_err)}")

    pages = []
    current_page_paragraphs = []
    current_page_words = 0
    page_number = 1

    def flush_page():
        nonlocal current_page_paragraphs, current_page_words, page_number
        if current_page_paragraphs:
            page_text = "\n".join(current_page_paragraphs).strip()
            if page_text:
                pages.append({
                    "page_number": page_number,
                    "content": page_text,
                    "word_count": len(page_text.split()),
                })
                page_number += 1
            current_page_paragraphs = []
            current_page_words = 0

    # Walk body elements in exact reading order (paragraphs + tables inline)
    for child in document.element.body.iterchildren():
        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag

        if tag == "p":
            paragraph = Paragraph(child, document)
            has_page_break = False
            for run in paragraph.runs:
                if "w:br" in run._r.xml and 'w:type="page"' in run._r.xml:
                    has_page_break = True
                    break

            text = paragraph.text.strip()
            if text:
                p_words = len(text.split())
                if current_page_words + p_words > WORDS_PER_LOGICAL_PAGE and current_page_words > 0:
                    flush_page()

                current_page_paragraphs.append(text)
                current_page_words += p_words

            if has_page_break:
                flush_page()

        elif tag == "tbl":
            table = Table(child, document)
            table_rows_text = []
            for row in table.rows:
                row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_cells:
                    deduped = []
                    for cell in row_cells:
                        if not deduped or cell != deduped[-1]:
                            deduped.append(cell)
                    table_rows_text.append(" | ".join(deduped))

            if table_rows_text:
                table_text = "\n".join(table_rows_text)
                t_words = len(table_text.split())
                if current_page_words + t_words > WORDS_PER_LOGICAL_PAGE and current_page_words > 0:
                    flush_page()
                current_page_paragraphs.append(table_text)
                current_page_words += t_words

    flush_page()

    all_content = "\n".join(p["content"] for p in pages if p["content"]).strip()
    total_words = sum(p["word_count"] for p in pages)

    if total_words == 0:
        raise ValueError("The uploaded Word (.docx) document contains no readable text.")

    return {
        "page_count": len(pages),
        "word_count": total_words,
        "character_count": len(all_content),
        "pages": pages,
    }