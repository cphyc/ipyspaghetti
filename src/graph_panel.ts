import { Toolbar, SessionContext } from '@jupyterlab/apputils';

import { BoxPanel, SplitPanel, StackedPanel } from '@lumino/widgets';

import { IMyPublicAPI } from './mime';

import { GraphEditor } from './graph_widget2';

import { GraphAPI } from './graph_api';


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

export class GraphEditionPanel extends StackedPanel {
  constructor(
    sessionContext: SessionContext,
    api: IMyPublicAPI,
    options: StackedPanel.IOptions
  ) {
    super(options);

    this.addClass(EDITOR_CLASS_NAME);

    // Initialize the API
    const { rendermime } = api.manager;
    const graphAPI = new GraphAPI(sessionContext, rendermime);

    // Create the widgets
    const toolbar = createGraphToolbar(sessionContext);

    const graphEditor = new GraphEditor(graphAPI);
    const codeBox = new SplitPanel({});
    const functionEditorBox = new BoxPanel({});
    const nodeViewerBox = new BoxPanel({});

    graphAPI.setWidgets(graphEditor, functionEditorBox, nodeViewerBox);

    // Setup code box
    SplitPanel.setStretch(functionEditorBox, 1);
    SplitPanel.setStretch(nodeViewerBox, 1);
    codeBox.addWidget(functionEditorBox);
    codeBox.addWidget(nodeViewerBox);

    const editionWidget = new SplitPanel({});
    SplitPanel.setStretch(graphEditor, 1);
    SplitPanel.setStretch(codeBox, 1);
    editionWidget.addWidget(graphEditor);
    editionWidget.addWidget(codeBox);

    // Add the widget
    this.addWidget(toolbar);
    this.addWidget(editionWidget);
  }
}


function createGraphToolbar(sessionContext: SessionContext): Toolbar {
  const toolbar = new Toolbar();
  // toolbar.addItem('reload-nodes', reloadNodes);
  // toolbar.addItem('run-graph', runGraph);
  toolbar.addItem('spacer', Toolbar.createSpacerItem());
  toolbar.addItem('interrupt', Toolbar.createInterruptButton(sessionContext));
  toolbar.addItem('restart', Toolbar.createRestartButton(sessionContext));
  toolbar.addItem('name', Toolbar.createKernelNameItem(sessionContext));
  toolbar.addItem('status', Toolbar.createKernelStatusItem(sessionContext));

  return toolbar;
}
