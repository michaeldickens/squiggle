import { Env, defaultEnv } from "../../dist/env.js";
import { RENeedToRun } from "../../errors.js";
import * as Library from "../../library/index.js";
import { IError } from "../../reducer/IError.js";
import { Namespace, NamespaceMap } from "../../reducer/bindings.js";
import { createContext } from "../../reducer/context.js";
import * as Result from "../../utility/result.js";
import { Value, vRecord } from "../../value/index.js";
import { SqError } from "../SqError.js";
import { SqRecord } from "../SqRecord.js";
import { SqValue, wrapValue } from "../SqValue.js";
import { SqValueLocation } from "../SqValueLocation.js";

import { ImportBinding, ProjectItem } from "./ProjectItem.js";
import { Resolver } from "./Resolver.js";
import * as Topology from "./Topology.js";

function getNeedToRunError() {
  return new SqError(IError.fromMessage(new RENeedToRun()));
}

// TODO - pass the the id from which the dependency was imported/continued too
function getMissingDependencyError(id: string) {
  return new SqError(IError.other(`Dependency ${id} is missing`));
}

type Options = {
  resolver?: Resolver;
};

export class SqProject {
  private readonly items: Map<string, ProjectItem>;
  private stdLib: Namespace;
  private environment: Env;
  private resolver?: Resolver; // if not present, imports are forbidden

  constructor(options?: Options) {
    this.items = new Map();
    this.stdLib = Library.getStdLib();
    this.environment = defaultEnv;
    this.resolver = options?.resolver;
  }

  static create(options?: { resolver: Resolver }) {
    return new SqProject(options);
  }

  setEnvironment(environment: Env) {
    this.environment = environment;
  }

  getEnvironment(): Env {
    return this.environment;
  }

  getStdLib(): Namespace {
    return this.stdLib;
  }

  setStdLib(value: Namespace) {
    this.stdLib = value;
  }

  getSourceIds(): string[] {
    return Array.from(this.items.keys());
  }

  private getItem(sourceId: string): ProjectItem {
    const item = this.items.get(sourceId);
    if (!item) {
      throw new Error(`Source ${sourceId} not found`);
    }
    return item;
  }

  private touchDependents(sourceId: string) {
    Topology.traverseDependents(this, sourceId, (id) => this.clean(id));
  }

  getDependencies(sourceId: string): string[] {
    return this.getItem(sourceId).getDependencies();
  }

  getRunOrder(): string[] {
    return Topology.getRunOrder(this);
  }

  getRunOrderFor(sourceId: string): string[] {
    return Topology.getRunOrderFor(this, sourceId);
  }

  getDependents(sourceId: string) {
    return Topology.getDependents(this, sourceId);
  }

  touchSource(sourceId: string) {
    this.getItem(sourceId).touchSource();
    this.touchDependents(sourceId);
  }

  setSource(sourceId: string, value: string) {
    if (this.items.has(sourceId)) {
      this.getItem(sourceId).setSource(value);
    } else {
      this.items.set(sourceId, new ProjectItem({ sourceId, source: value }));
    }
    this.touchDependents(sourceId);
  }

  removeSource(sourceId: string) {
    this.touchDependents(sourceId);
    this.items.delete(sourceId);
  }

  getSource(sourceId: string) {
    return this.items.get(sourceId)?.source;
  }

  clean(sourceId: string) {
    this.getItem(sourceId).clean();
  }

  cleanAll() {
    this.getSourceIds().forEach((id) => this.clean(id));
  }

  getImportIds(sourceId: string): Result.result<string[], SqError> {
    const imports = this.getImports(sourceId);
    if (!imports) {
      return Result.Err(getNeedToRunError());
    }
    return Result.fmap(imports, (imports) => imports.map((i) => i.sourceId));
  }

  getImports(
    sourceId: string
  ): Result.result<ImportBinding[], SqError> | undefined {
    return this.getItem(sourceId).imports;
  }

  getContinues(sourceId: string): string[] {
    return this.getItem(sourceId).continues;
  }

  setContinues(sourceId: string, continues: string[]): void {
    this.getItem(sourceId).setContinues(continues);
    this.touchDependents(sourceId);
  }

  private getResultOption(sourceId: string) {
    return this.getItem(sourceId).result;
  }

  private getInternalResult(sourceId: string): Result.result<Value, SqError> {
    const result = this.getResultOption(sourceId);
    return result ?? Result.Err(getNeedToRunError());
  }

  getResult(sourceId: string): Result.result<SqValue, SqError> {
    return Result.fmap(this.getInternalResult(sourceId), (v) =>
      wrapValue(
        v,
        new SqValueLocation(this, sourceId, {
          root: "result",
          items: [],
        })
      )
    );
  }

  parseImports(sourceId: string): void {
    // resolver can be undefined; in this case parseImports will fail if there are any imports
    this.getItem(sourceId).parseImports(this.resolver);
  }

  private getRawBindings(sourceId: string): Namespace {
    // FIXME - should fail if bindings are not set
    return this.getItem(sourceId).bindings ?? NamespaceMap();
  }

  getBindings(sourceId: string): SqRecord {
    return new SqRecord(
      this.getRawBindings(sourceId),
      new SqValueLocation(this, sourceId, {
        root: "bindings",
        items: [],
      })
    );
  }

  private buildInitialBindings(
    sourceId: string
  ): Result.result<Namespace, SqError> {
    const continues = this.getContinues(sourceId);

    // We start from stdLib and add more bindings on top of it.
    const namespacesToMerge = [this.getStdLib()];

    // First, merge continues.
    for (const continueId of continues) {
      if (!this.items.has(continueId)) {
        return Result.Err(getMissingDependencyError(continueId));
      }
      const continueBindings = this.getItem(continueId).bindings;
      if (!continueBindings) {
        return Result.Err(getNeedToRunError());
      }
      namespacesToMerge.push(continueBindings);

      const result = this.getInternalResult(continueId);
      if (!result.ok) {
        return result;
      }
    }
    let namespace = NamespaceMap<string, Value>().merge(...namespacesToMerge);

    // Second, merge imports.
    this.parseImports(sourceId);
    const rImports = this.getImports(sourceId);
    if (!rImports) {
      // Shouldn't happen, we just called parseImports.
      return Result.Err(new SqError(IError.other("Internal logic error")));
    }

    if (!rImports.ok) {
      // Shouldn't happen, getImports fail only if parse failed.
      return rImports;
    }
    for (const importBinding of rImports.value) {
      if (!this.items.has(importBinding.sourceId)) {
        return Result.Err(getMissingDependencyError(importBinding.sourceId));
      }
      const importBindings = this.getItem(importBinding.sourceId).bindings;
      if (!importBindings) {
        return Result.Err(getNeedToRunError());
      }

      // TODO - check for collisions?
      namespace = namespace.set(
        importBinding.variable,
        vRecord(importBindings)
      );
    }
    return Result.Ok(namespace);
  }

  private async doLinkAndRun(sourceId: string): Promise<void> {
    const rBindings = this.buildInitialBindings(sourceId);

    if (rBindings.ok) {
      const context = createContext(rBindings.value, this.getEnvironment());

      await this.getItem(sourceId).run(context);
    } else {
      this.getItem(sourceId).failRun(rBindings.value);
    }
  }

  private async runIds(sourceIds: string[]) {
    let error: SqError | undefined;
    for (const sourceId of sourceIds) {
      const cachedResult = this.getResultOption(sourceId);
      if (cachedResult) {
        // already ran
        if (!cachedResult.ok) {
          error = cachedResult.value;
        }
        continue;
      }

      if (error) {
        this.getItem(sourceId).failRun(error);
        continue;
      }

      await this.doLinkAndRun(sourceId);
      const result = this.getResultOption(sourceId);
      if (result && !result.ok) {
        error = result.value;
      }
    }
  }

  async runAll() {
    await this.runIds(this.getRunOrder());
  }

  // Deprecated; this method won't handle imports correctly.
  // Use `runWithImports` instead.
  async run(sourceId: string) {
    await this.runIds(Topology.getRunOrderFor(this, sourceId));
  }

  async loadImportsRecursively(
    initialSourceName: string,
    loadSource: (sourceId: string) => Promise<string>
  ) {
    const visited = new Set<string>();
    const inner = async (sourceName: string) => {
      if (visited.has(sourceName)) {
        // Oh we have already visited this source. There is an import cycle.
        throw new Error(`Cyclic import ${sourceName}`);
      }
      visited.add(sourceName);
      // Let's parse the imports and dive into them.
      this.parseImports(sourceName);
      const rImportIds = this.getImportIds(sourceName);
      if (!rImportIds.ok) {
        // Maybe there is an import syntax error.
        throw new Error(rImportIds.value.toString());
      }

      for (const newImportId of rImportIds.value) {
        // We have got one of the new imports.
        // Let's load it and add it to the project.
        const newSource = await loadSource(newImportId);
        this.setSource(newImportId, newSource);
        // The new source is loaded and added to the project.
        // Of course the new source might have imports too.
        // Let's recursively load them.
        await this.loadImportsRecursively(newImportId, loadSource);
      }
    };
    await inner(initialSourceName);
  }

  async runWithImports(
    sourceId: string,
    loadSource: (sourceId: string) => Promise<string>
  ) {
    await this.loadImportsRecursively(sourceId, loadSource);

    await this.run(sourceId);
  }

  findValueLocationByOffset(
    sourceId: string,
    offset: number
  ): Result.result<SqValueLocation, SqError> {
    const { ast } = this.getItem(sourceId);
    if (!ast) {
      return Result.Err(SqError.createOtherError("Not parsed"));
    }
    if (!ast.ok) {
      return ast;
    }
    const found = SqValueLocation.findByOffset({
      project: this,
      sourceId,
      ast: ast.value,
      offset,
    });
    if (!found) {
      return Result.Err(SqError.createOtherError("Not found"));
    }
    return Result.Ok(found);
  }
}

// ------------------------------------------------------------------------------------

// Shortcut for running a single piece of code without creating a project
export function evaluate(
  sourceCode: string
): [Result.result<SqValue, SqError>, SqRecord] {
  const project = SqProject.create();
  project.setSource("main", sourceCode);
  project.runAll();

  return [project.getResult("main"), project.getBindings("main")];
}
