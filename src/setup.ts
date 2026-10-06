// Installs the web implementations of the shared core's platform seams.
// Imported first in main.tsx as a side-effect import: ES imports are hoisted,
// so a plain statement in main.tsx would run after its sibling imports.
import { configureData } from "./lib/data";
import { fetchJson } from "./platform/data";

configureData(fetchJson);
