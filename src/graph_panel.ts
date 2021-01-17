import { Toolbar, SessionContext, MainAreaWidget } from '@jupyterlab/apputils';

import { BoxPanel, SplitPanel } from '@lumino/widgets';

import { IMyPublicAPI } from './mime';

import { GraphEditor } from './graph_widget';

import { GraphAPI } from './graph_api';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';


/** Inputs/outputs of functions */
export interface IFunctionSchemaIO {
  type: string;
  optional: boolean;
}

/** Schema of a function */
export interface IFunctionSchema {
  inputs: { [id: string]: IFunctionSchemaIO };
  outputs: { [id: string]: IFunctionSchemaIO };
  name: string;
  source: string;
}

/** Schema of a graph node cell */
export interface IGraphNodeSchema {
  id: number;
  function: IFunctionSchema;
}

const EDITOR_CLASS_NAME = 'mimerenderer-ipygraph-editor';

/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'mimerenderer-ipygraph';
export class GraphEditionPanel extends MainAreaWidget<SplitPanel>
  implements IRenderMime.IRenderer {
  constructor(api: IMyPublicAPI, options: SplitPanel.IOptions) {
    const content = new SplitPanel(options);
    super({ content });

    // this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);

    const { sessions } = api.manager.manager;
    const { kernelspecs } = api.manager.manager;

    const sessionContext = new SessionContext({
      sessionManager: sessions,
      specsManager: kernelspecs,
      name: 'IPyGraph Kernel'
    });

    this.addClass(EDITOR_CLASS_NAME);

    // Initialize the API
    const { rendermime } = api.manager;
    const graphAPI = new GraphAPI(sessionContext, rendermime);

    // Create the widgets
    createGraphToolbar(this.toolbar, sessionContext);

    const graphEditor = new GraphEditor(graphAPI);
    const functionEditorBox = new BoxPanel({});
    const nodeViewerBox = new BoxPanel({});

    graphAPI.setWidgets(graphEditor, functionEditorBox, nodeViewerBox);

    // Setup code box
    const codeBox = new SplitPanel({});
    SplitPanel.setStretch(functionEditorBox, 1);
    SplitPanel.setStretch(nodeViewerBox, 1);
    codeBox.addWidget(functionEditorBox);
    codeBox.addWidget(nodeViewerBox);

    // Setup content
    SplitPanel.setStretch(graphEditor, 1);
    SplitPanel.setStretch(codeBox, 1);
    content.addWidget(graphEditor);
    content.addWidget(codeBox);
  }

  /**
   * Render ipygraph into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    // const data = model.data[this._mimeType] as string;
    // const magicString = '___NODES = """';
    // const splitPoint = data.indexOf(magicString);
    // this._cell.model.value.text = data.substr(0, splitPoint);
    // const endPoint = data.lastIndexOf('"""');
    // this._graphData = data.substring(splitPoint + magicString.length, endPoint);
  }
}

function createGraphToolbar(
  toolbar: Toolbar,
  sessionContext: SessionContext
): void {
  // toolbar.addItem('reload-nodes', reloadNodes);
  // toolbar.addItem('run-graph', runGraph);
  toolbar.addItem('spacer', Toolbar.createSpacerItem());
  toolbar.addItem('interrupt', Toolbar.createInterruptButton(sessionContext));
  toolbar.addItem('restart', Toolbar.createRestartButton(sessionContext));
  toolbar.addItem('name', Toolbar.createKernelNameItem(sessionContext));
  toolbar.addItem('status', Toolbar.createKernelStatusItem(sessionContext));
}
