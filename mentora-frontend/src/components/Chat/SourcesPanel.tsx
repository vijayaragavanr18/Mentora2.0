"use client";
import { useEffect, useRef, useState } from "react";
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
  type UploadedDocument,
  type FAQItem,
} from "../../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  activeDocIds: string[];
  onChangeDocIds: (ids: string[]) => void;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ready: "bg-emerald-900/60 text-emerald-300 border-emerald-700",
    processing: "bg-amber-900/60 text-amber-300 border-amber-700",
    failed: "bg-red-900/60 text-red-300 border-red-700",
  };
  const cls = map[status] ?? map.processing;
  const label = status === "ready" ? "Ready" : status === "processing" ? "Indexing…" : "Failed";
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function SpinnerIcon() {
  return (
    <svg className="size-5 text-sky-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function FAQSection({ faq }: { faq: FAQItem[] }) {
  const [open, setOpen] = useState(false);
  if (!faq || faq.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`size-3 transition-transform ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        {faq.length} FAQs
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-2 border-l border-stone-700">
          {faq.map((item, i) => (
            <div key={i} className="text-xs">
              <p className="font-medium text-stone-300">{item.q}</p>
              <p className="text-stone-500 mt-0.5">{item.a}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummarySection({ summary }: { summary: string }) {
  const [open, setOpen] = useState(false);
  if (!summary) return null;
  return (
    <div className="mt-2">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`size-3 transition-transform ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        Summary
      </button>
      {open && (
        <p className="mt-1 pl-2 border-l border-stone-700 text-xs text-stone-400 leading-relaxed">
          {summary}
        </p>
      )}
    </div>
  );
}

export default function SourcesPanel({ open, onClose, activeDocIds, onChangeDocIds }: Props) {
  const [docs, setDocs] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep polling while panel is open to catch processing → ready transitions
  useEffect(() => {
    if (!open) return;
    loadDocs(true); // auto-select all ready docs on open
    pollRef.current = setInterval(() => loadDocs(false), 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadDocs = async (autoSelect = false) => {
    try {
      const list = await listDocuments();
      setDocs(list);
      // Auto-select all ready docs when panel first opens and nothing is selected yet
      if (autoSelect) {
        const readyIds = list
          .filter((d) => d.status === "ready")
          .map((d) => `doc_${d.id}`);
        if (readyIds.length > 0) {
          const toAdd = readyIds.filter((id) => !activeDocIds.includes(id));
          if (toAdd.length > 0) {
            onChangeDocIds([...activeDocIds, ...toAdd]);
          }
        }
      }
    } catch {
      // non-fatal
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
        // Auto-select newly uploaded doc
        const chromaId = `doc_${doc.id}`;
        onChangeDocIds([...activeDocIds.filter((id) => id !== chromaId), chromaId]);
      } catch (e: any) {
        setError(e?.message || "Upload failed");
      }
    }
    setUploading(false);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (e: React.MouseEvent, doc: UploadedDocument) => {
    e.stopPropagation();
    if (!confirm(`Delete "${doc.title || doc.original_name}"?`)) return;
    try {
      await deleteDocument(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      const chromaId = `doc_${doc.id}`;
      onChangeDocIds(activeDocIds.filter((id) => id !== chromaId));
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    }
  };

  const toggleDoc = (doc: UploadedDocument) => {
    if (doc.status !== "ready") return;
    const chromaId = `doc_${doc.id}`;
    if (activeDocIds.includes(chromaId)) {
      onChangeDocIds(activeDocIds.filter((id) => id !== chromaId));
    } else {
      onChangeDocIds([...activeDocIds, chromaId]);
    }
  };

  const readyDocs = docs.filter((d) => d.status === "ready");
  const allSelected = readyDocs.length > 0 && readyDocs.every((d) => activeDocIds.includes(`doc_${d.id}`));

  const toggleAll = () => {
    if (allSelected) {
      onChangeDocIds([]);
    } else {
      onChangeDocIds(readyDocs.map((d) => `doc_${d.id}`));
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-[340px] bg-[#0e0e11] border-l border-stone-800 flex flex-col shadow-2xl transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span className="text-white font-semibold text-sm">Sources</span>
            {activeDocIds.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-900/70 text-sky-300 border border-sky-700">
                {activeDocIds.length} active
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-stone-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Upload zone */}
        <div className="px-4 py-3 border-b border-stone-800">
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            className={`flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed py-5 cursor-pointer transition-colors
              ${uploading ? "border-stone-700 opacity-60 cursor-not-allowed" : dragOver ? "border-sky-500 bg-sky-950/30" : "border-stone-700 hover:border-sky-600 hover:bg-sky-950/20"}`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFiles(e.target.files)}
            />
            {uploading ? (
              <>
                <SpinnerIcon />
                <span className="text-stone-400 text-xs">{progress}</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="size-6 text-stone-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-stone-400 text-xs text-center">
                  Drop files or <span className="text-sky-400 underline">browse</span>
                </p>
              </>
            )}
          </label>
          {error && <p className="mt-1.5 text-red-400 text-xs text-center">{error}</p>}
        </div>

        {/* All sources toggle */}
        {readyDocs.length > 1 && (
          <div
            className="flex items-center gap-3 px-4 py-2.5 border-b border-stone-800 cursor-pointer hover:bg-stone-900/50 transition-colors"
            onClick={toggleAll}
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
              ${allSelected ? "bg-sky-600 border-sky-500" : "border-stone-600 bg-transparent"}`}>
              {allSelected && (
                <svg xmlns="http://www.w3.org/2000/svg" className="size-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className="text-stone-300 text-sm font-medium">All sources</span>
            <span className="ml-auto text-stone-600 text-xs">{readyDocs.length} docs</span>
          </div>
        )}

        {/* Document list */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 custom-scroll">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-10 text-stone-700" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <p className="text-stone-600 text-sm">No sources yet</p>
              <p className="text-stone-700 text-xs">Upload files above to start querying</p>
            </div>
          ) : (
            docs.map((doc) => {
              const chromaId = `doc_${doc.id}`;
              const isActive = activeDocIds.includes(chromaId);
              const isReady = doc.status === "ready";
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDoc(doc)}
                  className={`rounded-xl p-3 border flex flex-col gap-1 transition-colors
                    ${isReady ? "cursor-pointer" : "cursor-default opacity-70"}
                    ${isActive
                      ? "bg-sky-950/50 border-sky-700"
                      : "bg-stone-900/50 border-stone-800 hover:border-stone-600"}`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Checkbox */}
                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                      ${isActive ? "bg-sky-600 border-sky-500" : "border-stone-600 bg-transparent"}`}>
                      {isActive && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="size-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {/* Doc info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium truncate max-w-[170px] ${isActive ? "text-sky-200" : "text-stone-200"}`}>
                          {doc.title || doc.original_name || doc.filename}
                        </span>
                        <StatusBadge status={doc.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-600">
                        {doc.page_count > 0 && <span>{doc.page_count} pages</span>}
                        {doc.file_size_kb > 0 && <span>{doc.file_size_kb < 1024 ? `${doc.file_size_kb} KB` : `${(doc.file_size_kb / 1024).toFixed(1)} MB`}</span>}
                      </div>
                      {isReady && doc.summary && <SummarySection summary={doc.summary} />}
                      {isReady && doc.faq && doc.faq.length > 0 && <FAQSection faq={doc.faq} />}
                    </div>
                    {/* Delete */}
                    <button
                      onClick={(e) => handleDelete(e, doc)}
                      className="flex-shrink-0 p-1 text-stone-600 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
                      title="Delete source"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {activeDocIds.length > 0 && (
          <div className="px-4 py-3 border-t border-stone-800 bg-sky-950/30">
            <p className="text-xs text-sky-300 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              RAG active — searching {activeDocIds.length} source{activeDocIds.length > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
