"use client";

import { useState, useRef, useEffect } from "react";

export default function PromptInput({
  onSubmit,
}: {
  onSubmit: (que: string, file: File | null) => void;
}) {
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSubmit(input.trim(), file);
    setInput("");
    setFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // reset height after sending
    }
  };

  // Auto-grow the textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // Reset first
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.style.maxHeight = "200px";
    }
  }, [input]);

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl mx-auto px-4 py-3 bg-white/80 dark:bg-[#343541] border border-gray-300 dark:border-gray-700 rounded-xl shadow-md flex items-center gap-3 backdrop-blur-md"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything"
        className="flex-1 resize-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none overflow-auto"
      />
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="text-sm text-gray-700 dark:text-gray-300"
      />
      <button
        type="submit"
        className="p-2 w-10 h-10 bg-white text-black hover:text-black transition-colors rounded-full"
      >
        →
      </button>
    </form>
  );
}
