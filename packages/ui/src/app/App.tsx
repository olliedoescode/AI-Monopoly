import { loadRegistries } from "@ai-monopoly/data";
import { createInitialState } from "@ai-monopoly/engine";
import { useMemo } from "react";
import { TownCanvas } from "../canvas/TownCanvas";
import { Hud } from "../panels/Hud";

export function App() {
  const state = useMemo(() => {
    const registries = loadRegistries();
    return createInitialState({ seed: 1, registries });
  }, []);

  return (
    <div className="app">
      <TownCanvas />
      <Hud state={state} />
    </div>
  );
}
