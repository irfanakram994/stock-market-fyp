import { supabaseServer } from "@/lib/supabaseClient";

const PROFILE_BUCKET = "profile-images";
const MAX_IMAGE_BYTES = 1024 * 1024;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(`${label} timed out.`)), ms);
  });

  try {
    return await Promise.race([promise, timer]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function parseImageDataUrl(imageDataUrl: string): { contentType: string; extension: string; buffer: Buffer } {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image format.");
  }

  const contentType = match[1].toLowerCase();
  const allowedTypes: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const extension = allowedTypes[contentType];
  if (!extension) {
    throw new Error("Unsupported image type.");
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image must be smaller than 1MB.");
  }

  return { contentType, extension, buffer };
}

async function ensureProfileBucket() {
  const { data: existing, error: getError } = await withTimeout<any>(
    supabaseServer.storage.getBucket(PROFILE_BUCKET),
    8000,
    "Profile image bucket lookup",
  );
  if (!getError && existing) return;

  const { error } = await withTimeout<any>(
    supabaseServer.storage.createBucket(PROFILE_BUCKET, {
      public: true,
      fileSizeLimit: `${MAX_IMAGE_BYTES}`,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    }),
    8000,
    "Profile image bucket creation",
  );

  if (error && !/already exists/i.test(error.message || "")) {
    throw new Error(error.message || "Failed to create profile image bucket.");
  }
}

function getStoragePathFromPublicUrl(url: string | null | undefined) {
  if (!url) return null;
  const marker = `/${PROFILE_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.substring(index + marker.length);
}

export async function updateRoleProfileImage({
  currentUrl,
  imageDataUrl,
  removeProfileImage,
  pathPrefix,
}: {
  currentUrl?: string | null;
  imageDataUrl?: string;
  removeProfileImage?: boolean;
  pathPrefix: string;
}) {
  let nextUrl = currentUrl || null;

  if (removeProfileImage || imageDataUrl) {
    await ensureProfileBucket();
    const currentPath = getStoragePathFromPublicUrl(currentUrl);
    if (currentPath) {
      await withTimeout<any>(
        supabaseServer.storage.from(PROFILE_BUCKET).remove([currentPath]),
        8000,
        "Profile image removal",
      );
    }
    nextUrl = null;
  }

  if (imageDataUrl) {
    const { contentType, extension, buffer } = parseImageDataUrl(imageDataUrl);
    const path = `${pathPrefix}/${Date.now()}.${extension}`;
    const { error } = await withTimeout<any>(
      supabaseServer.storage.from(PROFILE_BUCKET).upload(path, buffer, {
        contentType,
        upsert: false,
      }),
      10000,
      "Profile image upload",
    );

    if (error) {
      throw new Error(error.message || "Failed to upload profile image.");
    }

    const { data } = supabaseServer.storage.from(PROFILE_BUCKET).getPublicUrl(path);
    nextUrl = data.publicUrl;
  }

  return nextUrl;
}
