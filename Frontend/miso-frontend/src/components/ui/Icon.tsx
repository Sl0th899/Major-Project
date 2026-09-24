/** Small stroke icon set, drawn to match Miso's pencil line. */
const PATHS = {
  send: "M4 12 L20 4 L14 20 L11 13 Z M11 13 L20 4",
  plus: "M12 5 V19 M5 12 H19",
  trash: "M5 7 H19 M10 7 V5 H14 V7 M7 7 L8 19 H16 L17 7 M10.5 11 V16 M13.5 11 V16",
  menu: "M4 7 H20 M4 12 H20 M4 17 H14",
  close: "M6 6 L18 18 M18 6 L6 18",
  eye: "M2.5 12 C5 7 8.5 5 12 5 C15.5 5 19 7 21.5 12 C19 17 15.5 19 12 19 C8.5 19 5 17 2.5 12 Z M12 9 A3 3 0 1 0 12.01 9",
  eyeOff: "M3 3 L21 21 M10.6 6.1 C11.1 6 11.5 6 12 6 C15.5 6 19 8 21.5 12 C20.7 13.4 19.8 14.6 18.8 15.5 M14.1 14.2 A3 3 0 0 1 9.8 9.9 M6.4 7.6 C4.9 8.7 3.6 10.2 2.5 12 C5 16 8.5 18 12 18 C13.6 18 15.1 17.6 16.5 16.8",
  logout: "M14 5 H6 V19 H14 M10 12 H21 M17 8 L21 12 L17 16",
  refresh: "M20 11 A8 8 0 1 0 18 17 M20 5 V11 H14",
  paw: "M12 13 C9 13 7 15.5 7 17.5 C7 19 8.5 19.5 10 19 C11 18.7 13 18.7 14 19 C15.5 19.5 17 19 17 17.5 C17 15.5 15 13 12 13 Z M7.5 9 A1.8 2.2 0 1 0 7.51 9 M16.5 9 A1.8 2.2 0 1 0 16.51 9 M10.5 6 A1.6 2 0 1 0 10.51 6 M13.5 6 A1.6 2 0 1 0 13.51 6",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
