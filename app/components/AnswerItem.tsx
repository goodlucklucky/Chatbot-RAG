export default function AnswerItem({ data }: { data: string }) {
  return (
    <div className="w-full px-4 py-3">
      <p className="whitespace-pre-wrap">
        {data}
      </p>
    </div>
  )
}
