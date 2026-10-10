import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge 默认不认识自定义圆角 token（--radius-inner/panel/card），
 * 会把 `rounded-inner` 当成未知类保留下来，导致外部传入的 `rounded-full`
 * 无法覆盖它（两个类同时出现在 DOM 里，最终由 CSS 顺序决定，结果不可控）。
 * 这里把三个自定义圆角登记进 `rounded` 分组，让覆盖行为可预期。
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: ['rounded-inner', 'rounded-panel', 'rounded-card'],
    },
  },
});

/** 合并条件类名，并消解 Tailwind 冲突（后者胜出）。 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
