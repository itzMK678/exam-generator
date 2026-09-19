
import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [files, setFiles] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [mcqs, setMcqs] = useState(4);
  const [shortQuestions, setShortQuestions] = useState(3);
  const [longQuestions, setLongQuestions] = useState(3);

  const [focusTopics, setFocusTopics] = useState("");
  const [difficulty, setDifficulty] = useState("Mixed");
  const [includeAnswers, setIncludeAnswers] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState("");

  const [generatedExam, setGeneratedExam] = useState(null);
  const [loading, setLoading] = useState(false);


  const questionSum =
    mcqs + shortQuestions + longQuestions;

  const isDistributionValid =
    questionSum === totalQuestions;

  const isFormValid =
    files.length > 0 &&
    totalQuestions > 0 &&
    isDistributionValid;

  // --------------------------------------------------
  // GENERATE EXAM
  // --------------------------------------------------

  const generateExam = async (documents) => {
    try {
      setLoading(true);
      setError("");

      if (!documents || documents.length === 0) {
        throw new Error(
          "No processed documents are available."
        );
      }

      const documentIds = documents
        .map((document) => document.id)
        .filter(Boolean); 
// remove false value
      if (documentIds.length === 0) {
        throw new Error(
          "Processed documents do not contain valid IDs."
        );
      }

      const response = await fetch(
        `${API_URL}/api/exams/generate`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            documentIds,

            totalQuestions: Number(totalQuestions),

            mcqCount: Number(mcqs),

            shortCount: Number(shortQuestions),

            longCount: Number(longQuestions),
            // soemtimes we get value in string it converts it in number

            difficulty,

            focusTopics,

            includeAnswers,
          }),
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "Invalid response from exam-generation server."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Failed to generate exam."
        );
      }

      if (!data.data) {
        throw new Error(
          "The server did not return a generated exam."
        );
      }

      setGeneratedExam(data.data);

    } catch (error) {
      console.error(
        "Exam generation error:",
        error
      );

      setError(
        error.message ||
          "Something went wrong while generating the exam."
      );

    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // FILE HANDLING
  // --------------------------------------------------

  const handleFiles = (selectedFiles) => {
    setError("");
    setUploadResult(null);
    setGeneratedExam(null);

    const incomingFiles = Array.from(selectedFiles);

    const supportedFiles = incomingFiles.filter((file) => {
      const filename = file.name.toLowerCase();

      return (
        filename.endsWith(".pdf") ||
        filename.endsWith(".docx")
      );
    });

    // const unsupportedFiles = incomingFiles.filter((file) => {
    //   const filename = file.name.toLowerCase();

    //   return (
    //     !filename.endsWith(".pdf") &&
    //     !filename.endsWith(".docx")
    //   );
    // });

    // if (unsupportedFiles.length > 0) {
    //   setError(
    //     "Only PDF and DOCX files are supported."
    //   );
    // }

    setFiles((previousFiles) => {
      const existingFiles = new Set(
        previousFiles.map(
          (file) => `${file.name}-${file.size}`
        )
      );

      const newFiles = supportedFiles.filter(
        (file) =>
          !existingFiles.has(
            `${file.name}-${file.size}`
          )
      );

      return [...previousFiles, ...newFiles];
    });
  };

  const handleFileInput = (event) => {
    handleFiles(event.target.files);

    // Allows selecting the same file again later.
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();

    handleFiles(event.dataTransfer.files);
  };

  const removeFile = (indexToRemove) => {
    setFiles((previousFiles) =>
      previousFiles.filter(
        (_, index) => index !== indexToRemove
      )
    );

    setUploadResult(null);
    setGeneratedExam(null);
  };

  const clearFiles = () => {
    setFiles([]);
    setUploadResult(null);
    setGeneratedExam(null);
    setError("");
  };

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const formatFileSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileType = (filename) => {
    return filename
      .toLowerCase()
      .endsWith(".pdf")
      ? "PDF"
      : "DOCX";
  };

  // --------------------------------------------------
  // UPLOAD TO BACKEND
  // --------------------------------------------------

  const uploadDocuments = async () => {
    if (files.length === 0) {
      setError("Please upload at least one document.");
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError("");
    setUploadResult(null);

    try {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });

      const xhr = new XMLHttpRequest();
// creating xhr request
      const uploadPromise = new Promise(
        (resolve, reject) => {
          xhr.open(
            "POST",
            `${API_URL}/api/documents/upload`
          );

          xhr.upload.addEventListener(
            "progress",
            (event) => {
              if (event.lengthComputable) {
                const progress = Math.round(
                  (event.loaded / event.total) * 100
                );

                setUploadProgress(progress);
              }
            }
          );

          xhr.addEventListener(
            "load",
            () => {
              try {
                const response = JSON.parse(
                  xhr.responseText
                );

                if (
                  xhr.status >= 200 &&
                  xhr.status < 300
                ) {
                  resolve(response);
                } else {
                  reject(
                    new Error(
                      response.message ||
                        response.error ||
                        "Upload failed."
                    )
                  );
                }
              } catch {
                reject(
                  new Error(
                    "Invalid response from server."
                  )
                );
              }
            }
          );

          xhr.addEventListener(
            "error",
            () => {
              reject(
                new Error(
                  "Could not connect to the backend server."
                )
              );
            }
          );

          xhr.addEventListener(
            "abort",
            () => {
              reject(
                new Error(
                  "Upload was cancelled."
                )
              );
            }
          );

          xhr.send(formData);
        }
      );

      const result = await uploadPromise;

      setUploadProgress(100);
      setUploadResult(result);

      // Important: return the upload result.
      return result;

    } catch (uploadError) {
      console.error(uploadError);

      setError(
        uploadError.message ||
          "Something went wrong while uploading."
      );

      return null;

    } finally {
      setIsUploading(false);
    }
  };

  // --------------------------------------------------
  // UPLOAD + GENERATE EXAM
  // --------------------------------------------------

  const handleGenerateExam = async () => {
    if (!isFormValid) {
      return;
    }

    setError("");
    setGeneratedExam(null);

    try {
      // First upload and process documents.
      const result = await uploadDocuments();

     if (!result.documents || result.documents.length === 0) {
  console.error("Upload result:", result);

  const errorMessage =
    result?.errors?.map((item) => {
      return `${item.filename || "File"}: ${item.error}`;
    }).join("\n") ||
    result?.message ||
    "No documents were successfully processed.";

  throw new Error(errorMessage);
}

      // Then generate the exam using processed documents.
      await generateExam(result.documents);

    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Failed to generate exam."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

     

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
        {/* //Heading  */}
        <section className="mb-12 text-center">

          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-6xl">

            Create exams
            <br />

            <span className="text-indigo-600">
              from your documents and Pdf.
            </span>

          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">

            Upload your study material and create exams of different pattern using RAG.

          </p>

        </section>


        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">

            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
              !
            </div>

            <div>

              <p className="text-sm font-semibold text-red-800">
                Something went wrong
              </p>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>

            </div>

          </div>
        )}


        {/* to upload pdf */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">

            <div>

              <div className="flex items-center gap-3">

                <h2 className="text-lg font-bold text-slate-900">
                  1. Upload study material
                </h2>

                {files.length > 0 && (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-600">
                    {files.length}
                  </span>
                )}

              </div>

              <p className="mt-1 text-sm text-slate-500">
                Upload as many PDF or Word documents
                as you need.
              </p>

            </div>

            {files.length > 0 && (
              <button
                type="button"
                onClick={clearFiles}
                className="w-fit text-xs font-semibold text-slate-400 transition hover:text-red-500"
              >
                Clear all
              </button>
            )}

          </div>


          {/* DROP ZONE */}

          <label
            onDragOver={(event) =>
              event.preventDefault()
            }
            onDrop={handleDrop}
            className="group gap-3 flex min-h-30 cursor-pointer items-center justify-center rounded-xl border-2  border-slate-300 bg-slate-50 px-5 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
          >

            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl text-indigo-600 transition group-hover:scale-105">
              ↑
            </div>

            <h3 className="font-semibold text-slate-900">
              Drop your documents here
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              or{" "}
              <span className="font-semibold text-indigo-600">
                browse files
              </span>
            </p>

            <p className="mt-2 text-xs text-slate-400">
              PDF and DOCX • No fixed document limit
            </p>

          </label>


          {/* FILE LIST */}

          {files.length > 0 && (
            <div className=" mt-4 space-y-2">

              {files.map((file, index) => (

                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-green-50 p-3"
                >

                  <div className="flex min-w-0 items-center gap-3">

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[9px] font-extrabold ${
                        getFileType(file.name) === "PDF"
                          ? "bg-red-50 text-red-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {getFileType(file.name)}
                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-sm font-semibold text-slate-800">
                        {file.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {formatFileSize(file.size)}
                      </p>

                    </div>

                  </div>

                  <button
                    type="button"
                    disabled={isUploading || loading}
                    onClick={() =>
                      removeFile(index)
                    }
                    className="shrink-0 text-xs text-extrabold text-slate-400 transition hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                   X
                  </button>

                </div>

              ))}
 <section className="rounded-2xl  bg-white p-5  sm:p-6">

          <div className="mb-6">

            <h2 className="text-lg font-bold text-slate-900">
              2. Select Prefrences
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Tell what kind of exam
              you want to generate.
            </p>

          </div>


          {/* TOTAL + DIFFICULTY */}

          <div className="grid gap-5 sm:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Total questions
              </label>

              <input
                type="number"
                min="1"
                value={totalQuestions}
                onChange={(event) =>
                  setTotalQuestions(
                    Math.max(
                      1,
                      Number(event.target.value)
                    )
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />

            </div>


            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Difficulty
              </label>

              <select
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              >

                <option>Mixed</option>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>

              </select>

            </div>

          </div>


          {/* QUESTION TYPES */}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">

            <QuestionType
              title="Multiple Choice"
              description="MCQ questions"
              value={mcqs}
              onChange={setMcqs}
            />

            <QuestionType
              title="Short Answer"
              description="Brief responses"
              value={shortQuestions}
              onChange={setShortQuestions}
            />

            <QuestionType
              title="Long Answer"
              description="Detailed responses"
              value={longQuestions}
              onChange={setLongQuestions}
            />

          </div>


          {/* DISTRIBUTION */}

          <div
            className={`mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
              isDistributionValid
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >

            <span>
              Question distribution
            </span>

            <strong>
              {questionSum} / {totalQuestions}
            </strong>

          </div>

          {!isDistributionValid && (
            <p className="mt-2 text-xs text-red-600">
              MCQ + Short + Long questions must
              equal the total number of questions.
            </p>
          )}


          {/* FOCUS TOPICS */}

          <div className="mt-6">

            <label className="mb-2 block text-sm font-semibold text-slate-700">

              Focus topics{" "}

              <span className="font-normal text-slate-400">
                (optional)
              </span>

            </label>

            <textarea
              rows={4}
              value={focusTopics}
              onChange={(event) =>
                setFocusTopics(
                  event.target.value
                )
              }
              placeholder="e.g. Photosynthesis, genetics, cellular respiration..."
              className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            />

            <p className="mt-2 text-xs text-slate-400">
              Leave empty to use content from all
              uploaded documents.
            </p>

          </div>


          {/* ANSWER KEY */}

          <label className="mt-6 flex cursor-pointer items-start gap-3">

            <input
              type="checkbox"
              checked={includeAnswers}
              onChange={(event) =>
                setIncludeAnswers(
                  event.target.checked
                )
              }
              className="mt-1 h-4 w-4 accent-indigo-600"
            />

            <div>

              <p className="text-sm font-semibold text-slate-800">
                Generate answer key
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Include correct answers and
                explanations with the exam.
              </p>

            </div>

          </label>

        </section>

            </div>
          )}


          {/* UPLOAD PROGRESS */}

          {isUploading && (
            <div className="mt-5">

              <div className="mb-2 flex items-center justify-between">

                <span className="text-xs font-semibold text-slate-600">
                  Uploading and processing...
                </span>

                <span className="text-xs font-bold text-indigo-600">
                  {uploadProgress}%
                </span>

              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                  }}
                />

              </div>

            </div>
          )}

        </section>


        {/* ==================================================
            PROCESSING RESULT
        ================================================== */}

        {uploadResult && (
          <section className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5">

            <div className="flex items-start gap-3">

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-600">
                ✓
              </div>

              <div className="min-w-0">

                <h3 className="font-bold text-green-900">
                  Documents processed
                </h3>

                <p className="mt-1 text-sm text-green-700">
                  {uploadResult.successful} of{" "}
                  {uploadResult.total} documents
                  were successfully processed.
                </p>

              </div>

            </div>


            {uploadResult.documents?.length > 0 && (
              <div className="mt-4 space-y-2">

                {uploadResult.documents.map(
                  (document) => (

                    <div
                      key={document.id}
                      className="flex items-center justify-between rounded-lg border border-green-200 bg-white/70 px-3 py-2"
                    >

                      <span className="truncate text-sm font-medium text-slate-700">
                        {document.filename}
                      </span>

                      <span className="ml-3 shrink-0 text-xs text-slate-500">
                        {Number(
                          document.word_count || 0
                        ).toLocaleString()}{" "}
                        words
                      </span>

                    </div>

                  )
                )}

              </div>
            )}

          </section>
        )}


          {/* ==================================================
            GENERATED EXAM
        ================================================== */}

        {generatedExam && (
          <section className="mt-8 space-y-5">

            {/* EXAM HEADER */}

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <h2 className="text-2xl font-bold text-slate-900">
                Generated Exam
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {generatedExam.totalQuestions ||
                  generatedExam.questions?.length ||
                  0}{" "}
                questions
              </p>


              {/* DOCUMENT DISTRIBUTION */}

              {generatedExam.documents?.length > 0 && (
                <div className="mt-5">

                  <p className="mb-3 text-sm font-semibold text-slate-700">
                    Document distribution
                  </p>

                  <div className="space-y-2">

                    {generatedExam.documents.map(
                      (document) => (

                        <div
                          key={document.id}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3"
                        >

                          <span className="truncate text-sm font-medium">
                            {document.filename}
                          </span>

                          <span className="ml-3 shrink-0 text-xs font-semibold text-indigo-600">
                            {document.percentage}%
                          </span>

                        </div>

                      )
                    )}

                  </div>

                </div>
              )}

            </div>


            {/* QUESTIONS */}

            {generatedExam.questions?.map(
              (question, index) => (

                <div
                  key={question.id || index}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >

                  <div className="mb-4 flex items-center gap-3">

                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase text-indigo-600">
                      {question.type}
                    </span>

                    <span className="text-sm text-slate-400">
                      Question {question.id || index + 1}
                    </span>

                  </div>


                  <h3 className="text-lg font-semibold leading-7 text-slate-900">
                    {question.question}
                  </h3>


                  {/* MCQ OPTIONS */}

                  {question.type === "mcq" &&
                    question.options?.length > 0 && (

                      <div className="mt-5 space-y-2">

                        {question.options.map(
                          (option, optionIndex) => (

                            <div
                              key={optionIndex}
                              className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700"
                            >

                              <span className="mr-2 font-bold">
                                {String.fromCharCode(
                                  65 + optionIndex
                                )}
                                .
                              </span>

                              {option}

                            </div>

                          )
                        )}

                      </div>

                    )}


                  {/* ANSWERS */}

                  {includeAnswers && (
                    <>

                      {question.correctAnswer && (
                        <div className="mt-5 rounded-xl bg-green-50 p-4">

                          <p className="text-sm font-bold text-green-800">
                            Answer
                          </p>

                          <p className="mt-1 text-sm text-green-700">
                            {question.correctAnswer}
                          </p>

                        </div>
                      )}


                      {!question.correctAnswer &&
                        question.answer && (

                          <div className="mt-5 rounded-xl bg-green-50 p-4">

                            <p className="text-sm font-bold text-green-800">
                              Answer
                            </p>

                            <p className="mt-1 text-sm text-green-700">
                              {question.answer}
                            </p>

                          </div>

                        )}


                      {/* EXPLANATION */}

                      {question.explanation && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-4">

                          <p className="text-sm font-bold text-slate-700">
                            Explanation
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {question.explanation}
                          </p>

                        </div>
                      )}

                    </>
                  )}


                  {/* SOURCE PAGES */}

                  {question.sourcePages?.length > 0 && (

                    <p className="mt-4 text-xs text-slate-400">

                      Source page
                      {question.sourcePages.length > 1
                        ? "s"
                        : ""}:{" "}

                      {question.sourcePages.join(", ")}

                    </p>

                  )}

                </div>

              )
            )}

          </section>
        )}

       

        {/* ==================================================
            GENERATE BUTTON
        ================================================== */}

        <section className="py-8 text-center">

          <button
            type="button"
            disabled={
              !isFormValid ||
              isUploading ||
              loading
            }
            onClick={handleGenerateExam}
            className="inline-flex min-w-60 items-center justify-center gap-3 rounded-xl bg-slate-900 px-6 py-3.5 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >

            {isUploading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                Processing documents...
              </>
            ) : loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                Generating exam...
              </>
            ) : (
              <>
                Generate Exam

                <span className="text-lg">
                  →
                </span>
              </>
            )}

          </button>


          {!files.length && (
            <p className="mt-3 text-xs text-slate-400">
              Add at least one PDF or DOCX to continue.
            </p>
          )}

          {files.length > 0 &&
            !isDistributionValid && (
              <p className="mt-3 text-xs text-red-500">
                Fix the question distribution
                before continuing.
              </p>
            )}

        </section>


    
      </main>

    </div>
  );
}


/* ======================================================
   QUESTION TYPE COMPONENT
====================================================== */

function QuestionType({
  title,
  description,
  value,
  onChange,
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">

      <div>

        <p className="text-sm font-semibold text-slate-800">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>

      </div>

      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) =>
          onChange(
            Math.max(
              0,
              Number(event.target.value)
            )
          )
        }
        className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-center text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />

    </div>
  );
}

export default App;