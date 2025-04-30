"use client";

import { useState, useEffect, useRef } from "react";
import { DocumentEditorContainerComponent, ParagraphWidget } from '@syncfusion/ej2-react-documenteditor';
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
  const [pendingEdit, setPendingEdit] = useState<{ origin: ParagraphWidget[], new: ParagraphWidget[] }>({ origin: [], new: [] });

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
    const paraList: string[] = [];
    if (selection) {
      const totalString: string = selection.getText(true);
      const start: string = selection.startOffset;
      const end: string = selection.endOffset;
      const selectedParas: ParagraphWidget[] = selection?.getParagraphsInSelection();
      for (let i = 0; i < selectedParas.length; i++) {
        selection.selectParagraphInternal(selectedParas[i], true);
        selection.selectParagraph();
        paraList.push(selection.getText(true));
      }
      selection.select(start, end);
      return { start, end, totalString, paraList };
    }
    return { start: "0;0;0", end: "0;0;0", totalString: "", paraList: [] };
  }

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  async function fetchAndRenderDocx() {
    if (!containerRef.current) return;
    try {
      const url = process.env.NEXT_PUBLIC_BACKEND_URL
        ? process.env.NEXT_PUBLIC_BACKEND_URL
        : "http://localhost:5000";
      const response = await fetch(`${url}/downloads/${localStorage.getItem("userName")}_current.docx`);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const base64String = arrayBufferToBase64(arrayBuffer);
        containerRef.current?.documentEditor.open(base64String);
      }
    } catch (err) {
      console.log(err);
    }
  }

  const onSubmit = async (que: string, file: File | null) => {
    const bodyFormData = new FormData();
    if (que.indexOf("@selection") >= 0) {
      que = que.replaceAll("@selection ", "");
      const selection = get_selection();
      if (selection.totalString.length) {
        bodyFormData.append("doc_start", selection.start);
        bodyFormData.append("doc_end", selection.end);
        bodyFormData.append("doc_content", JSON.stringify(selection.paraList));
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
    if (fullText.indexOf("Download your DOCX") >= 0) {
      fetchAndRenderDocx();
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
        const selectedParas: ParagraphWidget[] = editor.selection.getParagraphsInSelection();
        const origParas: ParagraphWidget[] = [];
        const newParas: ParagraphWidget[] = [];
        for (let i = selectedParas.length - 1; i >= 0; i--) {
          editor.selection?.selectParagraphInternal(selectedParas[i], true);
          editor.selection.selectParagraph();
          const orig_text = editor.selection.getText(false);
          if (orig_text.trim() == content[i].trim()) {
            continue;
          }
          origParas.unshift(editor.selection.start.paragraph);
          editor.selection.toggleHighlightColor("Red");
          editor.selection?.selectParagraphInternal(selectedParas[i], true);
          editor.editor.insertText(content[i]);
          editor.selection.moveToPreviousParagraph();
          editor.selection.selectParagraph();
          newParas.unshift(editor.selection.start.paragraph);
          editor.selection.characterFormat.copyFormat(selectedParas[i].characterFormat);
          editor.selection.paragraphFormat.copyFormat(selectedParas[i].paragraphFormat);
          editor.selection.toggleHighlightColor("BrightGreen");
        }
        setPendingEdit({ origin: origParas, new: newParas });

      }
    }
  }

  useEffect(() => {
    const editor = containerRef.current?.documentEditor;
    if (editor) {
      const helper = editor.documentHelper;
      helper.viewerContainer.querySelectorAll(".apply-container").forEach(el => el.remove());
      console.log(pendingEdit);
      for (let i = 0; i < pendingEdit.origin.length; i++) {
        editor.selection.selectParagraphInternal(pendingEdit.new[i], true);
        const width = editor.selection.getSelectionPage(editor.selection.end).boundingRectangle.width - editor.selection.sectionFormat.leftMargin - editor.selection.sectionFormat.rightMargin;
        const containerEl = document.createElement("div");
        const rejectEl = document.createElement("button");
        rejectEl.innerText = "Reject";
        rejectEl.setAttribute("class", "reject-button");
        rejectEl.setAttribute("style", `
          width: 40px;
          height: 20px;
          cursor: pointer;
          color: white;
          background: darkred;
          border-radius: 2px 2px 0 0;
          text-align: center;
          float: right;
        `);
        rejectEl.addEventListener("click", () => {
          editor.selection.selectParagraphInternal(pendingEdit.new[i], true);
          editor.selection.selectParagraph();
          editor.editor.delete();
          editor.selection.selectParagraphInternal(pendingEdit.origin[i], true);
          editor.selection.selectParagraph();
          editor.selection.characterFormat.highlightColor="NoColor";
          editor.selection.moveToParagraphStart();
          setPendingEdit({
            origin: pendingEdit.origin.filter((_, idx) => idx !== i),
            new: pendingEdit.new.filter((_, idx) => idx !== i)
          });
        })
        containerEl.appendChild(rejectEl);
        const applyEl = document.createElement("button");
        applyEl.innerText = "Apply";
        applyEl.setAttribute("class", "apply-button");
        applyEl.setAttribute("style", `
          width: 40px;
          height: 20px;
          cursor: pointer;
          color: white;
          background: green;
          border-radius: 2px 2px 0 0;
          text-align: center;
          float: right;
        `);
        applyEl.addEventListener("click", () => {
          editor.selection.selectParagraphInternal(pendingEdit.origin[i], true);
          editor.selection.selectParagraph();
          editor.editor.delete();
          editor.selection.selectParagraphInternal(pendingEdit.new[i], true);
          editor.selection.selectParagraph();
          editor.selection.characterFormat.highlightColor="NoColor";
          editor.selection.moveToParagraphStart();
          setPendingEdit({
            origin: pendingEdit.origin.filter((_, idx) => idx !== i),
            new: pendingEdit.new.filter((_, idx) => idx !== i)
          });
        })
        containerEl.appendChild(applyEl);
        containerEl.setAttribute("class", "apply-container");
        containerEl.setAttribute(
          "style",
          `position: absolute;
          left: ${editor.selection.caret.style.left};
          top: ${parseInt(editor.selection.caret.style.top.replace("px", "")) - 20}px;
          z-index: 1000;
          height: 20px;
          line-height: 20px;
          width: ${width}px;
          border-bottom: red 1px solid;`
        );
        helper.viewerContainer.appendChild(containerEl);
      }
    }
  }, [pendingEdit])

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
          <PrettyDocxPreview containerRef={containerRef} setSelectionFlag={setSelectionFlag} fetchAndRenderDocx={fetchAndRenderDocx} />
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
