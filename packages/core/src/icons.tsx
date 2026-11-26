import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function stroke({ size = 16, strokeWidth = 1.8, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const MusicIcon = (p: IconProps) => (
  <svg {...stroke(p)}><path d="M9 18V6l11-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>
);

export const PlayIcon = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
  </svg>
);

export const PauseIcon = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);

export const ImageIcon = (p: IconProps) => (
  <svg {...stroke(p)}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 8" /></svg>
);

export const ChevronDown = (p: IconProps) => <svg {...stroke(p)}><path d="M6 9l6 6 6-6" /></svg>;
export const ChevronLeft = (p: IconProps) => <svg {...stroke(p)}><path d="M15 6l-6 6 6 6" /></svg>;
export const ChevronRight = (p: IconProps) => <svg {...stroke(p)}><path d="M9 6l6 6-6 6" /></svg>;
export const CloseIcon = (p: IconProps) => <svg {...stroke(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const CheckIcon = (p: IconProps) => <svg {...stroke({ strokeWidth: 2, ...p })}><path d="M5 12l5 5 9-10" /></svg>;
export const PlusIcon = (p: IconProps) => <svg {...stroke(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const TrashIcon = (p: IconProps) => (
  <svg {...stroke(p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const CopyIcon = (p: IconProps) => (
  <svg {...stroke(p)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>
);
export const SendIcon = (p: IconProps) => <svg {...stroke(p)}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>;
export const SyncIcon = (p: IconProps) => (
  <svg {...stroke(p)}><path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2" /><path d="M21 4v5h-5M3 20v-5h5" /></svg>
);

export const PinIcon = (p: IconProps) => (
  <svg {...stroke(p)}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);

export const CalendarPlusIcon = (p: IconProps) => (
  <svg {...stroke(p)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M12 14v4M10 16h4" /></svg>
);

export const NavigateIcon = (p: IconProps) => <svg {...stroke(p)}><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>;

export const CarIcon = (p: IconProps) => (
  <svg {...stroke({ strokeWidth: 1.6, ...p })}>
    <path d="M5 17h14l-1.5-6.5A2 2 0 0 0 15.6 9H8.4a2 2 0 0 0-1.9 1.5L5 17z" /><circle cx="8" cy="18" r="1.5" /><circle cx="16" cy="18" r="1.5" />
  </svg>
);

export const GiftIcon = (p: IconProps) => (
  <svg {...stroke({ strokeWidth: 1.7, ...p })}>
    <rect x="3" y="8" width="18" height="13" rx="1.5" />
    <path d="M3 12h18M12 8v13M12 8c-1.5-3-5-4-6-2s2 2 6 2zM12 8c1.5-3 5-4 6-2s-2 2-6 2z" />
  </svg>
);

export const LockIcon = (p: IconProps) => (
  <svg {...stroke(p)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);

export const HeartSolid = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size * 0.9} viewBox="0 0 24 22" aria-hidden="true">
    <path d="M12 21C6 16.5 1 12.5 1 7.3 1 3.8 3.6 1 7 1c2.3 0 4 1.3 5 3.2C13 2.3 14.7 1 17 1c3.4 0 6 2.8 6 6.3C23 12.5 18 16.5 12 21z" fill={color} />
  </svg>
);

export const HeartOutline = ({ size = 64, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size * 0.9} viewBox="0 0 24 22" aria-hidden="true">
    <path d="M12 21C6 16.5 1 12.5 1 7.3 1 3.8 3.6 1 7 1c2.3 0 4 1.3 5 3.2C13 2.3 14.7 1 17 1c3.4 0 6 2.8 6 6.3C23 12.5 18 16.5 12 21z" fill="none" stroke={color} strokeWidth="1" />
  </svg>
);
