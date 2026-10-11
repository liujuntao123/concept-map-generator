/**
 * 图标统一使用 lucide-react，不再手绘 SVG。
 *
 * 这里只做一层薄适配：
 * - 统一描边粗细（1.75）与行内对齐；
 * - 装饰性图标默认 aria-hidden（调用点仍可覆盖）；
 * - 保留原有 Icon* 导出名，调用点无需改动。
 */
import type { ReactNode, SVGProps } from 'react';
import {
  AlignLeft,
  ArrowLeft,
  BookOpen,
  Brain,
  ChartColumn,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Ellipsis,
  FileText,
  Filter,
  Focus,
  Hexagon,
  Home,
  Info,
  Library,
  Lightbulb,
  List,
  LogOut,
  Map,
  Maximize,
  MessageSquare,
  Moon,
  Network,
  NotebookPen,
  Route,
  Search,
  Share2,
  Signal,
  SkipForward,
  Spline,
  Sun,
  Target,
  TrendingUp,
  User,
  Users,
  Waypoints,
  Workflow,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/cn';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** 统一包装：固定描边粗细与行内对齐，装饰性图标默认对辅助技术隐藏。 */
function icon(Icon: LucideIcon) {
  const Wrapped = ({ size = 16, className, ...rest }: IconProps) => (
    <Icon
      size={size}
      strokeWidth={1.75}
      className={cn('inline-block shrink-0 align-[-0.15em]', className)}
      aria-hidden
      {...rest}
    />
  );
  Wrapped.displayName = `Icon(${Icon.displayName ?? 'Lucide'})`;
  return Wrapped;
}

export const IconSearch = icon(Search);
export const IconShare = icon(Share2);
export const IconSun = icon(Sun);
export const IconMoon = icon(Moon);
export const IconMore = icon(Ellipsis);
export const IconClose = icon(X);
export const IconChevronLeft = icon(ChevronLeft);
export const IconChevronRight = icon(ChevronRight);
export const IconExit = icon(LogOut);
export const IconZoomIn = icon(ZoomIn);
export const IconZoomOut = icon(ZoomOut);
export const IconFit = icon(Maximize);
export const IconFocus = icon(Focus);
export const IconMap = icon(Map);
export const IconPath = icon(Route);
export const IconBook = icon(BookOpen);
export const IconList = icon(List);
export const IconClock = icon(Clock);
export const IconSignal = icon(Signal);
export const IconCheck = icon(Check);
export const IconInfo = icon(Info);

/* 节点类型 */
export const IconChapter = icon(AlignLeft);
export const IconConcept = icon(Target);
export const IconClaim = icon(Hexagon);
export const IconPerson = icon(User);
export const IconWork = icon(FileText);

/* 其他 */
export const IconBack = icon(ArrowLeft);
export const IconStructure = icon(Workflow);
export const IconFilter = icon(Filter);
export const IconBrain = icon(Brain);
export const IconLightbulb = icon(Lightbulb);
export const IconTrend = icon(TrendingUp);
export const IconChart = icon(ChartColumn);
export const IconUsers = icon(Users);
export const IconCompass = icon(Compass);
export const IconChat = icon(MessageSquare);
export const IconSkip = icon(SkipForward);
export const IconNote = icon(NotebookPen);
export const IconNetwork = icon(Network);
export const IconNodes = icon(Waypoints);
export const IconEdges = icon(Spline);
export const IconBooks = icon(Library);
export const IconHome = icon(Home);

/** 推荐路径的主题图标 */
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

/** 节点类型图标 */
export function nodeTypeIcon(type: string, size = 12): ReactNode {
  if (type === 'chapter') return <IconChapter size={size} />;
  if (type === 'concept') return <IconConcept size={size} />;
  if (type === 'claim') return <IconClaim size={size} />;
  if (type === 'person') return <IconPerson size={size} />;
  if (type === 'work') return <IconWork size={size} />;
  return <IconConcept size={size} />;
}
