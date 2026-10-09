import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import BookDetailPage from './pages/BookDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/books/:bookId" element={<BookDetailPage />} />
      <Route path="/maps/:mapId/about" element={<BookDetailPage />} />
      <Route path="/maps/:mapId" element={<MapPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
