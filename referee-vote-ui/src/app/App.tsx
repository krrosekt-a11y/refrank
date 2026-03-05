import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { hydrateFavoritesFromCloud } from "./lib/favorites";
import { hydrateMatchVotesFromCloud } from "./lib/matchVotes";
import { AuthProvider, useAuth } from "./auth/AuthProvider";

function AppRouter() {
  const { loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    void hydrateFavoritesFromCloud().catch(() => undefined);
    void hydrateMatchVotesFromCloud().catch(() => undefined);
  }, [loading]);

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
