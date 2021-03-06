import { Box, Tooltip, Typography } from "@material-ui/core";
import React from "react";
import { GPUStats, ResourceSlot } from "../../../../api";
import { RightPaddedTypography } from "../../../../common/CustomTypography";
import UsageBar from "../../../../common/UsageBar";
import { getWeightedAverage, sum } from "../../../../common/util";
import {
  ClusterFeatureComponent,
  Node,
  NodeFeatureComponent,
  WorkerFeatureComponent,
} from "./types";

const GPU_COL_WIDTH = 120;

const clusterUtilization = (nodes: Array<Node>): number => {
  const utils = nodes
    .map((node) => ({
      weight: node.gpus.length,
      value: nodeAverageUtilization(node),
    }))
    .filter((util) => !isNaN(util.value));
  if (utils.length === 0) {
    return NaN;
  }
  return getWeightedAverage(utils);
};

const nodeAverageUtilization = (node: Node): number => {
  if (!node.gpus || node.gpus.length === 0) {
    return NaN;
  }
  const utilizationSum = sum(node.gpus.map((gpu) => gpu.utilization_gpu));
  const avgUtilization = utilizationSum / node.gpus.length;
  return avgUtilization;
};

export const ClusterGPU: ClusterFeatureComponent = ({ nodes }) => {
  const clusterAverageUtilization = clusterUtilization(nodes);
  return (
    <div style={{ minWidth: GPU_COL_WIDTH }}>
      {isNaN(clusterAverageUtilization) ? (
        <Typography color="textSecondary" component="span" variant="inherit">
          N/A
        </Typography>
      ) : (
        <UsageBar
          percent={clusterAverageUtilization}
          text={`${clusterAverageUtilization.toFixed(1)}%`}
        />
      )}
    </div>
  );
};

export const NodeGPU: NodeFeatureComponent = ({ node }) => {
  const hasGPU = node.gpus !== undefined && node.gpus.length !== 0;
  return (
    <div style={{ minWidth: GPU_COL_WIDTH }}>
      {hasGPU ? (
        node.gpus.map((gpu, i) => <NodeGPUEntry gpu={gpu} slot={i} />)
      ) : (
        <Typography color="textSecondary" component="span" variant="inherit">
          N/A
        </Typography>
      )}
    </div>
  );
};

type NodeGPUEntryProps = {
  slot: number;
  gpu: GPUStats;
};

const NodeGPUEntry: React.FC<NodeGPUEntryProps> = ({ gpu, slot }) => {
  return (
    <Box display="flex" style={{ minWidth: GPU_COL_WIDTH }}>
      <Tooltip title={gpu.name}>
        <RightPaddedTypography variant="body1">[{slot}]:</RightPaddedTypography>
      </Tooltip>
      <UsageBar
        percent={gpu.utilization_gpu}
        text={`${gpu.utilization_gpu.toFixed(1)}%`}
      />
    </Box>
  );
};

type WorkerGPUEntryProps = {
  resourceSlot: ResourceSlot;
};

const WorkerGPUEntry: React.FC<WorkerGPUEntryProps> = ({ resourceSlot }) => {
  const { allocation, slot } = resourceSlot;
  // This is a bit of  a dirty hack . For some reason, the slot GPU slot
  // 0 as assigned always shows up as undefined in the API response.
  // There are other times, such as a partial allocation, where we truly don't
  // know the slot, however this will just plug the hole of 0s coming through
  // as undefined. I have not been able to figure out the root cause.
  const slotMsg =
    allocation >= 1 && slot === undefined
      ? "0"
      : slot === undefined
      ? "?"
      : slot.toString();
  return (
    <Typography variant="body1">
      [{slotMsg}]: {allocation}
    </Typography>
  );
};

export const WorkerGPU: WorkerFeatureComponent = ({ rayletWorker }) => {
  const workerRes = rayletWorker?.coreWorkerStats.usedResources;
  const workerUsedGPUResources = workerRes?.["GPU"];
  let message;
  if (workerUsedGPUResources === undefined) {
    message = (
      <Typography color="textSecondary" component="span" variant="inherit">
        N/A
      </Typography>
    );
  } else {
    message = workerUsedGPUResources.resourceSlots
      .sort((slot1, slot2) => {
        if (slot1.slot === undefined && slot2.slot === undefined) {
          return 0;
        } else if (slot1.slot === undefined) {
          return 1;
        } else if (slot2.slot === undefined) {
          return -1;
        } else {
          return slot1.slot - slot2.slot;
        }
      })
      .map((resourceSlot) => <WorkerGPUEntry resourceSlot={resourceSlot} />);
  }
  return <div style={{ minWidth: 60 }}>{message}</div>;
};
