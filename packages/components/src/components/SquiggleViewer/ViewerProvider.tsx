import merge from "lodash/merge.js";
import {
  createContext,
  FC,
  MutableRefObject,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SqValue, SqValuePath } from "@quri/squiggle-lang";

import { useForceUpdate } from "../../lib/hooks/useForceUpdate.js";
import { CalculatorState } from "../../widgets/CalculatorWidget/types.js";
import { CodeEditorHandle } from "../CodeEditor/index.js";
import {
  defaultPlaygroundSettings,
  PartialPlaygroundSettings,
  PlaygroundSettings,
} from "../PlaygroundSettings.js";
import {
  getChildrenValues,
  pathAsString,
  topLevelBindingsName,
} from "./utils.js";

type ItemHandle = {
  element: HTMLDivElement;
  forceUpdate: () => void;
};

type LocalItemState = {
  collapsed: boolean;
  calculator?: CalculatorState;
  settings: Pick<
    PartialPlaygroundSettings,
    "distributionChartSettings" | "functionChartSettings"
  >;
};

class ItemStore {
  state: Record<string, LocalItemState> = {};

  constructor({
    beginWithVariablesCollapsed,
  }: {
    beginWithVariablesCollapsed?: boolean;
  }) {
    if (beginWithVariablesCollapsed) {
      this.state = {
        [topLevelBindingsName]: { collapsed: true, settings: {} },
      };
    }
  }

  setState(
    path: SqValuePath,
    fn: (localItemState: LocalItemState) => LocalItemState
  ): void {
    const pathString = pathAsString(path);
    const newSettings = fn(this.state[pathString] || defaultLocalItemState);
    this.state[pathString] = newSettings;
  }

  getState(path: SqValuePath): LocalItemState {
    return this.state[pathAsString(path)] || defaultLocalItemState;
  }
}

type TypedAction<Type extends string, Payload = undefined> = {
  type: Type;
} & (Payload extends undefined
  ? { payload?: undefined }
  : { payload: Payload });

export type Action =
  | TypedAction<
      "SET_LOCAL_ITEM_STATE",
      {
        path: SqValuePath;
        value: LocalItemState;
      }
    >
  | TypedAction<"FOCUS", SqValuePath>
  | TypedAction<"UNFOCUS">
  | TypedAction<"TOGGLE_COLLAPSED", SqValuePath>
  | TypedAction<
      "SET_COLLAPSED",
      {
        path: SqValuePath;
        value: boolean;
      }
    >
  | TypedAction<"COLLAPSE_CHILDREN", SqValue>
  | TypedAction<"SCROLL_TO_PATH", { path: SqValuePath }>
  | TypedAction<"FORCE_UPDATE", { path: SqValuePath }>
  | TypedAction<
      "REGISTER_ITEM_HANDLE",
      {
        path: SqValuePath;
        handle: ItemHandle;
      }
    >
  | TypedAction<
      "UNREGISTER_ITEM_HANDLE",
      {
        path: SqValuePath;
      }
    >
  | TypedAction<
      "CALCULATOR_UPDATE",
      {
        path: SqValuePath;
        calculator: CalculatorState;
      }
    >;

export type ViewProviderDispatch = (action: Action) => void;

type ViewerContextShape = {
  // Note that we don't store localItemState themselves in the context (that would cause rerenders of the entire tree on each settings update).
  // Instead, we keep localItemState in local state and notify the global context via setLocalItemState to pass them down the component tree again if it got rebuilt from scratch.
  // See ./SquiggleViewer.tsx and ./ValueWithContextViewer.tsx for other implementation details on this.
  globalSettings: PlaygroundSettings;
  getLocalItemState({ path }: { path: SqValuePath }): LocalItemState;
  getCalculator({ path }: { path: SqValuePath }): CalculatorState | undefined;
  focused?: SqValuePath;
  editor?: CodeEditorHandle;
  dispatch(action: Action): void;
};

export const ViewerContext = createContext<ViewerContextShape>({
  globalSettings: defaultPlaygroundSettings,
  getLocalItemState: () => ({ collapsed: false, settings: {} }),
  getCalculator: () => undefined,
  focused: undefined,
  editor: undefined,
  dispatch() {},
});

export function useViewerContext() {
  return useContext(ViewerContext);
}

// `<ValueWithContextViewer>` calls this hook to register its handle in `<ViewerProvider>`.
// This allows us to do two things later:
// 1. Implement `SCROLL_TO_PATH` action.
// 2. Re-render individual item viewers on demand, for example on "Collapse Children" menu action.
export function useRegisterAsItemViewer(path: SqValuePath) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { dispatch } = useViewerContext();

  /**
   * Since `ViewerContext` doesn't store settings, this component won't rerender when `setSettings` is called.
   * So we use `forceUpdate` to force rerendering.
   * (This function is not used directly in this component. Instead, it's passed to `<ViewerProvider>` to be called when necessary, sometimes from other components.)
   */
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    dispatch({
      type: "REGISTER_ITEM_HANDLE",
      payload: { path, handle: { element, forceUpdate } },
    });

    return () => {
      dispatch({
        type: "UNREGISTER_ITEM_HANDLE",
        payload: { path },
      });
    };
  });

  return ref;
}

export function useSetLocalItemState() {
  const { dispatch } = useViewerContext();
  return (path: SqValuePath, value: LocalItemState) => {
    dispatch({
      type: "SET_LOCAL_ITEM_STATE",
      payload: { path, value },
    });
  };
}

export function useToggleCollapsed() {
  const { dispatch } = useViewerContext();
  return (path: SqValuePath) => {
    dispatch({
      type: "TOGGLE_COLLAPSED",
      payload: path,
    });
  };
}

export function useSetCollapsed() {
  const { dispatch } = useViewerContext();
  return (path: SqValuePath, isCollapsed: boolean) => {
    dispatch({
      type: "SET_COLLAPSED",
      payload: { path, value: isCollapsed },
    });
  };
}

export function useResetStateSettings() {
  const { dispatch, getLocalItemState } = useViewerContext();
  return (path: SqValuePath) => {
    const localState = getLocalItemState({ path });
    dispatch({
      type: "SET_LOCAL_ITEM_STATE",
      payload: {
        path,
        value: {
          ...localState,
          settings: {},
        },
      },
    });
  };
}

export function useHasLocalSettings(path: SqValuePath) {
  const { getLocalItemState } = useViewerContext();
  const localState = getLocalItemState({ path });
  return Boolean(
    localState.settings.distributionChartSettings ||
      localState.settings.functionChartSettings
  );
}

export function useFocus() {
  const { dispatch } = useViewerContext();
  return (path: SqValuePath) => {
    dispatch({
      type: "FOCUS",
      payload: path,
    });
  };
}

export function useUnfocus() {
  const { dispatch } = useViewerContext();
  return () => dispatch({ type: "UNFOCUS" });
}

export function useCollapseChildren() {
  const { dispatch } = useViewerContext();
  return useCallback(
    (value: SqValue) => {
      dispatch({
        type: "COLLAPSE_CHILDREN",
        payload: value,
      });
    },
    [dispatch]
  );
}

export function useIsFocused(path: SqValuePath) {
  const { focused } = useViewerContext();
  if (!focused) {
    return false;
  } else {
    return pathAsString(focused) === pathAsString(path);
  }
}

export function useMergedSettings(path: SqValuePath) {
  const { getLocalItemState, globalSettings } = useViewerContext();

  const localItemState = getLocalItemState({ path });

  const result: PlaygroundSettings = useMemo(
    () => merge({}, globalSettings, localItemState.settings),
    [globalSettings, localItemState.settings]
  );
  return result;
}

const defaultLocalItemState: LocalItemState = {
  collapsed: false,
  settings: {},
};

// React doesn't allow initializer functions in `useRef`.
// Simplified trick from https://github.com/facebook/react/issues/14490#issuecomment-1587704033
function useLazyRef<T>(fn: () => T) {
  const ref = useRef<T>();
  if (ref.current === undefined) {
    ref.current = fn();
  }
  return ref as MutableRefObject<T>; // guaranteed to be defined
}

export const ViewerProvider: FC<
  PropsWithChildren<{
    partialPlaygroundSettings: PartialPlaygroundSettings;
    editor?: CodeEditorHandle;
    beginWithVariablesCollapsed?: boolean;
    rootPathOverride?: SqValuePath;
  }>
> = ({
  partialPlaygroundSettings,
  editor,
  beginWithVariablesCollapsed,
  rootPathOverride,
  children,
}) => {
  // Can't store settings in the state because we don't want to rerender the entire tree on every change.
  const itemStoreRef = useLazyRef<ItemStore>(
    () => new ItemStore({ beginWithVariablesCollapsed })
  );

  // TODO - merge this with localItemStateStoreRef?
  const itemHandlesStoreRef = useRef<{ [k: string]: ItemHandle }>({});

  const [focused, setFocused] = useState<SqValuePath | undefined>(
    rootPathOverride
  );

  const globalSettings = useMemo(() => {
    return merge({}, defaultPlaygroundSettings, partialPlaygroundSettings);
  }, [partialPlaygroundSettings]);

  const getLocalItemState = useCallback(({ path }: { path: SqValuePath }) => {
    return itemStoreRef.current.getState(path);
  }, []);

  const getCalculator = useCallback(({ path }: { path: SqValuePath }) => {
    return itemStoreRef.current.getState(path)?.calculator;
  }, []);

  const setInitialCollapsed = useCallback(
    (path: SqValuePath, isCollapsed: boolean) => {
      itemStoreRef.current.setState(path, (state) => ({
        ...state,
        collapsed: state?.collapsed ?? isCollapsed,
      }));
    },
    []
  );

  const forceUpdate = useCallback((path: SqValuePath) => {
    itemHandlesStoreRef.current[pathAsString(path)]?.forceUpdate();
  }, []);

  const dispatch = useCallback(
    (action: Action) => {
      switch (action.type) {
        case "SET_LOCAL_ITEM_STATE":
          itemStoreRef.current.setState(
            action.payload.path,
            () => action.payload.value
          );
          forceUpdate(action.payload.path);
          return;
        case "FOCUS":
          setFocused(action.payload);
          return;
        case "UNFOCUS":
          setFocused(undefined);
          return;
        case "TOGGLE_COLLAPSED": {
          const path = action.payload;
          itemStoreRef.current.setState(path, (state) => ({
            ...state,
            collapsed: !state?.collapsed,
          }));
          forceUpdate(path);
          return;
        }
        case "SET_COLLAPSED": {
          const { path } = action.payload;
          itemStoreRef.current.setState(path, (state) => ({
            ...state,
            collapsed: action.payload.value,
          }));
          forceUpdate(path);
          return;
        }
        case "COLLAPSE_CHILDREN": {
          const children = getChildrenValues(action.payload);
          for (const child of children) {
            child.context && setInitialCollapsed(child.context.path, true);
          }
          return;
        }
        case "SCROLL_TO_PATH":
          itemHandlesStoreRef.current[
            pathAsString(action.payload.path)
          ]?.element.scrollIntoView({ behavior: "smooth" });
          return;
        case "FORCE_UPDATE":
          forceUpdate(action.payload.path);
          return;
        case "REGISTER_ITEM_HANDLE":
          itemHandlesStoreRef.current[pathAsString(action.payload.path)] =
            action.payload.handle;
          return;
        case "UNREGISTER_ITEM_HANDLE":
          delete itemHandlesStoreRef.current[pathAsString(action.payload.path)];
          return;
        case "CALCULATOR_UPDATE": {
          const { calculator, path } = action.payload;
          itemStoreRef.current.setState(path, (state) => ({
            ...state,
            calculator:
              state.calculator?.hashString === calculator.hashString
                ? {
                    // merge with existing value
                    ...state.calculator,
                    ...calculator,
                  }
                : calculator,
          }));
          return;
        }
      }
    },
    [forceUpdate, setInitialCollapsed]
  );

  return (
    <ViewerContext.Provider
      value={{
        globalSettings,
        getLocalItemState,
        getCalculator,
        editor,
        focused,
        dispatch,
      }}
    >
      {children}
    </ViewerContext.Provider>
  );
};
