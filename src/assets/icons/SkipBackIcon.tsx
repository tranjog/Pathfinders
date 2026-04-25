import type { SVGProps } from 'react';

export default function SkipBackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <polygon points="20,4 10,12 20,20" />
      <rect x="4" y="4" width="2" height="16" />
    </svg>
  );
}
