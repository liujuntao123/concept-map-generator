import { Link } from 'react-router-dom';
import { buttonClass, IconMap } from '@concept-map/core';

export default function NotFoundPage() {
  return (
    <div className="mobile-wash grid min-h-dvh place-content-center justify-items-center p-6 text-center">
      <div className="w-full max-w-[420px] rounded-card border border-dashed border-line bg-surface px-6 py-10">
        <div
          className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-card bg-accent/12 text-accent"
          aria-hidden
        >
          <IconMap size={26} />
        </div>
        <h2 className="mt-0 mb-2 text-xl font-semibold">页面不存在</h2>
        <p className="mb-6 text-sm text-muted">
          没有找到该路径。可能是链接写错了，或内容尚未发布。
        </p>
        <Link className={buttonClass({ variant: 'primary', size: 'lg', className: 'w-full' })} to="/">
          返回图书目录
        </Link>
      </div>
    </div>
  );
}