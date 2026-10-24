import { useState } from 'react';
import { sendPhoneOtp, verifyPhone } from '../../api/authApi';
import PhoneInput from '../../components/PhoneInput';
import { buildPhone, DIAL_CODES } from '../../utils/phone';

function PhoneSection({ phone, onUpdated }) {
  const [step, setStep] = useState('idle'); // idle | enter | otp
  const [dialCode, setDialCode] = useState(DIAL_CODES[0].code);
  const [number, setNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fullPhone = buildPhone(dialCode, number);

  function reset() {
    setStep('idle');
    setNumber('');
    setOtp('');
    setError('');
  }

  async function handleSend(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await sendPhoneOtp(fullPhone);
      setStep('otp');
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
      const res = await verifyPhone({ phone: fullPhone, otp_code: otp });
      onUpdated(res.data);
      reset();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'idle') {
    return (
      <p>
        <strong>Phone:</strong> {phone || 'Not set'}{' '}
        <button onClick={() => setStep('enter')}>{phone ? 'Change' : 'Add'}</button>
      </p>
    );
  }

  return (
    <div style={{ margin: '8px 0' }}>
      {step === 'enter' && (
        <form onSubmit={handleSend}>
          <PhoneInput
            dialCode={dialCode}
            number={number}
            onDialCodeChange={setDialCode}
            onNumberChange={setNumber}
            disabled={busy}
          />
          <br /><br />
          <button type="submit" disabled={busy}>Send OTP</button>
          <button type="button" onClick={reset} style={{ marginLeft: 6 }}>Cancel</button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerify}>
          <p>Enter the code sent to {fullPhone}</p>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            required
          />
          <br /><br />
          <button type="submit" disabled={busy}>Verify</button>
          <button
            type="button"
            onClick={() => { setStep('enter'); setOtp(''); setError(''); }}
            style={{ marginLeft: 6 }}
          >
            Back
          </button>
        </form>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default PhoneSection;