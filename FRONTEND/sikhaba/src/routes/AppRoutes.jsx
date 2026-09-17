import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/Auth/Login';
import Signup from '../pages/Auth/Signup';
import OtpVerify from '../pages/Auth/OtpVerify';
import Home from '../pages/Home/Home';
import LiveRoom from '../pages/Room/LiveRoom';
import { useAuth } from '../context/AuthContext';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/home" /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/home" /> : <Signup />} />
      <Route path="/otp-login" element={user ? <Navigate to="/home" /> : <OtpVerify />} />
      <Route path="/home" element={user ? <Home /> : <Navigate to="/login" />} />
      <Route path="/room/:roomId" element={user ? <LiveRoom /> : <Navigate to="/login" />} />
      <Route path="/" element={<Navigate to={user ? '/home' : '/login'} />} />
    </Routes>
  );
}

export default AppRoutes;