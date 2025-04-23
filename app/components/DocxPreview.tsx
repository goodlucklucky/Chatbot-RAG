"use client";
import { useEffect, useRef } from "react";

import { renderAsync } from "docx-preview";

export default function DocxPreview({ refreshKey }: { refreshKey: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchAndRenderDocx() {
      if (!containerRef.current) return;
      containerRef.current.innerHTML = "<p>Loading preview...</p>";
      try {
        const url = process.env.NEXT_PUBLIC_BACKEND_URL
          ? process.env.NEXT_PUBLIC_BACKEND_URL
          : "http://localhost:5000";
        const response = await fetch(`${url}/downloads/${localStorage.getItem("userName")}_current.docx`);
        if (!response.ok) {
          containerRef.current.innerHTML = "<p>No current.docx found.</p>";
          return;
        }
        const blob = await response.arrayBuffer();
        containerRef.current.innerHTML = "";
        await renderAsync(blob, containerRef.current);
      } catch (err) {
        containerRef.current.innerHTML = "<p>Error loading preview.</p>";
      }
    }
    fetchAndRenderDocx();
  }, [refreshKey]);

  return (
    <div
      ref={containerRef}
      className="rounded shadow overflow-y-visible bg-white"
      style={{ minHeight: 200, maxHeight: 1000 }}
    />
  );
}
