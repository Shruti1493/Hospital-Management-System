
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { Layout, Tooltip, Button } from 'antd';
import * as _ from 'lodash';
import LineageDag from '../src/index.tsx'; // Adjust the path as needed
import { mockData } from './mock_data/data'; // Adjust the path as needed

import 'antd/dist/antd.css';
import './index.less';

import {
  BorderOuterOutlined,
} from '@ant-design/icons';

const Com = () => {
  const { tables } = mockData;
  const validTableIds = new Set(tables.map((t) => t.id));
  const relations = mockData.relations.filter(
    (rel) => validTableIds.has(rel.srcTableId) && validTableIds.has(rel.tgtTableId)
  );

  const [state, setState] = useState({
    tables,
    relations,
    canvas: null,
    centerId: null,
    showLineage: false,
  });

  const columns = [
    {
      key: 'name',
      primaryKey: true,
    },
    {
      key: 'title',
    },
  ];

  const operator = [
    {
      id: 'isExpand',
      name: 'Expand/Collapse Lineage',
      icon: (
        <Tooltip title="Expand/Collapse Lineage">
          <BorderOuterOutlined />
        </Tooltip>
      ),
      onClick: (nodeData) => {
        let tables = state.tables;
        let table = _.find(tables, (item) => item.id === nodeData.id);
        if (!table) return;
        table.isCollapse = !table.isCollapse;
        setState({
          ...state,
          tables,
          centerId: table.id,
        });
      },
    },
  ];

  const handleSubmit = () => {
    setState({
      ...state,
      showLineage: true,
    });
  };

  useEffect(() => {}, []);

  return (
    <div>
      {/* Trigger button to show lineage */}
      <div style={{ marginBottom: 20 }}>
        <Button type="primary" onClick={handleSubmit}>
          Show Lineage
        </Button>
      </div>

      {state.showLineage && (
        <LineageDag
          tables={state.tables}
          relations={state.relations}
          columns={columns}
          operator={operator}
          centerId={state.centerId}
          onLoaded={(canvas) => {
            setState({ ...state, canvas });
          }}
          config={{
            titleRender: (title, node) => {
              return (
                <div
                  className="title-test"
                  onClick={() => {
                    let tables = _.cloneDeep(state.tables);
                    tables.forEach((item) => {
                      item.name = 'title change';
                    });
                    setState({ ...state, tables }, () => {
                      state.canvas.nodes.forEach((item) => {
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
          actionMenu={state.actionMenu}
        />
      )}
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Layout>
        <Com />
      </Layout>
    </Router>
  );
};

ReactDOM.render(<App />, document.getElementById('main'));
