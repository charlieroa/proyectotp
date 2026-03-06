import { createAsyncThunk } from "@reduxjs/toolkit";
import { sileo } from 'sileo';

//Include Both Helper File with needed methods
import {
    getProjectList as getProjectListApi,
    addProjectList as addProjectListApi,
    updateProjectList as updateProjectListApi,
    deleteProjectList as deleteProjectListApi
} from "../../helpers/fakebackend_helper";

export const getProjectList = createAsyncThunk("projects/getProjectList", async () => {
    try {
        const response = getProjectListApi();
        return response;
    } catch (error) {
        return error;
    }
});

export const addProjectList = createAsyncThunk("projects/addProjectList", async (project : any) => {
    try {
        const response = addProjectListApi(project);
        const data = await response;
        sileo.success({ title: "project-list Added Successfully" });
        return data;
    } catch (error) {
        sileo.error({ title: "project-list Added Failed" });
        return error;
    }
});

export const updateProjectList = createAsyncThunk("projects/updateProjectList", async (project : any) => {
    try {
        const response = updateProjectListApi(project);
        const data = await response;
        sileo.success({ title: "project-list Updated Successfully" });
        return data;
    } catch (error) {
        sileo.error({ title: "project-list Updated Failed" });
        return error;
    }
});

export const deleteProjectList = createAsyncThunk("projects/deleteProjectList", async (data : any) => {
    try {
        const response = deleteProjectListApi(data);
        const newdata = await response;
        sileo.success({ title: "project-list Delete Successfully" });
        return newdata;
    } catch (error) {
        sileo.error({ title: "project-list Delete Failed" });
        return error;
    }
});