const PATHS: Record<string, string> = {
  gear: "M6 4v16M12 4v16M18 4v8H6",
  screen: "M3 5h18v11H3zM9 20h6m-3-4v4",
  snow: "M12 2v20M4 6l16 12M20 6 4 18M9 4l3 3 3-3M9 20l3-3 3 3",
  bolt: "M13 2 5 13h6l-1 9 9-12h-6z",
  key: "M12 3v7m5.7-4.7a8 8 0 1 1-11.4 0",
  light: "M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  phone: "M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z",
  chat: "M4 5h16v11H9l-5 4z",
  home: "M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5h4v5",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0",
  grid: "M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z",
  back: "M19 12H5m6 6-6-6 6-6",
  exit: "M15 4h4v16h-4M10 8l-4 4 4 4m-4-4h10",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2.5h-15zM10 21h4",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4m8-4v4",
  car: "M5 16v3m14-3v3M3 16v-4l2-5a2 2 0 0 1 1.9-1.3h10.2A2 2 0 0 1 19 7l2 5v4zM3 12h18M7 14h.01M17 14h.01",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3",
  sliders: "M4 6h10m4 0h2M4 12h4m4 0h8M4 18h12m4 0h0M14 4v4M8 10v4M16 16v4",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v4l3 2",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  check: "M5 12.5 10 17l9-10",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  wallet: "M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1zM4 7l12-3v3M16 13h.01",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  lock: "M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  menu: "M4 7h16M4 12h16M4 17h16",
  chevron: "m9 6 6 6-6 6",
  road: "M8 3 5 21m11-18 3 18M12 5v2m0 4v2m0 4v2",
};

export default function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
