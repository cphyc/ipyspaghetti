import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { IMyManager } from './manager';

import { GraphEditionPanel } from './graph_panel';

/**
 * The default mime type for the extension.
 */
const MIME_TYPE = 'application/vnd.ipython.graph+json';

export interface IMyPublicAPI {
  manager: IMyManager;
}

/**
 * A public API to communicate with the graph mime handler
 */
export const MyPublicAPI: IMyPublicAPI = {
  manager: null
};

/**
 * A mime renderer factory for ipygraph data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MIME_TYPE],
  createRenderer: (options: IRenderMime.IRendererOptions) => {
    return new GraphEditionPanel(
      MyPublicAPI,
      { orientation: 'vertical' },
      options
    );
  }
};

/**
 * Extension definition.
 */
const extension: IRenderMime.IExtension = {
  id: '@node_editor/mime:plugin',
  rendererFactory,
  rank: 0,
  dataType: 'string',
  fileTypes: [
    {
      name: 'ipygraph',
      mimeTypes: [MIME_TYPE],
      extensions: ['.ipyg']
    }
  ],
  documentWidgetFactoryOptions: {
    name: 'IPython Graph Viewer',
    primaryFileType: 'ipygraph',
    fileTypes: ['ipygraph'],
    defaultFor: ['ipygraph']
  }
};

export default extension;
