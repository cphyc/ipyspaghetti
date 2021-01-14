import { JSONObject } from '@lumino/coreutils';

import { OutputArea } from '@jupyterlab/outputarea';

import { ISessionContext } from '@jupyterlab/apputils';

import { Kernel, KernelMessage } from '@jupyterlab/services';
import { CodeCell } from '@jupyterlab/cells';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

/**
 * Execute code on an output area.
 */
export async function execute(
  code: string,
  output: OutputArea,
  sessionContext: ISessionContext,
  metadata?: JSONObject
): Promise<KernelMessage.IExecuteReplyMsg | undefined> {
  // Override the default for `stop_on_error`.
  let stopOnError = true;
  if (
    metadata &&
    Array.isArray(metadata.tags) &&
    metadata.tags.indexOf('raises-exception') !== -1
  ) {
    stopOnError = false;
  }
  const content: KernelMessage.IExecuteRequestMsg['content'] = {
    code,
    stop_on_error: stopOnError
  };

  console.log('Yolo sir!');

  const kernel = sessionContext.session?.kernel;
  if (!kernel) {
    throw new Error('Session has no kernel.');
  }
  const future = kernel.requestExecute(content, false, metadata);
  output.future = future;
  return future.done;
}

export class OutputArea2 extends OutputArea {

  graphData: string;

  set future(
    value: Kernel.IShellFuture<
      KernelMessage.IExecuteRequestMsg,
      KernelMessage.IExecuteReplyMsg
    >
  ) {
    super.future = value;
    const prev = value.onIOPub;
    this.graphData = "";
    value.onIOPub = (msg): void => {
      const msgType = msg.header.msg_type;
      if (msgType === 'stream') {
        const ret: any = msg.content;
        this.graphData += ret['text'];
      } else {
        prev(msg);
      }
    };
  }
}

export function cloneOutput(
  cell: CodeCell,
  rendermime: IRenderMimeRegistry
): OutputArea2 {
  return new OutputArea2({
    model: cell.model.outputs,
    contentFactory: cell.contentFactory,
    rendermime
  });
}
