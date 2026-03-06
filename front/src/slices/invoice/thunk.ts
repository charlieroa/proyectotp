import { createAsyncThunk } from "@reduxjs/toolkit";
import { sileo } from 'sileo';

//Include Both Helper File with needed methods
import {
  getInvoices as getInvoicesApi,
  addNewInvoice as addNewInvoiceApi,
  updateInvoice as updateInvoiceApi,
  deleteInvoice as deleteInvoiceApi
} from "../../helpers/fakebackend_helper";

export const getInvoices = createAsyncThunk("invoice/getInvoices", async () => {
  try {
    const response = getInvoicesApi();
    return response;
  } catch (error) {
    return error;
  }
});

export const addNewInvoice = createAsyncThunk("invoice/addNewInvoice", async (invoice : any) => {
  try {
    const response = addNewInvoiceApi(invoice);
    sileo.success({ title: "Invoice Added Successfully" });
    return response;
  } catch (error) {
    sileo.error({ title: "Invoice Added Failed" });
    return error;
  }
});

export const updateInvoice = createAsyncThunk("invoice/updateInvoice", async (invoice : any) => {
  try {
    const response = updateInvoiceApi(invoice);
    sileo.success({ title: "Invoice Updated Successfully" });
    const data = await response;
    return data;
  } catch (error) {
    sileo.error({ title: "Invoice Updated Failed" });
    return error;
  }
});

export const deleteInvoice = createAsyncThunk("invoice/deleteInvoice", async (invoice : any) => {
  try {
    const response = deleteInvoiceApi(invoice);
    sileo.success({ title: "Invoice Delete Successfully" });
    return { invoice, ...response };
  }
  catch (error) {
    sileo.error({ title: "Invoice Delete Failed" });
    return error;
  }
});