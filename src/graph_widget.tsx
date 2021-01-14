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
    new GraphHandler(`#${this.myId}`);
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
  constructor() {
    super();
    this.addClass('jp-graphContainerWidget');
  }

  render(): JSX.Element {
    return <GraphComponent />;
  }
}
