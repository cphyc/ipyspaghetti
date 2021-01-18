import { JSONObject } from '@lumino/coreutils';

import { OutputArea, SimplifiedOutputArea } from '@jupyterlab/outputarea';

import { ISessionContext } from '@jupyterlab/apputils';

import { Kernel, KernelMessage } from '@jupyterlab/services';

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

  const kernel = sessionContext.session?.kernel;
  if (!kernel) {
    throw new Error('Session has no kernel.');
  }
  const future = kernel.requestExecute(content, false, metadata);
  output.future = future;
  return future.done;
}

export class OutputAreaInteractRegistry extends SimplifiedOutputArea {
  private _IOPubStream: string;

  set future(
    value: Kernel.IShellFuture<
      KernelMessage.IExecuteRequestMsg,
      KernelMessage.IExecuteReplyMsg
    >
  ) {
    super.future = value;
    const prevOnIOPub = value.onIOPub;
    this._IOPubStream = '';
    value.onIOPub = (msg): void => {
      const msgType = msg.header.msg_type;
      if (msgType === 'stream') {
        const ret: any = msg.content;
        this._IOPubStream += ret.text;
      }
      prevOnIOPub(msg);
    };
  }

  get IOPubStream(): any {
    return this._IOPubStream;
  }
}
