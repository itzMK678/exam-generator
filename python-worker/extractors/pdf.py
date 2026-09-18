import fitz


def extract_pdf(file_bytes: bytes):
    document = fitz.open(
        stream=file_bytes,
        filetype="pdf"
    )

    pages = []

    total_text = ""

    for index, page in enumerate(document):
        # build in feature give us 2 things index and pdf page number  
        text = page.get_text("text")
# get text is also build in to get text
        text = text.strip()

        word_count = len(
            text.split()
        )
# split text in word
        pages.append({
            "page_number": index + 1,
            "content": text,
            "word_count": word_count,
        })

        total_text += text + "\n"

    document.close()

    total_text = total_text.strip()

    return {
        "page_count": len(pages),

        "word_count": len(
            total_text.split()
        ),

        "character_count": len(
            total_text
        ),

        "pages": pages,
    }