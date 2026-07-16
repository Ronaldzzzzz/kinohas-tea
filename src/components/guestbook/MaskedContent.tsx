interface Props {
  content: string
  maskNote?: string
}

/** 遮蔽呈現：黑條化原文(保留長度)+標籤+店家註解 */
export default function MaskedContent({ content, maskNote }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[var(--color-text-muted)] tracking-wider">▓ 此留言已被店家遮蔽</span>
      <p aria-hidden="true" className="text-sm sm:text-base leading-relaxed bg-black text-black select-none rounded-sm w-fit max-w-full break-all">
        {content}
      </p>
      {maskNote && (
        <span className="text-xs text-[var(--color-gold-primary)]">店家註: {maskNote}</span>
      )}
    </div>
  )
}
