import { ArrowDownRight, Gauge, ShieldCheck } from "lucide-react";

import { ShortenForm } from "../components/ShortenForm";

export const CreatePage = () => (
  <section className="create-page" aria-labelledby="create-page-title">
    <div className="create-page-intro">
      <span className="section-index">02 / new route</span>
      <h1 id="create-page-title">
        One destination.
        <br />
        A cleaner <span>route.</span>
      </h1>
      <p>
        Turn a long destination into a short route you can share, pause, and
        measure from one workspace.
      </p>

      <ul className="create-notes" aria-label="What happens next">
        <li>
          <ShieldCheck aria-hidden="true" />
          <span>
            <strong>Validated</strong>
            Only complete HTTP and HTTPS destinations are accepted.
          </span>
        </li>
        <li>
          <Gauge aria-hidden="true" />
          <span>
            <strong>Fast by default</strong>
            Redirects use the cache while click events stay measurable.
          </span>
        </li>
      </ul>

      <ArrowDownRight className="create-page-cue" aria-hidden="true" />
    </div>

    <ShortenForm />
  </section>
);
