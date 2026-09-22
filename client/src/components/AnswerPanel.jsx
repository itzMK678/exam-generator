import { useEffect, useState } from "react";
import { useExam } from "../Context/ExamContent";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

function AnswerPanel() {
  const {
    selectedQuestion,
    isAnswerPanelOpen,
    closeAnswerPanel,

    getDiscussionMessages,
    addDiscussionMessage,
  } = useExam();

  const [userMessage, setUserMessage] = useState("");

  const [isDiscussing, setIsDiscussing] =
    useState(false);

  // ============================================================
  // RESET INPUT WHEN QUESTION CHANGES
  // ============================================================

  useEffect(() => {
    setUserMessage("");
  }, [selectedQuestion]);

  // ============================================================
  // ANSWER
  // ============================================================

  const answer =
    selectedQuestion?.correctAnswer ||
    selectedQuestion?.answer;

  // ============================================================
  // SOURCE PAGES
  // ============================================================

  const sourcePages =
    selectedQuestion?.sourcePages || [];

  // ============================================================
  // DISCUSSION MESSAGES
  // ============================================================

  const discussionMessages =
    selectedQuestion
      ? getDiscussionMessages(selectedQuestion)
      : [];

  // ============================================================
  // SEND DISCUSSION MESSAGE
  // ============================================================

  const handleDiscuss = async (event) => {
    event.preventDefault();

    const message = userMessage.trim();

    if (!message || !selectedQuestion) {
      return;
    }

    // Get existing conversation
    const previousMessages =
      getDiscussionMessages(selectedQuestion);

    // Add the new user message locally
    const newUserMessage = {
      role: "user",
      content: message,
    };

    const updatedMessages = [
      ...previousMessages,
      newUserMessage,
    ];

    addDiscussionMessage(
      selectedQuestion,
      newUserMessage
    );

    setUserMessage("");
    setIsDiscussing(true);

    try {
      const response = await fetch(
        `${API_URL}/api/exams/discuss`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            question:
              selectedQuestion.question,

            answer,

            explanation:
              selectedQuestion.explanation || "",

            messages: updatedMessages,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to discuss question."
        );
      }

      // Add AI response to this question's conversation
      addDiscussionMessage(
        selectedQuestion,
        {
          role: "assistant",
          content: data.message,
        }
      );

    } catch (error) {
      console.error(
        "Discussion error:",
        error
      );

      addDiscussionMessage(
        selectedQuestion,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't process your message. Please try again.",
        }
      );
    } finally {
      setIsDiscussing(false);
    }
  };

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

              {/* ==================================================
                  QUESTION
              ================================================== */}

              <div>

                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Question
                </p>

                <p className="text-sm leading-6 text-slate-700">
                  {selectedQuestion.question}
                </p>

              </div>


              {/* ==================================================
                  ANSWER
              ================================================== */}

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


              {/* ==================================================
                  EXPLANATION
              ================================================== */}

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


              {/* ==================================================
                  SOURCE PAGES
              ================================================== */}

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


              {/* ==================================================
                  DISCUSSION
              ================================================== */}

              <div className="border-t border-slate-200 pt-5">

                <p className="text-sm font-bold text-slate-800">
                  Discuss this question
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Ask anything about this question or its concept.
                </p>


                {/* ==================================================
                    PREVIOUS MESSAGES
                ================================================== */}

                {discussionMessages.length > 0 && (
                  <div className="mt-4 space-y-3">

                    {discussionMessages.map(
                      (message, index) => (

                        <div
                          key={index}
                          className={
                            message.role === "user"
                              ? "ml-8 rounded-xl bg-indigo-600 p-3 text-sm text-white"
                              : "mr-8 rounded-xl bg-slate-100 p-3 text-sm leading-6 text-slate-700"
                          }
                        >
                          {message.content}
                        </div>

                      )
                    )}

                  </div>
                )}


                {/* ==================================================
                    INPUT FORM
                ================================================== */}

                <form
                  onSubmit={handleDiscuss}
                  className="mt-4"
                >

                  <div className="flex items-end gap-2">

                    <textarea
                      value={userMessage}
                      onChange={(event) =>
                        setUserMessage(
                          event.target.value
                        )
                      }
                      placeholder="Ask something about this question..."
                      rows={2}
                      disabled={isDiscussing}
                      className="min-h-[50px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
                    />

                    <button
                      type="submit"
                      disabled={
                        !userMessage.trim() ||
                        isDiscussing
                      }
                      className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDiscussing
                        ? "..."
                        : "Send"}
                    </button>

                  </div>

                </form>

              </div>

            </div>

          )}

        </div>

      </aside>
    </>
  );
}

export default AnswerPanel;