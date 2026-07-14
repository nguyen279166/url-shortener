import { Link } from "react-router";

export const NotFoundPage = () => (
  <section className="not-found">
    <span className="section-index">404 / route missing</span>
    <h1>This path has no signal.</h1>
    <p>The page you requested is not part of this workspace.</p>
    <Link to="/">Return to overview</Link>
  </section>
);
