import { Link } from 'react-router-dom';
import { IconMap } from '../components/icons';
import { buttonClass, cardSurface } from '../components/ui/styles';
import { cn } from '../lib/cn';

export default function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-content-center justify-items-center bg-canvas p-6 text-center">
      <div className={cn(cardSurface, 'max-w-[440px] border-dashed px-8 py-10')}>
        <div
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-card bg-accent/12 text-accent"
          aria-hidden
        >
          <IconMap size={26} />
        </div>
        <h2 className="mb-2 text-xl font-semibold">页面不存在</h2>
        <p className="mb-6 text-sm text-muted">
          没有找到该路径。可能是链接写错了，或内容尚未发布。
        </p>
        <Link className={buttonClass({ variant: 'primary', size: 'lg' })} to="/">
          返回图书目录
        </Link>
      </div>
    </div>
  );
}
