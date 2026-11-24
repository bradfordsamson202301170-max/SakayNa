import React from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "navy" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#F0B90B] text-[#0B0E11] font-bold hover:bg-[#FCD535] focus-visible:ring-[#F0B90B] shadow-sm",
  navy:
    "bg-[#181A20] text-white hover:bg-[#2B3139] focus-visible:ring-[#181A20] shadow-sm",
  outline:
    "border border-[#EAECEF] bg-white text-[#1E2329] hover:bg-[#F5F5F5] focus-visible:ring-[#707A8A]",
  ghost:
    "text-[#474D57] hover:bg-[#F5F5F5] focus-visible:ring-[#707A8A]",
  danger:
    "bg-[#F6465D] text-white hover:bg-[#D9384E] focus-visible:ring-[#F6465D] shadow-sm",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs font-semibold rounded-lg",
  md: "px-4 py-2.5 text-sm font-semibold rounded-lg",
  lg: "px-6 py-3 text-base font-semibold rounded-xl",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}

interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {children}
    </Link>
  );
}
