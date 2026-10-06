import { forwardRef, useEffect, useRef, useState } from "react";
import type { FitResult, Point } from "./core";

type CurveChartProps = {
  points: Point[];
  result: FitResult;
};

function bounds(values: number[]): [number, number] {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = maximum === minimum ? Math.max(Math.abs(maximum) * 0.1, 1) : (maximum - minimum) * 0.08;
  return [minimum - padding, maximum + padding];
}

function ticks(minimum: number, maximum: number): number[] {
  return Array.from({ length: 5 }, (_, index) => minimum + ((maximum - minimum) * index) / 4);
}

function valueText(value: number): string {
  return Number(value.toPrecision(4)).toString();
}

export const CurveChart = forwardRef<SVGSVGElement, CurveChartProps>(function CurveChart(
  { points, result },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(680);
  const height = 400;
  const margins = { top: 24, right: 26, bottom: 54, left: 64 };
  const allPoints = [...points, ...result.fittedPoints];
  const [minimumX, maximumX] = bounds(allPoints.map((point) => point.x));
  const [minimumY, maximumY] = bounds(allPoints.map((point) => point.y));
  const plotWidth = width - margins.left - margins.right;
  const plotHeight = height - margins.top - margins.bottom;
  const scaleX = (value: number) => margins.left + ((value - minimumX) / (maximumX - minimumX)) * plotWidth;
  const scaleY = (value: number) => margins.top + ((maximumY - value) / (maximumY - minimumY)) * plotHeight;
  const curvePath = result.fittedPoints.map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(point.x)},${scaleY(point.y)}`).join(" ");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width)));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="curve-fit-chart" ref={containerRef}>
      <svg ref={ref} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="实验数据散点与拟合曲线">
        <title>实验数据散点与拟合曲线</title>
        <rect x={margins.left} y={margins.top} width={plotWidth} height={plotHeight} fill="#ffffff" stroke="#cbd5e1" />
        {ticks(minimumY, maximumY).map((value) => (
          <g key={`y-${value}`}>
            <line x1={margins.left} x2={width - margins.right} y1={scaleY(value)} y2={scaleY(value)} stroke="#e2e8f0" />
            <text x={margins.left - 10} y={scaleY(value) + 4} textAnchor="end" fill="#475569" fontSize="12">{valueText(value)}</text>
          </g>
        ))}
        {ticks(minimumX, maximumX).map((value) => (
          <g key={`x-${value}`}>
            <line x1={scaleX(value)} x2={scaleX(value)} y1={margins.top} y2={height - margins.bottom} stroke="#e2e8f0" />
            <text x={scaleX(value)} y={height - margins.bottom + 22} textAnchor="middle" fill="#475569" fontSize="12">{valueText(value)}</text>
          </g>
        ))}
        <path d={curvePath} fill="none" stroke="#2563eb" strokeWidth="2.5" />
        {points.map((point, index) => (
          <circle key={`${point.x}-${point.y}-${index}`} cx={scaleX(point.x)} cy={scaleY(point.y)} r="4.5" fill="#ea580c" stroke="#ffffff" strokeWidth="1.5">
            <title>{`x：${point.x}，y：${point.y}`}</title>
          </circle>
        ))}
        <text x={margins.left + plotWidth / 2} y={height - 12} textAnchor="middle" fill="#0f172a" fontSize="13">x</text>
        <text x="18" y={margins.top + plotHeight / 2} textAnchor="middle" fill="#0f172a" fontSize="13" transform={`rotate(-90 18 ${margins.top + plotHeight / 2})`}>y</text>
      </svg>
      <div className="curve-fit-legend" aria-label="图例">
        <span><i className="curve-fit-swatch curve-fit-swatch-data" />实验数据</span>
        <span><i className="curve-fit-swatch curve-fit-swatch-line" />拟合曲线</span>
      </div>
    </div>
  );
});
