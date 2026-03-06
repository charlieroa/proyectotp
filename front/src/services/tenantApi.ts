import api from "./api";

export interface TenantBusiness {
  id: string;
  name: string;
  business_type: string;
  parent_tenant_id: string | null;
  is_primary_branch?: boolean;
  address?: string;
  phone?: string;
}

export const getMyBusinesses = () =>
  api.get<TenantBusiness[]>("/tenants/my-businesses");

export const createBranch = (data: {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  business_type?: string;
}) => api.post<TenantBusiness>("/tenants/branch", data);

export const switchTenant = (targetTenantId: string) =>
  api.post<{ token: string; tenant: { id: string; name: string } }>(
    "/auth/switch-tenant",
    { target_tenant_id: targetTenantId }
  );

export const setPrimaryBranch = (tenantId: string) =>
  api.put(`/tenants/${tenantId}/set-primary`);
