import { useState } from 'react'
import type { Message } from '../../types'
import { likeMessage } from '../../lib/firestore'
import ReplyList from './ReplyList'

const LS_KEY = (id: string) => `vote_${id}`

interface Props {
  message: Message
  onDelete?: (id: string) => void
}

export default function MessageCard({ message, onDelete }: Props) {
  const [likes, setLikes] = useState(message.likes)
  const [dislikes, setDislikes] = useState(message.dislikes)
  const [voted, setVoted] = useState<'likes' | 'dislikes' | null>(
    () => (localStorage.getItem(LS_KEY(message.id)) as 'likes' | 'dislikes' | null)
  )
  const [showReplies, setShowReplies] = useState(false)

  async function handleVote(type: 'likes' | 'dislikes') {
    if (voted) return
    await likeMessage(message.id, type)
    if (type === 'likes') setLikes((v) => v + 1)
    else setDislikes((v) => v + 1)
    setVoted(type)
    localStorage.setItem(LS_KEY(message.id), type)
  }

  const date = message.timestamp?.toDate?.()
  const dateStr = date
    ? `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
    : ''

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-primary)] rounded p-3 sm:p-4 transition-all hover:bg-[var(--color-bg-card-hover)] hover:shadow-[var(--shadow-glow-warm)]">
      {/* 作者資訊 */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[#c9a55a] font-semibold text-sm sm:text-base content-text">
          {message.isAnonymous ? '匿名' : message.authorId}
        </span>
        {!message.isAnonymous && message.serverName && (
          <span className="text-[#6a5030] text-xs sm:text-sm content-text">@{message.serverName}</span>
        )}
        <span className="text-[#6a5030] text-xs ml-auto">{dateStr}</span>
      </div>

      {/* 內容 */}
      <p className="text-[#d4c090] text-sm sm:text-base leading-relaxed content-text">{message.content}</p>

      {/* 互動列 */}
      <div className="flex items-center gap-2 sm:gap-3 mt-3">
        <button
          onClick={() => handleVote('likes')}
          disabled={!!voted}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
            voted === 'likes'
              ? 'bg-[#1e3a1e] text-[#81c784]'
              : 'text-[#9a8a70] hover:text-[#d4c090] disabled:cursor-not-allowed'
          }`}
        >
          👍 <span>{likes}</span>
        </button>
        <button
          onClick={() => handleVote('dislikes')}
          disabled={!!voted}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
            voted === 'dislikes'
              ? 'bg-[#3a1e1e] text-[#ef9a9a]'
              : 'text-[#9a8a70] hover:text-[#d4c090] disabled:cursor-not-allowed'
          }`}
        >
          👎 <span>{dislikes}</span>
        </button>

        {(message.replies?.length ?? 0) > 0 && (
          <button
            onClick={() => setShowReplies((v) => !v)}
            className="text-xs text-[#6a5030] hover:text-[#9a8060] ml-1"
          >
            {showReplies ? '收起' : `${message.replies!.length} 則回覆`}
          </button>
        )}

        {onDelete && (
          <button
            onClick={() => onDelete(message.id)}
            className="ml-auto text-xs text-[#6a3030] hover:text-[#ef9a9a]"
          >
            刪除
          </button>
        )}
      </div>

      {showReplies && <ReplyList replies={message.replies ?? []} />}
    </div>
  )
}
