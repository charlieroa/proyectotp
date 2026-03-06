import { createAsyncThunk } from "@reduxjs/toolkit";
import { sileo } from 'sileo';

//Include Both Helper File with needed methods
import {
    getTeamData as getTeamDataApi,
    addTeamData as addTeamDataApi,
    updateTeamData as updateTeamDataApi,
    deleteTeamData as deleteTeamDataApi
} from "../../helpers/fakebackend_helper";

export const getTeamData = createAsyncThunk("team/getTeamData", async () => {
    try {
        const response = getTeamDataApi();
        return response;
    } catch (error) {
        return error;
    }
});

export const addTeamData = createAsyncThunk("team/addTeamData", async (team : any) => {
    try {
        const response = addTeamDataApi(team);
        sileo.success({ title: "Datos de equipo agregados" });
        return response;
    } catch (error) {
        sileo.error({ title: "Error al agregar datos de equipo" });
        return error;
    }
});

export const updateTeamData = createAsyncThunk("team/updateTeamData", async (project : any) => {
    try {
        const response = updateTeamDataApi(project);
        sileo.success({ title: "Datos de equipo actualizados" });
        return response;
    } catch (error) {
        sileo.error({ title: "Error al actualizar datos de equipo" });
        return error;
    }
});

export const deleteTeamData = createAsyncThunk("team/deleteTeamData", async (project : any) => {
    try {
        const response = deleteTeamDataApi(project);
        sileo.success({ title: "Datos de equipo eliminados" });
        return response;
    } catch (error) {
        sileo.error({ title: "Error al eliminar datos de equipo" });
        return error;
    }
});