"use client";

import { useState, useEffect, useRef } from "react";
import { DocumentEditorContainerComponent } from '@syncfusion/ej2-react-documenteditor';
import PromptInput from "@/app/components/PromptInput";
import QuestionItem from "./components/QuestionItem";
import AnswerItem from "./components/AnswerItem";
import NameInput from "./components/NameInputModal";
import PrettyDocxPreview from "./components/PrettyDocxPreview";

export default function Home() {
  const [input, setInput] = useState("");
  const [qList, setQList] = useState<string[]>([]);
  const [aList, setAList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<
    { name: string; size: number; date: string }[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<DocumentEditorContainerComponent>(null);

  useEffect(() => {
    const stored = localStorage.getItem("userName");
    if (!stored) {
      setShowModal(true);
    } else {
      setUserName(stored);
    }
  }, []);

  function get_selection() {
    const selection = containerRef.current?.documentEditor.selection;
    selection?.selectParagraph();
    return [selection?.startOffset, selection?.endOffset, selection?.getText(true)];
  }

  const onSubmit = async (que: string, file: File | null) => {
    const bodyFormData = new FormData();
    if (que.indexOf("@selection") >= 0) {
      que.replaceAll("@selection", "");
      const [start, end, selection] = get_selection();
      if (selection && start && end) {
        bodyFormData.append("doc_start", start);
        bodyFormData.append("doc_end", end);
        bodyFormData.append("doc_content", selection);
      }
    }
    bodyFormData.append("question", que);
    bodyFormData.append("user_id", userName);
    if (file) {
      bodyFormData.append("file", file);
      que = file.name + "\n\n" + que;

      // Save file info
      const newDoc = {
        name: file.name,
        size: file.size,
        date: new Date().toLocaleString(), // Or use a custom format
      };
      setUploadedDocs((prev) => [...prev, newDoc]);
    }
    setQList([...qList, que]);
    setIsLoading(true);
    const url = process.env.NEXT_PUBLIC_BACKEND_URL ? process.env.NEXT_PUBLIC_BACKEND_URL : "https://chatbot-rag-1-ugmp.onrender.com"
    const response = await fetch(`${url}/api/chat`, {
      method: "POST",
      body: bodyFormData,
    });

    if (!response.body) {
      setAList([...aList, "Error occured from server!"]);
      setIsLoading(false);
      return;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = "";

    setAList([...aList, ""]);
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      fullText += chunk;
      setAList((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = fullText;
        return updated;
      });
    }
    setIsLoading(false);
  };

  const handleSave = (user_name: string) => {
    const trimmed = user_name.trim();
    if (trimmed) {
      localStorage.setItem("userName", trimmed);
      setUserName(trimmed);
      setShowModal(false);
      setQList([]);
      setAList([]);
    }
  };

  async function handleApplyChange(url: string) {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      const { content, start, end } = data;

      // Assuming containerRef.current.documentEditor is your editor instance
      const editor = containerRef.current?.documentEditor;
      if (editor) {
        editor.selection.select(start, end);
        editor.editor.insertText(content); // Replace selection with new content
      }
    }
  }

  const setSelectionFlag = () => {
    setInput(input + " @selection ");
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [qList, aList]);

  return (
    <>
      {showModal && <NameInput handleSave={handleSave} />}
      <div className="main-panel flex flex-row min-h-screen max-h-screen bg-black w-full font-[family-name:var(--font-geist-sans)]">
        {/* Left: DOCX Preview */}
        <section className="flex-2 max-w-6xl bg-black rounded shadow-md overflow-auto">
          <PrettyDocxPreview containerRef={containerRef} setSelectionFlag={setSelectionFlag} />
        </section>
        {/* Right: Chat Interface */}
        <section className="flex-1 min-w-ml overflow-auto flex">
          <div className="flex-1 flex flex-col max-w-2xl min-w-ml bg-black rounded shadow-md overflow-auto ml-auto mr-auto">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-8">
              {qList.map((item, index) => (
                <div key={index} className="gap-8">
                  <QuestionItem data={item} />
                  <AnswerItem data={aList[index]} onApplyUrlClick={handleApplyChange} />
                </div>
              ))}
              <div ref={messagesEndRef} />
              {uploadedDocs.length > 0 && (
                <div className="w-full text-sm text-gray-600">
                  <h3 className="font-semibold mb-2">Uploaded Documents</h3>
                  <ul className="space-y-2">
                    {uploadedDocs.map((doc, i) => (
                      <li key={i} className="flex justify-between border-b pb-1">
                        <span>{doc.name}</span>
                        <span>{(doc.size / 1024).toFixed(1)} KB</span>
                        <span>{doc.date}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="p-1">
              <PromptInput onSubmit={onSubmit} isLoading={isLoading} input={input} setInput={setInput} />
            </div>
            <footer className="p-1 flex flex-wrap items-center justify-center">
              <button
                className="text-blue-500 hover:underline"
                onClick={() => setShowModal(true)}
              >
                New Chat
              </button>
            </footer>
          </div>
        </section>
      </div>
    </>
  );
}
