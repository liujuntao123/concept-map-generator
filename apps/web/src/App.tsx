import { Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/maps/:mapId" element={<MapPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
