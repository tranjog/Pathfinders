import type { SVGProps } from 'react';

export default function AppLogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={32} height={32} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        d="M5 19 C7 16 8 17 9 14 C10 11 12 13 14 10 C16 8 17 9 19 6"
        stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.18"
      />
      <path
        d="M5 19 C7 16 8 17 9 14 C10 11 12 13 14 10 C16 8 17 9 19 6"
        stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 2.5"
      />
      <path
        d="M19 3.5c-1.4 0-2.5 1.1-2.5 2.5 0 1.8 2.5 4.5 2.5 4.5S21.5 7.8 21.5 6c0-1.4-1.1-2.5-2.5-2.5z"
        fill="#4caf50"
      />
      <circle cx="19" cy="6" r="0.9" fill="white" />
      <circle cx="5" cy="19" r="2.5" fill="#e94560" />
      <circle cx="5" cy="19" r="1" fill="white" />
    </svg>
  );
}
