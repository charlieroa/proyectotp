import { createAsyncThunk } from "@reduxjs/toolkit";
//Include Both Helper File with needed methods
import {
    getJobApplicationList as getApplicationListApi,
    addNewJobApplicationList as addNewJobApplicationListApi,
    updateJobApplicationList as updateJobApplicationListApi,
    deleteJobApplicationList as deleteJobApplicationListApi,

    getJobCandidateList as getCandidateListApi,
    addJobCandidate as addCandidateApi,
    updateJobCandidate as updateCandidateApi,
    deleteJobCandidate as deleteCandidateApi,

    getCandidateGrid as getCandidateGridApi,
    addCandidateGrid as addCandidateGridApi,

    getcategoryList as getcategoryListApi,
    addcategoryList as addcategoryListApi
} from "../../helpers/fakebackend_helper";
import { sileo } from "sileo";


export const getApplicationList = createAsyncThunk("jobs/getJobApplicationList", async () => {
    try {
        const response = getApplicationListApi();
        return response;
    } catch (error) {
        return error;
    }
});

export const addNewJobApplicationList = createAsyncThunk("jobs/addNewJobApplicationList", async (job: any) => {
    try {
        const response = addNewJobApplicationListApi(job);
        const data = await response;
        sileo.success({ title: "Job Application Added Successfully" });
        return data;
    } catch (error) {
        sileo.error({ title: "Job Application Added Failed" });
        return error;
    }
});

export const updateJobApplicationList = createAsyncThunk("jobs/updateJobApplicationList", async (job: any) => {
    try {
        const response = updateJobApplicationListApi(job);
        const data = await response;
        sileo.success({ title: "Job Application Updated Successfully" });
        return data;
    } catch (error) {
        sileo.error({ title: "Job Application Updated Failed" });
        return error;
    }
});

export const deleteJobApplicationList = createAsyncThunk("jobs/deleteJobApplicationList", async (job: any) => {
    try {
        const response = deleteJobApplicationListApi(job);
        const data = await response;
        sileo.success({ title: "Job Application Deleted Successfully" });
        return data;
    } catch (error) {
        sileo.error({ title: "Job Application Deleted Failed" });
        return error;
    }
});

// candidate List
export const getCandidateList = createAsyncThunk("jobs/getJobCandidateList", async () => {
    try {
        const response = getCandidateListApi();
        return response;
    } catch (error) {
        return error;
    }
});

export const addCandidate = createAsyncThunk("jobs/addJobCandidate", async (candidate: any) => {
    try {
        const response = addCandidateApi(candidate);
        const data = await response;
        sileo.success({ title: "Candidate Added Successfully" });
        return data;
    } catch (error) {
        sileo.error({ title: "Candidate Added Failed" });
        return error;
    }
});

export const updateCandidate = createAsyncThunk("jobs/updateJobCandidate", async (candidate: any) => {
    try {
        const response = updateCandidateApi(candidate);
        const data = await response;
        sileo.success({ title: "Candidate Updated Successfully" });
        return data;
    } catch (error) {
        sileo.error({ title: "Candidate Updated Failed" });
        return error;
    }
});

export const deleteCandidate = createAsyncThunk("jobs/deleteJobCandidate", async (id: any) => {
    try {
        const response = deleteCandidateApi(id);
        sileo.success({ title: "Candidate Deleted Successfully" });
        return { id, ...response };
    } catch (error) {
        sileo.error({ title: "Candidate Deleted Failed" });
        return error;
    }
});

// candidate grid
export const getCandidateGrid = createAsyncThunk("jobs/getJobCandidateGrid", async () => {
    try {
        const response = getCandidateGridApi();
        return response;
    } catch (error) {
        return error;
    }
});

export const addCandidateGrid = createAsyncThunk("jobs/addJobCandidateGrid", async (candidate: any) => {
    try {
        const response = addCandidateGridApi(candidate);
        const data = await response;
        sileo.success({ title: "Candidate Added Successfully" });
        return data;
    } catch (error) {
        sileo.error({ title: "Candidate Added Failed" });
        return error;
    }
});


// Job category
export const getCategoryList = createAsyncThunk("jobs/getcategoryList", async () => {
    try {
        const response = getcategoryListApi();
        return response;
    } catch (error) {
        return error;
    }
});

export const addcategoryList = createAsyncThunk("jobs/addcategoryList", async (category: any) => {
    try {
        const response = addcategoryListApi(category);
        const data = await response;
        sileo.success({ title: "Category Added Successfully" });
        return data;
    } catch (error) {
        sileo.error({ title: "Category Added Failed" });
        return error;
    }
});
