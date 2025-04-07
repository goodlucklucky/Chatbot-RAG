"use client";

export default function QuestionItem({ data }: { data: string }) {
  return (
    <div className="w-full pl-48">
      <p className="px-4 py-3 bg-gray-700 rounded-xl">
        {data}
      </p>
    </div>
  )
}
