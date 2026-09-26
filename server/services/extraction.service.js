import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { env } from "../config/env.js";

export async function extractFile(file) {
  const form = new FormData();

  const filePayload = file.path
    ? fs.createReadStream(file.path)
    : file.buffer;

  form.append(
    "file",
    filePayload,
    {
      filename: file.originalname,
      contentType: file.mimetype,
    }
  );

  try {
    const response = await axios.post(
      `${env.pythonWorkerUrl}/extract`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },

        maxContentLength: Infinity,
        maxBodyLength: Infinity,

        timeout: 120000,
      }
    );

    return response.data;

  } catch (error) {
    const workerDetail =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message;

    console.error(
      "Python extraction error:",
      error.response?.data || error.message
    );

    throw new Error(
      workerDetail || `Document extraction failed for ${file.originalname}`
    );
  }
}