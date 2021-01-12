import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { Widget } from '@lumino/widgets';

import { IMyManager } from './manager';

/**
 * The default mime type for the extension.
 */
const MIME_TYPE = 'application/vnd.ipython.graph+json';

/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'mimerenderer-ipygraph';

/**
 * A widget for rendering ipygraph.
 */
export class OutputWidget extends Widget implements IRenderMime.IRenderer {
  /**
   * Construct a new output widget.
   */
  constructor(options: IRenderMime.IRendererOptions, api: IMyPublicAPI) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);
    this._api = api;
  }

  /**
   * Render ipygraph into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const data = model.data[this._mimeType] as string;
    this.node.textContent = data.substr(0, data.indexOf('___NODES = """'));
    console.log(this._api.manager.cellValue);
    this._api.manager.execute(this.node.textContent);
    this._api.manager.cellValue = 'registry';
    // return Promise.resolve();
    return;
  }

  private _mimeType: string;
  private _api: IMyPublicAPI;
}

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
  createRenderer: options => new OutputWidget(options, MyPublicAPI)
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
