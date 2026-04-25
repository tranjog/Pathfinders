import type { SVGProps } from 'react';

export default function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <polygon points="6,4 20,12 6,20" />
    </svg>
  );
}
