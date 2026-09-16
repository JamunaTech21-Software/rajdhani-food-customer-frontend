import { createBrowserRouter } from "react-router";

import { ScaffoldPage } from "../pages/ScaffoldPage.jsx";

/**
 * Routes arrive with their screens, from RTPP-57 onward. This scaffold carries
 * one route so the shell, the theme boot and the image component are all
 * reachable and verifiable now rather than at the end of the phase.
 */
export const router = createBrowserRouter([{ path: "/", element: <ScaffoldPage /> }]);
