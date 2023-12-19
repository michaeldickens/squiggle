import { FC } from "react";

import { SqBoxedValue } from "@quri/squiggle-lang";

import { SqValueWithContext } from "../../lib/utility.js";
import { widgetRegistry } from "../../widgets/registry.js";

export const SquiggleValuePreview: FC<{
  value: SqValueWithContext;
  boxed?: SqBoxedValue;
}> = ({ value, boxed }) => {
  const widget = widgetRegistry.widgets.get(value.tag);
  if (!widget?.Preview) {
    return null;
  }

  return <widget.Preview value={value} boxed={boxed} />;
};
