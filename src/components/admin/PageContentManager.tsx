import StoryContentForm from './StoryContentForm'
import DirectionsContentForm from './DirectionsContentForm'

interface Props {
  canWrite: boolean
}

export default function PageContentManager({ canWrite }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded p-5 flex flex-col gap-5">
        <h3 className="text-[var(--color-gold-primary)] text-sm font-semibold tracking-wide">本店歷史</h3>
        <StoryContentForm canWrite={canWrite} />
      </div>

      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-gold)] rounded p-5 flex flex-col gap-5">
        <h3 className="text-[var(--color-gold-primary)] text-sm font-semibold tracking-wide">交通指引</h3>
        <DirectionsContentForm canWrite={canWrite} />
      </div>
    </div>
  )
}
