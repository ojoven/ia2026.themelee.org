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
};

export function Icon({
  name,
  className,
  style,
}: {
  name: keyof typeof paths;
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
