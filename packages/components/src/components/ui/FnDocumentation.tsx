import { clsx } from "clsx";
import { FC, PropsWithChildren } from "react";

import {
  FnDefinition,
  type FnDocumentation as FnDocumentationType,
} from "@quri/squiggle-lang";

import { SQUIGGLE_DOCS_URL } from "../../lib/constants.js";
import { MarkdownViewer } from "../../lib/MarkdownViewer.js";

const Section: FC<PropsWithChildren> = ({ children }) => (
  <div className={clsx("px-4 py-2")}>{children}</div>
);

//I'm not sure if this is worth it here. Much of the input data is hidden from us at this point. It might be better to just go back to strings, or to formally parse it after having it as a string.
const StyleDefinition: FC<{ fullName: string; def: FnDefinition }> = ({
  fullName,
  def,
}) => {
  const isOptional = (t) => (t.isOptional === undefined ? false : t.isOptional);
  const primaryColor = "text-slate-900";
  const secondaryColor = "text-slate-400";
  const inputs = def.inputs.map((t, index) => (
    <span key={index}>
      <span className={primaryColor}>{t.display()}</span>
      {isOptional(t) ? <span className={primaryColor}>?</span> : ""}
      {index !== def.inputs.length - 1 && (
        <span className={secondaryColor}>, </span>
      )}
    </span>
  ));
  const output = def.output.display();
  return (
    <div>
      <span className="text-slate-500">{fullName}</span>
      <span className={secondaryColor}>(</span>
      <span className={clsx(primaryColor, "ml-0.5 mr-0.5")}>{inputs}</span>
      <span className={secondaryColor}>)</span>
      {output ? (
        <>
          <span className={secondaryColor}>{" => "}</span>{" "}
          <span className={primaryColor}>{output}</span>
        </>
      ) : (
        ""
      )}
    </div>
  );
};

export const FnDocumentation: FC<{ documentation: FnDocumentationType }> = ({
  documentation,
}) => {
  const {
    name,
    nameSpace,
    requiresNamespace,
    isUnit,
    shorthand,
    isExperimental,
    description,
    definitions,
    examples,
  } = documentation;
  const fullName = `${nameSpace ? nameSpace + "." : ""}${name}`;
  const tagCss = "text-xs font-medium me-2 px-2.5 py-0.5 rounded";

  return (
    <>
      <Section>
        <div className="flex flex-nowrap items-end justify-between gap-2 py-0.5">
          <a
            href={`${SQUIGGLE_DOCS_URL}/${nameSpace}#${name}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-500 hover:underline text-sm leading-none"
          >
            {fullName}
          </a>
          <div className="italic text-xs leading-none text-slate-500">
            Stdlib
          </div>
        </div>
      </Section>
      {(isUnit || shorthand || isExperimental || !requiresNamespace) && (
        <Section>
          <div className="flex">
            {isUnit && (
              <div className={clsx("bg-yellow-100 text-yellow-800", tagCss)}>
                Unit
              </div>
            )}
            {shorthand && (
              <div className={clsx("bg-orange-100 text-gray-500", tagCss)}>
                {`${shorthand.type}:  `}
                <span className="font-mono ml-2 text-orange-800">
                  {shorthand.symbol}
                </span>
              </div>
            )}
            {isExperimental && (
              <div className={clsx("bg-red-100 text-red-800", tagCss)}>
                Experimental
              </div>
            )}
            {!requiresNamespace && (
              <div className={clsx("bg-purple-100 text-slate-800", tagCss)}>
                {`Namespace optional`}
              </div>
            )}
          </div>
        </Section>
      )}

      {description ? (
        <Section>
          <MarkdownViewer
            md={description}
            textColor="prose-slate"
            textSize="xs"
          />
        </Section>
      ) : null}
      {definitions ? (
        <Section>
          <header className="text-xs text-slate-600 font-medium mb-2">
            Signatures
          </header>
          <div className="text-xs text-slate-600 font-mono p-2 bg-slate-100 rounded-md space-y-2">
            {definitions.map((def, id) => (
              <StyleDefinition fullName={fullName} def={def} key={id} />
            ))}
          </div>
        </Section>
      ) : null}
      {examples?.length ? (
        <Section>
          <header className="text-xs text-slate-600 font-medium mb-2">
            Examples
          </header>
          <div className="text-xs text-slate-600 font-mono p-2 bg-slate-100 rounded-md">
            {examples.map((example, i) => (
              <div className="p-1" key={i}>
                {example}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
};
