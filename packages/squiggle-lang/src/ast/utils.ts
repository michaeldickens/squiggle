import { LocationRange } from "peggy";

import { ASTNode } from "./peggyHelpers.js";

export function locationContains(location: LocationRange, offset: number) {
  return location.start.offset <= offset && location.end.offset >= offset;
}

export function isBindingStatement(
  statement: ASTNode
): statement is Extract<
  ASTNode,
  { type: "LetStatement" | "DefunStatement" | "DecoratedStatement" }
> {
  return (
    statement.type === "LetStatement" ||
    statement.type === "DefunStatement" ||
    statement.type === "DecoratedStatement"
  );
}

export function undecorated(node: ASTNode) {
  while (node.type === "DecoratedStatement") {
    node = node.statement;
  }
  return node;
}
