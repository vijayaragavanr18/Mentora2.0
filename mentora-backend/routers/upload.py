"""Upload Router — file ingestion into ChromaDB."""
import os
import uuid
import shutil
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from database.connection import get_db
from models.document import DocumentORM, DocumentOut
from services import rag_pipeline, vector_store
from routers.auth import get_current_user, UserORM
from config import get_settings

router = APIRouter(prefix="/api", tags=["upload"])
settings = get_settings()

# All accepted extensions — virtually everything readable
ALLOWED_EXTENSIONS = {
    # Documents
    ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".xlsm",
    # Text
    ".txt", ".md", ".markdown", ".rtf", ".csv", ".tsv",
    # Web / data
    ".html", ".htm", ".xml", ".json", ".yaml", ".yml", ".toml", ".ini", ".log",
    # Images (OCR)
    ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp", ".gif",
    # E-books
    ".epub",
    # Code files
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp", ".cs",
    ".go", ".rs", ".rb", ".php", ".swift", ".kt", ".r", ".sql", ".sh",
}


async def _ingest_and_update(
    file_path: str,
    doc_id: str,
    db_doc_id: str,
    metadata: dict,
) -> None:
    """Background task: parse, embed, upsert, update DB status."""
    from sqlalchemy.ext.asyncio import AsyncSession
    from database.connection import AsyncSessionLocal
    from sqlalchemy import update as sql_update

    async with AsyncSessionLocal() as db:
        try:
            result = await rag_pipeline.ingest_document(file_path, doc_id, metadata)

            # Generate summary + FAQ from raw chunks (non-blocking, best-effort)
            summary_text = None
            faq_data = []
            try:
                raw_chunks = result.get("raw_chunks", [])
                doc_title = metadata.get("title") or metadata.get("original_name", "Document")
                sf = await rag_pipeline.generate_summary_and_faq(raw_chunks, doc_title)
                summary_text = sf.get("summary")
                faq_data = sf.get("faq", [])
            except Exception as sf_err:
                print(f"[upload] summary/faq generation failed (non-fatal): {sf_err}")

            stmt = (
                sql_update(DocumentORM)
                .where(DocumentORM.id == db_doc_id)
                .values(
                    status=result["status"],
                    page_count=result.get("page_count", 0),
                    file_size_kb=result.get("file_size_kb", 0),
                    chroma_collection_id=doc_id,
                    summary=summary_text,
                    faq=faq_data,
                )
            )
            await db.execute(stmt)
            await db.commit()
        except Exception as e:
            stmt = (
                sql_update(DocumentORM)
                .where(DocumentORM.id == db_doc_id)
                .values(status="failed")
            )
            await db.execute(stmt)
            await db.commit()
            print(f"Ingest error for {doc_id}: {e}")


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_file(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    subject: Optional[str] = Form(None),
    grade: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    # Save file to disk
    os.makedirs(settings.upload_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.upload_dir, safe_name)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Create DB record
    db_doc = DocumentORM(
        id=uuid.uuid4(),
        user_id=user.id if user else None,
        filename=safe_name,
        original_name=file.filename,
        subject=subject,
        grade=grade,
        title=title or file.filename,
        status="processing",
    )
    db.add(db_doc)
    await db.commit()
    await db.refresh(db_doc)

    # Queue background ingest
    chroma_id = f"doc_{db_doc.id}"
    metadata = {"subject": subject, "grade": grade, "original_name": file.filename}
    background.add_task(_ingest_and_update, file_path, chroma_id, str(db_doc.id), metadata)

    return DocumentOut(
        id=str(db_doc.id),
        filename=db_doc.filename,
        original_name=db_doc.original_name,
        subject=db_doc.subject,
        grade=db_doc.grade,
        title=db_doc.title,
        page_count=0,
        file_size_kb=0,
        status="processing",
        created_at=db_doc.created_at,
        summary=None,
        faq=[],
    )


@router.get("/documents", response_model=list[DocumentOut])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    stmt = select(DocumentORM)
    if user:
        stmt = stmt.where(DocumentORM.user_id == user.id)
    result = await db.execute(stmt.order_by(DocumentORM.created_at.desc()))
    docs = result.scalars().all()
    return [
        DocumentOut(
            id=str(d.id),
            filename=d.filename,
            original_name=d.original_name,
            subject=d.subject,
            grade=d.grade,
            title=d.title,
            page_count=d.page_count or 0,
            file_size_kb=d.file_size_kb or 0,
            status=d.status or "processing",
            created_at=d.created_at,
            summary=d.summary,
            faq=d.faq or [],
        )
        for d in docs
    ]


@router.delete("/documents/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    stmt = select(DocumentORM).where(DocumentORM.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    # Remove from ChromaDB
    if doc.chroma_collection_id:
        vector_store.delete_collection(doc.chroma_collection_id)

    # Remove file from disk
    file_path = os.path.join(settings.upload_dir, doc.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    await db.execute(delete(DocumentORM).where(DocumentORM.id == doc_id))
    await db.commit()
