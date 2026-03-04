import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { hydrateFavoritesFromCloud } from "./lib/favorites";
import { hydrateMatchVotesFromCloud } from "./lib/matchVotes";

export default function App() {
  useEffect(() => {
    void hydrateFavoritesFromCloud().catch(() => undefined);
    void hydrateMatchVotesFromCloud().catch(() => undefined);
  }, []);

  return <RouterProvider router={router} />;
}
