import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
// @ts-expect-error next line is not error
import { CodeProps } from "react-markdown/lib/ast-to-react";

interface AnswerItemProps {
  data?: string;
  onApplyUrlClick: (url: string) => void;
}

export default function AnswerItem({ data, onApplyUrlClick }: AnswerItemProps) {
  // Regex to match the apply url, e.g., "Apply your change(http://...)"
  const applyUrlRegex = /Apply your change\((https?:\/\/[^\)]+)\)/g;

  // Replace the pattern with a clickable link
  const replaced = (data ?? '').replace(applyUrlRegex, (match, url) => {
    // We'll return a placeholder and replace it in JSX below
    return `[[APPLY_CHANGE_LINK:${url}]]`;
  });

  // Split by the placeholder to render as JSX
  const parts = replaced.split(/(\[\[APPLY_CHANGE_LINK:[^\]]+\]\])/);

  return (
    <div className="w-full px-4 py-3">
      {parts.map((part, idx) => {
        const match = part.match(/\[\[APPLY_CHANGE_LINK:(https?:\/\/[^\]]+)\]\]/);
        if (match) {
          const url = match[1];
          return (
            <button
              key={idx}
              type="button"
              className="bg-white text-blue-700 font-semibold px-4 py-2 rounded shadow border border-blue-200 transition hover:bg-blue-600 hover:text-white cursor-pointer"
              onClick={() => onApplyUrlClick(url)}
            >
              Apply change
            </button>
          );
        }
        return (
          <ReactMarkdown
            key={idx}
            components={{
              code({ inline, className, children, ...props }: CodeProps) {
                const match = /language-(\w+)/.exec(className || "");

                return !inline && match ? (
                  <SyntaxHighlighter
                    style={materialDark}
                    PreTag="div"
                    language={match[1]}
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className ? className : ""} {...props}>
                    {children}
                  </code>
                );
              }
            }}>
            {part}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}