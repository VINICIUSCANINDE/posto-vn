'use client';

import { useSyncExternalStore, type HTMLAttributes, type ReactNode } from 'react';
import BlurText from './BlurText';
import CountUp from './CountUp';
import FadeContent from './FadeContent';

const QUERY = '(prefers-reduced-motion: reduce)';
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
const useReducedMotion = () => useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...rest}>{children}</div>;
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <FadeContent trigger="mount" effect="fade" blur={4} duration={0.5} delay={delay} initialOpacity={0} className={className}>
      {children}
    </FadeContent>
  );
}

export function Counter({ value, decimals = 0, prefix = '', suffix = '' }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const reduce = useReducedMotion();
  const text = `${prefix}${value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  if (reduce) return <>{text}</>;
  return (
    <>
      <span aria-hidden="true"><CountUp to={value} decimals={decimals} separator="." decimalSeparator="," prefix={prefix} suffix={suffix} duration={0.9} trigger="load" /></span>
      <span className="sr-only">{text}</span>
    </>
  );
}

export function Headline({ text, className }: { text: string; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <h1 className={className}>{text}</h1>;
  return (
    <h1 className={className} aria-label={text}>
      <span aria-hidden="true"><BlurText text={text} animateBy="words" direction="bottom" delay={70} /></span>
    </h1>
  );
}
