import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    scrollRestorationBehavior: 'instant',
    // Let the router reset scroll only after the destination has rendered.
    defaultViewTransition: false,
    defaultHashScrollIntoView: { behavior: 'instant', block: 'start' },
    defaultPreloadStaleTime: 0,
  });

  return router;
};
