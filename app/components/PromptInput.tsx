"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

export default function PromptInput({
  onSubmit,
  isLoading,
  input,
  setInput
}: {
  onSubmit: (que: string, file: File | null) => void;
  isLoading: boolean;
  input: string;
  setInput: (new_str: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSubmit(input.trim(), file);
    setInput("");
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // reset height after sending
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const tFile = e.target.files[0];
      setFile(tFile); // Set the file name
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click(); // Trigger the file input
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
      {/* Custom button to trigger file selection */}
      <button
        type="button"
        onClick={triggerFileInput}
        className={clsx(
          "p-2 w-10 h-10 text-white rounded-full transition-all",
          {
            "bg-green-600 hover:bg-green-700": file,
            "bg-blue-600 hover:bg-blue-700": !file,
          }
        )}
      >
        ⇧
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf, .jpg, .png, .jpeg, .docx, .doc"
        onChange={handleFileChange}
        className="hidden"
      />
      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything (Ctrl+Shift+L), @selection to mention current selection"
        className="flex-1 resize-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none overflow-auto"
      />
      <button
        type="submit"
        className="p-2 w-10 h-10 bg-white text-black hover:text-black transition-colors rounded-full flex items-center justify-center"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          "→"
        )}
      </button>
    </form>
  );
}
