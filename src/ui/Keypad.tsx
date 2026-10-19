import { useEffect } from 'react';

export function parseEntry(v: string): number | null {
  if (v === '' || v === '-' || v === '.' || v === '-.') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Thumb-sized numeric keypad with a ± key (negative numbers) and optional decimal point. */
export function Keypad({
  value, onChange, onSubmit, prompt, sub, allowDecimal, submitLabel = 'Submit',
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (n: number) => void;
  prompt: string;
  sub?: string;
  allowDecimal?: boolean;
  submitLabel?: string;
}) {
  const press = (k: string) => {
    if (k === '⌫') return onChange(value.slice(0, -1));
    if (k === '±') return onChange(value.startsWith('-') ? value.slice(1) : '-' + value);
    if (k === '.') return allowDecimal && !value.includes('.') ? onChange(value + '.') : undefined;
    const digits = value.replace(/[-.]/g, '');
    if (digits.length >= 3) return;
    onChange(value === '0' ? k : value === '-0' ? '-' + k : value + k);
  };
  const n = parseEntry(value);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === '-') press('±');
      else if (e.key === '.') press('.');
      else if (e.key === 'Backspace') press('⌫');
      else if (e.key === 'Enter' && n !== null) onSubmit(n);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '±', '0', '⌫'];
  return (
    <div className="keypad">
      <div className="kp-prompt">{prompt}</div>
      {sub && <div className="kp-sub">{sub}</div>}
      <div className={`kp-display${value ? '' : ' empty'}`}>{value === '' ? '0' : value.startsWith('-') ? `−${value.slice(1)}` : value}</div>
      <div className="kp-grid">
        {keys.map((k) => (
          <button key={k} className={`kp-key${k === '±' || k === '⌫' ? ' fn' : ''}`} onClick={() => press(k)} aria-label={k === '±' ? 'plus minus' : k === '⌫' ? 'backspace' : k}>
            {k === '±' ? '+/−' : k}
          </button>
        ))}
      </div>
      <div className="kp-bottom">
        {allowDecimal && <button className="kp-key fn" onClick={() => press('.')}>.</button>}
        <button className="btn kp-submit" disabled={n === null} onClick={() => n !== null && onSubmit(n)}>{submitLabel}</button>
      </div>
    </div>
  );
}

export const fmtSigned = (n: number, digits = 0) => {
  const v = digits ? n.toFixed(digits) : String(n);
  return n > 0 ? `+${v}` : n < 0 ? `−${v.slice(1)}` : v;
};
