import { Link } from "react-router-dom";

type NavLogoProps = {
  to: string;
  src?: string;
  alt?: string;
  className?: string;
};

const baseClassName = "flex items-center gap-4 text-white";
const logoFrameClassName =
  "flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-slate-600 transition-colors hover:border-slate-400";
const defaultLogoSrc = "/logo.svg";
const defaultLogoAlt = "Logo";

export function NavLogo({
  to,
  src = defaultLogoSrc,
  alt = defaultLogoAlt,
  className,
}: NavLogoProps) {
  return (
    <Link
      to={to}
      className={className ? `${baseClassName} ${className}` : baseClassName}
    >
      {/* Logo image in a circular frame; keeps the border around the image only. */}
      <span className={logoFrameClassName}>
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
        />
      </span>
      {/* Brand title text styled independently from the logo frame. */}
      <span
        className="text-3xl tracking-wide"
        style={{
          fontFamily: "Impact, Haettenschweiler, \"Arial Narrow Bold\", sans-serif",
        }}
      >
        FragComms
      </span>
    </Link>
  );
}
