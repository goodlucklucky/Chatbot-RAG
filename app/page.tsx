"use client";

import axios from "axios";
import { useState } from "react";
import Image from "next/image";
import PromptInput from "@/app/components/PromptInput";
import QuestionItem from "./components/QuestionItem";
import AnswerItem from "./components/AnswerItem";

export default function Home() {
  const [qList, setQList] = useState<string[]>([]);
  const [aList, setAList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = (que: string, file: File | null) => {
    const bodyFormData = new FormData();
    bodyFormData.append("question", que);
    if (file) {
      bodyFormData.append("file", file);
      que = file.name + "\n\n" + que;
    }
    setQList([...qList, que]);
    setIsLoading(true);
    axios
      .post("https://chatbot-rag-e7en.onrender.com/api/chat", bodyFormData)
      .then((res) => {
        console.log(res.data);
        setAList([...aList, res.data]);
        setIsLoading(false);
      })
      .catch((err) => {
        console.log(err);
        setAList([...aList, "Error occured from server!"]);
        setIsLoading(false);
      });
  };

  return (
    <div className="grid grid-rows-[1fr_20px_20px] items-end justify-items-center min-h-screen max-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="w-full h-full max-w-3xl mx-auto row-start-1 overflow-hidden">
        <div className="overflow-y-auto h-full flex flex-col gap-[32px]">
          {qList.map((item, index) => (
            <div key={index} className="gap-[32px]">
              <QuestionItem data={item}></QuestionItem>
              <AnswerItem data={aList[index]}></AnswerItem>
            </div>
          ))}
        </div>
      </main>
      <div className="w-full flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <PromptInput onSubmit={onSubmit} isLoading={isLoading}></PromptInput>
      </div>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
