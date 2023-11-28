import { builder } from "@/graphql/builder";
import { prisma } from "@/prisma";

import { Model, ModelConnection } from "../types/Model";
import { modelWhereHasAccess } from "../helpers/modelHelpers";

builder.queryField("models", (t) =>
  t.prismaConnection(
    {
      type: Model,
      cursor: "id",
      resolve: (query, _, __, { session }) => {
        return prisma.model.findMany({
          ...query,
          orderBy: {
            updatedAt: "desc",
          },
          where: modelWhereHasAccess(session),
        });
      },
    },
    ModelConnection
  )
);
