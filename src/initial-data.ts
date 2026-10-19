import type { FlowDocumentJSON } from '@flowgram.ai/fixed-layout-editor';

import { approvalDefaults } from './workflow';

export const initialData: FlowDocumentJSON = {
  nodes: [
    { id: 'start', type: 'start', data: { title: '发起审批' } },
    {
      id: 'approval_initial',
      type: 'approval',
      data: { config: { ...approvalDefaults(), name: '审批', types: ['发起人'] } },
    },
    { id: 'end', type: 'end', data: { title: '审批通过' } },
  ],
};
