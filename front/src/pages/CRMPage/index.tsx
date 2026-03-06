import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Container, Nav, NavItem, NavLink, TabContent, TabPane, Badge, Button,
} from "reactstrap";
import classnames from "classnames";
import { useSelector } from "react-redux";
import { selectTenantPlan, isPlanAtLeast } from "../../slices/Settings/settingsSlice";
import CrmContacts from "../Crm/CrmContacts";
import Campaigns from "../Campaigns";

const TAB_MAP: Record<string, string> = {
  campaigns: "2",
};
const TAB_MAP_REV: Record<string, string> = { "2": "campaigns" };

const CRMPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam && TAB_MAP[tabParam] ? TAB_MAP[tabParam] : "1"
  );

  const tenantPlan = useSelector(selectTenantPlan);
  const hasCampaigns = isPlanAtLeast(tenantPlan, "enterprise");

  useEffect(() => {
    document.title = "CRM | Tupelukeria";
  }, []);

  const toggleTab = (tab: string) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
      setSearchParams(TAB_MAP_REV[tab] ? { tab: TAB_MAP_REV[tab] } : {});
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <div className="d-flex align-items-center mb-3">
          <h4 className="mb-0 flex-grow-1">CRM</h4>
          {activeTab === "2" && hasCampaigns && (
            <Link to="/campaigns/new">
              <Button color="success" size="sm">
                <i className="ri-add-line me-1"></i> Nueva Campaña
              </Button>
            </Link>
          )}
        </div>

        <Nav tabs className="nav-tabs-custom mb-3">
          <NavItem>
            <NavLink
              className={classnames({ active: activeTab === "1" })}
              onClick={() => toggleTab("1")}
              style={{ cursor: "pointer" }}
            >
              <i className="ri-contacts-line me-1"></i> Contactos
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={classnames({ active: activeTab === "2" })}
              onClick={() => {
                if (hasCampaigns) toggleTab("2");
              }}
              style={{ cursor: hasCampaigns ? "pointer" : "not-allowed", opacity: hasCampaigns ? 1 : 0.6 }}
            >
              <i className="ri-mail-send-line me-1"></i> Campañas
              {!hasCampaigns && (
                <Badge color="warning" className="ms-2" pill>Enterprise</Badge>
              )}
            </NavLink>
          </NavItem>
        </Nav>

        <TabContent activeTab={activeTab}>
          <TabPane tabId="1">
            <CrmContacts embedded />
          </TabPane>
          <TabPane tabId="2">
            {hasCampaigns && activeTab === "2" && <Campaigns embedded />}
          </TabPane>
        </TabContent>
      </Container>
    </div>
  );
};

export default CRMPage;
