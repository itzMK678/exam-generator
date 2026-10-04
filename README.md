# ExamForge
> **Transform textbooks, lecture slides, and notes into customized, balanced exam papers with verified page citations, answer keys, explanations, document summaries, and an interactive AI study tutor.**
ExamForge is a full-stack, AI-native platform designed for educators, students, and institutions. Upload multi-page PDF or Word (`.docx`) materials, and ExamForge will extract text, chunk and index content in Supabase, and generate tailored exams using Google Gemini models.
---
##  Key Features
* **Multi-Format Document Ingestion**: High-performance text and table extraction from `.pdf` and `.docx` educational files using PyMuPDF and `python-docx`.
* **Proportional Multi-Document Allocation**: Upload multiple lecture modules or textbook chapters simultaneously; questions are allocated proportionally to each document's length using the Largest Remainder Method.
* **Customizable Question Formats**:
  * **MCQs**: 4 distinct options with one unambiguously correct choice.
  * **Short Answer**: 1–3 sentence expected responses.
  * **Long Answer / Essay**: Detailed, structured multi-point expected responses.
* **Verified Page Citations**: Every generated question includes verifiable source page numbers directly from your uploaded materials.
* **Executive Document Summaries**: Instant high-level distillation of core concepts, definitions, and topics for any uploaded document.
* **Interactive AI Tutor Chat**: Ask clarifying questions, request real-world examples, or dive deeper into any specific exam question with a context-aware AI tutor.
* **Export & Print Ready**: One-click Markdown export to clipboard, plus custom print stylesheets for physical paper distribution.
* **Vercel & Serverless Ready**: Architected to run seamlessly on modern serverless infrastructure without mandatory Redis or PM2 requirements.
---
##  Architecture Overview
```mermaid
graph TD
    User([User / Browser])
    Client[Client: React 19 + Tailwind v4 + Vite]
    Server[Server: Express 5 + Node.js]
    Worker[Python Worker: FastAPI + PyMuPDF + python-docx]
    Supabase[(Supabase PostgreSQL: documents, pages, chunks)]
    Gemini[Google Gemini API]
    User <-->|UI & Interaction| Client
    Client <-->|REST APIs| Server
    Server <-->|File Upload / Text Extraction| Worker
    Server <-->|Metadata & Text Chunks| Supabase
    Server <-->|Structured JSON & Text Generation| Gemini
````
#  License
````
This project is open-source and available under the [MIT License](LICENSE).
