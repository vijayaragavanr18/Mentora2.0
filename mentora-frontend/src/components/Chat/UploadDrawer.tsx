"use client";
import { useEffect, useRef, useState } from "react";
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
  type UploadedDocument,
} from "../../lib/api";

type Props = {
  open: boolean;
  activeDocId: string | null;
  onClose: () => void;
  onSelectDoc: (docId: string | null, docTitle: string) => void;
};

const ACCEPT = "*"; // accept any file

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ready: "bg-emerald-900/60 text-emerald-300 border-emerald-700",
    processing: "bg-yellow-900/60 text-yellow-300 border-yellow-700",
    failed: "bg-red-900/60 text-red-300 border-red-700",
  };
  const cls = map[status] ?? map.processing;
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {status === "ready" ? "Ready" : status === "processing" ? "Processing…" : "Failed"}
    </span>
  );
}

export default function UploadDrawer({ open, activeDocId, onClose, onSelectDoc }: Props) {
  const [docs, setDocs] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load documents when drawer opens
  useEffect(() => {
    if (!open) return;
    loadDocs();
    // Poll every 3 s to catch status transitions processing → ready
    pollRef.current = setInterval(loadDocs, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadDocs = async () => {
    try {
      const list = await listDocuments();
      setDocs(list);
    } catch {
      // silently fail — maybe no auth yet
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      try {
        setProgress(`Uploading ${file.name}…`);
        const doc = await uploadDocument(file, { title: file.name });
        setDocs((prev) => [doc, ...prev]);
        setProgress(`Processing ${file.name}…`);
        // Auto-select newly uploaded doc
        onSelectDoc(`doc_${doc.id}`, doc.title || doc.original_name || file.name);
      } catch (e: any) {
        setError(e?.message || "Upload failed");
      }
    }

    setUploading(false);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (doc: UploadedDocument) => {
    if (!confirm(`Delete "${doc.title || doc.original_name}"?`)) return;
    try {
      await deleteDocument(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      if (activeDocId === `doc_${doc.id}`) onSelectDoc(null, "");
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-stone-950 border-l border-stone-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div>
            <h2 className="text-white font-semibold text-base">Study Documents</h2>
            <p className="text-stone-500 text-xs mt-0.5">
              Upload files — RAG answers from the selected doc
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-stone-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Upload zone */}
        <div className="px-4 py-3 border-b border-stone-800">
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className={`flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed py-6 cursor-pointer transition-colors
              ${uploading ? "border-stone-700 opacity-60 cursor-not-allowed" : "border-stone-700 hover:border-sky-600 hover:bg-sky-950/20"}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
            {uploading ? (
              <>
                <svg className="size-7 text-sky-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span className="text-stone-400 text-sm">{progress}</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="size-7 text-stone-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-stone-400 text-sm text-center">
                  Drop files here or <span className="text-sky-400 underline">browse</span>
                </p>
                <p className="text-stone-600 text-xs">PDF, DOCX, PPTX, XLSX, CSV, HTML, EPUB, Images, Code &amp; more</p>
              </>
            )}
          </label>

          {error && (
            <p className="mt-2 text-red-400 text-xs text-center">{error}</p>
          )}
        </div>

        {/* Active doc indicator */}
        {activeDocId && (
          <div className="mx-4 my-2 px-3 py-2 rounded-lg bg-sky-950/40 border border-sky-800 text-sky-300 text-xs flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>RAG active — questions answered from selected doc</span>
          </div>
        )}

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scroll">
          {docs.length === 0 ? (
            <p className="text-stone-600 text-sm text-center py-8">No documents yet. Upload one above.</p>
          ) : (
            docs.map((doc) => {
              const chromaId = `doc_${doc.id}`;
              const isActive = activeDocId === chromaId;
              return (
                <div
                  key={doc.id}
                  onClick={() => doc.status === "ready" && onSelectDoc(isActive ? null : chromaId, doc.title || doc.original_name || doc.filename)}
                  className={`rounded-xl p-3 border flex items-start gap-3 transition-colors
                    ${doc.status === "ready" ? "cursor-pointer" : "cursor-default opacity-70"}
                    ${isActive
                      ? "bg-sky-950/50 border-sky-700"
                      : "bg-stone-900/50 border-stone-800 hover:border-stone-600"}`}
                >
                  {/* File icon */}
                  <div className={`mt-0.5 rounded-lg p-1.5 flex-shrink-0 ${isActive ? "bg-sky-800/60" : "bg-stone-800"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`size-4 ${isActive ? "text-sky-300" : "text-stone-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? "text-sky-200" : "text-stone-200"}`}>
                      {doc.title || doc.original_name || doc.filename}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <StatusBadge status={doc.status} />
                      {doc.page_count > 0 && (
                        <span className="text-stone-500 text-[10px]">{doc.page_count}p</span>
                      )}
                      {doc.file_size_kb > 0 && (
                        <span className="text-stone-500 text-[10px]">
                          {doc.file_size_kb > 1024
                            ? `${(doc.file_size_kb / 1024).toFixed(1)} MB`
                            : `${doc.file_size_kb} KB`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc); }}
                    className="flex-shrink-0 text-stone-600 hover:text-red-400 transition-colors p-1 rounded"
                    title="Delete document"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: clear selection */}
        {activeDocId && (
          <div className="px-4 py-3 border-t border-stone-800">
            <button
              onClick={() => onSelectDoc(null, "")}
              className="w-full text-stone-400 hover:text-white text-xs py-2 rounded-lg hover:bg-stone-800 transition-colors"
            >
              Clear selection — answer without doc context
            </button>
          </div>
        )}
      </div>
    </>
  );
}
