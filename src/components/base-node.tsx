import { type FlowNodeEntity, useNodeRender } from '@flowgram.ai/fixed-layout-editor';

import { useDesigner } from './designer-context';
import {
  approvalSummary,
  conditionSummary,
  validateApproval,
  validateBranch,
  type NodeConfig,
  type ApprovalConfig,
  type BranchConfig,
} from '../workflow';

export const BaseNode = ({ node }: { node: FlowNodeEntity }) => {
  const render = useNodeRender();
  return (
    <div
      className="flow-node-wrapper"
      data-node-id={node.id}
      onMouseEnter={render.onMouseEnter}
      onMouseLeave={render.onMouseLeave}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {render.form?.render()}
    </div>
  );
};

export function NodeCard({ config }: { config: NodeConfig }) {
  const { node } = useNodeRender();
  const { open, selection } = useDesigner();
  if (node.flowNodeType === 'start') return <div className="start-node">发起审批</div>;
  if (node.flowNodeType === 'end')
    return (
      <div className="flow-card end-node">
        <div className="node-heading">审批通过</div>
        <div className="node-content">结束</div>
      </div>
    );
  if (node.flowNodeType === 'condition') return <div className="split-anchor" />;
  const branch = node.flowNodeType === 'block';
  const branchConfig = config as BranchConfig;
  const approvalConfig = config as ApprovalConfig;
  const invalid = branch ? validateBranch(branchConfig) : validateApproval(approvalConfig);
  const summary = branch ? conditionSummary(branchConfig) : approvalSummary(approvalConfig);
  const priority = node.parent?.blocks.findIndex((n) => n.id === node.id);
  return (
    <button
      type="button"
      className={`flow-card ${branch ? 'branch-node' : 'approval-node'} ${
        selection?.node.id === node.id ? 'selected' : ''
      } ${branchConfig.isDefault ? 'default-branch' : ''}`}
      onClick={() => open(node, config)}
      aria-label={`配置${config.name}`}
    >
      <div className="node-heading">
        <span>{config.name}</span>
        <span className="node-meta">
          {branch
            ? `优先级：${(priority ?? 0) + 1}`
            : approvalConfig.mode === 'and'
            ? '会签'
            : '或签'}
        </span>
      </div>
      <div className={`node-content ${invalid ? 'incomplete' : ''}`}>
        {invalid ? (
          <>
            请设置 <span className="warning-mark">!</span>
          </>
        ) : branch ? (
          summary
        ) : (
          `审批人：${summary}`
        )}
      </div>
    </button>
  );
}
