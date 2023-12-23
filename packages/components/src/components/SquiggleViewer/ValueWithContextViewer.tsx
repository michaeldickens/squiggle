// make sure all widgets are in registry
import "../../widgets/index.js";

import { clsx } from "clsx";
import { FC, PropsWithChildren, useMemo } from "react";
import ReactMarkdown from "react-markdown";

import { SqValue } from "@quri/squiggle-lang";
import { CommentIcon, TextTooltip } from "@quri/ui";

import { SqValueWithContext } from "../../lib/utility.js";
import { leftWidgetMargin } from "../../widgets/utils.js";
import { ErrorBoundary } from "../ErrorBoundary.js";
import { CollapsedIcon, ExpandedIcon } from "./icons.js";
import { SquiggleValueChart } from "./SquiggleValueChart.js";
import { SquiggleValueMenu } from "./SquiggleValueMenu.js";
import { SquiggleValuePreview } from "./SquiggleValuePreview.js";
import {
  getValueComment,
  hasExtraContentToShow,
  pathToShortName,
} from "./utils.js";
import {
  useFocus,
  useIsFocused,
  useMergedSettings,
  useRegisterAsItemViewer,
  useToggleCollapsed,
  useViewerContext,
} from "./ViewerProvider.js";

const CommentIconForValue: FC<{ value: SqValueWithContext }> = ({ value }) => {
  const comment = getValueComment(value);

  return comment ? (
    <div className="ml-3">
      <TextTooltip text={comment} placement="bottom">
        <span>
          <CommentIcon
            size={13}
            className="text-purple-100 group-hover:text-purple-300"
          />
        </span>
      </TextTooltip>
    </div>
  ) : null;
};

type Props = {
  value: SqValueWithContext;
  parentValue?: SqValue;
};

const WithComment: FC<PropsWithChildren<Props>> = ({ value, children }) => {
  const comment = getValueComment(value);

  if (!comment) {
    return children;
  }

  const tagsWithTopPosition = new Set([
    "Dict",
    "Array",
    "TableChart",
    "Plot",
    "String",
  ]);
  const commentPosition = tagsWithTopPosition.has(value.tag) ? "top" : "bottom";

  const commentEl = (
    <ReactMarkdown
      className={clsx(
        "prose max-w-4xl text-sm text-stone-600",
        leftWidgetMargin,
        commentPosition === "bottom" ? "mt-1" : "mb-1"
      )}
    >
      {comment}
    </ReactMarkdown>
  );

  return (
    // TODO - can be simplified with flex-col-reverse
    <div>
      {commentPosition === "top" && commentEl}
      {children}
      {commentPosition === "bottom" && commentEl}
    </div>
  );
};

const ValueViewerBody: FC<Props> = ({ value }) => {
  const { path } = value.context;
  const isFocused = useIsFocused(path);
  const isRoot = path.isRoot();

  const mergedSettings = useMergedSettings(path);
  const adjustedMergedSettings = useMemo(() => {
    const { chartHeight } = mergedSettings;
    return {
      ...mergedSettings,
      chartHeight: isFocused || isRoot ? chartHeight * 4 : chartHeight,
    };
  }, [isFocused, isRoot, mergedSettings]);

  return (
    <WithComment value={value}>
      <SquiggleValueChart value={value} settings={adjustedMergedSettings} />
    </WithComment>
  );
};

export const ValueWithContextViewer: FC<Props> = ({ value, parentValue }) => {
  const { tag } = value;
  const { path } = value.context;

  const toggleCollapsed_ = useToggleCollapsed();
  const focus = useFocus();

  const { itemStore } = useViewerContext();
  const itemState = itemStore.getStateOrInitialize(value);

  const isFocused = useIsFocused(path);

  const isRoot = path.isRoot();
  const taggedName = value.tags.name();

  const toggleCollapsed = () => {
    toggleCollapsed_(path);
  };

  const ref = useRegisterAsItemViewer(path);

  const isOpen = isFocused || !itemState.collapsed;
  const _focus = () => !isFocused && !isRoot && focus(path);

  const triangleToggle = () => {
    const Icon = isOpen ? ExpandedIcon : CollapsedIcon;
    const _hasExtraContentToShow = hasExtraContentToShow(value);
    //Only show triangle if there is content to show, that's not in the header.
    if (_hasExtraContentToShow) {
      return (
        <div
          className="w-4 mr-1.5 flex justify-center cursor-pointer text-stone-200 hover:!text-stone-600 group-hover:text-stone-300"
          onClick={toggleCollapsed}
        >
          <Icon size={12} />
        </div>
      );
    } else {
      return <div className="w-4 mr-1.5" />;
    }
  };

  const getHeaderColor = () => {
    let color = "text-orange-900";
    const parentTag = parentValue?.tag;
    if (parentTag === "Array") {
      color = "text-stone-400";
    } else if (path.items.length > 1) {
      color = "text-teal-700";
    }
    return color;
  };

  const headerColor = getHeaderColor();

  const headerClasses = () => {
    if (isFocused) {
      return clsx("text-md font-bold ml-1", headerColor);
    } else if (isRoot) {
      return "text-sm text-stone-600 font-semibold";
    } else {
      return clsx("text-sm cursor-pointer hover:underline", headerColor);
    }
  };

  //We want to show colons after the keys, for dicts/arrays.
  const showColon = !isFocused && path.items.length > 1;
  const name = pathToShortName(path);
  const headerName = (
    <div>
      <span
        className={clsx(!taggedName && "font-mono", headerClasses())}
        onClick={_focus}
      >
        {taggedName ? taggedName : name}
      </span>
      {showColon && <span className={"text-gray-400 font-mono"}>:</span>}
    </div>
  );

  const leftCollapseBorder = () => {
    if (isRoot) {
      return null;
    }
    const isDictOrList = tag === "Dict" || tag === "Array";
    if (isDictOrList) {
      return (
        <div
          className="group w-4 shrink-0 flex justify-center cursor-pointer"
          onClick={toggleCollapsed}
        >
          <div className="w-px bg-stone-100 group-hover:bg-stone-400" />
        </div>
      );
    } else {
      // non-root leaf elements have unclickable padding to align with dict/list elements
      return <div className="flex w-4 min-w-[1rem]" />; // min-w-1rem = w-4
    }
  };

  return (
    <ErrorBoundary>
      <div ref={ref} className={clsx(isFocused && "px-2")}>
        <header
          className={clsx(
            "flex justify-between group pr-0.5",
            isFocused ? "mb-2" : "hover:bg-stone-100 rounded-sm"
          )}
        >
          <div className="inline-flex items-center">
            {!isFocused && triangleToggle()}
            {headerName}
            {!isFocused && !isOpen && (
              <div
                className={clsx(
                  "text-sm text-blue-800",
                  showColon ? "ml-2" : "ml-5"
                )}
              >
                <SquiggleValuePreview value={value} />
              </div>
            )}
            {!isFocused && !isOpen && <CommentIconForValue value={value} />}
          </div>
          <div className="inline-flex space-x-1 items-center">
            <SquiggleValueMenu value={value} />
          </div>
        </header>
        {isOpen && (
          <div
            className={clsx(
              "flex w-full",
              Boolean(getValueComment(value)) && "py-2"
            )}
          >
            {!isFocused && leftCollapseBorder()}
            <div className="grow">
              <ValueViewerBody value={value} />
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};
