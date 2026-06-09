import uuid
from pathlib import Path
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import settings

router = APIRouter(prefix="/api/upload")

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".doc", ".docx", ".xls", ".xlsx"}
MAX_SIZE = 10 * 1024 * 1024


@router.post("/docs")
async def upload_document(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Tipo de archivo no permitido: {ext}")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(400, "El archivo excede el tamano maximo de 10 MB")

    upload_dir = Path(settings.UPLOAD_DIR).resolve()
    upload_dir.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / unique_name
    file_path.write_bytes(contents)

    return {"url": f"/uploads/{unique_name}", "filename": file.filename}
