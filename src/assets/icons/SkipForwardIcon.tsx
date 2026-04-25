import type { SVGProps } from 'react';

export default function SkipForwardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <polygon points="4,4 14,12 4,20" />
      <rect x="18" y="4" width="2" height="16" />
    </svg>
  );
}
