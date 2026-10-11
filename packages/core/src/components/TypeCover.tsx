import { cn } from '../lib/cn';

interface Props {
  /** 封面字（书名 1–2 字） */
  text: string;
  /** 底板色（内容字段 coverColor）；缺省用主题强调色 */
  color?: string;
  className?: string;
  markClassName?: string;
}

/**
 * 字型封面：没有真实封面图时，用书名 1–2 字放大 + 底板色渲染。
 * 纯装饰（书名在卡片正文里），对辅助技术隐藏。
 */
export default function TypeCover({ text, color, className, markClassName }: Props) {
  return (
    <span
      aria-hidden
      className={cn('grid place-items-center overflow-hidden', className)}
      style={{ background: color || 'var(--accent-strong)' }}
    >
      <span
        className={cn(
          'font-bold tracking-[0.12em] text-white/90 select-none [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]',
          markClassName,
        )}
      >
        {text}
      </span>
    </span>
  );
}