import { forwardRef, type InputHTMLAttributes } from 'react';
import { Input } from './Input';
import { exponent } from '../../lib/money';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  currency: string;
  onChange: (value: string) => void;
}

/** Text input restricted to a valid amount for the currency (e.g. at most 2 decimals for USD). */
export const MoneyInput = forwardRef<HTMLInputElement, Props>(({ value, currency, onChange, ...rest }, ref) => {
  const exp = exponent(currency);
  return (
    <Input
      ref={ref}
      inputMode="decimal"
      autoComplete="off"
      placeholder={exp === 0 ? '0' : `0.${'0'.repeat(exp)}`}
      value={value}
      onChange={(e) => {
        const next = e.target.value.replace(/,/g, '');
        const pattern = exp === 0 ? /^\d*$/ : new RegExp(`^\\d*\\.?\\d{0,${exp}}$`);
        if (next === '' || pattern.test(next)) onChange(next);
      }}
      {...rest}
    />
  );
});
MoneyInput.displayName = 'MoneyInput';
