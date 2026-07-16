import type { Reply } from '../../types'

interface Props {
  replies: Reply[]
}

export default function ReplyList({ replies }: Props) {
  if (replies.length === 0) return null

  return (
    <div className="mt-3 ml-4 pl-3 border-l border-[#4a3820] flex flex-col gap-2">
      {replies.map((reply) => (
        <div key={reply.id} className="text-xs">
          <span className="text-[#c9a55a] font-semibold mr-1">
            {reply.isAnonymous ? '匿名' : reply.authorId}
          </span>
          {!reply.isAnonymous && reply.serverName && (
            <span className="text-[#6a5030] mr-2">@{reply.serverName}</span>
          )}
          <span className="text-[#9a8a70]">{reply.content}</span>
        </div>
      ))}
    </div>
  )
}
