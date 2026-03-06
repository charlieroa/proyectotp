import { createAsyncThunk } from "@reduxjs/toolkit";
import { sileo } from 'sileo';

//Include Both Helper File with needed methods
import {
    getTicketsList as getTicketsListApi,
    addNewTicket as addNewTicketApi,
    updateTicket as updateTicketApi,
    deleteTicket as deleteTicketApi
} from "../../helpers/fakebackend_helper";

export const getTicketsList = createAsyncThunk("tickets/getTicketsList", async () => {
    try {
        const response = getTicketsListApi();
        return response;
    } catch (error) {
        return error;
    }
});

export const addNewTicket = createAsyncThunk("tickets/addNewTicket", async (ticket : any) => {
    try {
        const response = addNewTicketApi(ticket);
        const data = await response;
        sileo.success({ title: "Ticket agregado correctamente" });
        return data;
    } catch (error) {
        return error;
    }
});

export const updateTicket = createAsyncThunk("tickets/updateTicket", async (ticket : any) => {
    try {
        const response = updateTicketApi(ticket);
        const data = await response;
        sileo.success({ title: "Ticket actualizado correctamente" });
        return data;
    } catch (error) {
        sileo.error({ title: "Error al actualizar ticket" });
        return error;
    }
});

export const deleteTicket = createAsyncThunk("tickets/deleteTicket", async (ticket : any) => {
    try {
        const response = deleteTicketApi(ticket);
        sileo.success({ title: "Ticket eliminado correctamente" });
        return { ticket, ...response };
    } catch (error) {
        sileo.error({ title: "Error al eliminar ticket" });
        return error;
    }
});