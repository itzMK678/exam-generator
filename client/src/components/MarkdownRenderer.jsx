import React from "react";

/**
 * Parse inline markdown formatting: **bold**, *italic*, and `code`.
 */
function parseInline(text) {
  if (!text) return null;

  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={index}
          className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-xs text-indigo-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Lightweight, dependency-free Markdown renderer for AI summaries,
 * explanations, and tutor chat responses.
 */
export default function MarkdownRenderer({ content, className = "" }) {
  if (!content) return null;

  const lines = String(content).replace(/\r\n/g, "\n").split("\n");
  const elements = [];

  let inCodeBlock = false;
  let codeLines = [];
  let listItems = [];
  let listType = null; // "ul" | "ol"

  const flushList = (keyPrefix) => {
    if (listItems.length === 0) return;
    if (listType === "ol") {
      elements.push(
        <ol
          key={`list-${keyPrefix}`}
          className="my-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed"
        >
          {listItems.map((item, idx) => (
            <li key={idx}>{parseInline(item)}</li>
          ))}
        </ol>
      );
    } else {
      elements.push(
        <ul
          key={`list-${keyPrefix}`}
          className="my-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed"
        >
          {listItems.map((item, idx) => (
            <li key={idx}>{parseInline(item)}</li>
          ))}
        </ul>
      );
    }
    listItems = [];
    listType = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    // Handle fenced code blocks
    if (trimmed.startsWith("```")) {
      flushList(idx);
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${idx}`}
            className="my-2.5 overflow-x-auto rounded-xl bg-slate-900 p-3.5 font-mono text-xs leading-relaxed text-slate-100"
          >
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      return;
    }

    // Empty line
    if (!trimmed) {
      flushList(idx);
      return;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushList(idx);
      elements.push(<hr key={`hr-${idx}`} className="my-3 border-slate-200" />);
      return;
    }

    // Headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      flushList(idx);
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const sizeClasses =
        level === 1
          ? "mt-4 mb-2 text-base font-extrabold text-slate-900"
          : level === 2
            ? "mt-3.5 mb-1.5 text-sm font-bold text-slate-900"
            : "mt-3 mb-1 text-xs font-bold uppercase tracking-wide text-indigo-700";

      elements.push(
        <div key={`h-${idx}`} className={sizeClasses}>
          {parseInline(headingText)}
        </div>
      );
      return;
    }

    // Unordered list item (-, *, •)
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (ulMatch) {
      if (listType === "ol") flushList(idx);
      listType = "ul";
      listItems.push(ulMatch[1]);
      return;
    }

    // Ordered list item (1., 2., etc.)
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (listType === "ul") flushList(idx);
      listType = "ol";
      listItems.push(olMatch[1]);
      return;
    }

    // Regular paragraph
    flushList(idx);
    elements.push(
      <p key={`p-${idx}`} className="my-1.5 text-sm leading-relaxed">
        {parseInline(trimmed)}
      </p>
    );
  });

  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre
        key="code-final"
        className="my-2.5 overflow-x-auto rounded-xl bg-slate-900 p-3.5 font-mono text-xs leading-relaxed text-slate-100"
      >
        <code>{codeLines.join("\n")}</code>
      </pre>
    );
  }

  flushList("final");

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
