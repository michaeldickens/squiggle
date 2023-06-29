import {
  ReactNode,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { SqValuePath } from "@quri/squiggle-lang";
import { Bars3CenterLeftIcon, Button } from "@quri/ui";

import {
  SquiggleOutput,
  useRunnerState,
  useSquiggle,
  useUncontrolledCode,
} from "../../../lib/hooks/index.js";
import { altKey, getErrors } from "../../../lib/utility.js";
import { CodeEditor, CodeEditorHandle } from "../../CodeEditor.js";
import { PlaygroundSettings } from "../../PlaygroundSettings.js";
import { AutorunnerMenuItem } from "./AutorunnerMenuItem.js";
import { MenuItem } from "./MenuItem.js";
import { RunMenuItem } from "./RunMenuItem.js";
import { SetttingsMenuItem } from "./SettingsMenuItem.js";

type Override = {
  render(props: {
    // Passing these through SettingsMenuItem props won't work correctly, because it would snapshot
    // its props at the moment when settings form was opened.
    settings: PlaygroundSettings;
    setSettings: (newSettings: PlaygroundSettings) => void;
  }): ReactNode;
  title: string;
};

function useOverrideContent() {
  const [overrideState, setOverrideState] = useState<Override | undefined>(
    undefined
  );

  const overrideHandle = useMemo(() => {
    return {
      override: (value: Override) => {
        setOverrideState(value);
      },
      back: () => setOverrideState(undefined),
    };
  }, [setOverrideState]);

  return {
    overrideState,
    overrideHandle,
  };
}

export type OverrideHandle = ReturnType<
  typeof useOverrideContent
>["overrideHandle"];

export type RenderExtraControls = () => ReactNode;

type Props = {
  defaultCode?: string;
  onCodeChange?(code: string): void;
  settings: PlaygroundSettings;
  onSettingsChange(settings: PlaygroundSettings): void;
  onOutputChange(output: {
    output: SquiggleOutput | undefined;
    isRunning: boolean;
  }): void;
  renderExtraControls?: RenderExtraControls;
  onViewValuePath?: (path: SqValuePath) => void;
};

// for interactions with this component from outside
export type LeftPlaygroundPanelHandle = {
  getEditor(): CodeEditorHandle | null; // used by "find in editor" feature
  getLeftPanelElement(): HTMLDivElement | null; // used by local settings modal window positioning
};

export const LeftPlaygroundPanel = forwardRef<LeftPlaygroundPanelHandle, Props>(
  function LeftPanel(props, ref) {
    const { code, setCode, defaultCode } = useUncontrolledCode({
      defaultCode: props.defaultCode,
      onCodeChange: props.onCodeChange,
    });

    const runnerState = useRunnerState(code);

    const [squiggleOutput, { project, isRunning, sourceId }] = useSquiggle({
      code: runnerState.renderedCode,
      executionId: runnerState.executionId,
      environment: props.settings.environment,
    });

    const { onOutputChange } = props;
    useEffect(() => {
      onOutputChange({
        output: squiggleOutput,
        isRunning,
      });
    }, [onOutputChange, squiggleOutput, isRunning]);

    const errors = useMemo(() => {
      if (!squiggleOutput) {
        return [];
      }
      return getErrors(squiggleOutput.result);
    }, [squiggleOutput]);

    const editorRef = useRef<CodeEditorHandle>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      getEditor: () => editorRef.current,
      getLeftPanelElement: () => containerRef.current,
    }));

    const { overrideState, overrideHandle } = useOverrideContent();

    const leftPanelBody = overrideState ? (
      <div className="px-4 py-2">
        <div className="pb-4">
          <Button onClick={() => overrideHandle.back()}>Back</Button>
        </div>
        {overrideState.render({
          settings: props.settings,
          setSettings: props.onSettingsChange,
        })}
      </div>
    ) : (
      <div data-testid="squiggle-editor">
        <CodeEditor
          ref={editorRef}
          defaultValue={defaultCode}
          errors={errors}
          project={project}
          sourceId={sourceId}
          showGutter={true}
          onChange={setCode}
          onViewValuePath={props.onViewValuePath}
          onSubmit={runnerState.run}
        />
      </div>
    );

    const leftPanelHeader = (
      <div className="flex justify-between h-8 bg-slate-50 border-b border-slate-200 overflow-hidden mb-1 px-4">
        <div className="flex">
          <RunMenuItem {...runnerState} isRunning={isRunning} />
          <AutorunnerMenuItem {...runnerState} />
          <SetttingsMenuItem overrideHandle={overrideHandle} />
          <MenuItem
            tooltipText={`Format Code (${altKey()}+Shift+f)`}
            icon={Bars3CenterLeftIcon}
            onClick={editorRef.current?.format}
          />
        </div>
        <div className="flex items-center">{props.renderExtraControls?.()}</div>
      </div>
    );

    return (
      <div className="h-full flex flex-col" ref={containerRef}>
        {leftPanelHeader}
        <div className="flex-1 grid place-content-stretch overflow-auto">
          {leftPanelBody}
        </div>
      </div>
    );
  }
);
