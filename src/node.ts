import { CodeCell, CodeCellModel, ICodeCellModel } from '@jupyterlab/cells';

const EDITOR_CLASS_NAME = 'mimerenderer-ipygraph-editor';

export class NodeCodeCellModel extends CodeCellModel implements ICodeCellModel {
  constructor(options: CodeCellModel.IOptions) {
    super(options);
  }
}

export class NodeCodeCell extends CodeCell {
  constructor(options: CodeCell.IOptions) {
    super(options);
    this.outputHidden = false;
    this.outputsScrolled = false;
    this.outputArea.show();

    this.addClass(EDITOR_CLASS_NAME);
  }
}