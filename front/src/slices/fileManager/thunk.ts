import { createAsyncThunk } from "@reduxjs/toolkit";
import { sileo } from 'sileo';

//Include Both Helper File with needed methods
import {
  getFolders as getFoldersApi,
  addNewFolder as addNewFolderApi,
  updateFolder as updateFolderApi,
  deleteFolder as deleteFolderApi,
  getFiles as getFilesApi,
  addNewFile as addNewFileApi,
  updateFile as updateFileApi,
  deleteFile as deleteFileApi,
} from "../../helpers/fakebackend_helper";

export const getFolders = createAsyncThunk("fileManager/getFolders", async () => {
  try {
    const response = getFoldersApi();
    return response;
  }
  catch (error) {
    return error;
  }
});

export const addNewFolder = createAsyncThunk("fileManager/addNewFolder", async (folder : any) => {
  try {
    const response = addNewFolderApi(folder);
    sileo.success({ title: "Carpeta agregada correctamente" });
    return response;
  } catch (error) {
    sileo.error({ title: "Error al agregar carpeta" });
    return error;
  }
});

export const updateFolder = createAsyncThunk("fileManager/updateFolder", async (folder : any) => {
  try {
    const response = updateFolderApi(folder);
    sileo.success({ title: "Carpeta actualizada correctamente" });
    return response;
  } catch (error) {
    sileo.error({ title: "Error al actualizar carpeta" });
    return error;
  }
});

export const deleteFolder = createAsyncThunk("fileManager/deleteFolder", async (folder : any) => {
  try {
    const response = deleteFolderApi(folder);
    sileo.success({ title: "Eliminado correctamente" });
    return response;
  } catch (error) {
    sileo.error({ title: "Error al eliminar" });
    return error;
  }
});

export const getFiles = createAsyncThunk("fileManager/getFiles", async () => {
  try {
    const response = getFilesApi();
    return response;
  } catch (error) {
    return error;
  }
});

export const addNewFile = createAsyncThunk("fileManager/addNewFile", async (file : any) => {
  try {
    const response = addNewFileApi(file);
    sileo.success({ title: "Archivo agregado correctamente" });
    return response;
  } catch (error) {
    sileo.error({ title: "Error al agregar archivo" });
    return error;
  }
});

export const updateFile = createAsyncThunk("fileManager/updateFile", async (file : any) => {
  try {
    const response = updateFileApi(file);
    sileo.success({ title: "Archivo actualizado correctamente" });
    return response;
  } catch (error) {
    sileo.error({ title: "Error al actualizar archivo" });
    return error;
  }
});

export const deleteFile = createAsyncThunk("fileManager/deleteFile", async (file : any) => {
  try {
    const response = deleteFileApi(file);
    sileo.success({ title: "Archivo eliminado correctamente" });
    return response;
  } catch (error) {
    sileo.error({ title: "Error al eliminar archivo" });
    return error;
  }
});