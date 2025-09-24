import { memo, useId, useMemo } from 'react';
import type { PriceSample } from '../lib/priceHistory';

export interface SparklineProps {
  data: PriceSample[];
  width?: number;
  height?: number;
  color?: string;
  title?: string;
}

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 60;

const SparklineComponent = ({
  data,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  color = 'var(--accent-color, #f7931a)',
  title = 'Evolución reciente del precio',
}: SparklineProps) => {
  const points = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const numericPoints = data.filter((item) => Number.isFinite(item.price));
    if (numericPoints.length === 0) return [];

    const prices = numericPoints.map((item) => item.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    return numericPoints.map((item, index) => {
      const x = (index / Math.max(numericPoints.length - 1, 1)) * width;
      const y = height - ((item.price - min) / range) * height;
      return { x, y };
    });
  }, [data, height, width]);

  const path = useMemo(() => {
    if (points.length === 0) return '';
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
      .join(' ');
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="sparkline__empty" role="status" aria-live="polite">
        Sin histórico suficiente
      </div>
    );
  }

  const gradientId = useId().replace(/[:]/g, '');

  return (
    <figure className="sparkline" aria-label={title} role="img">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="presentation"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L${width},${height} L0,${height} Z`}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </svg>
      <figcaption className="visualmente-oculto">{title}</figcaption>
    </figure>
  );
};

export const Sparkline = memo(SparklineComponent);

Sparkline.displayName = 'Sparkline';
