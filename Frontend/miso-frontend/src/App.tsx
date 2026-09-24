import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { FullPageLoader } from "./components/ui/FullPageLoader";
import { PublicOnly, RequireAuth } from "./routes/guards";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const ChatLayout = lazy(() => import("./layouts/ChatLayout"));
const ChatHome = lazy(() => import("./pages/ChatHome"));
const ConversationPage = lazy(() => import("./pages/ConversationPage"));

const withSuspense = (node: React.ReactNode) => <Suspense fallback={<FullPageLoader label="One moment" />}>{node}</Suspense>;

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: withSuspense(<PublicOnly><AuthPage /></PublicOnly>) },
  { path: "/register", element: withSuspense(<PublicOnly><AuthPage /></PublicOnly>) },
  {
    path: "/chat",
    element: withSuspense(<RequireAuth><ChatLayout /></RequireAuth>),
    children: [
      { index: true, element: withSuspense(<ChatHome />) },
      { path: ":id", element: withSuspense(<ConversationPage />) },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
