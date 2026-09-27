// Temporary image used until real photography/screenshots are added.
// Swap `src` for the real image path when it is ready.

export const PLACEHOLDER_SRC = "/site/placeholder.svg";

type PlaceholderImageProps = {
  width: number;
  height: number;
  alt: string;
  className?: string;
  src?: string;
  style?: React.CSSProperties;
};

export default function PlaceholderImage({ width, height, alt, className, src, style }: PlaceholderImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={src || PLACEHOLDER_SRC}
      width={width}
      height={height}
      alt={alt}
      style={{ objectFit: "cover", ...style }}
    />
  );
}
