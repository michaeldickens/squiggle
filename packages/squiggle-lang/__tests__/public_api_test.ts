import { SqLambda, SqNumberValue, defaultEnvironment } from "../src/index.js";
import { SqSymbolicDistribution } from "../src/public/SqValue/SqDistribution/index.js";
import { testRun } from "./helpers/helpers.js";

describe("SqValue", () => {
  test("toJS", async () => {
    const value = (
      await testRun('{ x: 5, y: [3, "foo", { dist: normal(5,2) } ] }')
    ).asJS();

    expect(value).toBeInstanceOf(Map);
    expect((value as any).get("x")).toBe(5);
    expect((value as any).get("y")[2].get("dist")).toBeInstanceOf(
      SqSymbolicDistribution
    );
  });
});

describe("SqLambda", () => {
  test("createFromStdlibName", () => {
    const lambda = SqLambda.createFromStdlibName("List.upTo");
    const result = lambda.call(
      [SqNumberValue.create(1), SqNumberValue.create(5)],
      defaultEnvironment
    );

    expect(result.ok).toBe(true);
    expect(result.value.toString()).toBe("[1,2,3,4,5]");
  });

  test("createFromStdlibName for squiggle definition", () => {
    const lambda = SqLambda.createFromStdlibName("RelativeValues.wrap");
    expect(lambda).toBeInstanceOf(SqLambda);
  });

  test("createFromStdlibName for unknown name", () => {
    expect(() => SqLambda.createFromStdlibName("Foo.bar")).toThrow();
  });
});
