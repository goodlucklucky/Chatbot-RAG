"use client";

import { useState, useEffect, useRef } from "react";
import PromptInput from "@/app/components/PromptInput";
import QuestionItem from "./components/QuestionItem";
import AnswerItem from "./components/AnswerItem";
import NameInput from "./components/NameInputModal";

export default function Home() {
  const [qList, setQList] = useState<string[]>([]);
  const [aList, setAList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<
    { name: string; size: number; date: string }[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("userName");
    if (!stored) {
      setShowModal(true);
    } else {
      setUserName(stored);
    }
  }, []);

  const onSubmit = async (que: string, file: File | null) => {
    const bodyFormData = new FormData();
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
    const response = await fetch(url, {
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [qList, aList]);

  return (
    <>
      {showModal && <NameInput handleSave={handleSave} />}
      <div className="grid grid-rows-[1fr_20px_20px] items-end justify-items-center min-h-screen max-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <main className="w-full h-full max-w-3xl mx-auto row-start-1 overflow-hidden">
          <div className="overflow-y-auto h-full flex flex-col gap-[32px]">
            {qList.map((item, index) => (
              <div key={index} className="gap-[32px]">
                <QuestionItem data={item}></QuestionItem>
                <AnswerItem data={aList[index]}></AnswerItem>
              </div>
            ))}
            <div ref={messagesEndRef} />
            {uploadedDocs.length > 0 && (
              <div className="w-full max-w-3xl text-sm text-gray-600 mx-auto">
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
        </main>
        <div className="w-full flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
          <PromptInput onSubmit={onSubmit} isLoading={isLoading}></PromptInput>
        </div>
        <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
          <button
            className="text-blue-300 hover:underline"
            onClick={() => setShowModal(true)}
          >
            New Chat
          </button>
        </footer>
      </div>
    </>
  );
}
