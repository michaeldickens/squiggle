import { forwardRef } from "react";

import { SqValue } from "@quri/squiggle-lang";

import { SqOutputResult } from "../../../../squiggle-lang/src/public/types.js";
import { CodeEditorHandle } from "../CodeEditor/index.js";
import { PartialPlaygroundSettings } from "../PlaygroundSettings.js";
import { SquiggleErrorAlert } from "../SquiggleErrorAlert.js";
import { SquiggleViewer } from "../SquiggleViewer/index.js";
import { SquiggleViewerHandle } from "../SquiggleViewer/ViewerProvider.js";
import { ViewerMode } from "./index.js";

type Props = {
  mode: ViewerMode;
  output: SqOutputResult;
  isRunning: boolean;
  editor?: CodeEditorHandle;
  playgroundSettings: PartialPlaygroundSettings;
};

export function modeToValue(
  mode: ViewerMode,
  output: SqOutputResult
): SqValue | undefined {
  if (!output.ok) {
    return;
  }
  const sqOutput = output.value;
  switch (mode) {
    case "Result":
      return sqOutput.result;
    case "Variables":
      return sqOutput.bindings.asValue();
    case "Imports":
      return sqOutput.imports.asValue();
    case "Exports":
      return sqOutput.exports.asValue();
    case "AST":
      return;
  }
  if (mode.tag === "CustomResultPath") {
    const rootValue =
      mode.value.root === "result"
        ? output.value.result
        : output.value.bindings.asValue();
    return rootValue.getSubvalueByPath(mode.value, () => undefined);
  }
}

export const ViewerBody = forwardRef<SquiggleViewerHandle, Props>(
  function ViewerBody(
    { output, mode, isRunning, editor, playgroundSettings },
    viewerRef
  ) {
    if (!output.ok) {
      return <SquiggleErrorAlert error={output.value} />;
    }

    const sqOutput = output.value;

    if (mode === "AST") {
      return (
        <pre className="text-xs">
          {JSON.stringify(sqOutput.bindings.asValue().context?.ast, null, 2)}
        </pre>
      );
    }

    const usedValue = modeToValue(mode, output);

    if (!usedValue) {
      return null;
    }

    return (
      <div className="relative">
        {isRunning && (
          // `opacity-0 squiggle-semi-appear` would be better, but won't work reliably until we move Squiggle evaluation to Web Workers
          <div className="absolute z-10 inset-0 bg-white opacity-50" />
        )}
        <SquiggleViewer
          ref={viewerRef}
          value={usedValue}
          editor={editor}
          {...playgroundSettings}
        />
      </div>
    );
  }
);
