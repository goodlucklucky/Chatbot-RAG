"use client";

import axios from "axios";
import { useState } from "react";
import Image from "next/image";
import PromptInput from "@/app/components/PromptInput";
import QuestionItem from "./components/QuestionItem";
import AnswerItem from "./components/AnswerItem";

export default function Home() {
  const [qaList, setQAList] = useState<{ q: string; a: unknown }[]>([]);

  const onSubmit = (que: string) => {
    const bodyFormData = new FormData();
    bodyFormData.append("question", que);
    axios.post("http://127.0.0.1:5000/api/chat", bodyFormData).then((res) => {
      console.log(res.data);
      setQAList([...qaList, { q: que, a: res.data }]);
    });
  };

  return (
    <div className="grid grid-rows-[1fr_20px_20px] items-end justify-items-center min-h-screen max-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="w-full h-full max-w-3xl mx-auto row-start-1 overflow-hidden">
        <div className="overflow-y-auto h-full flex flex-col gap-[32px]">
          {qaList.map((item, index) => (
            <>
              <div key={index} className="gap-[32px]">
                <QuestionItem data={item["q"]}></QuestionItem>
                <AnswerItem data={item["a"]}></AnswerItem>
              </div>
            </>
          ))}
        </div>
      </main>
      <div className="w-full flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <PromptInput onSubmit={onSubmit}></PromptInput>
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
