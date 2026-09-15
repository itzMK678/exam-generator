import { randomUUID } from "crypto";

import { supabase } from "./supabase.service.js";
import { extractFile } from "./extraction.service.js";

import {
  createDocumentChunks,
} from "./chunking.service.js";

import {
  embedChunks,
} from "./embedding.service.js";

import {
  saveDocumentChunks,
  deleteDocumentChunks,
} from "./vector.service.js";

const BUCKET_NAME = "documents";

/**
 * Process one uploaded document.
 */
export async function processDocument(file) {
  const documentId = randomUUID();

  const storagePath =
    `${documentId}/${file.originalname}`;

  // ========================================================
  // 1. Upload original file to Supabase Storage
  // ========================================================

  console.log(
    `[${file.originalname}] Uploading original file...`
  );

  const { error: storageError } =
    await supabase.storage
      .from(BUCKET_NAME)
      .upload(
        storagePath,
        file.buffer,
        {
          contentType: file.mimetype,
          upsert: false,
        }
      );

  if (storageError) {
    throw new Error(
      `Storage upload failed: ${storageError.message}`
    );
  }

  try {
    // ======================================================
    // 2. Extract text using Python worker
    // ======================================================

    console.log(
      `[${file.originalname}] Extracting text...`
    );

    const extraction =
      await extractFile(file);

    if (
      !extraction ||
      !Array.isArray(extraction.pages)
    ) {
      throw new Error(
        "Invalid extraction response from Python worker"
      );
    }

    console.log(
      `[${file.originalname}] Extracted ${extraction.pages.length} pages`
    );

    // ======================================================
    // 3. Insert document metadata
    // ======================================================

    console.log(
      `[${file.originalname}] Saving document metadata...`
    );

    const { error: documentError } =
      await supabase
        .from("documents")
        .insert({
          id: documentId,

          filename: file.originalname,

          file_type: extraction.file_type,

          mime_type: file.mimetype,

          storage_path: storagePath,

          file_size: file.size,

          page_count:
            extraction.page_count,

          word_count:
            extraction.word_count,

          character_count:
            extraction.character_count,

          status: "processing",
        });

    if (documentError) {
      throw new Error(
        `Document insert failed: ${documentError.message}`
      );
    }

    // ======================================================
    // 4. Save extracted pages
    // ======================================================

    const pageRows =
      extraction.pages.map((page) => ({
        document_id: documentId,

        page_number: page.page_number,

        content: page.content,

        word_count: page.word_count,
      }));

    if (pageRows.length > 0) {
      console.log(
        `[${file.originalname}] Saving ${pageRows.length} pages...`
      );

      const { error: pagesError } =
        await supabase
          .from("document_pages")
          .insert(pageRows);

      if (pagesError) {
        throw new Error(
          `Page insert failed: ${pagesError.message}`
        );
      }
    }

    // ======================================================
    // 5. Create text chunks
    // ======================================================

    console.log(
      `[${file.originalname}] Creating chunks...`
    );

    const chunks =
      createDocumentChunks(
        extraction.pages
      );

    console.log(
      `[${file.originalname}] Created ${chunks.length} chunks`
    );

    if (chunks.length === 0) {
      throw new Error(
        "No text chunks were created"
      );
    }

    // ======================================================
    // 6. Generate Gemini embeddings
    // ======================================================

    console.log(
      `[${file.originalname}] Generating embeddings...`
    );

    const embeddedChunks =
      await embedChunks(chunks);

    console.log(
      `[${file.originalname}] Generated ${embeddedChunks.length} embeddings`
    );

    if (
      embeddedChunks.length !== chunks.length
    ) {
      throw new Error(
        `Embedding count mismatch. Expected ${chunks.length}, received ${embeddedChunks.length}`
      );
    }

    // ======================================================
    // 7. Save vectors in Supabase
    // ======================================================

    console.log(
      `[${file.originalname}] Saving vectors...`
    );

    await saveDocumentChunks(
      documentId,
      embeddedChunks
    );

    // ======================================================
    // 8. Mark document as ready
    // ======================================================

    console.log(
      `[${file.originalname}] Marking document as ready...`
    );

    const { error: updateError } =
      await supabase
        .from("documents")
        .update({
          status: "ready",
        })
        .eq("id", documentId);

    if (updateError) {
      throw new Error(
        `Failed to update document status: ${updateError.message}`
      );
    }

    console.log(
      `[${file.originalname}] Processing completed successfully`
    );

    // ======================================================
    // 9. Return processed document
    // ======================================================

    return {
      id: documentId,

      filename: file.originalname,

      file_type: extraction.file_type,

      page_count:
        extraction.page_count,

      word_count:
        extraction.word_count,

      character_count:
        extraction.character_count,

      chunk_count:
        chunks.length,

      status: "ready",
    };
  } catch (error) {
    // ======================================================
    // Cleanup after processing failure
    // ======================================================

    console.error(
      `Processing failed for ${file.originalname}:`,
      error
    );

    // ------------------------------------------------------
    // Delete document chunks
    // ------------------------------------------------------

    try {
      await deleteDocumentChunks(
        documentId
      );
    } catch (cleanupError) {
      console.error(
        "Failed to delete document chunks during cleanup:",
        cleanupError.message
      );
    }

    // ------------------------------------------------------
    // Delete document pages
    // ------------------------------------------------------

    try {
      await supabase
        .from("document_pages")
        .delete()
        .eq("document_id", documentId);
    } catch (cleanupError) {
      console.error(
        "Failed to delete document pages during cleanup:",
        cleanupError.message
      );
    }

    // ------------------------------------------------------
    // Delete document metadata
    // ------------------------------------------------------

    try {
      await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);
    } catch (cleanupError) {
      console.error(
        "Failed to delete document metadata during cleanup:",
        cleanupError.message
      );
    }

    // ------------------------------------------------------
    // Delete original file from Storage
    // ------------------------------------------------------

    try {
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([
          storagePath,
        ]);
    } catch (cleanupError) {
      console.error(
        "Failed to delete storage file during cleanup:",
        cleanupError.message
      );
    }

    // Throw the original error
    throw error;
  }
}