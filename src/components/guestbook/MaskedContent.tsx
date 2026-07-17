interface Props {
  content: string
  maskNote?: string
}

/** 遮蔽呈現：原文模糊化，下一行顯示遮蔽提示(含選填管理員附註) */
export default function MaskedContent({ content, maskNote }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <p
        aria-hidden="true"
        className="text-sm sm:text-base leading-relaxed text-[var(--color-text-primary)] blur select-none opacity-50 break-all"
      >
        {content}
      </p>
      <p className="text-xs sm:text-sm text-[var(--color-text-primary)] tracking-wider">
        ▓ 此留言已被管理員遮蔽{maskNote ? `：${maskNote}` : ''}
      </p>
    </div>
  )
}
