import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import { bootstrapSite } from "./lib/bootstrap.js";
import "./index.css";

// Before createRoot, not inside an effect: an effect runs after first paint, so
// the request would not even have left the browser by the time the page is on
// screen. Started here, it is in flight while React mounts.
bootstrapSite();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
