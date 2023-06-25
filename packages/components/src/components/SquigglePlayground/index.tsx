import { zodResolver } from "@hookform/resolvers/zod";
import { clsx } from "clsx";
import merge from "lodash/merge.js";
import React, {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FormProvider, useForm } from "react-hook-form";
import { ResizableBox } from "react-resizable";
import { z } from "zod";

import { Env } from "@quri/squiggle-lang";
import { AdjustmentsVerticalIcon, Bars3CenterLeftIcon, Button } from "@quri/ui";

import {
  useInitialWidth,
  useSquiggle,
  useUncontrolledCode,
} from "../../lib/hooks/index.js";
import { getErrors, getValueToRender, isMac } from "../../lib/utility.js";
import { CodeEditor, CodeEditorHandle } from "../CodeEditor.js";
import {
  PartialPlaygroundSettings,
  PlaygroundSettingsForm,
  defaultPlaygroundSettings,
  viewSettingsSchema,
  type PlaygroundSettings,
} from "../PlaygroundSettings.js";
import {
  SquiggleViewer,
  SquiggleViewerHandle,
} from "../SquiggleViewer/index.js";
import { SquiggleCodeProps } from "../types.js";
import { MenuItem } from "./MenuItem.js";
import { AutorunnerMenuItem } from "./RunControls/AutorunnerMenuItem.js";
import { RunMenuItem } from "./RunControls/RunMenuItem.js";
import { useRunnerState } from "./RunControls/useRunnerState.js";

type PlaygroundProps = // Playground can be either controlled (`code`) or uncontrolled (`defaultCode` + `onCodeChange`)
  SquiggleCodeProps &
    PartialPlaygroundSettings & {
      /* When settings change */
      onSettingsChange?(settings: PlaygroundSettings): void;
      /** Should we show the editor? */
      showEditor?: boolean;
      /** Allows to inject extra buttons, e.g. share button on the website, or save button in Squiggle Hub */
      renderExtraControls?: () => ReactNode;
      /** Height of the editor */
      height?: CSSProperties["height"];
    };

// Left panel ref is used for local settings modal positioning in ItemSettingsMenu.tsx
type PlaygroundContextShape = {
  getLeftPanelElement: () => HTMLDivElement | undefined;
};
export const PlaygroundContext = React.createContext<PlaygroundContextShape>({
  getLeftPanelElement: () => undefined,
});

export const SquigglePlayground: React.FC<PlaygroundProps> = (props) => {
  const {
    onSettingsChange,
    renderExtraControls,
    height = 500,
    showEditor = true,
  } = props;
  const [code, setCode] = useUncontrolledCode(props);
  const { ref: fullContainerRef, width: initialWidth } = useInitialWidth();

  const defaultValues: PlaygroundSettings = merge(
    {},
    defaultPlaygroundSettings,
    Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined))
  );

  type Tab = "CODE" | "SETTINGS";

  const [selectedTab, setSelectedTab] = useState<Tab>("CODE");

  const form = useForm({
    resolver: zodResolver(viewSettingsSchema),
    defaultValues,
    mode: "onChange",
  });

  const [settings, setSettings] = useState<z.infer<typeof viewSettingsSchema>>(
    () => form.getValues()
  );

  useEffect(() => {
    const submit = form.handleSubmit((data) => {
      setSettings(data);
      onSettingsChange?.(data);
    });
    const subscription = form.watch(() => submit());
    return () => subscription.unsubscribe();
  }, [form, onSettingsChange]);

  const environment: Env = useMemo(
    () => ({
      sampleCount: settings.renderingSettings.sampleCount,
      xyPointLength: settings.renderingSettings.xyPointLength,
    }),
    [
      settings.renderingSettings.sampleCount,
      settings.renderingSettings.xyPointLength,
    ]
  );

  const runnerState = useRunnerState(code);

  const [squiggleOutput, { project, isRunning, sourceId }] = useSquiggle({
    ...props,
    code: runnerState.renderedCode,
    executionId: runnerState.executionId,
    environment,
  });

  const errors = useMemo(() => {
    if (!squiggleOutput) {
      return [];
    }
    return getErrors(squiggleOutput.result);
  }, [squiggleOutput]);

  const editorRef = useRef<CodeEditorHandle>(null);
  const viewerRef = useRef<SquiggleViewerHandle>(null);

  const squiggleChart =
    runnerState.renderedCode === "" || !squiggleOutput ? null : (
      <div className="relative">
        {isRunning ? (
          <div className="absolute inset-0 bg-white opacity-0 animate-semi-appear" />
        ) : null}
        <SquiggleViewer
          {...settings}
          ref={viewerRef}
          localSettingsEnabled={true}
          result={getValueToRender(squiggleOutput)}
          editor={editorRef.current ?? undefined}
        />
      </div>
    );

  const leftPanelBody =
    selectedTab === "CODE" ? (
      <div data-testid="squiggle-editor">
        <CodeEditor
          ref={editorRef}
          value={code}
          errors={errors}
          project={project}
          sourceId={sourceId}
          showGutter={true}
          onChange={setCode}
          onViewValuePath={(ast) => viewerRef.current?.viewValuePath(ast)}
          onSubmit={runnerState.run}
        />
      </div>
    ) : selectedTab === "SETTINGS" ? (
      <div className="px-2 space-y-6">
        <div className="px-2 py-2">
          <div className="pb-4">
            <Button onClick={() => setSelectedTab("CODE")}>Back</Button>
          </div>
          <FormProvider {...form}>
            <PlaygroundSettingsForm />
          </FormProvider>
        </div>
      </div>
    ) : null;

  const leftPanelRef = useRef<HTMLDivElement | null>(null);

  const leftPanelHeader = (
    <div className="flex items-center h-8 bg-slate-50 border-b border-slate-200 overflow-hidden mb-1 px-5">
      <RunMenuItem {...runnerState} isRunning={isRunning} />
      <AutorunnerMenuItem {...runnerState} />
      <MenuItem
        onClick={() =>
          selectedTab !== "SETTINGS"
            ? setSelectedTab("SETTINGS")
            : setSelectedTab("CODE")
        }
        icon={AdjustmentsVerticalIcon}
        tooltipText="Configuration"
      />
      <MenuItem
        tooltipText={
          isMac() ? "Format Code (Option+Shift+f)" : "Format Code (Alt+Shift+f)"
        }
        icon={Bars3CenterLeftIcon}
        onClick={editorRef.current?.format}
      />
      {renderExtraControls?.()}
    </div>
  );

  const showTime = (executionTime) =>
    executionTime > 1000
      ? `${(executionTime / 1000).toFixed(2)}s`
      : `${executionTime}ms`;

  const playgroundWithEditor = (
    <div className="flex h-full items-stretch">
      <ResizableBox
        className={clsx("relative", !initialWidth && "w-1/2")}
        width={
          initialWidth === undefined
            ? (null as any) // we intentionally pass the invalid value to ResizableBox when initialWidth is not set yet
            : initialWidth / 2
        }
        axis="x"
        resizeHandles={["e"]}
        handle={(_, ref) => (
          <div
            ref={ref}
            // we don't use react-resizable original styles, it's easier to style this manually
            className="absolute top-0 h-full border-l border-slate-300 hover:border-blue-500 transition cursor-ew-resize"
            style={{ width: 5, right: -5 }}
          />
        )}
      >
        <div className="h-full flex flex-col" ref={leftPanelRef}>
          {leftPanelHeader}
          <div className="flex-1 grid place-content-stretch overflow-auto">
            {leftPanelBody}
          </div>
        </div>
      </ResizableBox>
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="mb-1 h-8 p-2 flex justify-end text-zinc-400 text-sm whitespace-nowrap">
          {isRunning
            ? "rendering..."
            : squiggleOutput
            ? `render #${squiggleOutput.executionId} in ${showTime(
                squiggleOutput.executionTime
              )}`
            : null}
        </div>
        <div
          className="flex-1 overflow-auto p-2"
          data-testid="playground-result"
        >
          {squiggleChart}
        </div>
      </div>
    </div>
  );

  const getLeftPanelElement = useCallback(() => {
    return leftPanelRef.current ?? undefined;
  }, []);

  return (
    <PlaygroundContext.Provider value={{ getLeftPanelElement }}>
      <div ref={fullContainerRef} style={{ height }}>
        {showEditor ? playgroundWithEditor : squiggleChart}
      </div>
    </PlaygroundContext.Provider>
  );
};
