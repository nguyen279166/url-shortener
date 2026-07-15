import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Link2,
  MousePointerClick,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Link } from "react-router";

import { ClickTrendChart } from "../components/ClickTrendChart";
import { DashboardLinkList } from "../components/DashboardLinkList";
import { getDashboard } from "../lib/api";
import type { DashboardData } from "../types/link";

const numberFormatter = new Intl.NumberFormat("en");

const DashboardSkeleton = () => (
  <div
    className="dashboard-skeleton"
    role="status"
    aria-label="Loading dashboard"
  >
    <span className="sr-only">Loading dashboard analytics</span>
    <div className="dashboard-skeleton-intro" aria-hidden="true" />
    <div className="dashboard-skeleton-metrics" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} />
      ))}
    </div>
    <div className="dashboard-skeleton-panels" aria-hidden="true">
      <div />
      <div />
    </div>
  </div>
);

export const OverviewPage = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadDashboard = async () => {
    setIsRefreshing(true);
    setLoadError("");

    try {
      setDashboard(await getDashboard());
    } catch {
      setLoadError(
        "Dashboard data could not be loaded. Check the API connection and try again.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let shouldIgnore = false;

    void getDashboard()
      .then((data) => {
        if (!shouldIgnore) {
          setDashboard(data);
        }
      })
      .catch(() => {
        if (!shouldIgnore) {
          setLoadError(
            "Dashboard data could not be loaded. Check the API connection and try again.",
          );
        }
      })
      .finally(() => {
        if (!shouldIgnore) {
          setIsLoading(false);
        }
      });

    return () => {
      shouldIgnore = true;
    };
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!dashboard) {
    return (
      <section className="dashboard-failure" role="alert">
        <Activity aria-hidden="true" />
        <span className="section-index">Dashboard unavailable</span>
        <h1>We lost the signal.</h1>
        <p>{loadError}</p>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={isRefreshing}
        >
          <RefreshCw className={isRefreshing ? "spin" : ""} aria-hidden="true" />
          {isRefreshing ? "Retrying" : "Retry dashboard"}
        </button>
      </section>
    );
  }

  const inactiveLinks = Math.max(0, dashboard.totalLinks - dashboard.activeLinks);
  const metrics = [
    {
      label: "Total links",
      value: dashboard.totalLinks,
      note:
        dashboard.totalLinks === 1
          ? "1 route in this workspace"
          : `${dashboard.totalLinks} routes in this workspace`,
      icon: Link2,
    },
    {
      label: "Active links",
      value: dashboard.activeLinks,
      note:
        inactiveLinks === 0
          ? "Every route is ready"
          : `${inactiveLinks} ${inactiveLinks === 1 ? "route" : "routes"} paused or expired`,
      icon: Zap,
    },
    {
      label: "Total clicks",
      value: dashboard.totalClicks,
      note: "All-time redirect volume",
      icon: MousePointerClick,
    },
    {
      label: "Last 7 days",
      value: dashboard.clicksLast7Days,
      note: "Seven UTC calendar days",
      icon: BarChart3,
    },
  ];

  return (
    <div className="dashboard-page">
      <section className="dashboard-intro" aria-labelledby="dashboard-title">
        <div>
          <span className="section-index">01 / workspace signal</span>
          <h1 id="dashboard-title">
            Redirects,
            <br />
            made <span>visible.</span>
          </h1>
          <p>
            Your link operation at a glance: current inventory, redirect volume,
            and the routes carrying the most traffic.
          </p>
        </div>

        <div className="dashboard-intro-actions">
          <Link className="dashboard-primary-action" to="/new">
            New link
            <ArrowRight aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={isRefreshing}
          >
            <RefreshCw className={isRefreshing ? "spin" : ""} aria-hidden="true" />
            {isRefreshing ? "Refreshing" : "Refresh data"}
          </button>
        </div>
      </section>

      {loadError ? (
        <div className="dashboard-inline-error" role="alert">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Retrying" : "Try again"}
          </button>
        </div>
      ) : null}

      <section className="dashboard-metrics" aria-label="Workspace metrics">
        {metrics.map(({ label, value, note, icon: Icon }, index) => (
          <article key={label}>
            <div className="metric-heading">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <Icon aria-hidden="true" />
            </div>
            <p>{label}</p>
            <strong>{numberFormatter.format(value)}</strong>
            <span>{note}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-analysis" aria-label="Redirect analytics">
        <article className="dashboard-panel dashboard-panel--trend">
          <header className="dashboard-panel-heading">
            <div>
              <span className="section-index">02 / traffic trace</span>
              <h2>Click velocity</h2>
            </div>
            <p>
              <strong>{numberFormatter.format(dashboard.clicksLast7Days)}</strong>
              <span>clicks / 7 days</span>
            </p>
          </header>
          <ClickTrendChart points={dashboard.dailyClicks} />
        </article>

        <article className="dashboard-panel dashboard-panel--top">
          <header className="dashboard-panel-heading">
            <div>
              <span className="section-index">03 / route leaders</span>
              <h2>Top links</h2>
            </div>
            <Link to="/links" aria-label="View all links">
              All links
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>
          <DashboardLinkList links={dashboard.topLinks} variant="top" />
        </article>
      </section>

      <section className="dashboard-recent" aria-labelledby="recent-links-title">
        <header className="dashboard-panel-heading">
          <div>
            <span className="section-index">04 / latest inventory</span>
            <h2 id="recent-links-title">Recent links</h2>
          </div>
          <Link to="/links">
            Manage routes
            <ArrowRight aria-hidden="true" />
          </Link>
        </header>
        <DashboardLinkList links={dashboard.recentLinks} variant="recent" />
      </section>
    </div>
  );
};
