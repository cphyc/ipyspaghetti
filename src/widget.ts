import {
  ABCWidgetFactory,
  DocumentRegistry,
  IDocumentWidget,
  DocumentWidget
} from '@jupyterlab/docregistry';

import { GraphEditionPanel } from './graph_panel';

import { MyPublicAPI } from './mime';

/**
 * A document widget for CSV content widgets.
 */
export class GraphDocument extends DocumentWidget<GraphEditionPanel> {
  constructor(options: DocumentWidget.IOptions<GraphEditionPanel>) {
    super(options);
  }
  setFragment(fragment: string): void {
    console.log('Fragment?', fragment);
  }
}

/**
 * A widget factory for IPyg widgets.
 */
export class IPygViewerFactory extends ABCWidgetFactory<
  IDocumentWidget<GraphEditionPanel>
> {
  constructor(
    options: DocumentRegistry.IWidgetFactoryOptions<
      IDocumentWidget<GraphEditionPanel>
    >
  ) {
    super(options);
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget<GraphEditionPanel> {
    const content = new GraphEditionPanel(MyPublicAPI, {
      orientation: 'vertical',
      context: context
    });
    return new GraphDocument({ content, context });
  }
}