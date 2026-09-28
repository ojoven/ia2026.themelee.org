import type { CSSProperties } from "react";

const paths = {
  arrow: <path d="M7 17 17 7M7 7h10v10" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  right: <path d="M4 12h16m-6-6 6 6-6 6" />,
  down: <path d="M12 4v16m-6-6 6 6 6-6" />,
  pin: (
    <>
      <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  talk: (
    <>
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />
      <path d="M8 10h8m-8 4h5" />
    </>
  ),
  beer: (
    <>
      <path d="M5 8h11v13H5zM16 10h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3M8 11v6m5-6v6" />
      <path d="M5 8a3 3 0 0 1 0-6 3 3 0 0 1 5-1 3 3 0 0 1 5 2 2.5 2.5 0 0 1 1 5" />
    </>
  ),
  star: (
    <path d="m12 2 1.9 6.1L20 6l-4.1 5L22 13l-6.1 1.9L18 21l-5-4.1L11 23l-1.9-6.1L3 19l4.1-5L1 12l6.1-1.9L5 4l5 4.1L12 2Z" />
  ),
  left: <path d="M20 12H4m6-6-6 6 6 6" />,
  code: <path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  pen: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Zm9.5-13.5 4 4" />,
  chart: <path d="M3 20h18M6 16v-5m5 5V6m5 10v-8" />,
  bulb: (
    <>
      <path d="M9 18h6m-5 3h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
    </>
  ),
  megaphone: <path d="M3 10v4h3l7 5V5l-7 5H3Zm13-1a4 4 0 0 1 0 6m2.5-9a8 8 0 0 1 0 12" />,
  cap: (
    <>
      <path d="m2 9 10-5 10 5-10 5L2 9Z" />
      <path d="M6 11v5c3 2.5 9 2.5 12 0v-5m4-2v6" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </>
  ),
  sprout: <path d="M12 21v-9m0 0C12 7 8.5 4 4 4c0 5 3.5 8 8 8Zm0 0c0-4 3-7 8-7 0 4.5-3 7-8 7Z" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  bot: (
    <>
      <rect x="5" y="8" width="14" height="11" rx="3" />
      <path d="M12 8V4m-3 9h.01M15 13h.01M9 16h6M3 13v2m18-2v2" />
    </>
  ),
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a3 3 0 0 0 3 5m8-5h3a3 3 0 0 1-3 5m-4 3v4m-4 3h8" />
    </>
  ),
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  className,
  style,
}: {
  name: IconName;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
