import {
  Toolbar,
  SessionContext,
  MainAreaWidget,
  sessionContextDialogs
} from '@jupyterlab/apputils';

import { BoxPanel, SplitPanel } from '@lumino/widgets';

import { IMyPublicAPI } from './mime';

import { GraphEditor } from './graph_widget';

import { GraphAPI } from './graph_api';

import { IRenderMime } from '@jupyterlab/rendermime-interfaces';

import { CodeMirrorMimeTypeService } from '@jupyterlab/codemirror';

import { CodeCell } from '@jupyterlab/cells';


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
  private _sessionContext: SessionContext;
  private _mimeRendererOptions: IRenderMime.IRendererOptions;
  private _graphAPI: GraphAPI;
  // private _mimeRendererOptions: IRenderMime.IRendererOptions;
  constructor(
    api: IMyPublicAPI,
    options: SplitPanel.IOptions,
    mimeRendererOptions: IRenderMime.IRendererOptions
  ) {
    const content = new SplitPanel(options);
    super({ content });

    const { sessions, kernelspecs } = api.manager.manager;

    const sessionContext = new SessionContext({
      sessionManager: sessions,
      specsManager: kernelspecs,
      name: 'IPyGraph Kernel'
    });

    // this._mimeType = options.mimeType;
    this.addClass(CLASS_NAME);

    // Initialize the API
    const { rendermime } = api.manager;
    const graphAPI = new GraphAPI(sessionContext, rendermime);

    // Create the widgets
    createGraphToolbar(this.toolbar, sessionContext);

    const graphEditor = new GraphEditor(graphAPI);
    const functionEditorBox = new BoxPanel({});
    const nodeViewerBox = new BoxPanel({});
    [functionEditorBox, nodeViewerBox].forEach(widget => {
      widget.addClass(EDITOR_CLASS_NAME);
    });

    // Attach the widget now that the kernel is ready
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

    // Change the mime type of cells when the kernel has loaded
    const mimeService = new CodeMirrorMimeTypeService();
    sessionContext.kernelChanged.connect(() => {
      sessionContext.session?.kernel?.info.then(async info => {
        const lang = info.language_info;
        const mimeType = mimeService.getMimeTypeByLanguage(lang);
        for (const box of [nodeViewerBox, functionEditorBox]) {
          box.widgets.forEach(w => ((w as CodeCell).model.mimeType = mimeType));
        }
        await graphAPI.executeGlobals();
        await graphAPI.loadFunctionList();
      });
    });

    this._sessionContext = sessionContext;
    this._mimeRendererOptions = mimeRendererOptions;
    this._graphAPI = graphAPI;

    // Query a kernel
    sessionContext
      .initialize()
      .then(async value => {
        if (value) {
          await sessionContextDialogs.selectKernel(sessionContext);
        }
      })
      .catch(reason => {
        console.error(
          `Failed to initialize the session in ExamplePanel.\n${reason}`
        );
      });
    this._sessionContext;
  }

  /**
   * Render ipygraph into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    // Launch a kernel
    console.log('HERE');
    const mimeType = this._mimeRendererOptions.mimeType;
    const code = model.data[mimeType] as string;
    await this._graphAPI.setupGlobals(code);
    // TODO: load nodes

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
