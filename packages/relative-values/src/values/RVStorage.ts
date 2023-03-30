import { result, SqLambda } from "@quri/squiggle-lang";

import { RelativeValue } from "./RelativeValue";
import {ModelData, distToRelativeValue} from "./SCache"

export type RelativeValueResult = result<RelativeValue, string>;

const buildRelativeValue = ({
  fn,
  id1,
  id2,
}: {
  fn: SqLambda;
  id1: string;
  id2: string;
}): RelativeValueResult => {
  const env = fn.location.project.getEnvironment();

  const result = fn.call([id1, id2]);
  if (!result.ok) {
    return { ok: false, value: result.value.toString() };
  }
  const record = result.value.asJS();
  if (!(record instanceof Map)) {
    return { ok: false, value: "Expected record" };
  }

  // TODO - yup
  const median = record.get("median");
  const min = record.get("min");
  const max = record.get("max");
  const db = record.get("db");

  if (typeof median !== "number") {
    return { ok: false, value: "Expected median to be a number" };
  }
  if (typeof min !== "number") {
    return { ok: false, value: "Expected min to be a number" };
  }
  if (typeof max !== "number") {
    return { ok: false, value: "Expected max to be a number" };
  }
  if (typeof db !== "number") {
    return { ok: false, value: "Expected db to be a number" };
  }

  return {
    ok: true,
    value: new RelativeValue({
      median,
      min,
      max,
      db,
    }),
  };
};

export class RVStorage {
  cache: Map<string, Map<string, RelativeValueResult>>;

  constructor(public fn: SqLambda, public db: ModelData) {
    this.cache = new Map();
  }

  compare(id1: string, id2: string): RelativeValueResult {
    return { ok: true, value: distToRelativeValue(this.db.relativeValues[id1][id2].value)}
    // const cachedValue = this.cache.get(id1)?.get(id2);
    // if (cachedValue) {
    //   return cachedValue;
    // }
    // const value = buildRelativeValue({ id1, id2, fn: this.fn });
    // if (!this.cache.get(id1)) {
    //   this.cache.set(id1, new Map());
    // }
    // this.cache.get(id1)!.set(id2, value);
    // return value;
  }
}
