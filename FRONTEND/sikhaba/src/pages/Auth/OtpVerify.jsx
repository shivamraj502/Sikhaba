import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendOtp, verifyOtp } from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import PhoneInput from '../../components/PhoneInput';
import { buildPhone, DIAL_CODES } from '../../utils/phone';

function OtpVerify() {
  const [dialCode, setDialCode] = useState(DIAL_CODES[0].code);
  const [number, setNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login: setAuthUser } = useAuth();
  const navigate = useNavigate();

  const phone = buildPhone(dialCode, number);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await sendOtp(phone);
      setOtpSent(true);
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await verifyOtp({ phone, otp_code: otp, name });
      setAuthUser(res.data);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '50px auto' }}>
      <h2>Login with Phone</h2>

      {!otpSent ? (
        <form onSubmit={handleSendOtp}>
          <PhoneInput
            dialCode={dialCode}
            number={number}
            onDialCodeChange={setDialCode}
            onNumberChange={setNumber}
            disabled={busy}
          />
          <br /><br />
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit" disabled={busy}>Send OTP</button>
        </form>
      ) : (
        <form onSubmit={handleVerify}>
          <p>Code sent to {phone}</p>
          <input
            type="text"
            placeholder="Name (only for new accounts)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <br /><br />
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
          <br /><br />
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit" disabled={busy}>Verify OTP</button>
          <button
            type="button"
            onClick={() => handleSendOtp()}
            disabled={busy || cooldown > 0}
            style={{ marginLeft: 8 }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
          </button>
          <br /><br />
          <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}>
            Change number
          </button>
        </form>
      )}

      <p><Link to="/login">Back to email login</Link></p>
    </div>
  );
}

export default OtpVerify;