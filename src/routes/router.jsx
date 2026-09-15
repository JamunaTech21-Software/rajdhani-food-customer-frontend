import { createBrowserRouter } from "react-router";
import Randompage from "../Component/Randompage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Randompage></Randompage>,
  },
]);
