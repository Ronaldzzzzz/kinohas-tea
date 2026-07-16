import type { Reply } from '../../types'
import MaskedContent from './MaskedContent'

interface Props {
  replies: Reply[]
}

export default function ReplyList({ replies }: Props) {
  if (replies.length === 0) return null

  return (
    <div className="mt-3 ml-4 pl-3 border-l border-[var(--color-border-gold)] flex flex-col gap-2">
      {replies.map((reply) => (
        <div key={reply.id} className="text-xs">
          <span className="text-[var(--color-gold-primary)] font-semibold mr-1">
            {reply.isAnonymous ? '匿名' : reply.authorId}
          </span>
          {!reply.isAnonymous && reply.serverName && (
            <span className="text-[var(--color-text-muted)] mr-2">@{reply.serverName}</span>
          )}
          {reply.masked ? (
            <MaskedContent content={reply.content} maskNote={reply.maskNote} />
          ) : (
            <span className="text-[var(--color-text-muted)]">{reply.content}</span>
          )}
        </div>
      ))}
    </div>
  )
}
