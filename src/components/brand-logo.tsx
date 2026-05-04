import Image from "next/image";

import { APP_LOGO_SRC } from "@/lib/app-config";
import { cn } from "@/lib/utils";

const variants = {
  badge: "size-9 rounded-md bg-white p-1.5 shadow-sm ring-1 ring-white/30",
  plain: "size-7",
};

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  variant?: keyof typeof variants;
};

export function BrandLogo({
  className,
  imageClassName,
  variant = "plain",
}: BrandLogoProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden",
        variants[variant],
        className,
      )}
    >
      <Image
        alt=""
        className={cn("size-full object-contain", imageClassName)}
        height={240}
        src={APP_LOGO_SRC}
        width={240}
      />
    </span>
  );
}
