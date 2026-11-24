import React from "react";

interface MotoGoLogoProps {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export function MotoGoLogo({
  variant = "light",
  size = "md",
  showTagline = false,
}: MotoGoLogoProps) {
  const heightClass =
    size === "sm" ? "h-8 sm:h-9" : size === "lg" ? "h-12 sm:h-14" : "h-10";

  return (
    <div className="inline-flex flex-col items-start select-none">
      <img
        src="/images/sakayna-logo.png"
        alt="SakayNa"
        className={`${heightClass} w-auto object-contain ${
          variant === "dark"
            ? "drop-shadow-[0_1px_2px_rgba(11,14,17,0.85)]"
            : ""
        }`}
      />
      {showTagline && (
        <span
          className={`mt-1 text-[10px] font-semibold uppercase tracking-widest ${
            variant === "light" ? "text-[#848E9C]" : "text-[#707A8A]"
          }`}
        >
          Iligan MC Ride-Hailing
        </span>
      )}
    </div>
  );
}
