import React from 'react';
export default function TestImage({
  unoptimized: _unoptimized,
  ...props
}: React.ComponentProps<'img'> & { unoptimized?: boolean }) {
  void _unoptimized;
  // Native image is intentional in this isolated Vite harness; production uses next/image.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} alt={props.alt ?? ''} />;
}
