import type { DailyClicks } from "../types/link";

type ClickTrendChartProps = {
  points: DailyClicks[];
};

const chartWidth = 720;
const chartHeight = 244;
const plot = {
  top: 22,
  right: 20,
  bottom: 52,
  left: 44,
};

const dayFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  timeZone: "UTC",
});

const fullDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const parseUtcDate = (date: string) => new Date(`${date}T00:00:00Z`);

export const ClickTrendChart = ({ points }: ClickTrendChartProps) => {
  const maxValue = Math.max(1, ...points.map((point) => point.clicks));
  const plotWidth = chartWidth - plot.left - plot.right;
  const plotHeight = chartHeight - plot.top - plot.bottom;
  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: plot.left + step * index,
    y: plot.top + plotHeight * (1 - point.clicks / maxValue),
  }));
  const linePath = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const baseline = plot.top + plotHeight;
  const areaPath = coordinates.length
    ? `${linePath} L ${coordinates.at(-1)?.x ?? plot.left} ${baseline} L ${plot.left} ${baseline} Z`
    : "";
  const hasClicks = points.some((point) => point.clicks > 0);

  return (
    <figure className="trend-chart">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-labelledby="click-chart-title click-chart-description"
      >
        <title id="click-chart-title">Clicks over the last seven days</title>
        <desc id="click-chart-description">
          {hasClicks
            ? `${points.reduce((total, point) => total + point.clicks, 0)} clicks across the displayed seven-day period.`
            : "No clicks were recorded during the displayed seven-day period."}
        </desc>

        {[0, 0.5, 1].map((ratio) => {
          const y = plot.top + plotHeight * ratio;
          const value = Math.round(maxValue * (1 - ratio));

          return (
            <g className="chart-grid-line" key={ratio}>
              <line x1={plot.left} x2={chartWidth - plot.right} y1={y} y2={y} />
              <text x={plot.left - 12} y={y + 4} textAnchor="end">
                {value}
              </text>
            </g>
          );
        })}

        {coordinates.length ? (
          <>
            <path className="chart-area" d={areaPath} />
            <path className="chart-line" d={linePath} />
          </>
        ) : null}

        {coordinates.map((point) => (
          <g className="chart-point" key={point.date}>
            <circle cx={point.x} cy={point.y} r="5">
              <title>
                {fullDateFormatter.format(parseUtcDate(point.date))}: {point.clicks}{" "}
                {point.clicks === 1 ? "click" : "clicks"}
              </title>
            </circle>
            <text
              className="chart-day-label"
              x={point.x}
              y={chartHeight - 20}
              textAnchor="middle"
            >
              {dayFormatter.format(parseUtcDate(point.date))}
            </text>
          </g>
        ))}
      </svg>

      <figcaption className="sr-only">
        <ol>
          {points.map((point) => (
            <li key={point.date}>
              {fullDateFormatter.format(parseUtcDate(point.date))}: {point.clicks}{" "}
              {point.clicks === 1 ? "click" : "clicks"}
            </li>
          ))}
        </ol>
      </figcaption>

      {!hasClicks ? (
        <p className="chart-empty">No redirect activity in this window yet.</p>
      ) : null}
    </figure>
  );
};
