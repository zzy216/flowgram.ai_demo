import { createContext, useContext } from 'react';

import type { FlowNodeEntity } from '@flowgram.ai/fixed-layout-editor';

import type { NodeConfig } from '../workflow';

export interface Selection {
  node: FlowNodeEntity;
  config: NodeConfig;
}
export const DesignerContext = createContext<{
  selection: Selection | null;
  open: (node: FlowNodeEntity, config: NodeConfig) => void;
  close: () => void;
  notify: (message: string) => void;
}>({ selection: null, open: () => {}, close: () => {}, notify: () => {} });
export const useDesigner = () => useContext(DesignerContext);
