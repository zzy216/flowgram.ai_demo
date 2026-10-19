import { useState } from 'react';

import {
  type FlowNodeEntity,
  useClientContext,
  usePlayground,
} from '@flowgram.ai/fixed-layout-editor';
import { Popover } from '@douyinfe/semi-ui';

import { nodeRegistries } from '../node-registries';
import { useAddNode } from '../hooks/use-add-node';

export const NodeAdder = ({
  from,
}: {
  from: FlowNodeEntity;
  to?: FlowNodeEntity;
  hoverActivated: boolean;
}) => {
  const [visible, setVisible] = useState(false);
  const playground = usePlayground();
  const context = useClientContext();
  const { handleAdd } = useAddNode();
  if (playground.config.readonlyOrDisabled) return null;
  return (
    <Popover
      trigger="click"
      position="rightTop"
      visible={visible}
      onVisibleChange={setVisible}
      showArrow
      content={
        <div className="add-menu">
          {['approval', 'condition'].map((type) => (
            <button
              key={type}
              onClick={() => {
                const json = nodeRegistries.find((r) => r.type === type)?.onAdd?.(context, from);
                if (json) handleAdd(json, from);
                setVisible(false);
              }}
            >
              <span className="add-menu-icon">{type === 'approval' ? '♙' : '⑂'}</span>
              {type === 'approval' ? '审批人' : '条件分支'}
            </button>
          ))}
        </div>
      }
    >
      <button className="node-plus" aria-label="添加节点" onMouseDown={(e) => e.stopPropagation()}>
        ＋
      </button>
    </Popover>
  );
};
