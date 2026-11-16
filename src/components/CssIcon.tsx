import type { CSSProperties } from "react";

export type CssIconName =
  | "logo"
  | "play"
  | "stop"
  | "upload"
  | "download"
  | "trash"
  | "copy"
  | "check"
  | "alert"
  | "shield"
  | "bolt"
  | "bug"
  | "code"
  | "history"
  | "sun"
  | "moon"
  | "close"
  | "refresh"
  | "sliders";

interface CssIconProps {
  name: CssIconName;
  size?: number;
  className?: string;
}

export function CssIcon({ name, size = 16, className = "" }: CssIconProps) {
  const style = { "--ci-size": `${size}px` } as CSSProperties;
  const needsInnerSpan =
    name === "upload" ||
    name === "download" ||
    name === "alert" ||
    name === "bug";

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`ci-icon ci-${name} ${className}`.trim()}
    >
      {needsInnerSpan ? <span /> : null}
    </span>
  );
}
