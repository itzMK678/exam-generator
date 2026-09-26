import fitz


def extract_pdf(file_bytes: bytes):
    try:
        document = fitz.open(
            stream=file_bytes,
            filetype="pdf"
        )
    except Exception as open_err:
        raise ValueError(f"Failed to open PDF document: {str(open_err)}")

    try:
        if document.is_encrypted or document.needs_pass:
            raise ValueError("The uploaded PDF is password-protected or encrypted. Please remove password protection before uploading.")

        if len(document) == 0:
            raise ValueError("The uploaded PDF contains no pages.")

        pages = []
        total_text_parts = []

        for index, page in enumerate(document):
            try:
                text = page.get_text("text")
            except Exception:
                text = ""

            text = text.strip() if text else ""
            words = text.split()
            word_count = len(words)

            pages.append({
                "page_number": index + 1,
                "content": text,
                "word_count": word_count,
            })

            if text:
                total_text_parts.append(text)

        full_text = "\n".join(total_text_parts).strip()
        total_words = len(full_text.split()) if full_text else 0

        if total_words == 0:
            raise ValueError(
                "No selectable text found in this PDF. It appears to be a scanned or image-only document—please upload a PDF with selectable text or OCR enabled."
            )

        return {
            "page_count": len(pages),
            "word_count": total_words,
            "character_count": len(full_text),
            "pages": pages,
        }
    finally:
        document.close()