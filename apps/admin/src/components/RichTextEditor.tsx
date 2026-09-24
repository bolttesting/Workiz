"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

export function RichTextEditor({ value, onChange, placeholder, minHeight = 220 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (!ref.current || seeded.current) return;
    ref.current.innerHTML = value || "";
    seeded.current = true;
  }, [value]);

  function run(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  return (
    <div className="workiz-richtext border radius-8 overflow-hidden">
      <div className="d-flex flex-wrap gap-2 p-12 border-bottom bg-neutral-50">
        <button type="button" className="btn btn-sm btn-outline-secondary-600 radius-8" onClick={() => run("bold")}>
          Bold
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary-600 radius-8" onClick={() => run("italic")}>
          Italic
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary-600 radius-8" onClick={() => run("insertUnorderedList")}>
          List
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary-600 radius-8" onClick={() => run("formatBlock", "h2")}>
          H2
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary-600 radius-8" onClick={() => run("formatBlock", "p")}>
          Paragraph
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary-600 radius-8"
          onClick={() => {
            const url = window.prompt("Link URL");
            if (url) run("createLink", url);
          }}
        >
          Link
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary-600 radius-8" onClick={() => run("formatBlock", "blockquote")}>
          Quote
        </button>
      </div>
      <div
        ref={ref}
        className="p-16"
        contentEditable
        suppressContentEditableWarning
        aria-label={placeholder || "Write content"}
        style={{ minHeight }}
        onInput={() => {
          if (ref.current) onChange(ref.current.innerHTML);
        }}
        onBlur={() => {
          if (ref.current) onChange(ref.current.innerHTML);
        }}
      />
    </div>
  );
}
