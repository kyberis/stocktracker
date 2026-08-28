"use client";

import Image from "next/image";

interface Props {
  size?: number;
  className?: string;
  thinking?: boolean;
}

export default function CloverAvatar({ size = 44, className = "", thinking = false }: Props) {
  return (
    <span
      className={`inline-block rounded-full overflow-hidden ${className} ${thinking ? "animate-pulse" : ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src="/avatars/clover-512.png"
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-cover"
        unoptimized
      />
    </span>
  );
}
