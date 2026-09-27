import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { useGame } from "./game/store";
import { DIRS } from "./game/grid";

// Geliştirici konsolu / otomatik testler için oyun deposu (hile değil, araç): window.PixelOrbit.getState()
(window as unknown as { PixelOrbit: typeof useGame; PixelOrbitDirs: typeof DIRS }).PixelOrbit = useGame;
(window as unknown as { PixelOrbitDirs: typeof DIRS }).PixelOrbitDirs = DIRS;

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
