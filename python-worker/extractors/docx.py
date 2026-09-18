from docx import Document
from io import BytesIO #it help to treat byte store in memory as file object


def extract_docx(file_bytes: bytes):
    document = Document(
        BytesIO(file_bytes)
    )

    paragraphs = []

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()

        if text:
            paragraphs.append(text)

    full_text = "\n".join(
        paragraphs
    ).strip()

    word_count = len(
        full_text.split()
    )

    # DOCX doesn't naturally expose
    # PDF-style page numbers.
    #
    # We currently treat the extracted
    # document as one logical page.
    pages = []

    if full_text:
        pages.append({
            "page_number": 1,
            "content": full_text,
            "word_count": word_count,
        })

    return {
        "page_count": len(pages),

        "word_count": word_count,

        "character_count": len(
            full_text
        ),

        "pages": pages,
    } 