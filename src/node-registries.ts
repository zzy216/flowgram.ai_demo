import type { FlowNodeRegistry } from '@flowgram.ai/fixed-layout-editor';

import { approvalDefaults, branchDefaults, uid } from './workflow';

export const nodeRegistries: FlowNodeRegistry[] = [
  { type: 'start', meta: { deleteDisable: true, copyDisable: true } },
  { type: 'end', meta: { deleteDisable: true, copyDisable: true } },
  {
    type: 'condition',
    extend: 'dynamicSplit',
    onAdd: () => ({
      id: `condition_${uid()}`,
      type: 'condition',
      blocks: [
        { id: `branch_${uid()}`, type: 'block', data: { config: branchDefaults() } },
        { id: `branch_${uid()}`, type: 'block', data: { config: branchDefaults(true) } },
      ],
    }),
  },
  {
    type: 'blockIcon',
    meta: { size: { width: 1, height: 0 }, autoResizeDisable: true, spacing: 0 },
  },
  { type: 'block', meta: { deleteDisable: true, copyDisable: true } },
  {
    type: 'approval',
    onAdd: () => ({
      id: `approval_${uid()}`,
      type: 'approval',
      data: { config: approvalDefaults() },
    }),
  },
];
