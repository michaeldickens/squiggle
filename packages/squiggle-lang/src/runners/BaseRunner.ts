import { AST } from "../ast/parse.js";
import { Env } from "../dists/env.js";
import { ICompileError, IRuntimeError } from "../errors/IError.js";
import { result } from "../utility/result.js";
import { Value } from "../value/index.js";
import { VDict } from "../value/VDict.js";

export type RunParams = {
  // source is already parsed, because by this point `externals` already exists, which means that someone parsed the source code already
  ast: AST;
  // necessary for stacktraces
  sourceId: string;
  environment: Env;
  // should be previously resolved, usually by SqProject
  externals: VDict;
};

export type RunOutput = { result: Value; bindings: VDict; exports: VDict };

export type RunResult = result<RunOutput, ICompileError | IRuntimeError>;

export abstract class BaseRunner {
  abstract run(params: RunParams): Promise<RunResult>;
}
