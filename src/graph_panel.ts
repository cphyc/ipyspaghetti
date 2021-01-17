import { Toolbar, SessionContext } from '@jupyterlab/apputils';

import { BoxPanel, SplitPanel } from '@lumino/widgets';

import { IMyPublicAPI } from './mime';

import { GraphEditor } from './graph_widget';

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

export class GraphEditionPanel extends BoxPanel {
  constructor(
    sessionContext: SessionContext,
    api: IMyPublicAPI,
    options: BoxPanel.IOptions
  ) {
    super(options);

    this.addClass(EDITOR_CLASS_NAME);

    // Initialize the API
    const { rendermime } = api.manager;
    const graphAPI = new GraphAPI(sessionContext, rendermime);

    // Create the widgets
    const toolbar = createGraphToolbar(sessionContext);
    toolbar.show();

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

    // Setup edition zone
    const editionZone = new SplitPanel({ orientation: 'vertical' });
    SplitPanel.setStretch(graphEditor, 1);
    SplitPanel.setStretch(codeBox, 1);
    editionZone.addWidget(graphEditor);
    editionZone.addWidget(codeBox);

    // Add the widget
    BoxPanel.setStretch(toolbar, 0);
    BoxPanel.setStretch(editionZone, 1);
    this.addWidget(toolbar);
    this.addWidget(editionZone);
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
