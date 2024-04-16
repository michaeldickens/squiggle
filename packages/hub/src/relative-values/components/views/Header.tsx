import { FC } from "react";

import { ClusterIcon } from "@/relative-values/components/common/ClusterIcon";
import { Item } from "@/relative-values/types";

import { useDefinitionClusters } from "./RelativeValuesProvider";

export const Header: FC<{
  item: Item;
}> = ({ item }) => {
  const clusters = useDefinitionClusters();

  const cluster = item.clusterId ? clusters[item.clusterId] : undefined;
  return (
    <div className="flex p-1 text-sm font-semibold text-slate-800">
      {cluster ? (
        <div className="float-left px-0.5 pr-2 pt-1.5">
          <ClusterIcon cluster={cluster} />
        </div>
      ) : null}
      <div>{item.name}</div>
    </div>
  );
};
