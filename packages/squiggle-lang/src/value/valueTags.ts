import { ImmutableMap } from "../utility/immutableMap.js";
import { Err, fmap, mergeMany, Ok, result } from "../utility/result.js";
import { Value } from "./index.js";
import { type VBool } from "./VBool.js";
import { VDict } from "./VDict.js";
import { type VString } from "./VString.js";

export type ValueTagsType = {
  name?: VString;
  doc?: VString;
  showAs?: Value;
  numberFormat?: VString;
  dateFormat?: VString;
  hidden?: VBool;
  notebook?: VBool;
  exportData?: VDict; // { sourceId: String, path: List(String) }
  startOpenState?: VString;
};

type ValueTagsTypeName = keyof ValueTagsType;

const valueTagsTypeNames: ValueTagsTypeName[] = [
  "name",
  "doc",
  "showAs",
  "numberFormat",
  "dateFormat",
  "hidden",
  "notebook",
  "exportData",
  "startOpenState",
];

function convertToValueTagsTypeName(
  key: string
): result<ValueTagsTypeName, string> {
  const validKeys: Set<string> = new Set(valueTagsTypeNames);
  if (validKeys.has(key)) {
    return Ok(key as ValueTagsTypeName);
  } else {
    // Throw an error if the key is not a valid ValueTagsTypeName
    return Err(
      `Invalid ValueTagsTypeName: ${key}. Must be one of ${valueTagsTypeNames.join(
        ","
      )}`
    );
  }
}

// I expect these to get much more complicated later, so it seemed prudent to make a class now.
export class ValueTags {
  constructor(public value: ValueTagsType) {}

  toList(): [string, Value][] {
    const result: [string, Value][] = [];
    const { value } = this;
    if (value.name?.value) {
      result.push(["name", value.name]);
    }
    if (value.doc?.value) {
      result.push(["doc", value.doc]);
    }
    if (value.showAs) {
      result.push(["showAs", value.showAs]);
    }
    if (value.numberFormat) {
      result.push(["numberFormat", value.numberFormat]);
    }
    if (value.dateFormat) {
      result.push(["dateFormat", value.dateFormat]);
    }
    if (value.hidden) {
      result.push(["hidden", value.hidden]);
    }
    if (value.notebook) {
      result.push(["notebook", value.notebook]);
    }
    const _exportData = this.exportData();
    if (_exportData) {
      result.push(["exportData", _exportData]);
    }

    if (value.startOpenState) {
      result.push(["startOpenState", value.startOpenState]);
    }
    return result;
  }

  isEmpty() {
    return this.toList().length === 0;
  }

  omit(keys: ValueTagsTypeName[]) {
    const newValue: ValueTagsType = { ...this.value };
    keys.forEach((key) => delete newValue[key]);
    return new ValueTags(newValue);
  }

  omitUsingStringKeys(keys: string[]) {
    const params = mergeMany(keys.map(convertToValueTagsTypeName));
    //Don't simplify the omit call, as we need to ensure "this" is carried.
    return fmap(params, (args) => this.omit(args));
  }

  toMap(): ImmutableMap<string, Value> {
    return ImmutableMap(this.toList());
  }

  toString(): string {
    return this.toList()
      .map(([key, value]) => `${key}: ${value.toString()}`)
      .join(", ");
  }

  merge(other: ValueTagsType) {
    return new ValueTags({
      ...this.value,
      ...other,
    });
  }

  name() {
    return this.value.name?.value;
  }

  doc() {
    return this.value.doc?.value;
  }

  showAs() {
    return this.value.showAs;
  }

  numberFormat() {
    return this.value.numberFormat?.value;
  }

  dateFormat() {
    return this.value.dateFormat?.value;
  }

  hidden() {
    return this.value.hidden?.value;
  }

  notebook() {
    return this.value.notebook?.value;
  }

  startOpenState(): "open" | "closed" | undefined {
    const { value } = this.value.startOpenState ?? {};
    if (!value) {
      return;
    }
    if (["open", "closed"].includes(value)) {
      return value as "open" | "closed";
    }

    // Shouldn't happen in `fr/tags.ts` is coded correctly, but we don't have a way to validate `VString` values yet.
    // I guess ignoring the value instead of failing here is a better choice,
    // wrong open/closed state is not important enough for a fatal error.
    return undefined;
  }

  exportData() {
    return this.value.exportData;
  }
}
