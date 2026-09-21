import { createContext, useContext, useState } from "react";

const ExamContext = createContext(null);

export function ExamProvider({ children }) {
  const [generatedExam, setGeneratedExam] = useState(null);

  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const [isAnswerPanelOpen, setIsAnswerPanelOpen] =
    useState(false);

  // Open answer panel for a specific question
  const openAnswerPanel = (question) => {
    setSelectedQuestion(question);
    setIsAnswerPanelOpen(true);
  };

  // Close answer panel
  const closeAnswerPanel = () => {
    setIsAnswerPanelOpen(false);
  };

  // Completely clear exam data
  const clearExam = () => {
    setGeneratedExam(null);
    setSelectedQuestion(null);
    setIsAnswerPanelOpen(false);
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