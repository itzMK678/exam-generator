import { useEffect, useState, useRef } from "react";
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
    clearDiscussion,
  } = useExam();

  const [userMessage, setUserMessage] = useState("");
  const [isDiscussing, setIsDiscussing] = useState(false);
  const chatBottomRef = useRef(null);

  // ============================================================
  // RESET INPUT WHEN QUESTION CHANGES
  // ============================================================
  useEffect(() => {
    setUserMessage("");
  }, [selectedQuestion]);

  // ============================================================
  // AUTO SCROLL CHAT TO BOTTOM
  // ============================================================
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isAnswerPanelOpen, selectedQuestion, isDiscussing]);

  const answer =
    selectedQuestion?.correctAnswer ||
    selectedQuestion?.answer;

  const sourcePages =
    selectedQuestion?.sourcePages || [];

  const discussionMessages =
    selectedQuestion
      ? getDiscussionMessages(selectedQuestion)
      : [];

  // ============================================================
  // SEND DISCUSSION MESSAGE
  // ============================================================
  const sendMessage = async () => {
    const message = userMessage.trim();
    if (!message || !selectedQuestion || isDiscussing) {
      return;
    }

    const previousMessages = getDiscussionMessages(selectedQuestion);

    const newUserMessage = {
      role: "user",
      content: message,
    };

    const updatedMessages = [
      ...previousMessages,
      newUserMessage,
    ];

    addDiscussionMessage(selectedQuestion, newUserMessage);
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
            question: selectedQuestion.question,
            answer,
            explanation: selectedQuestion.explanation || "",
            messages: updatedMessages,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to discuss question."
        );
      }

      addDiscussionMessage(selectedQuestion, {
        role: "assistant",
        content: data.message,
      });
    } catch (error) {
      console.error("Discussion error:", error);
      addDiscussionMessage(selectedQuestion, {
        role: "assistant",
        content:
          "Sorry, I had trouble generating a response. Please check that the server is online and try again.",
      });
    } finally {
      setIsDiscussing(false);
    }
  };

  const handleDiscuss = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* ==================================================
          BACKDROP
      ================================================== */}
      <div
        onClick={closeAnswerPanel}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          isAnswerPanelOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* ==================================================
          ANSWER PANEL
      ================================================== */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isAnswerPanelOpen
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        {/* ==================================================
            HEADER
        ================================================== */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Answer & Explanation
            </h2>
            {selectedQuestion && (
              <p className="mt-1 text-xs text-slate-400">
                Question {selectedQuestion.id || ""} • {selectedQuestion.filename || "Document"}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={closeAnswerPanel}
            aria-label="Close answer panel"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        {/* ==================================================
            CONTENT
        ================================================== */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedQuestion ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Select a question to view its answer.
            </div>
          ) : (
            <div className="space-y-5">
              {/* QUESTION TEXT */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">
                  Question
                </p>
                <p className="text-sm font-medium leading-relaxed text-slate-800">
                  {selectedQuestion.question}
                </p>
              </div>

              {/* CORRECT ANSWER */}
              {answer && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Correct Answer
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-900">
                    {answer}
                  </p>
                </div>
              )}

              {/* EXPLANATION */}
              {selectedQuestion.explanation && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Detailed Explanation
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {selectedQuestion.explanation}
                  </p>
                </div>
              )}

              {/* SOURCE PAGES */}
              {sourcePages.length > 0 && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                    Verified Source Pages
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {sourcePages.map((page, index) => (
                      <span
                        key={index}
                        className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-indigo-600 shadow-xs border border-indigo-100"
                      >
                        Page {page}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* DISCUSSION SECTION */}
              <div className="border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      AI Tutor Discussion
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Ask clarifying questions or request more examples.
                    </p>
                  </div>
                  {discussionMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearDiscussion(selectedQuestion)}
                      className="text-xs font-medium text-slate-400 hover:text-red-500 transition"
                    >
                      Clear chat
                    </button>
                  )}
                </div>

                {/* MESSAGES */}
                {discussionMessages.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {discussionMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex flex-col ${
                          message.role === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <span className="mb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {message.role === "user" ? "You" : "AI Tutor"}
                        </span>
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            message.role === "user"
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-850 border border-slate-200"
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isDiscussing && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    <span>AI Tutor is thinking...</span>
                  </div>
                )}

                <div ref={chatBottomRef} />

                {/* INPUT FORM */}
                <form onSubmit={handleDiscuss} className="mt-4">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={userMessage}
                      onChange={(event) => setUserMessage(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask the tutor (Press Enter to send)..."
                      rows={2}
                      disabled={isDiscussing}
                      className="min-h-[50px] flex-1 resize-none rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 disabled:bg-slate-100"
                    />

                    <button
                      type="submit"
                      disabled={!userMessage.trim() || isDiscussing}
                      className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Send
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