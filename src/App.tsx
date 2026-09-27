import Scene from "./three/Scene";
import HUD from "./ui/HUD";
import BuildMenu from "./ui/BuildMenu";
import Missions from "./ui/Missions";
import Toasts from "./ui/Toasts";
import Menu from "./ui/Menu";
import { useGame } from "./game/store";

export default function App() {
  const screen = useGame((s) => s.screen);
  return (
    <div className="relative h-full w-full">
      <Scene />
      {screen === "game" && (<><HUD /><Missions /><BuildMenu /><Toasts /></>)}
      {screen === "menu" && <Menu />}
    </div>
  );
}
