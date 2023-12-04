import type { Meta, StoryObj } from "@storybook/react";
import { FnDocumentation as Component } from "../components/ui/FnDocumentation.js";
import { type FnDocumentation as FnDocumentationType } from "@quri/squiggle-lang";
import {
  getAllFunctionNames,
  getFunctionDocumentation,
} from "@quri/squiggle-lang";

/**
 * Internal UI component. Used in `SquigglePlayground`.
 */
const meta: Meta<typeof Component> = {
  component: Component,
};
export default meta;
type Story = StoryObj<typeof meta>;

export const FnStory = () => {
  const fnNames = getAllFunctionNames();
  const fnDocumentation = fnNames.map(getFunctionDocumentation);

  return (
    <div>
      {fnDocumentation.map((e, i) =>
        e ? (
          <div className="pb-2" key={i}>
            <Component documentation={e} />
          </div>
        ) : (
          ""
        )
      )}
    </div>
  );
};

FnStory.story = {
  name: "All",
};

const foo: FnDocumentationType = {
  name: "add",
  nameSpace: "Number",
  requiresNamespace: false,
  signatures: ["(number, number) => number"],
  examples: ["add(5,2)"],
  isExperimental: true,
  isUnit: true,
  shorthand: { type: "unary", symbol: "-" },
  description: `**Lorem Ipsum**
More content *here*`,
};

export const Simple: Story = {
  name: "Normal",
  args: {
    documentation: foo,
  },
};
