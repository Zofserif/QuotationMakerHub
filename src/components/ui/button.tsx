import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-stone-950 text-white hover:bg-stone-800",
  secondary:
    "border border-stone-200 bg-white text-stone-900 hover:bg-stone-100",
  ghost: "text-stone-700 hover:bg-stone-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "size-10 p-0",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  loadingText?: string;
};

export function Button({
  children,
  className,
  disabled,
  loading = false,
  loadingText,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function LinkButton({
  className,
  variant = "primary",
  size = "md",
  href,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
