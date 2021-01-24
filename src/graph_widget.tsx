import { ReactWidget } from '@jupyterlab/apputils';

import React, { ReactNode } from 'react';

import { GraphHandler } from './graph';
import { GraphAPI } from './graph_api';

interface IGraphComponentProps {
  setGraph: (gh: GraphHandler) => void;
  width: number;
  height: number;
  graphId: string;
  graphAPI: GraphAPI;
}


let currentId = 0;
class GraphComponent extends React.Component<IGraphComponentProps> {
  constructor(props: IGraphComponentProps) {
    super(props);
  }

  componentDidMount(): void {
    // We need to wait for the element to be added in the DOM before
    // initializing the graph.
    // TODO: fix
    const graph = new GraphHandler(
      `#${this.props.graphId}`,
      this.props.graphAPI
    );
    this.props.setGraph(graph);
  }

  render(): ReactNode {
    return (
      <canvas
        width={this.props.width}
        height={this.props.height}
        id={this.props.graphId}>
      </canvas>
    );
  }
}

/**A Lumino widget that displays a the graph as a react component. */
export class GraphEditor extends ReactWidget {
  private _graphId: string;
  private _width: number;
  private _height: number;
  private _graphAPI: GraphAPI;
  private _graphHandler: GraphHandler;

  constructor(graphApi: GraphAPI) {
    super();
    currentId++;
    this._graphId = `graph-${currentId.toString()}`;
    this._width = window.outerWidth;
    this._height = window.outerHeight;
    this._graphAPI = graphApi;
  }


  render(): JSX.Element {
    return (
      <GraphComponent
        data-jp-suppress-context-menu
        setGraph={this.setGraph}
        graphId={this._graphId}
        width={this._width}
        height={this._height}
        graphAPI={this._graphAPI}
      />
    );
  }

  setGraph = (gh: GraphHandler): void => {
    this._graphHandler = gh;
  }

  get graphHandler(): GraphHandler {
    return this._graphHandler;
  }
}