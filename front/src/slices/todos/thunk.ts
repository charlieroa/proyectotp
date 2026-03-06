import { createAsyncThunk } from "@reduxjs/toolkit";
import { sileo } from 'sileo';

//Include Both Helper File with needed methods
import {
  getTodos as getTodosApi,
  addNewTodo as addNewTodoApi,
  updateTodo as updateTodoApi,
  deleteTodo as deleteTodoApi,
  getProjects as getProjectsApi,
  addNewProject as addNewProjectApi,
} from "../../helpers/fakebackend_helper";

export const getTodos = createAsyncThunk("todos/getTodos", async () => {
  try {
    const response = getTodosApi();
    return response;
  } catch (error) {
    return error;
  }
});

export const addNewTodo = createAsyncThunk("todos/addNewTodo", async (todo : any) => {
  try {
    const response = addNewTodoApi(todo);
    const data = await response;
    sileo.success({ title: "Todo agregado correctamente" });
    return data;
  } catch (error) {
    sileo.error({ title: "Error al agregar todo" });
    return error;
  }
});

export const updateTodo = createAsyncThunk("todos/updateTodo", async (todo : any) => {
  try {
    const response = updateTodoApi(todo);
    const data = await response;
    sileo.success({ title: "Todo actualizado correctamente" });
    return data;
  } catch (error) {
    sileo.error({ title: "Error al actualizar todo" });
    return error;
  }
});

export const deleteTodo = createAsyncThunk("todos/deleteTodo", async (todo : any) => {
  try {
    const response = deleteTodoApi(todo);
    const data = await response;
    sileo.success({ title: "Todo eliminado correctamente" });
    return data;
  } catch (error) {
    sileo.error({ title: "Error al eliminar todo" });
    return error;
  }
});

export const getProjects = createAsyncThunk("todos/getProjects", async () => {
  try {
    const response = getProjectsApi();
    return response;
  } catch (error) {
    return error;
  }
});

export const addNewProject = createAsyncThunk("todos/addNewProject", async (project : any) => {
  try {
    const response = addNewProjectApi(project);
    const data = await response;
    sileo.success({ title: "Proyecto agregado correctamente" });
    return data;
  } catch (error) {
    sileo.error({ title: "Error al agregar proyecto" });
    return error;
  }
});