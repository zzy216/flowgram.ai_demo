import { type FlowNodeEntity, useClientContext } from '@flowgram.ai/fixed-layout-editor';

import { branchDefaults, uid } from '../workflow';

export function BranchAdder({ node }: { activated?: boolean; node: FlowNodeEntity }) {
  const { operation } = useClientContext();
  return (
    <button
      className="branch-adder"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() =>
        operation.addBlock(
          node,
          { id: `branch_${uid()}`, type: 'block', data: { config: branchDefaults() } },
          { index: Math.max(0, node.blocks.length - 1) }
        )
      }
    >
      ＋添加条件
    </button>
  );
}
