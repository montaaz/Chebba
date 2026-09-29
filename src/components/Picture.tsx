import manifest from "@/lib/images.json";

type Name = keyof typeof manifest;

type Props = {
  name: string;
  alt: string;
  sizes: string;
  className?: string;
  eager?: boolean;
};

/* Pre-compressed AVIF with a WebP fallback, sized for the viewport. */
export default function Picture({ name, alt, sizes, className, eager }: Props) {
  const { widths, width, height, v } = manifest[name as Name];
  const set = (ext: string) => widths.map((w) => `/img/${name}-${w}.${ext}?v=${v} ${w}w`).join(", ");
  return (
    <picture>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <img
        className={className}
        src={`/img/${name}-${widths[0]}.webp?v=${v}`}
        srcSet={set("webp")}
        sizes={sizes}
        width={width}
        height={height}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding={eager ? "sync" : "async"}
        draggable={false}
      />
    </picture>
  );
}
