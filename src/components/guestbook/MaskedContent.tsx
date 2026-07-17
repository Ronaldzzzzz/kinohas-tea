interface Props {
  content: string
  maskNote?: string
}

/** 遮蔽呈現：原文模糊化，正中間覆蓋遮蔽提示(含選填店家附註) */
export default function MaskedContent({ content, maskNote }: Props) {
  return (
    <div className="relative overflow-hidden rounded-sm">
      <p
        aria-hidden="true"
        className="text-sm sm:text-base leading-relaxed text-[var(--color-text-primary)] blur select-none opacity-50 break-all"
      >
        {content}
      </p>
      <div className="absolute inset-0 flex items-center">
        <span className="text-xs sm:text-sm text-[var(--color-text-primary)] tracking-wider text-left px-2">
          ▓ 此留言已被店家遮蔽{maskNote ? `：${maskNote}` : ''}
        </span>
      </div>
    </div>
  )
}
