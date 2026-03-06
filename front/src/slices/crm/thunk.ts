import { createAsyncThunk } from "@reduxjs/toolkit";
import { sileo } from 'sileo';

// =================== Dependencias ===================

// Se mantiene el Fake Backend para Companies, Leads y Deals
import {
  getCompanies as getCompaniesApi,
  getDeals as getDealsApi,
  getLeads as getLeadsApi,
  addNewCompanies as addNewCompaniesApi,
  updateCompanies as updateCompaniesApi,
  deleteCompanies as deleteCompaniesApi,
  addNewLead as addNewLeadApi,
  updateLead as updateLeadApi,
  deleteLead as deleteLeadApi
} from "../../helpers/fakebackend_helper";

// Se añaden las dependencias del Backend Real para Contacts (Clientes)
import api from '../../services/api';
import { getTenantIdFromToken } from '../../services/auth';


// ============================================================================
// --- CLIENTS / CONTACTS (Conexión a Backend Real) ---
// ============================================================================

const API_ENDPOINT_USERS = '/users';

// Renombramos fetchTenantClients a getContacts para que coincida con el nombre que usa el componente
export const getContacts = createAsyncThunk("crm/getContacts", async (_, { rejectWithValue }) => {
  const tenantId = getTenantIdFromToken();
  if (!tenantId) {
    return rejectWithValue({ error: 'No se pudo identificar el tenant.' });
  }
  try {
    const response = await api.get(`${API_ENDPOINT_USERS}/tenant/${tenantId}/clients`);
    return response.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data || { error: 'Error desconocido al buscar contactos' });
  }
});

// Renombramos createClient a addNewContact
export const addNewContact = createAsyncThunk("crm/addNewContact", async (contact: any, { rejectWithValue }) => {
  const tenantId = getTenantIdFromToken();
  if (!tenantId) {
    return rejectWithValue({ error: 'No se pudo identificar el tenant.' });
  }
  try {
    const dataToCreate = { ...contact, role_id: 4, tenant_id: tenantId };
    const response = await api.post(API_ENDPOINT_USERS, dataToCreate);
    sileo.success({ title: "Contacto añadido con éxito" });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || 'Error desconocido al crear contacto';
    sileo.error({ title: errorMessage });
    return rejectWithValue({ error: errorMessage });
  }
});

// Renombramos updateClient a updateContact
export const updateContact = createAsyncThunk("crm/updateContact", async (contact: any, { rejectWithValue }) => {
  try {
    // El ID ya viene en el objeto contact que manda el componente
    const { id, ...clientData } = contact; 
    const response = await api.put(`${API_ENDPOINT_USERS}/${id}`, clientData);
    sileo.success({ title: "Contacto actualizado con éxito" });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || 'Error desconocido al actualizar contacto';
    sileo.error({ title: errorMessage });
    return rejectWithValue({ error: errorMessage });
  }
});

// Renombramos deleteClient a deleteContact
export const deleteContact = createAsyncThunk("crm/deleteContact", async (contactId: any, { rejectWithValue }) => {
  try {
    await api.delete(`${API_ENDPOINT_USERS}/${contactId}`);
    sileo.success({ title: "Contacto eliminado con éxito" });
    return contactId; // Devolvemos el ID para el reducer
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || 'Error desconocido al eliminar contacto';
    sileo.error({ title: errorMessage });
    return rejectWithValue({ error: errorMessage });
  }
});


// ============================================================================
// --- COMPANIES, LEADS, DEALS (Aún con Fake Backend para no dañar la app) ---
// ============================================================================

export const getCompanies = createAsyncThunk("crm/getCompanies", async (_, { rejectWithValue }) => {
  try {
    const response = getCompaniesApi();
    return response;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const addNewCompanies = createAsyncThunk("crm/addNewCompanies", async (company: any, { rejectWithValue }) => {
  try {
    const response = await addNewCompaniesApi(company);
    sileo.success({ title: "Compañía añadida con éxito" });
    return response;
  } catch (error) {
    sileo.error({ title: "Error al añadir compañía" });
    return rejectWithValue(error);
  }
});

export const updateCompanies = createAsyncThunk("crm/updateCompanies", async (company: any, { rejectWithValue }) => {
  try {
    const response = await updateCompaniesApi(company);
    sileo.success({ title: "Compañía actualizada con éxito" });
    return response;
  } catch (error) {
    sileo.error({ title: "Error al actualizar compañía" });
    return rejectWithValue(error);
  }
});

export const deleteCompanies = createAsyncThunk("crm/deleteCompanies", async (companyId: any, { rejectWithValue }) => {
  try {
    const response = await deleteCompaniesApi(companyId);
    sileo.success({ title: "Compañía eliminada con éxito" });
    return companyId;
  } catch (error) {
    sileo.error({ title: "Error al eliminar compañía" });
    return rejectWithValue(error);
  }
});


export const getLeads = createAsyncThunk("crm/getLeads", async (_, { rejectWithValue }) => {
  try {
    const response = getLeadsApi();
    return response;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const addNewLead = createAsyncThunk("crm/addNewLead", async (lead: any, { rejectWithValue }) => {
  try {
    const response = await addNewLeadApi(lead);
    sileo.success({ title: "Lead añadido con éxito" });
    return response;
  } catch (error) {
    sileo.error({ title: "Error al añadir Lead" });
    return rejectWithValue(error);
  }
});

export const updateLead = createAsyncThunk("crm/updateLead", async (lead: any, { rejectWithValue }) => {
  try {
    const response = await updateLeadApi(lead);
    sileo.success({ title: "Lead actualizado con éxito" });
    return response;
  } catch (error) {
    sileo.error({ title: "Error al actualizar Lead" });
    return rejectWithValue(error);
  }
});

export const deleteLead = createAsyncThunk("crm/deleteLead", async (leadId: any, { rejectWithValue }) => {
  try {
    await deleteLeadApi(leadId);
    sileo.success({ title: "Lead eliminado con éxito" });
    return leadId;
  } catch (error) {
    sileo.error({ title: "Error al eliminar Lead" });
    return rejectWithValue(error);
  }
});

export const getDeals = createAsyncThunk("crm/getDeals", async (_, { rejectWithValue }) => {
  try {
    const response = getDealsApi();
    return response;
  } catch (error) {
    return rejectWithValue(error);
  }
});