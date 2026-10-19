import { useMemo } from 'react';

import { defaultFixedSemiMaterials } from '@flowgram.ai/fixed-semi-materials';
import {
  Field,
  type FixedLayoutProps,
  type FlowDocumentJSON,
  type FlowNodeRegistry,
  FlowRendererKey,
} from '@flowgram.ai/fixed-layout-editor';

import type { NodeConfig } from '../workflow';
import { NodeAdder } from '../components/node-adder';
import { BranchAdder } from '../components/branch-adder';
import { BaseNode, NodeCard } from '../components/base-node';

export function useEditorProps(
  initialData: FlowDocumentJSON,
  nodeRegistries: FlowNodeRegistry[]
): FixedLayoutProps {
  return useMemo(
    () => ({
      background: false,
      readonly: false,
      initialData,
      nodeRegistries,
      getNodeDefaultRegistry: (type) => ({
        type,
        meta: { defaultExpanded: true, draggable: false, selectable: false, spacing: 70 },
        formMeta: {
          render: () => (
            <Field<NodeConfig> name="config">
              {({ field }) => <NodeCard config={field.value} />}
            </Field>
          ),
        },
      }),
      materials: {
        components: {
          ...defaultFixedSemiMaterials,
          [FlowRendererKey.ADDER]: NodeAdder,
          [FlowRendererKey.BRANCH_ADDER]: BranchAdder,
        },
        renderDefaultNode: BaseNode,
      },
      nodeEngine: { enable: true },
      history: { enable: true, enableChangeNode: true },
      onAllLayersRendered: (ctx) => {
        setTimeout(() => ctx.playground.config.fitView(ctx.document.root.bounds.pad(70)), 30);
      },
    }),
    [initialData, nodeRegistries]
  );
}
