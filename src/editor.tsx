import { useCallback, useEffect, useRef, useState } from 'react';

import {
  FixedLayoutEditorProvider,
  EditorRenderer,
  useClientContext,
  type FlowDocumentJSON,
  type FlowNodeEntity,
} from '@flowgram.ai/fixed-layout-editor';

import '@flowgram.ai/fixed-layout-editor/index.css';
import './index.css';

import { STORAGE_KEY, readSavedFlow, validateFlow, type NodeConfig } from './workflow';
import { nodeRegistries } from './node-registries';
import { initialData } from './initial-data';
import { useEditorProps } from './hooks/use-editor-props';
import { Tools } from './components/tools';
import { DesignerContext, type Selection } from './components/designer-context';
import { ConfigDrawer } from './components/config-drawer';

function Designer({ hideTools }: { hideTools?: boolean }) {
  const { document: flowDocument, history } = useClientContext();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const close = useCallback(() => setSelection(null), []);
  const open = useCallback(
    (node: FlowNodeEntity, config: NodeConfig) => setSelection({ node, config }),
    []
  );
  const notify = useCallback((message: string) => {
    clearTimeout(timer.current);
    setNotice(message);
    timer.current = setTimeout(() => setNotice(''), 3200);
  }, []);
  useEffect(() => {
    const sub = history.undoRedoService.onChange(() => {
      setDirty(true);
      setRevision((v) => v + 1);
    });
    return () => {
      sub.dispose();
      clearTimeout(timer.current);
    };
  }, [history]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function save() {
    const flow = flowDocument.toJSON();
    const error = validateFlow(flow);
    if (error) {
      notify(`请先完成配置：${error}`);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, flow }));
      setDirty(false);
      setSaved(true);
      notify('流程已保存到当前浏览器');
    } catch {
      notify('保存失败，浏览器存储空间不可用。请导出 JSON 备份。');
    }
  }
  function exportFlow() {
    const blob = new Blob([JSON.stringify({ version: 1, flow: flowDocument.toJSON() }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '审批流程.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('流程 JSON 已导出');
  }
  return (
    <DesignerContext.Provider value={{ selection, open, close, notify }}>
      <div className="approval-designer" data-revision={revision}>
        <header className="app-header" {...(selection ? { inert: '' } : {})}>
          <div className="brand">
            <div className="brand-mark">✓</div>
            <div>
              <h1>审批流程设计器</h1>
              <p>基于 FlowGram 固定布局</p>
            </div>
          </div>
          <div className="header-actions">
            <span className={`save-state ${dirty ? 'unsaved' : ''}`}>
              <span />
              {dirty ? '有未保存的更改' : saved ? '已保存到本地' : '本地流程'}
            </span>
            <button className="button" onClick={exportFlow}>
              导出 JSON
            </button>
            <button className="button primary" onClick={save}>
              保存流程
            </button>
          </div>
        </header>
        <main className="canvas-area" {...(selection ? { inert: '' } : {})}>
          <div className="canvas-hint">
            点击节点配置审批人，点击 <b>＋</b> 添加节点
          </div>
          <EditorRenderer className="demo-fixed-editor" />
          {!hideTools && <Tools />}
        </main>
        <div className="local-note">配置仅保存在当前浏览器</div>
        {notice && (
          <div className="toast" role="status">
            {notice}
          </div>
        )}
        {selection && <ConfigDrawer key={selection.node.id} selection={selection} />}
      </div>
    </DesignerContext.Provider>
  );
}
export const Editor = (props: { demo?: string; hideTools?: boolean }) => {
  const [data] = useState<FlowDocumentJSON>(() => {
    try {
      return (readSavedFlow(localStorage.getItem(STORAGE_KEY)) as FlowDocumentJSON) || initialData;
    } catch {
      return initialData;
    }
  });
  const editorProps = useEditorProps(data, nodeRegistries);
  return (
    <FixedLayoutEditorProvider {...editorProps}>
      <Designer hideTools={props.hideTools} />
    </FixedLayoutEditorProvider>
  );
};
