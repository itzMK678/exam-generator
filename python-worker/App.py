from fastapi import FastAPI, UploadFile, File, HTTPException
from extractors.pdf import extract_pdf
from extractors.docx import extract_docx


app = FastAPI(
    title="Exam Document Worker",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "service": "ExamForge Python Worker",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/extract")
async def extract_document(
    file: UploadFile = File(...)
):
    # this function use file AND UPLOAD FILE TO GET FILE FROM FRONTEND AND EXTEACT FILE NAME AND SIZE
    filename = file.filename or ""
#IT IS TELLING THE FILE NAME TO LOWER CASE TO CHECK IF IT IS PDF OR DOCX
    filename_lower = filename.lower()

    if not (
        filename_lower.endswith(".pdf")
        or filename_lower.endswith(".docx")
    ):
        raise HTTPException(
            status_code=400,
            detail="Only PDF and DOCX files are supported."
        )

    file_bytes = await file.read()
    # saving the file bytes to check if the file is empty or not

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    try:

        if filename_lower.endswith(".pdf"):
            result = extract_pdf(
                file_bytes
            )

            file_type = "pdf"

        else:
            result = extract_docx(
                file_bytes
            )

            file_type = "docx"

        return {
            "success": True,

            "filename": filename,

            "file_type": file_type,

            **result
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {str(error)}"
        )