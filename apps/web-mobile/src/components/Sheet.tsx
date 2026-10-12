import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { cn, IconClose, iconButtonClass } from '@concept-map/core';

export type SheetSnap = 'peek' | 'half' | 'full';

/** 收起态高度：手柄 + 一行头部 */
const PEEK_PX = 108;

const SNAP_ORDER: SheetSnap[] = ['peek', 'half', 'full'];

function measure(): Record<SheetSnap, number> {
  const h = typeof window === 'undefined' ? 800 : window.innerHeight;
  return { peek: PEEK_PX, half: Math.round(h * 0.52), full: Math.round(h * 0.88) };
}

interface Props {
  snap: SheetSnap;
  onSnap: (snap: SheetSnap) => void;
  onClose: () => void;
  /** peek 态保持可见的一行头部 */
  header: ReactNode;
  ariaLabel: string;
  children?: ReactNode;
}

/**
 * 移动端底部抽屉：三档高度（peek / half / full），手柄可拖拽、就近吸附。
 * 内容态由调用方切换（节点详情 / 关系 / 更多 / 路径步骤）。
 *
 * 注意：这里刻意不用 setPointerCapture —— 它会把后续 click 重定向到
 * 拖拽容器，导致手柄按钮点不动；改用 window 上的 pointermove/up 监听。
 */
export default function Sheet({ snap, onSnap, onClose, header, ariaLabel, children }: Props) {
  const [dragH, setDragH] = useState<number | null>(null);
  const [view, setView] = useState<Record<SheetSnap, number>>(measure);
  const suppressClick = useRef(false);

  useEffect(() => {
    const onResize = () => setView(measure());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const currentH = dragH ?? view[snap];
  const dragging = dragH != null;

  const startDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const interactive = (e.target as HTMLElement).closest(
        'button, a, input, textarea, select',
      );
      // 头部右侧的按钮（关闭等）不参与拖拽；手柄本身可拖
      if (interactive && !(interactive as HTMLElement).dataset.sheetHandle) return;

      const startY = e.clientY;
      const startH = currentH;
      let lastY = startY;
      let lastT = performance.now();
      let h = startH;
      let moved = false;
      setDragH(startH);

      const onMove = (ev: PointerEvent) => {
        if (Math.abs(ev.clientY - startY) > 8) moved = true;
        lastY = ev.clientY;
        lastT = performance.now();
        h = Math.min(view.full, Math.max(view.peek, startH + (startY - ev.clientY)));
        setDragH(h);
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (moved) {
          suppressClick.current = true;
          window.setTimeout(() => {
            suppressClick.current = false;
          }, 250);
        }
        /** px/ms，向下为正 */
        const dt = Math.max(1, performance.now() - lastT);
        const velocity = (lastY - startY) / dt;
        setDragH(null);
        const found = SNAP_ORDER.findIndex((s) => view[s] >= h - 1);
        const currentIndex = found < 0 ? SNAP_ORDER.length - 1 : found;
        let target: SheetSnap;
        if (velocity > 0.45) {
          target = SNAP_ORDER[Math.max(0, currentIndex - 1)];
        } else if (velocity < -0.45) {
          target = SNAP_ORDER[Math.min(SNAP_ORDER.length - 1, currentIndex + 1)];
        } else {
          target = SNAP_ORDER.reduce(
            (best, s) => (Math.abs(view[s] - h) < Math.abs(view[best] - h) ? s : best),
            SNAP_ORDER[0],
          );
        }
        onSnap(target);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [currentH, onSnap, view],
  );

  const showContent = currentH > view.peek + 24;

  return (
    <section
      role="dialog"
      aria-label={ariaLabel}
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden',
        'rounded-t-card border-t border-line bg-surface shadow-[0_-10px_30px_var(--shadow-color)]',
        !dragging && 'transition-[height] duration-200 ease-soft',
      )}
      style={{ height: currentH }}
    >
      {/* 拖拽区：手柄整行 + 头部空白处（按钮除外） */}
      <div className="shrink-0 touch-none select-none" onPointerDown={startDrag}>
        <button
          type="button"
          data-sheet-handle
          className="flex h-7 w-full cursor-pointer items-center justify-center border-0 bg-transparent"
          aria-label={snap === 'peek' ? '展开抽屉' : '收起抽屉'}
          onClick={() => {
            if (suppressClick.current) return;
            onSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'half');
          }}
        >
          <span
            className="h-1 w-10 rounded-full bg-[color-mix(in_srgb,var(--muted)_55%,transparent)]"
            aria-hidden
          />
        </button>
        <div className="flex items-start gap-2 px-4 pb-2.5">
          <div className="min-w-0 flex-1">{header}</div>
          <button
            type="button"
            className={iconButtonClass({ className: '-mt-0.5 h-9 w-9' })}
            onClick={onClose}
            aria-label="关闭"
          >
            <IconClose />
          </button>
        </div>
      </div>
      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+20px)]',
          !showContent && 'invisible',
        )}
      >
        {children}
      </div>
    </section>
  );
}