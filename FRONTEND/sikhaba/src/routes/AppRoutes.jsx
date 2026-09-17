import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Auth/Login';
import Signup from '../pages/Auth/Signup';
import OtpVerify from '../pages/Auth/OtpVerify';
import Home from '../pages/Home/Home';
import { useAuth } from '../context/AuthContext';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/otp-login" element={<OtpVerify />} />
      <Route path="/home" element={user ? <Home /> : <Navigate to="/login" />} />
      <Route path="/" element={<Navigate to={user ? '/home' : '/login'} />} />
    </Routes>
  );
}

export default AppRoutes;