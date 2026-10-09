import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="cm-shell cm-shell--center">
      <div className="cm-empty-books" style={{ maxWidth: 420 }}>
        <div className="cm-empty-books__icon" aria-hidden>
          🗺️
        </div>
        <h2>页面不存在</h2>
        <p>没有找到该路径。可能是链接写错了，或内容尚未发布。</p>
        <Link className="cm-btn cm-btn--primary" to="/">
          返回图书目录
        </Link>
      </div>
    </div>
  );
}
