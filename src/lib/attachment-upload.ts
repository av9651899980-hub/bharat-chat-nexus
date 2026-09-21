import { supabase } from "@/integrations/supabase/client";

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function safeFileName(name: string) {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
  return cleaned || "attachment";
}

export async function uploadAttachmentWithProgress(
  file: File,
  chatId: string,
  onProgress: (progress: number) => void,
) {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("Files must be 25 MB or smaller");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const baseUrl = import.meta.env["VITE_SUPABASE_URL"];
  const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (sessionError || !token || !baseUrl || !publishableKey) {
    throw new Error("Your session expired. Please sign in again.");
  }

  const path = `${chatId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const xhr = new XMLHttpRequest();

  await new Promise<void>((resolve, reject) => {
    xhr.open("POST", `${baseUrl}/storage/v1/object/chat-attachments/${encodePath(path)}`);
    xhr.setRequestHeader("apikey", publishableKey);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("The file could not be uploaded"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        reject(new Error(body.message ?? body.error ?? "The file could not be uploaded"));
      } catch {
        reject(new Error("The file could not be uploaded"));
      }
    };
    xhr.send(file);
  });

  return { path, name: file.name, mime: file.type || "application/octet-stream", size: file.size };
}

export function formatAttachmentSize(size: number | null | undefined) {
  if (!size) return "File";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}