import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { getStoredTheme, applyTheme } from "./lib/theme";

applyTheme(getStoredTheme());

createRoot(document.getElementById("root")!).render(<App />);
