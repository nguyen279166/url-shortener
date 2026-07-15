import { Route, Routes } from "react-router";

import { AppLayout } from "./components/AppLayout";
import { RequireAuth } from "./components/RequireAuth";
import { LinkDetailPage } from "./pages/LinkDetailPage";
import { LinksPage } from "./pages/LinksPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { OverviewPage } from "./pages/OverviewPage";
import { CreatePage } from "./pages/CreatePage";

export const App = () => (
  <Routes>
    <Route path="login" element={<LoginPage />} />
    <Route element={<RequireAuth />}>
      <Route element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="new" element={<CreatePage />} />
        <Route path="links" element={<LinksPage />} />
        <Route path="links/:slug" element={<LinkDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>
  </Routes>
);
