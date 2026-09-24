import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from extractors.pdf import extract_pdf
from extractors.docx import extract_docx

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("examforge-worker")

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB limit

app = FastAPI(
    title="ExamForge Document Worker",
    version="1.1.0",
    description="High-performance extraction microservice for PDF and DOCX educational documents"
)


@app.get("/")
def root():
    return {
        "service": "ExamForge Python Worker",
        "status": "running",
        "version": "1.1.0"
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
    filename = file.filename or "uploaded_file"
    filename_lower = filename.lower()

    if not (filename_lower.endswith(".pdf") or filename_lower.endswith(".docx")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Only .pdf and .docx files are supported."
        )

    try:
        file_bytes = await file.read()
    except Exception as read_err:
        logger.error(f"Failed to read stream for {filename}: {read_err}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to read uploaded file: {str(read_err)}"
        )

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty (0 bytes)."
        )

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
        )

    logger.info(f"Extracting {filename} ({len(file_bytes)} bytes)...")

    try:
        if filename_lower.endswith(".pdf"):
            result = extract_pdf(file_bytes)
            file_type = "pdf"
        else:
            result = extract_docx(file_bytes)
            file_type = "docx"

        logger.info(f"Successfully extracted {filename}: {result['page_count']} pages, {result['word_count']} words.")

        return {
            "success": True,
            "filename": filename,
            "file_type": file_type,
            **result
        }

    except ValueError as val_err:
        logger.warning(f"Validation error extracting {filename}: {val_err}")
        raise HTTPException(
            status_code=400,
            detail=str(val_err)
        )
    except Exception as error:
        logger.error(f"Unexpected error extracting {filename}: {error}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {str(error)}"
        )