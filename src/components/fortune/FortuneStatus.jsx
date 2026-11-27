import { compactStatus } from './statusText'

export function FortuneStatus({ level, small = false }) {
  return <span className={`fortune-status inline-block max-w-full shrink-0 whitespace-nowrap rounded-full ${small ? 'px-1 text-[10px]' : 'px-2 py-0.5 text-[11px]'} font-semibold text-white`}
    style={{ background: level.color }} title={level.th} aria-label={level.th}>{compactStatus(level.th)}</span>
}
