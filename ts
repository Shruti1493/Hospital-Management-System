
'use strict';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './index.less';
import 'butterfly-dag/dist/index.css';
import * as _ from 'lodash';
import LineageCanvas from './canvas/canvas';
import {
  transformInitData,
  transformEdges,
  diffPropsData,
  updateCanvasData,
  diffActionMenuData
} from './adaptor';
import ActionMenu, { action } from './component/action-menu';

interface ComProps {
  width?: number | string;
  height?: number | string;
  tables: Array<ITable>;
  relations: Array<IRelation>;
  className?: string;
  actionMenu: action[]; // Action menu
  config?: {
    titleRender: (node: ITable) => void; // Custom title renderer for nodes
    showActionIcon?: boolean; // Whether to show action icons: zoom in, zoom out, focus
    enableHoverChain: boolean; // Whether to highlight lineage path on hover
    minimap?: { // Minimap configuration
      enable: boolean;
      config: {
        nodeColor: any;
      };
    };
    gridMode: {
      isAdsorb: boolean;
      theme: {
        shapeType: string; // Type of grid shape: 'line' or 'circle'
        gap: number; // Grid spacing
        lineWidth: number; // Line thickness
        lineColor: string; // Line color
        circleRadiu: number; // Circle radius
        circleColor: string; // Circle color
      };
    };
    butterfly: any; // Butterfly DAG canvas config: https://github.com/alibaba/butterfly/blob/dev/v4/docs/zh-CN/canvas.md
  };
  emptyContent?: string | JSX.Element;
  emptyWidth?: number | string;
  centerId?: string;
  onChange(data: any): void;
  onLoaded(canvas: any): void;
}

interface ITable {
  id: string; // Table ID
  name: string; // Table name (display)
  isCollapse: boolean; // Collapse all columns
  fields: Array<columns>; // Table columns
}

interface IRelation {
  id?: string; // Relation ID (optional, but recommended)
  srcTableId: string; // Source table ID
  tgtTableId: string; // Target table ID
  srcTableColName: string; // Source column name
  tgtTableColName: string; // Target column name
}

// Similar to Ant Design Table's column definition
interface columns {
  key: string;
  width?: number;
  primaryKey: boolean;
  render?(text: any, record: any, index: number): void;
}

export default class LineageDag extends React.Component<ComProps, any> {
  props: any;
  protected _isFirstFocus: any;
  protected canvas: any;
  protected canvasData: any;
  protected originEdges: any;

  constructor(props: ComProps) {
    super(props);
    this.canvas = null;
    this.canvasData = null;
    this.originEdges = [];
    this._isFirstFocus = false;
  }

  componentDidMount() {
    let root = ReactDOM.findDOMNode(this) as HTMLElement;

    let enableHoverChain = this.props.config?.enableHoverChain ?? true;
    let titleRender = this.props.config?.titleRender;

    let canvasObj = {
      root: root,
      disLinkable: false,
      linkable: false,
      draggable: false,
      zoomable: true,
      moveable: true,
      theme: {
        edge: {
          type: 'endpoint',
          arrow: true,
          isExpandWidth: true,
          arrowPosition: 1,
          arrowOffset: -5
        },
        endpoint: {
          limitNum: undefined,
          expandArea: {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
          }
        }
      },
      data: {
        enableHoverChain: enableHoverChain
      }
    };

    this.canvas = new LineageCanvas(canvasObj);

    let result = transformInitData({
      tables: this.props.tables,
      relations: this.props.relations,
      columns: this.props.columns,
      operator: this.props.operator,
      _titleRender: titleRender,
      _enableHoverChain: enableHoverChain,
      _emptyContent: this.props.emptyContent,
      _emptyWidth: this.props.emptyWidth
    });

    this.originEdges = result.edges;

    result = transformEdges(result.nodes, _.cloneDeep(result.edges));
    this.canvasData = {
      nodes: result.nodes,
      edges: result.edges
    };

    setTimeout(() => {
      let tmpEdges = result.edges;
      result.edges = [];
      this.canvas.draw(result, () => {
        this.canvas.relayout({
          edges: tmpEdges.map((item) => ({
            source: item.sourceNode,
            target: item.targetNode
          }))
        });
        this.canvas.addEdges(tmpEdges, true);

        const minimap = this.props.config?.minimap || {};
        const minimapCfg = _.assign({}, minimap.config, {
          events: ['system.node.click', 'system.canvas.click']
        });

        if (minimap && minimap.enable) {
          this.canvas.setMinimap(true, minimapCfg);
        }

        if (this.props.config?.gridMode) {
          this.canvas.setGridMode(true, _.assign({}, this.props.config.gridMode));
        }

        if (result.nodes.length !== 0) {
          this.canvas.focusCenterWithAnimate();
          this._isFirstFocus = true;
        }

        this.forceUpdate();
        this.props.onLoaded && this.props.onLoaded(this.canvas);
      });

      this.canvas.on('system.node.click', (data) => {
        let node = data.node;
        this.canvas.focus(node.id);
      });

      this.canvas.on('system.canvas.click', () => {
        this.canvas.unfocus();
      });
    }, this.props.config?.delayDraw || 0);
  }

  shouldComponentUpdate(newProps: ComProps, newState: any) {
    let enableHoverChain = _.get(newProps, 'config.enableHoverChain', true);
    let titleRender = _.get(this.props, 'config.titleRender');

    let result = transformInitData({
      tables: newProps.tables,
      relations: newProps.relations,
      columns: this.props.columns,
      operator: this.props.operator,
      _titleRender: titleRender,
      _enableHoverChain: enableHoverChain,
      _emptyContent: this.props.emptyContent,
      _emptyWidth: this.props.emptyWidth
    });

    this.originEdges = result.edges;

    result = transformEdges(result.nodes, _.cloneDeep(result.edges));
    let diffInfo = diffPropsData(result, this.canvasData);
    let isNeedRelayout = false;

    if (diffInfo.rmEdges.length > 0) {
      this.canvas.removeEdges(diffInfo.rmEdges.map(edge => edge.id));
      isNeedRelayout = true;
    }

    if (diffInfo.rmNodes.length > 0) {
      this.canvas.removeNodes(diffInfo.rmNodes.map(item => item.id));
      isNeedRelayout = true;
    }

    if (diffInfo.addNodes.length > 0) {
      this.canvas.addNodes(diffInfo.addNodes);
      isNeedRelayout = true;
    }

    if (diffInfo.collapseNodes.length > 0) {
      diffInfo.collapseNodes.forEach((item) => {
        let node = this.canvas.getNode(item.id);
        node.collapse(item.isCollapse);
      });
      isNeedRelayout = true;
    }

    if (diffInfo.addEdges.length > 0) {
      this.canvas.addEdges(diffInfo.addEdges);
      isNeedRelayout = true;
    }

    if (isNeedRelayout) {
      this.canvas.relayout({
        centerNodeId: newProps.centerId
      });

      let nodesRenderPromise = this.canvas.nodes.map(item => item._renderPromise);
      this.canvas._renderPromise = Promise.all(nodesRenderPromise).then(() => {
        return new Promise<void>((resolve) => {
          if (newProps.centerId) {
            this.canvas.focusNodeWithAnimate(newProps.centerId, 'node', {}, () => {
              setTimeout(resolve, 50);
            });
            this.canvas.focus(newProps.centerId);
          } else {
            if (!this._isFirstFocus) {
              this.canvas.focusCenterWithAnimate();
              this._isFirstFocus = true;
            }
            resolve();
          }
        });
      });
    }

    this.canvasData = result;
    updateCanvasData(result.nodes, this.canvas.nodes);

    // React update is needed if the action menu has changed
    let isNeedUpdate = diffActionMenuData(newProps.actionMenu, this.props.actionMenu);
    return isNeedUpdate;
  }

  render() {
    const { canvas } = this;
    const { actionMenu = [] } = this.props;
    const actionMenuVisible = _.get(this, 'props.config.showActionIcon', true);

    return (
      <div className={this._genClassName()}>
        <ActionMenu
          canvas={canvas}
          actionMenu={actionMenu}
          visible={actionMenuVisible}
        />
      </div>
    );
  }

  _genClassName() {
    return this.props.className
      ? `${this.props.className} butterfly-lineage-dag`
      : 'butterfly-lineage-dag';
  }
}
