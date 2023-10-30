import { FC } from "react";

import { valueHasContext } from "../../lib/utility.js";
import { PlaygroundSettings } from "../PlaygroundSettings.js";
import { getWidget } from "../SquiggleViewer/getWidget.js";
import { SqValueResult } from "./index.js";

// Unlike ValueViewer/ValueWithContextViewer, this just renders the raw widget; TODO - better name?
export const ValueResultViewer: FC<{
  result: SqValueResult;
  settings: PlaygroundSettings;
}> = ({ result, settings }) => {
  if (result.ok) {
    const value = result.value;
    if (valueHasContext(value)) {
      return getWidget(value).render(settings);
    } else {
      return value.toString();
    }
  } else {
    return (
      <div className="text-sm text-red-800 text-opacity-70">
        {result.value.toString()}
      </div>
    );
  }
};
