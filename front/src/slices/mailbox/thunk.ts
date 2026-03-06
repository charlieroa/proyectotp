import { createAsyncThunk } from "@reduxjs/toolkit";
import { sileo } from 'sileo';

//Include Both Helper File with needed methods
import {
  getMailDetails as getMailDetailsApi,
  deleteMail as deleteMailApi,
  trashMail as trashMailApi,
  staredMail as staredMailApi,
  unreadMail as unreadMailApi,
  labelMail as labelMailApi
} from "../../helpers/fakebackend_helper";

export const getMailDetails = createAsyncThunk("mailbox/getMailDetails", async () => {
  try {
    const response = getMailDetailsApi();
    return response;
  } catch (error) {
    return error;
  }
});

export const unreadMail = createAsyncThunk("mailbox/unreadMail", async (mail: any) => {
  try {
    const response = unreadMailApi(mail);
    // sileo.success({ title: "Mail Added Favorite Successfully" });
    return response;
  } catch (error) {
    // sileo.error({ title: "Mail Added Favorite Failed" });
    return error;
  }
});

export const staredMail = createAsyncThunk("mailbox/staredMail", async (mail: any) => {
  try {
    const response = staredMailApi(mail);
    // sileo.success({ title: "Mail Added Favorite Successfully" });
    return response;
  } catch (error) {
    // sileo.error({ title: "Mail Added Favorite Failed" });
    return error;
  }
});

export const trashMail = createAsyncThunk("mailbox/trashMail", async (mail: any) => {
  try {
    const response = trashMailApi(mail);
    sileo.success({ title: "Mail Moved Trash Successfully" });
    return response;
  } catch (error) {
    sileo.error({ title: "Mail Moved Trash Failed" });
    return error;
  }
});

export const deleteMail = createAsyncThunk("mailbox/deleteMail", async (mail: any) => {
  try {
    const response = deleteMailApi(mail);
    sileo.success({ title: "Mail Delete Successfully" });
    return response;
  } catch (error) {
    sileo.error({ title: "Mail Delete Failed" });
    return error;
  }
});

export const labelMail = createAsyncThunk("mailbox/labelMail", async (mail: any) => {
  try {
    const data = labelMailApi(mail.forId);
    const response = await data;
    return { response: response, label: mail.e };
  } catch (error) {
    return error;
  }
});