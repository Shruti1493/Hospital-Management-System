'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { Layout, Tooltip } from 'antd';
import * as _ from 'lodash';
import LineageDag from '../src/index.tsx';
import { mockData } from './mock_data/data';

import 'antd/dist/antd.css';
import './index.less';

import {
  BorderOuterOutlined,
  DownSquareOutlined,
  CloseCircleOutlined,
  StarOutlined,
} from '@ant-design/icons';

const { Header } = Layout;

class Com extends React.Component {
  constructor(props) {
    super(props);
    const { tables } = mockData;
    const validTableIds = new Set(tables.map((t) => t.id));
    const relations = mockData.relations.filter(
      (rel) => validTableIds.has(rel.srcTableId) && validTableIds.has(rel.tgtTableId)
    );

    this.state = {
      tables,
      relations,
      canvas: null,
      actionMenu: [
        {
          icon: <StarOutlined />,
          key: 'star',
          onClick: () => {
            alert('点击收藏！');
          },
        },
      ],
    };

    this.columns = [
      {
        key: 'name',
        primaryKey: true,
      },
      {
        key: 'title',
      },
    ];

    this.operator = [
      {
        id: 'isExpand',
        name: '展开/收缩血缘',
        icon: (
          <Tooltip title="展开/收缩血缘">
            <BorderOuterOutlined />
          </Tooltip>
        ),
        onClick: (nodeData) => {
          let tables = _.cloneDeep(this.state.tables);
          let table = _.find(tables, (item) => item.id === nodeData.id);

          const tableIds = new Set(tables.map((t) => t.id));
          const relatedRelations = this.state.relations.filter(
            (rel) => rel.srcTableId === table.id || rel.tgtTableId === table.id
          );

          const unknownRelatedIds = relatedRelations
            .map((rel) =>
              rel.srcTableId === table.id ? rel.tgtTableId : rel.srcTableId
            )
            .filter((id) => !tableIds.has(id));

          if (unknownRelatedIds.length > 0) {
            alert(
              `Cannot expand. Missing related tables: ${unknownRelatedIds.join(', ')}`
            );
            return;
          }

          table.isCollapse = !!!table.isCollapse;

          this.setState({
            tables,
            centerId: table.id,
          });
        },
      },
      {
        id: 'explore',
        name: '探索血缘',
        icon: (
          <Tooltip title="探索血缘">
            <DownSquareOutlined />
          </Tooltip>
        ),
        onClick: (nodeData) => {
          let tables = _.cloneDeep(this.state.tables);
          let table = _.find(tables, (item) => item.id === nodeData.id);

          const tableIds = new Set(tables.map((t) => t.id));
          const relatedRelations = this.state.relations.filter(
            (rel) => rel.srcTableId === table.id || rel.tgtTableId === table.id
          );

          const relatedTableIds = relatedRelations
            .map((rel) =>
              rel.srcTableId === table.id ? rel.tgtTableId : rel.srcTableId
            )
            .filter((id) => tableIds.has(id));

          if (relatedTableIds.length > 0) {
            alert(`Related tables: ${relatedTableIds.join(', ')}`);
          } else {
            alert('No related tables found.');
          }
        },
      },
      {
        id: 'remove',
        name: '删除节点',
        icon: (
          <Tooltip title="删除节点">
            <CloseCircleOutlined />
          </Tooltip>
        ),
        onClick: (nodeData) => {
          let _tables = _.cloneDeep(this.state.tables);
          let index = _.findIndex(_tables, (item) => item.id === nodeData.id);
          _tables.splice(index, 1);

          let remainingTableIds = new Set(_tables.map((t) => t.id));
          let _relations = this.state.relations.filter(
            (r) => remainingTableIds.has(r.srcTableId) && remainingTableIds.has(r.tgtTableId)
          );

          this.setState({
            tables: _tables,
            relations: _relations,
          });
        },
      },
    ];
  }

  render() {
    return (
      <LineageDag
        tables={this.state.tables}
        relations={this.state.relations}
        columns={this.columns}
        operator={this.operator}
        centerId={this.state.centerId}
        onLoaded={(canvas) => {
          this.setState({ canvas });
        }}
        config={{
          titleRender: (title, node) => {
            return (
              <div
                className="title-test"
                onClick={() => {
                  let tables = _.cloneDeep(this.state.tables);
                  tables.forEach((item) => {
                    item.name = 'title change';
                  });
                  this.setState({ tables }, () => {
                    this.state.canvas.nodes.forEach((item) => {
                      item.redrawTitle();
                    });
                  });
                }}
              >
                {title}
              </div>
            );
          },
          minimap: {
            enable: true,
          },
        }}
        actionMenu={this.state.actionMenu}
      />
    );
  }
}

ReactDOM.render(
  <Router>
    <Layout>
      <Header className="header">DTDesign-React数据血缘图</Header>
      <Layout>
        <Com />
      </Layout>
    </Layout>
  </Router>,
  document.getElementById('main')
);
