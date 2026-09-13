"use client";
import { createClient } from "./supabase/client";
import type { TablesInsert } from "./supabase/database.types";
import type { PhotoKind } from "./types";

export type DraftAttempt = {
  id: string;
  details: TablesInsert<"pandal_submissions">;
  uploads: Map<File, string>;
};
const mimeExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export async function submitPandal(attempt: DraftAttempt, files: Record<PhotoKind, File[]>, progress: (message: string) => void) {
  const client = createClient();
  const { data: identity, error: authError } = await client.auth.getUser();
  if (authError || !identity.user) throw new Error("Your session has ended. Please sign in again.");
  const userId = identity.user.id;
  if (attempt.details.submitted_by !== userId) throw new Error("This draft belongs to another account. Reload to continue.");
  progress("Saving your draft…");
  // The browser retains this random ID even when a response is lost. A retry never creates another submission.
  const { data: existing, error: readError } = await client.from("pandal_submissions").select("id,status").eq("id", attempt.id).maybeSingle();
  if (readError) throw new Error("Unable to check your draft. Please retry.");
  if (!existing) {
    const { error } = await client.from("pandal_submissions").insert({ ...attempt.details, id: attempt.id });
    if (error && error.code !== "23505") throw new Error("Your draft could not be saved. Check your details and connection, then retry.");
  }
  if (!existing || existing.status === "draft") {
    const bucket = client.storage.from("pandal-images");
    const allFiles = [...files.ganapati, ...files.decoration];
    if (files.ganapati.length < 1 || files.ganapati.length > 2 || files.decoration.length < 1 || files.decoration.length > 3)
      throw new Error("Add 1–2 Ganapati photos and 1–3 decoration photos. Your draft is saved.");
    if (allFiles.some(file => !mimeExtensions[file.type] || file.size < 1 || file.size > 5 * 1024 * 1024))
      throw new Error("Use JPEG, PNG or WebP photos up to 5 MB each.");
    let uploaded = 0;
    for (const kind of ["ganapati", "decoration"] as const) {
      const folder = `${userId}/${attempt.id}/${kind === "ganapati" ? "ganapati" : "pandal"}`;
      // Assign names once, then reconcile with Storage after failures or changed selections.
      for (const file of files[kind]) if (!attempt.uploads.has(file))
        attempt.uploads.set(file, `${folder}/${crypto.randomUUID()}.${mimeExtensions[file.type]}`);
      const { data: objects, error: listError } = await bucket.list(folder, { limit: 100 });
      if (listError || !objects) throw new Error("Unable to check uploaded photos. Your draft is saved; please retry.");
      const wanted = new Set(files[kind].map(file => attempt.uploads.get(file)!));
      const old = objects.filter(object => object.id && !wanted.has(`${folder}/${object.name}`)).map(object => `${folder}/${object.name}`);
      if (old.length) {
        const { error } = await bucket.remove(old);
        if (error) throw new Error("Earlier draft photos could not be replaced. Please retry.");
      }
      const existingNames = new Set(objects.map(object => object.name));
      for (const file of files[kind]) {
        const path = attempt.uploads.get(file)!;
        progress(`Uploading photos ${uploaded + 1} of ${allFiles.length}…`);
        if (!existingNames.has(path.split("/").at(-1)!)) {
          const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
          if (error) throw new Error("A photo could not be uploaded. Your draft and completed uploads are saved. Please retry.");
        }
        uploaded++;
      }
    }
  }
  progress("Submitting your Ganapati…");
  // No scores, status, category, arrays, or browser-supplied image counts are accepted by this RPC.
  const { data, error } = await client.rpc("finalize_pandal_submission", { p_submission_id: attempt.id });
  if (error || !data?.[0]) throw new Error(error?.code === "22023" ? error.message : "Your submission could not be completed. Your draft is saved; please retry.");
  return data[0];
}
