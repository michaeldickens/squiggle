import merge from "lodash/merge.js";
import {
  FC,
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { SqValueLocation } from "@quri/squiggle-lang";

import {
  PartialPlaygroundSettings,
  defaultPlaygroundSettings,
} from "../PlaygroundSettings.js";
import {
  LocalItemSettings,
  MergedItemSettings,
  locationAsString,
} from "./utils.js";
import { CodeEditorHandle } from "../CodeEditor.js";

type Action =
  | {
      type: "SET_SETTINGS";
      payload: {
        location: SqValueLocation;
        value: LocalItemSettings;
      };
    }
  | {
      type: "FOCUS";
      payload: SqValueLocation;
    }
  | {
      type: "UNFOCUS";
    }
  | {
      type: "SCROLL_TO_LOCATION";
      payload: {
        location: SqValueLocation;
      };
    }
  | {
      type: "REGISTER_ITEM_HANDLE";
      payload: {
        location: SqValueLocation;
        element: HTMLDivElement;
      };
    }
  | {
      type: "UNREGISTER_ITEM_HANDLE";
      payload: {
        location: SqValueLocation;
      };
    };

type ViewerContextShape = {
  // Note that we don't store settings themselves in the context (that would cause rerenders of the entire tree on each settings update).
  // Instead, we keep settings in local state and notify the global context via setSettings to pass them down the component tree again if it got rebuilt from scratch.
  // See ./SquiggleViewer.tsx and ./VariableBox.tsx for other implementation details on this.
  getSettings(location: SqValueLocation): LocalItemSettings;
  getMergedSettings(location: SqValueLocation): MergedItemSettings;
  localSettingsEnabled: boolean; // show local settings icon in the UI
  focused?: SqValueLocation;
  editor?: CodeEditorHandle;
  dispatch(action: Action): void;
};

export const ViewerContext = createContext<ViewerContextShape>({
  getSettings: () => ({ collapsed: false }),
  getMergedSettings: () => defaultPlaygroundSettings,
  localSettingsEnabled: false,
  focused: undefined,
  editor: undefined,
  dispatch() {},
});

export function useViewerContext() {
  return useContext(ViewerContext);
}

export function useSetSettings() {
  const { dispatch } = useViewerContext();
  return (location: SqValueLocation, value: LocalItemSettings) => {
    dispatch({
      type: "SET_SETTINGS",
      payload: {
        location,
        value,
      },
    });
  };
}

export function useFocus() {
  const { dispatch } = useViewerContext();
  return (location: SqValueLocation) => {
    dispatch({
      type: "FOCUS",
      payload: location,
    });
  };
}

export function useUnfocus() {
  const { dispatch } = useViewerContext();
  return () => dispatch({ type: "UNFOCUS" });
}

type SettingsStore = {
  [k: string]: LocalItemSettings;
};

const defaultLocalSettings: LocalItemSettings = { collapsed: false };

export const ViewerProvider: FC<
  PropsWithChildren<{
    partialPlaygroundSettings: PartialPlaygroundSettings;
    localSettingsEnabled: boolean;
    editor?: CodeEditorHandle;
  }>
> = ({ partialPlaygroundSettings, localSettingsEnabled, editor, children }) => {
  // can't store settings in the state because we don't want to rerender the entire tree on every change
  const settingsStoreRef = useRef<SettingsStore>({});

  const itemHandlesStoreRef = useRef<{ [k: string]: HTMLDivElement }>({});

  const [focused, setFocused] = useState<SqValueLocation | undefined>();

  const globalSettings = useMemo(() => {
    return merge({}, defaultPlaygroundSettings, partialPlaygroundSettings);
  }, [partialPlaygroundSettings]);

  const getSettings = useCallback(
    (location: SqValueLocation) => {
      return (
        settingsStoreRef.current[locationAsString(location)] ||
        defaultLocalSettings
      );
    },
    [settingsStoreRef]
  );

  const getMergedSettings = useCallback(
    (location: SqValueLocation) => {
      const localSettings = getSettings(location);
      const result: MergedItemSettings = merge(
        {},
        globalSettings,
        localSettings
      );
      return result;
    },
    [globalSettings, getSettings]
  );

  const dispatch = useCallback(
    (action: Action) => {
      switch (action.type) {
        case "SET_SETTINGS":
          settingsStoreRef.current[locationAsString(action.payload.location)] =
            action.payload.value;
          return;
        case "FOCUS":
          setFocused(action.payload);
          return;
        case "UNFOCUS":
          setFocused(undefined);
          return;
        case "SCROLL_TO_LOCATION":
          itemHandlesStoreRef.current[
            locationAsString(action.payload.location)
          ]?.scrollIntoView({ behavior: "smooth" });
          return;
        case "REGISTER_ITEM_HANDLE":
          itemHandlesStoreRef.current[
            locationAsString(action.payload.location)
          ] = action.payload.element;
          setFocused(undefined);
          return;
        case "UNREGISTER_ITEM_HANDLE":
          delete itemHandlesStoreRef.current[
            locationAsString(action.payload.location)
          ];
          return;
      }
    },
    [settingsStoreRef]
  );

  return (
    <ViewerContext.Provider
      value={{
        getSettings,
        getMergedSettings,
        localSettingsEnabled,
        editor,
        focused,
        dispatch,
      }}
    >
      {children}
    </ViewerContext.Provider>
  );
};
