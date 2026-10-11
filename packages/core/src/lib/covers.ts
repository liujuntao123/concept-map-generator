/** Real book covers (JPG) under /illustrations — not hand-drawn SVG. */
export const COVER_SRC: Record<string, string> = {
  'kahneman-si-kao-kuai-yu-man': '/illustrations/cover-kahneman.jpg',
  'chujia-ying-zou-chu-wei-yi-zhen-li-guan': '/illustrations/cover-chujia.jpg',
};

export function coverOf(id: string): string {
  return COVER_SRC[id] || '/illustrations/cover-default.svg';
}
