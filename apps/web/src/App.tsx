import { Route, Routes } from "react-router";

import { AppLayout } from "./components/AppLayout";
import { LinkDetailPage } from "./pages/LinkDetailPage";
import { LinksPage } from "./pages/LinksPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OverviewPage } from "./pages/OverviewPage";

export const App = () => (
  <Routes>
    <Route element={<AppLayout />}>
      <Route index element={<OverviewPage />} />
      <Route path="links" element={<LinksPage />} />
      <Route path="links/:slug" element={<LinkDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
