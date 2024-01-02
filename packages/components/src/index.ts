import {
  scaleLinear,
  scaleLog,
  scalePow,
  scaleSymlog,
} from "./lib/d3/patchedScales.js";

export { SqProject } from "@quri/squiggle-lang";

export { NumberShower } from "./components/NumberShower.js";
export {
  SquiggleChart,
  type SquiggleChartProps,
} from "./components/SquiggleChart.js";
export { SquiggleEditor } from "./components/SquiggleEditor.js";
export {
  SquigglePlayground,
  type SquigglePlaygroundProps,
} from "./components/SquigglePlayground/index.js";
export { SquiggleViewer } from "./components/SquiggleViewer/index.js";
export { ToolbarItem as PlaygroundToolbarItem } from "./components/ui/PanelWithToolbar/ToolbarItem.js";

export { SquiggleErrorAlert } from "./components/SquiggleErrorAlert.js";

export { RelativeValueCell } from "./widgets/PlotWidget/RelativeValuesGridChart/RelativeValueCell.js";

// for use in relative values
export {
  type DrawContext,
  useCanvas,
  useCanvasCursor,
} from "./lib/hooks/index.js";

export { drawAxes } from "./lib/draw/index.js";

export const d3Extended = {
  scaleLinear,
  scaleLog,
  scaleSymlog,
  scalePow,
};
