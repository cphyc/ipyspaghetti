import { ReactWidget } from '@jupyterlab/apputils';

import React, { ReactNode } from 'react';

import { GraphHandler } from './graph';

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
    const graph = new GraphHandler(`#${this.myId}`, this.props.executeCell);
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

export class GraphWidget extends ReactWidget {
  /**
   * Constructs a new CounterWidget.
   */
  constructor(execute: Function) {
    super();
    this.addClass('jp-graphContainerWidget');
    this._execute = execute;
  }

  setGraph(g: GraphHandler): void {
    this._graph = g;
  }

  get graph(): GraphHandler {
    return this._graph;
  }

  render(): JSX.Element {
    // TODO: fix this
    // @ts-ignore
    return <GraphComponent setGraph={this.setGraph.bind(this)} executeCell={this.execute}
    />;
  }

  get execute(): Function {
    return this._execute;
  }

  private _graph: GraphHandler;
  private _execute: Function;
}
