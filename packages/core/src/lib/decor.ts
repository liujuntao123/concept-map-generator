/**
 * 装饰性映射（每本书的强调色 / 封面底板 / 路径 chip 三色轮转）。
 * 按设计契约：颜色一律走 token，仅这类装饰性映射允许写十六进制，且集中收敛在这里。
 */

/** 路径 chip 三色轮转 */
export const PATH_CHIP_TONES = [
  'border-[#4f8fe8]/50 bg-[#4f8fe8]/10 dark:bg-[#4f8fe8]/18',
  'border-[#7fbf6a]/50 bg-[#7fbf6a]/10 dark:bg-[#7fbf6a]/16',
  'border-[#c678dd]/50 bg-[#c678dd]/10 dark:bg-[#c678dd]/18',
];

/** 封面底板配色（沿用原设计的每本书配色映射） */
export function plateOf(id: string): string {
  if (id.includes('kahneman')) {
    return 'bg-linear-to-b from-[#e7f0fb] to-[#f5f9fe] dark:from-[#182433] dark:to-[#151d2a]';
  }
  if (id.includes('chujia')) {
    return 'bg-linear-to-b from-[#f0ebf8] to-[#f8f5fc] dark:from-[#221d30] dark:to-[#1a1626]';
  }
  return 'bg-linear-to-b from-[#edf3fa] to-[#f7fafc] dark:from-[#182230] dark:to-[#151d29]';
}