import { useExam } from "../Context/ExamContent";

function AnswerPanel() {
  const {
    selectedQuestion,
    isAnswerPanelOpen,
    closeAnswerPanel,
  } = useExam();

  const answer =
    selectedQuestion?.correctAnswer ||
    selectedQuestion?.answer;

  const sourcePages =
    selectedQuestion?.sourcePages || [];

  return (
    <>
      {/* ==================================================
          BACKDROP
      ================================================== */}

      <div
        onClick={closeAnswerPanel}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          isAnswerPanelOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* ==================================================
          ANSWER PANEL
      ================================================== */}

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isAnswerPanelOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Answer & Explanation
            </h2>

            {selectedQuestion && (
              <p className="mt-1 text-xs text-slate-400">
                Question{" "}
                {selectedQuestion.id || ""}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={closeAnswerPanel}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            ×
          </button>

        </div>


        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="flex-1 overflow-y-auto p-5">

          {!selectedQuestion ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Select a question to view its answer.
            </div>
          ) : (
            <div className="space-y-5">

              {/* QUESTION */}

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Question
                </p>

                <p className="text-sm leading-6 text-slate-700">
                  {selectedQuestion.question}
                </p>
              </div>


              {/* ANSWER */}

              {answer && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">

                  <p className="text-sm font-bold text-green-800">
                    Correct Answer
                  </p>

                  <p className="mt-2 text-sm leading-6 text-green-700">
                    {answer}
                  </p>

                </div>
              )}


              {/* EXPLANATION */}

              {selectedQuestion.explanation && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-sm font-bold text-slate-800">
                    Explanation
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {selectedQuestion.explanation}
                  </p>

                </div>
              )}


              {/* SOURCE PAGES */}

              {sourcePages.length > 0 && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">

                  <p className="text-sm font-bold text-indigo-800">
                    Source Pages
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">

                    {sourcePages.map(
                      (page, index) => (
                        <span
                          key={index}
                          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-sm"
                        >
                          Page {page}
                        </span>
                      )
                    )}

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

export default AnswerPanel;