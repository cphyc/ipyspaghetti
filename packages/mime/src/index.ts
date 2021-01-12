import { IRenderMime } from '@jupyterlab/rendermime-interfaces';



import { Widget } from '@lumino/widgets';

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
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);
  }

  /**
   * Render ipygraph into this widget's node.
   */
  renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    
    let data = model.data[this._mimeType] as string;
    this.node.textContent = data.slice(0, 16384);
    
    return Promise.resolve();
  }

  private _mimeType: string;
}

/**
 * A mime renderer factory for ipygraph data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MIME_TYPE],
  createRenderer: options => new OutputWidget(options)
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
