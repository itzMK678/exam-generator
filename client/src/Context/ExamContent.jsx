import { createContext, useContext, useState, useEffect } from "react";

const ExamContext = createContext(null);

export function ExamProvider({ children }) {
  const [generatedExam, setGeneratedExam] = useState(() => {
    try {
      const saved = localStorage.getItem("examforge_generated_exam");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const [isAnswerPanelOpen, setIsAnswerPanelOpen] = useState(false);

  // ============================================================
  // DISCUSSIONS
  // Each question has its own conversation, persisted across refreshes
  // ============================================================

  const [discussions, setDiscussions] = useState(() => {
    try {
      const saved = localStorage.getItem("examforge_discussions");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync exam to localStorage
  useEffect(() => {
    try {
      if (generatedExam) {
        localStorage.setItem(
          "examforge_generated_exam",
          JSON.stringify(generatedExam)
        );
      } else {
        localStorage.removeItem("examforge_generated_exam");
      }
    } catch (err) {
      console.warn("Failed to persist exam to localStorage:", err);
    }
  }, [generatedExam]);

  // Sync discussions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "examforge_discussions",
        JSON.stringify(discussions)
      );
    } catch (err) {
      console.warn("Failed to persist discussions to localStorage:", err);
    }
  }, [discussions]);

  // Create a stable key for each question
  const getQuestionKey = (question) => {
    return String(
      question?.id ??
      question?.question ??
      ""
    );
  };

  // Get messages for a particular question
  const getDiscussionMessages = (question) => {
    const key = getQuestionKey(question);

    return discussions[key] || [];
  };

  // Add a message to a question's discussion
  const addDiscussionMessage = (question, message) => {
    const key = getQuestionKey(question);

    setDiscussions((previous) => ({
      ...previous,
      [key]: [
        ...(previous[key] || []),
        message,
      ],
    }));
  };

  // Clear discussion for one question
  const clearDiscussion = (question) => {
    const key = getQuestionKey(question);

    setDiscussions((previous) => {
      const updated = { ...previous };

      delete updated[key];

      return updated;
    });
  };

  // ============================================================
  // ANSWER PANEL
  // ============================================================

  const openAnswerPanel = (question) => {
    setSelectedQuestion(question);
    setIsAnswerPanelOpen(true);
  };

  const closeAnswerPanel = () => {
    setIsAnswerPanelOpen(false);
  };

  // ============================================================
  // CLEAR EXAM
  // ============================================================

  const clearExam = () => {
    setGeneratedExam(null);
    setSelectedQuestion(null);
    setIsAnswerPanelOpen(false);
    setDiscussions({});
    try {
      localStorage.removeItem("examforge_generated_exam");
      localStorage.removeItem("examforge_discussions");
    } catch (err) {
      console.warn("Failed to clear localStorage on clearExam:", err);
    }
  };

  return (
    <ExamContext.Provider
      value={{
        generatedExam,
        setGeneratedExam,

        selectedQuestion,
        setSelectedQuestion,

        isAnswerPanelOpen,

        openAnswerPanel,
        closeAnswerPanel,

        discussions,
        getDiscussionMessages,
        addDiscussionMessage,
        clearDiscussion,

        clearExam,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const context = useContext(ExamContext);

  if (!context) {
    throw new Error(
      "useExam must be used inside ExamProvider"
    );
  }

  return context;
}