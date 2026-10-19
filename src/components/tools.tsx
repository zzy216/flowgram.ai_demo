import { useEffect, useState } from 'react';

import { useClientContext, usePlaygroundTools } from '@flowgram.ai/fixed-layout-editor';

export function Tools() {
  const { history } = useClientContext();
  const tools = usePlaygroundTools();
  const [, refresh] = useState(0);
  useEffect(() => {
    const listener = history.undoRedoService.onChange(() => refresh((v) => v + 1));
    return () => listener.dispose();
  }, [history]);
  return (
    <>
      <div className="canvas-tools" aria-label="画布工具">
        <button aria-label="缩小" onClick={() => tools.zoomout()} disabled={tools.zoom <= 0.2}>
          −
        </button>
        <span>{Math.round(tools.zoom * 100)}%</span>
        <button aria-label="放大" onClick={() => tools.zoomin()} disabled={tools.zoom >= 2}>
          ＋
        </button>
        <i />
        <button onClick={() => tools.fitView()}>适应画布</button>
      </div>
      <div className="history-tools">
        <button
          aria-label="撤销"
          title="撤销"
          disabled={!history.canUndo()}
          onClick={() => history.undo()}
        >
          ↶
        </button>
        <button
          aria-label="重做"
          title="重做"
          disabled={!history.canRedo()}
          onClick={() => history.redo()}
        >
          ↷
        </button>
      </div>
    </>
  );
}
