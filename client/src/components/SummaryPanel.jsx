import { useState, useRef, useEffect } from "react";
import MarkdownRenderer from "./MarkdownRenderer.jsx";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

function SummaryPanel({
  document,
  isOpen,
  onClose,
}) {
  // Cache summaries, loading, and errors keyed by document ID
  const [summaryCache, setSummaryCache] = useState({});
  const [loadingByDoc, setLoadingByDoc] = useState({});
  const [errorByDoc, setErrorByDoc] = useState({});
  const [copied, setCopied] = useState(false);
  const abortControllersRef = useRef({});

  const docId = document?.id;
  const docName = document?.filename || document?.name || "Selected Document";
  const currentSummary = docId ? summaryCache[docId] || "" : "";
  const isLoading = docId ? Boolean(loadingByDoc[docId]) : false;
  const error = docId ? errorByDoc[docId] || "" : "";

  useEffect(() => {
    const controllers = abortControllersRef.current;
    return () => {
      Object.values(controllers).forEach((ctrl) => ctrl?.abort());
    };
  }, []);

  // ============================================================
  // GENERATE SUMMARY (LIVE SSE STREAMING)
  // ============================================================
  const handleGenerateSummary = async () => {
    if (!docId || loadingByDoc[docId]) {
      return;
    }

    // Abort any previous stream for this doc
    if (abortControllersRef.current[docId]) {
      abortControllersRef.current[docId].abort();
    }

    const controller = new AbortController();
    abortControllersRef.current[docId] = controller;

    setLoadingByDoc((prev) => ({ ...prev, [docId]: true }));
    setErrorByDoc((prev) => ({ ...prev, [docId]: "" }));
    setSummaryCache((prev) => ({ ...prev, [docId]: "" }));

    try {
      const response = await fetch(
        `${API_URL}/api/documents/summarize/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId: docId,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        let errorMsg = "Failed to generate summary.";
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      if (!response.body) {
        throw new Error("Streaming is not supported by your browser or empty response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.replace(/^data:\s*/, "");
          if (dataStr === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              accumulated += parsed.text;
              setSummaryCache((prev) => ({
                ...prev,
                [docId]: accumulated,
              }));
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (jsonErr) {
            if (jsonErr.message && !jsonErr.message.includes("JSON")) {
              throw jsonErr;
            }
          }
        }
      }

      if (!accumulated.trim()) {
        throw new Error("Empty summary received from server.");
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Summary error:", err);
      setErrorByDoc((prev) => ({
        ...prev,
        [docId]:
          err.message ||
          "Failed to generate summary. Please ensure the server is running.",
      }));
    } finally {
      setLoadingByDoc((prev) => ({ ...prev, [docId]: false }));
      delete abortControllersRef.current[docId];
    }
  };

  const handleCopy = () => {
    if (!currentSummary) return;
    navigator.clipboard.writeText(currentSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = document?.word_count ?? document?.wordCount;

  return (
    <div className="print:hidden">
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
                  {wordCount ? (
                    <span className="text-xs text-indigo-700">
                      {Number(wordCount).toLocaleString()} words
                    </span>
                  ) : null}
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

              {/* INITIAL LOADING (BEFORE FIRST TOKEN) */}
              {isLoading && !currentSummary && (
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

              {/* SUMMARY RESULT (STREAMING OR COMPLETED) */}
              {currentSummary && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <span>Executive Summary</span>
                      {isLoading && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-normal text-indigo-600">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600" />
                          Streaming...
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      {!isLoading && (
                        <button
                          type="button"
                          onClick={handleGenerateSummary}
                          className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
                        >
                          Regenerate
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={handleCopy}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 disabled:opacity-50"
                      >
                        {copied ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div className="px-4 py-4 text-slate-700">
                    <MarkdownRenderer content={currentSummary} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default SummaryPanel;