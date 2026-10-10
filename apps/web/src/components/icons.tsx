/** Lightweight inline icons (no lucide dependency). */
import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, className, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: className
      ? `inline-block shrink-0 align-[-0.15em] ${className}`
      : 'inline-block shrink-0 align-[-0.15em]',
    'aria-hidden': true as const,
    ...rest,
  };
}

export function IconSearch(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
export function IconShare(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}
export function IconSun(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
export function IconMoon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z" />
    </svg>
  );
}
export function IconMore(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function IconClose(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
export function IconChevronLeft(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
export function IconChevronRight(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
export function IconExit(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
export function IconZoomIn(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M11 8v6M8 11h6M20 20l-3-3" />
    </svg>
  );
}
export function IconZoomOut(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M8 11h6M20 20l-3-3" />
    </svg>
  );
}
export function IconFit(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4M21 15v4a2 2 0 0 1-2 2h-4" />
    </svg>
  );
}
export function IconFocus(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}
export function IconMap(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  );
}
export function IconPath(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <circle cx="8" cy="18" r="2.5" />
      <path d="M8 7.5 16 11M16.5 14 10 17" />
    </svg>
  );
}
export function IconBook(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
export function IconList(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}
export function IconClock(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
export function IconSignal(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 18h3V10H4zM10.5 18h3V6h-3zM17 18h3V3h-3z" />
    </svg>
  );
}
export function IconCheck(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
export function IconInfo(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </svg>
  );
}
export function IconChapter(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}
export function IconConcept(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
export function IconClaim(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3 4 9v6l8 6 8-6V9z" />
    </svg>
  );
}
export function IconPerson(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}
export function IconWork(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </svg>
  );
}
export function IconBack(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
export function IconStructure(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 4h4v4H6zM14 10h4v4h-4zM6 16h4v4H6z" />
      <path d="M10 6h6M8 16v-6h6" />
    </svg>
  );
}

export function IconBrain(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M9.5 4a3.5 3.5 0 0 0-3.4 4.2A3.5 3.5 0 0 0 4 11.5V14a4 4 0 0 0 4 4h1" />
      <path d="M14.5 4a3.5 3.5 0 0 1 3.4 4.2A3.5 3.5 0 0 1 20 11.5V14a4 4 0 0 1-4 4h-1" />
      <path d="M12 4v16M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
    </svg>
  );
}
export function IconLightbulb(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12c.6.6 1 1.5 1 2.5V17h6v-.5c0-1 .4-1.9 1-2.5A7 7 0 0 0 12 2z" />
    </svg>
  );
}
export function IconTrend(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}
export function IconChart(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 20h16M7 16V10M12 16V6M17 16v-4" />
    </svg>
  );
}
export function IconUsers(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c1.2-3 3.5-4.5 6-4.5S13.8 17 15 20M14 15.5c1.8.2 3.5 1.2 4.5 3.5" />
    </svg>
  );
}
export function IconCompass(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2.5 6.5L7 17l2.5-6.5z" />
    </svg>
  );
}
export function IconChat(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-5 3z" />
    </svg>
  );
}
export function IconSkip(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M5 5v14l10-7zM19 5v14" />
    </svg>
  );
}
export function IconNote(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </svg>
  );
}
export function IconNetwork(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="6" r="2.5" />
      <circle cx="6" cy="17" r="2.5" />
      <circle cx="18" cy="17" r="2.5" />
      <path d="M12 8.5 7.5 15M12 8.5l4.5 6.5M8.5 17h7" />
    </svg>
  );
}
export function IconNodes(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="16" r="3" />
      <path d="M10.5 10.5 13.5 13.5" />
    </svg>
  );
}
export function IconEdges(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="12" r="2.5" />
      <path d="M8.5 12h7" />
    </svg>
  );
}
export function IconBooks(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 5h5a2 2 0 0 1 2 2v12H6a2 2 0 0 0-2 2z" />
      <path d="M20 5h-5a2 2 0 0 0-2 2v12h5a2 2 0 0 1 2 2z" />
    </svg>
  );
}
export function IconHome(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="m4 11 8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </svg>
  );
}

/** Theme icon for featured path chips/tabs */
export function pathThemeIcon(themeOrId: string, size = 14): ReactNode {
  const k = themeOrId.toLowerCase();
  if (/双系统|dual|system/.test(k)) return <IconBrain size={size} />;
  if (/启发|heur|偏见/.test(k)) return <IconLightbulb size={size} />;
  if (/过度|over|自信/.test(k)) return <IconTrend size={size} />;
  if (/前景|prospect|损失/.test(k)) return <IconChart size={size} />;
  if (/两个自我|self|幸福/.test(k)) return <IconUsers size={size} />;
  if (/唯一|weiyi|真理/.test(k)) return <IconCompass size={size} />;
  if (/说理|对话|shuoli/.test(k)) return <IconChat size={size} />;
  if (/此在|本真|dazai/.test(k)) return <IconHome size={size} />;
  return <IconPath size={size} />;
}

export function nodeTypeIcon(type: string, size = 12): ReactNode {
  if (type === 'chapter') return <IconChapter size={size} />;
  if (type === 'concept') return <IconConcept size={size} />;
  if (type === 'claim') return <IconClaim size={size} />;
  if (type === 'person') return <IconPerson size={size} />;
  if (type === 'work') return <IconWork size={size} />;
  return <IconConcept size={size} />;
}
