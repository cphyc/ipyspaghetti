import { ReactWidget } from '@jupyterlab/apputils';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Widget } from '@lumino/widgets';

import React, { ReactNode } from 'react';

import { INodeCallback, GraphHandler } from './graph';

/**
 * React component for a counter.
 *
 * @returns The React component
 */

let currentId = 0;
class GraphComponent extends React.Component {
  private myId: string;
  private width: number;
  private height: number;

  constructor(props: object) {
    super(props);
    const myId = `graph-${currentId}`;
    currentId++;
    this.myId = myId;
    this.width = window.outerWidth;
    this.height = window.outerHeight;
  }

  componentDidMount(): void {
    // We need to wait for the element to be added in the DOM before
    // initializing the graph.
    // TODO: fix
    // @ts-ignore
    const options = this.props.options as IGraphWidgetOptions;

    const graph = new GraphHandler({
      id: `#${this.myId}`,
      // @ts-ignore
      execute: options.execute,
      // @ts-ignore
      widget: options.execute,
      rendermime: options.rendermime
    });
    // TODO: fix
    // @ts-ignore
    this.props.setGraph(graph);
  }

  render(): ReactNode {
    return (
      <canvas width={this.width} height={this.height} id={this.myId}></canvas>
    );
  }
}

export interface IGraphWidgetOptions {
  execute: INodeCallback;
  widget: Widget;
  rendermime: IRenderMimeRegistry
}

export class GraphWidget extends ReactWidget {
  /**
   * Constructs a new CounterWidget.
   */
  constructor(options: IGraphWidgetOptions) {
    super();
    this.addClass('jp-graphContainerWidget');
    this._options = options;
  }

  setGraph(g: GraphHandler): void {
    this._graph = g;
  }

  get graph(): GraphHandler {
    return this._graph;
  }

  render(): JSX.Element {
    // TODO: fix this
    return (
      <GraphComponent
        // @ts-ignore
        setGraph={this.setGraph.bind(this)}
        options={this._options}
      />
    );
  }

  private _graph: GraphHandler;
  private _options: IGraphWidgetOptions;
}
