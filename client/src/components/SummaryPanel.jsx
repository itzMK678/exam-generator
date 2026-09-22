import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

function SummaryPanel({
  document,
  isOpen,
  onClose,
}) {
  const [summary, setSummary] = useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] = useState("");


  // ============================================================
  // GENERATE SUMMARY
  // ============================================================

  const handleGenerateSummary = async () => {
    if (!document?.id) {
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
            documentId: document.id,
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

      setSummary(data.summary);

    } catch (error) {
      console.error(
        "Summary error:",
        error
      );

      setError(
        error.message ||
          "Failed to generate summary."
      );

    } finally {
      setIsLoading(false);
    }
  };


  return (
    <>
      {/* ==================================================
          BACKDROP
      ================================================== */}

      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />


      {/* ==================================================
          SUMMARY PANEL
      ================================================== */}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

          <div className="min-w-0">

            <h2 className="text-lg font-bold text-slate-900">
              Document Summary
            </h2>

            {document && (
              <p className="mt-1 truncate text-xs text-slate-400">
                {document.name}
              </p>
            )}

          </div>


          <button
            type="button"
            onClick={onClose}
            className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            ×
          </button>

        </div>


        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="flex-1 overflow-y-auto p-5">

          {!document ? (

            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Select a document to view its summary.
            </div>

          ) : (

            <div className="space-y-5">

              {/* DOCUMENT NAME */}

              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">

                <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Document
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-800">
                  {document.name}
                </p>

              </div>


              {/* GENERATE BUTTON */}

              {!summary && !isLoading && !error && (
                <button
                  type="button"
                  onClick={handleGenerateSummary}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Generate Summary
                </button>
              )}


              {/* LOADING */}

              {isLoading && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">

                  <p className="text-sm font-semibold text-slate-700">
                    Generating summary...
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    ExamForge is reading this document.
                  </p>

                </div>
              )}


              {/* ERROR */}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                  <p className="text-sm font-semibold text-red-700">
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Try Again
                  </button>

                </div>
              )}


              {/* SUMMARY */}

              {summary && (
                <div className="rounded-xl border border-slate-200 bg-white">

                  <div className="border-b border-slate-200 px-4 py-3">

                    <p className="text-sm font-bold text-slate-800">
                      Summary
                    </p>

                  </div>


                  <div className="whitespace-pre-wrap px-4 py-4 text-sm leading-7 text-slate-600">
                    {summary}
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