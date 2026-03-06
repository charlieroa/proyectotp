import { createAsyncThunk } from "@reduxjs/toolkit";
import { sileo } from 'sileo';
//Include Both Helper File with needed methods
import {
    getTaskList as getTaskListApi,
    addNewTask as addNewTaskApi,
    updateTask as updateTaskApi,
    deleteTask as deleteTaskApi,
    getTasks as getTasksApi,
    addNewTasks as addNewTasksApi,
    updateTasks as updateTasksApi,
    deleteTasks as deleteTasksApi
} from "../../helpers/fakebackend_helper";
export const getTaskList = createAsyncThunk("tasks/getTaskList", async () => {
    try {
        const response = getTaskListApi();
        return response;
    } catch (error) {
        return error;
    }
});
export const addNewTask = createAsyncThunk("tasks/addNewTask", async (task: any) => {
    try {
        const response = addNewTaskApi(task);
        sileo.success({ title: "Task Added Successfully" });
        return response;
    } catch (error) {
        sileo.error({ title: "Task Added Failed" });
        return error;
    }
});
export const updateTask = createAsyncThunk("tasks/updateTask", async (task: any) => {
    try {
        const response = updateTaskApi(task);
        sileo.success({ title: "Task Updated Successfully" });
        return response;
    } catch (error) {
        sileo.error({ title: "Task Updated Failed" });
        return error;
    }
});
export const deleteTask = createAsyncThunk("tasks/deleteTask", async (task: any) => {
    try {
        const response = deleteTaskApi(task);
        sileo.success({ title: "Task Updated Successfully" });
        return { task, ...response };
    } catch (error) {
        sileo.error({ title: "Task Updated Failed" });
        return error;
    }
});
// Kanban Board
export const getTasks = createAsyncThunk("tasks/getTasks", async () => {
    try {
        const response = getTasksApi();
        return response;
    } catch (error) {
        return error;
    }
});
export const addCardData = createAsyncThunk("tasks/addCardData", async (card: any) => {
    try {
        const response = addNewTasksApi(card);
        const data = await response;
        sileo.success({ title: "Card Add Successfully" });
        return data;
    } catch (error) {
        sileo.error({ title: "Card Add Failded" });
        return error;
    }
})
export const updateCardData = createAsyncThunk("tasks/updateCardData", async (card: any) => {
    try {
        const response = updateTasksApi(card);
        const data = await response;
        sileo.success({ title: "Card Update Successfully" });
        return data;
    } catch (error) {
        sileo.error({ title: "Card Update Failded" });
        return error
    }
})
export const deleteKanban = createAsyncThunk("tasks/deleteKanban", async (card: any) => {
    try {
        const response = deleteTasksApi(card);
        sileo.success({ title: "Card Delete Successfully" });
        return response;
    } catch (error) {
        sileo.error({ title: "Card Delete Failded" });
        return error;
    }
})