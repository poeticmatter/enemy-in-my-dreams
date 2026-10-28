// Small line icons, drawn on a 16-unit grid so they stay crisp at text size. They inherit currentColor.
import type { ReactNode } from 'react';

interface IconProps {
  title?: string;
}

function Icon({ title, children }: IconProps & { children: ReactNode }) {
  return (
    <svg className="icon" viewBox="0 0 16 16" width="1em" height="1em" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.5 13.5 3.5v4c0 3.3-2.3 5.8-5.5 7-3.2-1.2-5.5-3.7-5.5-7v-4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </Icon>
  );
}

/** Losing cards: a card with a tear through it. */
export function HitIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="1.5" width="9" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 5.5 8.5 8 6.5 9.5 9.5 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  );
}

/** Loot: a four-point star, like a glint of light. */
export function LootIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1c.6 3.6 1.8 5.4 6 7-4.2 1.6-5.4 3.4-6 7-.6-3.6-1.8-5.4-6-7 4.2-1.6 5.4-3.4 6-7z" fill="currentColor" />
    </Icon>
  );
}

/** Attack: a blade, point up. */
export function AttackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.5 10 4v6.5H6V4zM4.5 10.5h7M8 10.5v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </Icon>
  );
}
