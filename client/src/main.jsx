import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";

import { ExamProvider } from "./Context/ExamContent.jsx";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ExamProvider>
      <App />
    </ExamProvider>
  </StrictMode>
);