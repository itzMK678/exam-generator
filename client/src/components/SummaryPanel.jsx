import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

function SummaryPanel({
  document,
  isOpen,
  onClose,
}) {
  // Cache summaries by document ID to avoid repeated AI calls
  const [summaryCache, setSummaryCache] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const docId = document?.id;
  const docName = document?.filename || document?.name || "Selected Document";
  const currentSummary = docId ? summaryCache[docId] : "";

  // ============================================================
  // GENERATE SUMMARY
  // ============================================================
  const handleGenerateSummary = async () => {
    if (!docId) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/documents/summarize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId: docId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to generate summary."
        );
      }

      setSummaryCache((prev) => ({
        ...prev,
        [docId]: data.summary,
      }));
    } catch (err) {
      console.error("Summary error:", err);
      setError(
        err.message ||
          "Failed to generate summary. Please ensure the server is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!currentSummary) return;
    navigator.clipboard.writeText(currentSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* ==================================================
          BACKDROP
      ================================================== */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* ==================================================
          SUMMARY PANEL
      ================================================== */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        {/* ==================================================
            HEADER
        ================================================== */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">
              Document Summary
            </h2>
            {document && (
              <p className="mt-1 truncate text-xs font-medium text-slate-400">
                {docName}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close summary panel"
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        {/* ==================================================
            CONTENT
        ================================================== */}
        <div className="flex-1 overflow-y-auto p-6">
          {!document ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Select a document to view its summary.
            </div>
          ) : (
            <div className="space-y-5">
              {/* DOCUMENT INFO CARD */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                    Source Document
                  </p>
                  {document.word_count && (
                    <span className="text-xs text-indigo-700">
                      {Number(document.word_count).toLocaleString()} words
                    </span>
                  )}
                </div>
                <p className="mt-1.5 truncate text-sm font-semibold text-slate-800">
                  {docName}
                </p>
              </div>

              {/* GENERATE BUTTON */}
              {!currentSummary && !isLoading && !error && (
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow-md"
                >
                  <span>✨ Generate AI Summary</span>
                </button>
              )}

              {/* LOADING */}
              {isLoading && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  <p className="text-sm font-semibold text-slate-800">
                    Analyzing document & generating summary...
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    ExamForge is distilling key concepts and definitions.
                  </p>
                </div>
              )}

              {/* ERROR */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-700">{error}</p>
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    className="mt-3 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
                  >
                    Retry Generation
                  </button>
                </div>
              )}

              {/* SUMMARY RESULT */}
              {currentSummary && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <p className="text-sm font-bold text-slate-800">
                      Executive Summary
                    </p>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                    >
                      {copied ? "✓ Copied" : "Copy"}
                    </button>
                  </div>

                  <div className="whitespace-pre-wrap px-4 py-4 text-sm leading-7 text-slate-700">
                    {currentSummary}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default SummaryPanel;