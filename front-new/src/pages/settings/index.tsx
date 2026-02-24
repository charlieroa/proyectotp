import { useState } from 'react';
import {
  Building2,
  Clock,
  Scissors,
  Users,
  MessageSquare,
  CreditCard,
} from 'lucide-react';
import { Tabs } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { BusinessDataTab } from '@/components/settings/business-data-tab';
import { ScheduleTab } from '@/components/settings/schedule-tab';
import { ServicesTab } from '@/components/settings/services-tab';
import { StaffTab } from '@/components/settings/staff-tab';
import { WhatsAppTab } from '@/components/settings/whatsapp-tab';
import { PlansTab } from '@/components/settings/plans-tab';
import { getTenantIdFromToken } from '@/lib/auth';
import { useTenant } from '@/api/tenants';
import { PageSpinner } from '@/components/ui/spinner';

const settingsTabs = [
  { id: 'datos', label: 'Datos del Negocio', icon: <Building2 className="h-4 w-4" /> },
  { id: 'horario', label: 'Horario', icon: <Clock className="h-4 w-4" /> },
  { id: 'servicios', label: 'Servicios', icon: <Scissors className="h-4 w-4" /> },
  { id: 'personal', label: 'Personal', icon: <Users className="h-4 w-4" /> },
  { id: 'whatsapp', label: 'Bot WhatsApp', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'planes', label: 'Planes', icon: <CreditCard className="h-4 w-4" /> },
];

export default function SettingsPage() {
  const tenantId = getTenantIdFromToken();
  const { data: tenant, isLoading } = useTenant(tenantId);
  const [activeTab, setActiveTab] = useState('datos');

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>
        <p className="text-sm text-gray-500">Administra tu negocio</p>
      </div>

      <Tabs tabs={settingsTabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="mt-6">
        {activeTab === 'datos' && <BusinessDataTab tenantId={tenantId} tenant={tenant} />}
        {activeTab === 'horario' && <ScheduleTab tenantId={tenantId} tenant={tenant} />}
        {activeTab === 'servicios' && <ServicesTab tenantId={tenantId} />}
        {activeTab === 'personal' && <StaffTab tenantId={tenantId} />}
        {activeTab === 'whatsapp' && <WhatsAppTab tenantId={tenantId!} />}
        {activeTab === 'planes' && <PlansTab tenant={tenant} />}
      </div>
    </div>
  );
}
