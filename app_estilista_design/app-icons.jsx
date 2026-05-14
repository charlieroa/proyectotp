// Icons — stroke style, flat, consistent with premium dark UI
const Icon = {
  home: (c='currentColor', s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1v-9.5z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  calendar: (c='currentColor', s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2.5" stroke={c} strokeWidth="1.8"/>
      <path d="M3 10h18M8 3v4M16 3v4" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  chart: (c='currentColor', s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  queue: (c='currentColor', s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.8"/>
      <path d="M12 7v5l3 2" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  users: (c='currentColor', s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3.5" stroke={c} strokeWidth="1.8"/>
      <path d="M2.5 20c.5-3.3 3.2-5.5 6.5-5.5s6 2.2 6.5 5.5" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="17" cy="9" r="2.5" stroke={c} strokeWidth="1.8"/>
      <path d="M21.5 18c-.3-2-1.8-3.5-4-3.8" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  user: (c='currentColor', s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8"/>
      <path d="M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  arrowUp: (c='currentColor', s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 19V5M5 12l7-7 7 7" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  arrowRight: (c='currentColor', s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 5l7 7-7 7" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  plus: (c='currentColor', s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  check: (c='currentColor', s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M5 12l5 5L20 7" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  search: (c='currentColor', s=18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke={c} strokeWidth="1.8"/>
      <path d="M20 20l-3.5-3.5" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  bell: (c='currentColor', s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M10 19a2 2 0 004 0" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  scissors: (c='currentColor', s=20) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <circle cx="6" cy="6" r="3" stroke={c} strokeWidth="1.8"/>
      <circle cx="6" cy="18" r="3" stroke={c} strokeWidth="1.8"/>
      <path d="M8.5 7.5L20 18M20 6L8.5 16.5M12.5 12L14 13" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  star: (c='currentColor', fill=false, s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={fill? c : 'none'}>
      <path d="M12 2l3 7 7 .6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.6 9 9l3-7z" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  dot: (c='currentColor', s=6) => (
    <div style={{ width:s, height:s, borderRadius:999, background:c }} />
  ),
  spark: (c='currentColor', s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" fill={c}/>
    </svg>
  ),
};

Object.assign(window, { Icon });
