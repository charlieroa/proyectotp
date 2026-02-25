import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, CardBody, Nav, NavItem, NavLink, TabContent, TabPane
} from 'reactstrap';
import classnames from 'classnames';
import { api } from '../../services/api';
import TenantTable from './TenantTable';
import GlobalSettings from './GlobalSettings';
import TokenUsage from './TokenUsage';

interface DashboardData {
  total_tenants: number;
  total_users: number;
  tokens_this_month: number;
}

const SuperAdminDashboard: React.FC = () => {
  document.title = 'Super Admin | TuPelukeria';

  const [activeTab, setActiveTab] = useState('1');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/super-admin/dashboard');
      setDashboard(res.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const summaryCards = [
    {
      title: 'Salones Registrados',
      value: dashboard?.total_tenants ?? '...',
      icon: 'ri-store-2-line',
      color: '#438eff',
    },
    {
      title: 'Usuarios Totales',
      value: dashboard?.total_users ?? '...',
      icon: 'ri-group-line',
      color: '#25a0e2',
    },
    {
      title: 'Tokens Este Mes',
      value: dashboard?.tokens_this_month != null
        ? dashboard.tokens_this_month.toLocaleString('es-CO')
        : '...',
      icon: 'ri-coin-line',
      color: '#f7b84b',
    },
  ];

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          {/* Header */}
          <Row className="mb-3">
            <Col>
              <h4 className="mb-0">
                <i className="ri-shield-star-line me-2 text-primary"></i>
                Super Admin
              </h4>
              <p className="text-muted mb-0">Panel de administración global</p>
            </Col>
          </Row>

          {/* Summary Cards */}
          <Row className="mb-4">
            {summaryCards.map((card, idx) => (
              <Col md={4} key={idx}>
                <Card className="border shadow-sm">
                  <CardBody className="d-flex align-items-center gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-3"
                      style={{
                        width: 52,
                        height: 52,
                        backgroundColor: card.color + '20',
                      }}
                    >
                      <i className={`${card.icon} fs-20`} style={{ color: card.color }}></i>
                    </div>
                    <div>
                      <p className="text-muted mb-1 small">{card.title}</p>
                      <h4 className="mb-0">{card.value}</h4>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Tabs */}
          <Card className="border shadow-sm">
            <CardBody>
              <Nav tabs className="nav-tabs-custom mb-3">
                <NavItem>
                  <NavLink
                    className={classnames({ active: activeTab === '1' })}
                    onClick={() => setActiveTab('1')}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="ri-store-2-line me-1"></i> Salones
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={classnames({ active: activeTab === '2' })}
                    onClick={() => setActiveTab('2')}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="ri-settings-3-line me-1"></i> Configuración Global
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={classnames({ active: activeTab === '3' })}
                    onClick={() => setActiveTab('3')}
                    style={{ cursor: 'pointer' }}
                  >
                    <i className="ri-bar-chart-box-line me-1"></i> Consumo de Tokens
                  </NavLink>
                </NavItem>
              </Nav>

              <TabContent activeTab={activeTab}>
                <TabPane tabId="1">
                  <TenantTable />
                </TabPane>
                <TabPane tabId="2">
                  <GlobalSettings />
                </TabPane>
                <TabPane tabId="3">
                  <TokenUsage />
                </TabPane>
              </TabContent>
            </CardBody>
          </Card>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default SuperAdminDashboard;
