import merge from "lodash/merge.js";
import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { SqLinker, SqProject } from "@quri/squiggle-lang";
import { RefreshIcon } from "@quri/ui";

import { useSquiggleRunner } from "../../lib/hooks/useSquiggleRunner.js";
import { useUncontrolledCode } from "../../lib/hooks/useUncontrolledCode.js";
import {
  defaultPlaygroundSettings,
  PartialPlaygroundSettings,
  type PlaygroundSettings,
} from "../PlaygroundSettings.js";
import { SquiggleOutputViewer } from "../SquiggleOutputViewer/index.js";
import { SquiggleViewerHandle } from "../SquiggleViewer/ViewerProvider.js";
import {
  LeftPlaygroundPanel,
  LeftPlaygroundPanelHandle,
} from "./LeftPlaygroundPanel/index.js";
import { ResizableTwoPanelLayout } from "./ResizableTwoPanelLayout.js";

export type ModelExport = {
  variableName: string;
  variableType: string;
  title?: string;
  docstring: string;
};

/*
 * We don't support `project` or `continues` in the playground.
 * First, because playground will support multi-file mode by itself.
 * Second, because environment is configurable through playground settings and it should match the project.getEnvironment(), so this component owns the project to guarantee that.
 */
export type SquigglePlaygroundProps = {
  /*
   * Playground code is not reactive, because Codemirror editor is stateful and it would be hard/impossible to support code updates.
   * For example, it's not clear what we could do with the cursor position or selection if this prop is changed.
   * So updates to it are completely ignored.
   */
  defaultCode?: string;
  sourceId?: string;
  linker?: SqLinker;
  onCodeChange?(code: string): void;
  onExportsChange?(exports: ModelExport[]): void;
  /* When settings change */
  onSettingsChange?(settings: PlaygroundSettings): void;
  /* Height of the playground */
  height?: CSSProperties["height"];
} & Pick<
  Parameters<typeof LeftPlaygroundPanel>[0],
  | "renderExtraControls"
  | "renderExtraDropdownItems"
  | "renderExtraModal"
  | "renderImportTooltip"
> &
  PartialPlaygroundSettings;

// Left panel ref is used for local settings modal positioning in ItemSettingsMenu.tsx
type PlaygroundContextShape = {
  getLeftPanelElement: () => HTMLDivElement | undefined;
};
export const PlaygroundContext = React.createContext<PlaygroundContextShape>({
  getLeftPanelElement: () => undefined,
});

export const SquigglePlayground: React.FC<SquigglePlaygroundProps> = (
  props
) => {
  const {
    defaultCode,
    linker,
    onCodeChange,
    onExportsChange,
    onSettingsChange,
    renderExtraControls,
    renderExtraDropdownItems,
    renderExtraModal,
    renderImportTooltip,
    height = 500,
    ...defaultSettings
  } = props;

  // `settings` are owned by SquigglePlayground.
  // This can cause some unnecessary renders (e.g. settings form), but most heavy playground subcomponents
  // should rerender on settings changes (e.g. right panel), so that's fine.
  const [settings, setSettings] = useState(
    () =>
      merge(
        {},
        defaultPlaygroundSettings,
        Object.fromEntries(
          Object.entries(defaultSettings).filter(([, v]) => v !== undefined)
        )
      ) as PlaygroundSettings
  );
  const handleSettingsChange = useCallback(
    (newSettings: PlaygroundSettings) => {
      setSettings(newSettings);
      onSettingsChange?.(newSettings);
    },
    [onSettingsChange]
  );

  const [project] = useState(() => {
    // not reactive on `linker` changes; TODO?
    return new SqProject({ linker });
  });

  const { code, setCode } = useUncontrolledCode({
    defaultCode: defaultCode,
    onCodeChange: onCodeChange,
  });

  const {
    squiggleOutput,
    mode,
    setMode,
    isRunning,
    sourceId: _sourceId,
    autorunMode,
    setAutorunMode,
    run,
  } = useSquiggleRunner({ project, code });

  useEffect(() => {
    project.setEnvironment(settings.environment);

    function invalidate() {
      if (autorunMode) {
        run(); // mark output as stale but don't re-run if autorun is disabled; useful on environment changes, triggered in <SquigglePlayground> code
      }
    }
    invalidate();
  }, [project, settings.environment, autorunMode]); //Don't add runnerState here, it will cause infinite loop

  useEffect(() => {
    const _output = squiggleOutput?.output;
    if (_output && _output.ok) {
      const exports = _output.value.exports;
      const _exports: ModelExport[] = exports.entries().map((e) => ({
        variableName: e[0],
        variableType: e[1].tag,
        title: e[1].title(),
        docstring: e[1].context?.docstring() || "",
      }));
      onExportsChange && onExportsChange(_exports);
    } else {
      onExportsChange && onExportsChange([]);
    }
  }, [squiggleOutput, onExportsChange]);

  const leftPanelRef = useRef<LeftPlaygroundPanelHandle>(null);
  const rightPanelRef = useRef<SquiggleViewerHandle>(null);

  const getLeftPanelElement = useCallback(
    () => leftPanelRef.current?.getLeftPanelElement() ?? undefined,
    []
  );
  const renderLeft = () => (
    <LeftPlaygroundPanel
      project={project}
      code={code}
      setCode={setCode}
      sourceId={_sourceId}
      isRunning={isRunning}
      squiggleOutput={squiggleOutput}
      settings={settings}
      onSettingsChange={handleSettingsChange}
      renderExtraControls={renderExtraControls}
      renderExtraDropdownItems={renderExtraDropdownItems}
      renderExtraModal={renderExtraModal}
      onViewValuePath={(path) => rightPanelRef.current?.viewValuePath(path)}
      renderImportTooltip={renderImportTooltip}
      ref={leftPanelRef}
      autorunMode={autorunMode}
      setAutorunMode={setAutorunMode}
      run={run}
    />
  );

  const renderRight = () =>
    squiggleOutput ? (
      <SquiggleOutputViewer
        squiggleOutput={squiggleOutput}
        isRunning={isRunning}
        // FIXME - this will cause viewer to be rendered twice on initial render
        editor={leftPanelRef.current?.getEditor() ?? undefined}
        ref={rightPanelRef}
        mode={mode}
        setMode={setMode}
        {...settings}
      />
    ) : (
      <div className="grid place-items-center h-full">
        <RefreshIcon className="animate-spin text-slate-400" size={24} />
      </div>
    );

  return (
    <PlaygroundContext.Provider value={{ getLeftPanelElement }}>
      <ResizableTwoPanelLayout
        height={height}
        renderLeft={renderLeft}
        renderRight={renderRight}
      />
    </PlaygroundContext.Provider>
  );
};
