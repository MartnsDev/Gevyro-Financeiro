import Image from 'next/image';
export function GevyroLogo({
  className = '',
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <Image
      src="/brand/gevyro-mark.png"
      width={128}
      height={128}
      className={`gevyro-logo ${className}`}
      alt={decorative ? '' : 'Logo Gevyro'}
      unoptimized
    />
  );
}
