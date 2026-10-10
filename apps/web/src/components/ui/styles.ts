import { cn } from '../../lib/cn';
import type { NodeType } from '../../types/graph';

/* ---------- 按钮 ---------- */

export type ButtonVariant = 'primary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-inner font-medium whitespace-nowrap transition-colors ease-soft disabled:cursor-not-allowed disabled:opacity-45';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'border border-transparent bg-accent-strong text-on-accent shadow-accent hover:brightness-110',
  ghost: 'border border-line bg-surface text-ink hover:border-accent hover:text-accent',
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[0.8rem]',
  md: 'h-9 px-3.5 text-[0.85rem]',
  lg: 'h-[42px] px-5 text-[0.9rem] font-semibold',
};

export function buttonClass(
  opts: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {},
): string {
  const { variant = 'ghost', size = 'md', className } = opts;
  return cn(BUTTON_BASE, BUTTON_VARIANT[variant], BUTTON_SIZE[size], className);
}

/* ---------- 图标按钮 ---------- */

const ICON_BUTTON_BASE =
  'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-inner border border-line bg-surface text-ink transition-colors ease-soft hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40';

export function iconButtonClass(
  opts: { active?: boolean; className?: string } = {},
): string {
  const { active, className } = opts;
  return cn(ICON_BUTTON_BASE, active && 'border-accent bg-accent/15 text-accent', className);
}

/* ---------- 表单控件 ---------- */

export const fieldClass =
  'rounded-inner border border-line bg-surface text-ink outline-none transition-[border-color,box-shadow] ease-soft placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25';

/* ---------- 容器 ---------- */

export const cardSurface = 'rounded-card border border-line bg-surface shadow-card';
export const panelSurface = 'rounded-panel border border-line bg-surface';

/* ---------- 标签 ---------- */

export type PillTone = NodeType | 'neutral';

const PILL_TONE: Record<PillTone, string> = {
  neutral: 'border-line text-muted',
  chapter: 'border-chapter/40 bg-chapter/15 text-chapter',
  concept: 'border-concept/40 bg-concept/15 text-concept',
  claim: 'border-claim/40 bg-claim/15 text-claim',
  person: 'border-person/40 bg-person/15 text-person',
  work: 'border-work/40 bg-work/15 text-work',
};

export function pillClass(tone: PillTone = 'neutral', className?: string): string {
  return cn(
    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.72rem] leading-[1.5] whitespace-nowrap',
    PILL_TONE[tone],
    className,
  );
}
