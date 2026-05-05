import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthContext from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ExamCreator from './pages/ExamCreator';
import AdminPanel from './pages/AdminPanel';
import ExamDetail from './pages/ExamDetail';
import NotFound from './pages/NotFound';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <AuthContext>
        <SocketProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route element={<PrivateRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/exam/create" element={<ExamCreator />} />
                <Route path="/exam/:id" element={<ExamDetail />} />
                <Route path="/admin" element={<AdminPanel />} />
              </Route>

              {/* Fallback */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthContext>
    </ThemeProvider>
  );
}

export default App;
