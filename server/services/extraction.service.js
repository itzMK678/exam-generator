import axios from "axios";
import FormData from "form-data";
import { env } from "../config/env.js";

export async function extractFile(file) {
  const form = new FormData();

  form.append(
    "file",
    file.buffer,
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
    console.error(
      "Python extraction error:",
      error.response?.data || error.message
    );

    throw new Error(
      `Document extraction failed for ${file.originalname}`
    );
  }
}