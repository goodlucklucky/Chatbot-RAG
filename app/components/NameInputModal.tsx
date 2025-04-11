"use client";

import { useState } from "react";

export default function NameInput({
  handleSave,
}: {
  handleSave: (user_name: string) => void;
}) {
  const [tempName, setTempName] = useState("");

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-120">
        <h2 className="text-lg font-semibold mb-4 text-black">Name your new chat <br />(or previous chat name for continuos use)</h2>
        <input
          type="text"
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          className="w-full px-3 py-2 border rounded mb-4 focus:outline-none focus:ring text-black"
          placeholder="example: Kelen's chat for cover letter"
        />
        <button
          onClick={() => handleSave(tempName)}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}
