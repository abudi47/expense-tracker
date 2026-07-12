import { useEffect, useRef, useState } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { formatCurrency } from '../utils/format';
import { fonts } from '../theme';

interface Props {
  value: number;
  currency?: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}

export function AnimatedBalance({ value, currency, style, duration = 650 }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }

    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return (
    <Text
      style={[
        {
          fontFamily: fonts.bold,
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}
    >
      {formatCurrency(display, currency)}
    </Text>
  );
}
