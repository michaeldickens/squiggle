import { makeDefinition } from "../library/registry/fnDefinition.js";
import { frNumber } from "../library/registry/frTypes.js";
import { FnFactory } from "../library/registry/helpers.js";
import { vNumber } from "../value/index.js";

const maker = new FnFactory({
  nameSpace: "",
  requiresNamespace: false,
});

const makeUnitFn = (
  shortName: string,
  fullName: string,
  multiplier: number
) => {
  return maker.make({
    output: "Number",
    name: "fromUnit_" + shortName,
    description: `Unit conversion from ${fullName}.`,
    examples: [`3${shortName} // ${3 * multiplier}`],
    isUnit: true,
    definitions: [
      makeDefinition([frNumber], frNumber, ([x]) => vNumber(x * multiplier)),
    ],
  });
};

export const library = [
  makeUnitFn("n", "nano", 1e-9),
  makeUnitFn("m", "mili", 1e-3),
  makeUnitFn("%", "percent", 1e-2),
  makeUnitFn("k", "kilo", 1e3),
  makeUnitFn("M", "mega", 1e6),
  makeUnitFn("B", "billion", 1e9),
  makeUnitFn("G", "giga", 1e9),
  makeUnitFn("T", "tera", 1e12),
  makeUnitFn("P", "peta", 1e15),
];
