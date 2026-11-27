import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { loadSharedEnv } from "@wedding/core/env";
import { isHost } from "@wedding/core/host-auth";

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Hands the browser a short-lived token to upload a photo or the song straight to Vercel Blob.
 * Only a signed-in host gets a token. The file's public URL is then saved in the "Evento" settings.
 */
export async function POST(request: Request) {
  loadSharedEnv();
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "O armazenamento de ficheiros não está configurado." }, { status: 503 });
  }

  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isHost())) throw new Error("Sessão expirada.");
        if (!pathname.startsWith("evento/")) throw new Error("Caminho inválido.");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "audio/mpeg", "audio/mp4", "audio/aac", "audio/ogg", "audio/wav", "audio/x-m4a"],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
