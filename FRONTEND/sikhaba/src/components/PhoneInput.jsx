import { DIAL_CODES } from '../utils/phone';

function PhoneInput({ dialCode, number, onDialCodeChange, onNumberChange, disabled }) {
  return (
    <span>
      <select value={dialCode} onChange={(e) => onDialCodeChange(e.target.value)} disabled={disabled}>
        {DIAL_CODES.map((c) => (
          <option key={c.code} value={c.code}>{c.label}</option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="numeric"
        placeholder="Phone number"
        value={number}
        onChange={(e) => onNumberChange(e.target.value)}
        disabled={disabled}
        required
        style={{ marginLeft: 6 }}
      />
    </span>
  );
}

export default PhoneInput;