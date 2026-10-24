export const DIAL_CODES = [
  { code: '+91', label: 'IN +91' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+971', label: 'AE +971' },
  { code: '+61', label: 'AU +61' },
  { code: '+65', label: 'SG +65' }
];

export function buildPhone(dialCode, number) {
  const digits = String(number).replace(/\D/g, '').replace(/^0+/, '');
  return `${dialCode}${digits}`;
}