import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BookPage from './pages/BookPage';
import MapPage from './pages/MapPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/books/:bookId" element={<BookPage />} />
      <Route path="/maps/:mapId/about" element={<BookPage />} />
      <Route path="/maps/:mapId" element={<MapPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}