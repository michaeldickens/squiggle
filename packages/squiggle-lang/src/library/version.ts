import { ImmutableMap } from "../utility/immutableMap.js";
import { Value, vString } from "../value/index.js";

// automatically updated on release by ops/ patch-js utils
const VERSION = "0.9.3-0";
export function makeVersionConstant(): ImmutableMap<string, Value> {
  return ImmutableMap([["System.version", vString(VERSION)]]);
}
