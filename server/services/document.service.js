import fs from "fs";
import { randomUUID } from "crypto";

import { supabase } from "./supabase.service.js";
import { extractFile } from "./extraction.service.js";
import { createDocumentChunks } from "./chunking.service.js";
import { saveDocumentChunks, deleteDocumentChunks } from "./vector.service.js";

const INSERT_BATCH_SIZE = 100;

export async function processDocument(file) {
  const documentId = randomUUID();

  try {
    // ======================================================
    // 1. Extract text using Python worker (streamed from disk)
    // ======================================================
    console.log(`[${file.originalname}] Extracting text via Python worker...`);

    const extraction = await extractFile(file);

    if (!extraction || !Array.isArray(extraction.pages)) {
      throw new Error("Invalid extraction response from Python worker");
    }

    console.log(
      `[${file.originalname}] Extracted ${extraction.pages.length} pages, ${extraction.word_count} words`
    );

    // ======================================================
    // 2. Insert document metadata (text-only, no binary storage)
    // ======================================================
    console.log(`[${file.originalname}] Saving document metadata...`);

    const { error: documentError } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        filename: file.originalname,
        file_type: extraction.file_type,
        mime_type: file.mimetype,
        storage_path: "text_only",
        file_size: file.size,
        page_count: extraction.page_count,
        word_count: extraction.word_count,
        character_count: extraction.character_count,
        status: "processing",
      });

    if (documentError) {
      throw new Error(`Document insert failed: ${documentError.message}`);
    }

    // ======================================================
    // 4. Save extracted pages with batching
    // ======================================================
    const pageRows = extraction.pages.map((page) => ({
      document_id: documentId,
      page_number: page.page_number,
      content: page.content,
      word_count: page.word_count,
    }));

    if (pageRows.length > 0) {
      console.log(`[${file.originalname}] Saving ${pageRows.length} pages in batches...`);

      for (let i = 0; i < pageRows.length; i += INSERT_BATCH_SIZE) {
        const batch = pageRows.slice(i, i + INSERT_BATCH_SIZE);
        const { error: pagesError } = await supabase
          .from("document_pages")
          .insert(batch);

        if (pagesError) {
          throw new Error(`Page insert failed (batch ${Math.floor(i / INSERT_BATCH_SIZE) + 1}): ${pagesError.message}`);
        }
      }
    }

    // ======================================================
    // 5. Create text chunks
    // ======================================================
    console.log(`[${file.originalname}] Creating text chunks...`);

    const chunks = createDocumentChunks(extraction.pages);

    console.log(`[${file.originalname}] Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error("No text chunks were created");
    }

    // ======================================================
    // 6. Save chunks in Supabase
    // (Bypassing redundant sequential embedding generation)
    // ======================================================
    console.log(`[${file.originalname}] Saving chunks to database...`);

    await saveDocumentChunks(documentId, chunks);

    // ======================================================
    // 7. Mark document as ready
    // ======================================================
    console.log(`[${file.originalname}] Marking document status as ready...`);

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: "ready",
      })
      .eq("id", documentId);

    if (updateError) {
      throw new Error(`Failed to update document status: ${updateError.message}`);
    }

    console.log(`[${file.originalname}] Processing completed successfully!`);

    return {
      id: documentId,
      filename: file.originalname,
      file_type: extraction.file_type,
      page_count: extraction.page_count,
      word_count: extraction.word_count,
      character_count: extraction.character_count,
      chunk_count: chunks.length,
      status: "ready",
    };
  } catch (error) {
    // ======================================================
    // Rollback / Cleanup after processing failure
    // ======================================================
    console.error(`Processing failed for ${file.originalname}:`, error.message);

    try {
      await deleteDocumentChunks(documentId);
    } catch (cleanupError) {
      console.error("Cleanup error (chunks):", cleanupError.message);
    }

    try {
      await supabase
        .from("document_pages")
        .delete()
        .eq("document_id", documentId);
    } catch (cleanupError) {
      console.error("Cleanup error (pages):", cleanupError.message);
    }

    try {
      await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);
    } catch (cleanupError) {
      console.error("Cleanup error (metadata):", cleanupError.message);
    }

    throw error;
  } finally {
    // Clean up temporary upload file from disk
    if (file.path) {
      try {
        await fs.promises.unlink(file.path);
        console.log(`[${file.originalname}] Removed temporary disk file.`);
      } catch (cleanupErr) {
        console.warn(`[${file.originalname}] Could not delete temp file ${file.path}:`, cleanupErr.message);
      }
    }
  }
}