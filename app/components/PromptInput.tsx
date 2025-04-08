"use client";

import { useState, useRef, useEffect } from "react";

export default function PromptInput({
  onSubmit,
  isLoading
}: {
  onSubmit: (que: string, file: File | null) => void;
  isLoading: boolean
}) {
  const [input, setInput] = useState("");
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
      const file = e.target.files[0];
      setFile(file); // Set the file name
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
        className="p-2 w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all"
      >
        ⇧
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <textarea
        ref={textareaRef}
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything"
        className="flex-1 resize-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none overflow-auto"
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
