import type { SubscriptionPlan } from "@/lib/types";

interface TierIconProps {
  plan: SubscriptionPlan;
  size?: number;
  className?: string;
}

function OneLeaf({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 3C12 3 8 6 8 11c0 3.5 2 5.5 4 6v2a1 1 0 1 0 0 0V17c2-.5 4-2.5 4-6 0-5-4-8-4-8z"
        fill="currentColor"
        opacity={0.85}
      />
      <path d="M12 17v4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function TwoLeaves({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M10 4C10 4 6 7 6 11c0 2.8 1.6 4.6 3.4 5.4L12 17l2.6-.6C16.4 15.6 18 13.8 18 11c0-4-4-7-4-7s-1.5 1.2-2 2c-.5-.8-2-2-2-2z"
        fill="currentColor"
        opacity={0.85}
      />
      <path
        d="M12 4.5c0 0-1 1.5-1 4s.5 4 1 5.5c.5-1.5 1-3 1-5.5s-1-4-1-4z"
        fill="currentColor"
        opacity={0.15}
      />
      <path d="M12 17v4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function ThreeLeaves({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Top leaf */}
      <path
        d="M12 2C12 2 9 5 9 8.5c0 2 1 3.3 2.2 4L12 13l.8-.5C14 11.8 15 10.5 15 8.5 15 5 12 2 12 2z"
        fill="currentColor"
        opacity={0.85}
      />
      {/* Bottom-left leaf */}
      <path
        d="M7 8c0 0-3 2-3 5.5 0 2 1 3.3 2.2 4l2.3.5.5-1C8 15.5 7 14 7 12c0-2.5 1.5-4 1.5-4H7z"
        fill="currentColor"
        opacity={0.75}
      />
      {/* Bottom-right leaf */}
      <path
        d="M17 8c0 0 3 2 3 5.5 0 2-1 3.3-2.2 4l-2.3.5-.5-1C16 15.5 17 14 17 12c0-2.5-1.5-4-1.5-4H17z"
        fill="currentColor"
        opacity={0.75}
      />
      <path d="M12 13v8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export default function TierIcon({ plan, size = 20, className }: TierIconProps) {
  switch (plan) {
    case "free":
      return <OneLeaf size={size} className={className} />;
    case "starter":
      return <TwoLeaves size={size} className={className} />;
    case "pro":
      return <ThreeLeaves size={size} className={className} />;
  }
}
