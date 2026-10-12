import { useState, type ReactNode } from 'react';
import { cn, IconChevronRight } from '@concept-map/core';

interface Props {
  title: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/** 折叠分区：标题行 + 展开区（grid-rows 动画，不测量高度）。 */
export default function Collapse({
  title,
  badge,
  defaultOpen = false,
  children,
  className,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn('border-t border-line', className)}>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent py-3 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex-1 text-[0.95rem] font-semibold">{title}</span>
        {badge}
        <IconChevronRight
          size={16}
          className={cn('text-muted transition-transform duration-150 ease-soft', open && 'rotate-90')}
        />
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-soft',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}