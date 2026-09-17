import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';

function OtpLogin() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const { login: setAuthUser } = useAuth();
  const navigate = useNavigate();

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    try {
      await sendOtp(phone);
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await verifyOtp({ phone, otp_code: otp, name });
      setAuthUser(res.data);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '50px auto' }}>
      <h2>Login with Phone</h2>

      {!otpSent ? (
        <form onSubmit={handleSendOtp}>
          <input
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <br /><br />
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit">Send OTP</button>
        </form>
      ) : (
        <form onSubmit={handleVerify}>
          <input
            type="text"
            placeholder="Name (for new accounts)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <br /><br />
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <br /><br />
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit">Verify OTP</button>
        </form>
      )}

      <p><Link to="/login">Back to email login</Link></p>
    </div>
  );
}

export default OtpLogin;