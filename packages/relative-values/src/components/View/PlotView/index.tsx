import { StyledTab } from "@/components/ui/StyledTab";
import { ModelEvaluator } from "@/values/ModelEvaluator";
import { SqLambda } from "@quri/squiggle-lang";
import { FC } from "react";
import { ClusterFilter } from "../ClusterFilter";
import { ForcePlot } from "./ForcePlot";
import { ValueAndUncertaintyPlot } from "./ValueAndUncertaintyPlot";

export const PlotView: FC<{
  rv: ModelEvaluator;
}> = ({ rv }) => {
  return (
    <div className="flex gap-8 max-w-6xl mx-auto">
      <div>
        <StyledTab.Group>
          <StyledTab.List>
            <StyledTab name="Value and Uncertainty" icon={() => <div />} />
            <StyledTab name="Force" icon={() => <div />} />
          </StyledTab.List>
          <StyledTab.Panels>
            <StyledTab.Panel>
              <ValueAndUncertaintyPlot rv={rv} />
            </StyledTab.Panel>
            <StyledTab.Panel>
              <ForcePlot rv={rv} />
            </StyledTab.Panel>
          </StyledTab.Panels>
        </StyledTab.Group>
      </div>
      <ClusterFilter axis="rows" />
    </div>
  );
};
