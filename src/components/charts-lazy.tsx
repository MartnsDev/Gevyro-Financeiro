'use client';
import { lazy, Suspense, type ComponentProps } from 'react';
const LazyFlow = lazy(() => import('./charts').then((m) => ({ default: m.FlowChart })));
const LazyCategory = lazy(() => import('./charts').then((m) => ({ default: m.CategoryChart })));
const fallback = (
  <div className="chart-loading" role="status">
    Carregando gráfico…
  </div>
);
export function FlowChart(props: ComponentProps<typeof LazyFlow>) {
  return (
    <Suspense fallback={fallback}>
      <LazyFlow {...props} />
    </Suspense>
  );
}
export function CategoryChart(props: ComponentProps<typeof LazyCategory>) {
  return (
    <Suspense fallback={fallback}>
      <LazyCategory {...props} />
    </Suspense>
  );
}
