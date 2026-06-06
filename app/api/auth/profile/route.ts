import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseServer } from '@/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

const PROFILE_BUCKET = 'profile-images';
const MAX_IMAGE_BYTES = 1024 * 1024;

type ProfileRow = {
  id: string;
  email: string;
  name: string | null;
  gender: string | null;
  profileImage: string | null;
};

function extractBearerToken(authorizationHeader: string | null): string | undefined {
  if (!authorizationHeader) return undefined;
  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token;
}

async function ensureProfileBucket() {
  const { data: existing, error: getError } = await supabaseServer.storage.getBucket(PROFILE_BUCKET);
  if (!getError && existing) return;

  const { error: createError } = await supabaseServer.storage.createBucket(PROFILE_BUCKET, {
    public: true,
    fileSizeLimit: `${MAX_IMAGE_BYTES}`,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  });

  if (createError && !/already exists/i.test(createError.message || '')) {
    throw new Error(createError.message || 'Failed to create profile bucket');
  }
}

function parseImageDataUrl(imageDataUrl: string): { contentType: string; extension: string; buffer: Buffer } {
  const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image format');
  }

  const contentType = match[1].toLowerCase();
  const base64Data = match[2];
  const allowedTypes: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };

  const extension = allowedTypes[contentType];
  if (!extension) {
    throw new Error('Unsupported image type');
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Image must be smaller than 1MB');
  }

  return { contentType, extension, buffer };
}

function getStoragePathFromPublicUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${PROFILE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.substring(idx + marker.length);
}

async function deleteExistingProfileImage(publicUrl: string | null) {
  const currentPath = getStoragePathFromPublicUrl(publicUrl);
  if (!currentPath) return;

  await supabaseServer.storage.from(PROFILE_BUCKET).remove([currentPath]);
}

async function ensureAppUser(id: string, email: string, name: string | null): Promise<void> {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "gender" TEXT,
    ADD COLUMN IF NOT EXISTS "profileImage" TEXT
  `);

  await prisma.$executeRaw`
    INSERT INTO "User" ("id", "email", "name", "createdAt", "updatedAt")
    VALUES (${id}, ${email}, ${name}, NOW(), NOW())
    ON CONFLICT ("id") DO UPDATE
      SET "email" = EXCLUDED."email",
          "name" = COALESCE("User"."name", EXCLUDED."name"),
          "updatedAt" = NOW()
  `;
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const accessToken = extractBearerToken(request.headers.get('authorization'))
      || (typeof body?.accessToken === 'string' ? body.accessToken : undefined);
    const refreshToken = typeof body?.refreshToken === 'string' ? body.refreshToken : undefined;

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let authData = await supabaseServer.auth.getUser(accessToken);

    if ((authData.error || !authData.data.user) && refreshToken) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseAnonKey) {
        const recoveryClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        const sessionResult = await recoveryClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!sessionResult.error && sessionResult.data.session) {
          authData = await recoveryClient.auth.getUser(sessionResult.data.session.access_token);
        }
      }
    }

    if (authData.error || !authData.data.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const nameRaw = typeof body?.name === 'string' ? body.name.trim() : '';
    const genderRaw = typeof body?.gender === 'string' ? body.gender.trim() : '';
    const imageDataUrl = typeof body?.profileImageDataUrl === 'string' ? body.profileImageDataUrl : '';
    const removeProfileImage = Boolean(body?.removeProfileImage);

    const name = nameRaw || null;
    const gender = genderRaw || null;

    if (name && name.length > 120) {
      return NextResponse.json({ success: false, error: 'Name is too long' }, { status: 400 });
    }

    await ensureAppUser(authData.data.user.id, authData.data.user.email || '', authData.data.user.user_metadata?.name || null);

    const existingRows = await prisma.$queryRaw<ProfileRow[]>`
      SELECT "id", "email", "name", "gender", "profileImage"
      FROM "User"
      WHERE "id" = ${authData.data.user.id}
      LIMIT 1
    `;
    const existing = existingRows[0];

    let profileImageUrl: string | null = existing?.profileImage || null;

    if (removeProfileImage || imageDataUrl) {
      await ensureProfileBucket();
      await deleteExistingProfileImage(profileImageUrl);
      profileImageUrl = null;
    }

    if (imageDataUrl) {
      const { contentType, extension, buffer } = parseImageDataUrl(imageDataUrl);
      const path = `${authData.data.user.id}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabaseServer.storage
        .from(PROFILE_BUCKET)
        .upload(path, buffer, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { success: false, error: uploadError.message || 'Failed to upload profile image' },
          { status: 500 }
        );
      }

      const { data: publicData } = supabaseServer.storage.from(PROFILE_BUCKET).getPublicUrl(path);
      profileImageUrl = publicData.publicUrl;
    }

    const rows = await prisma.$queryRaw<ProfileRow[]>`
      UPDATE "User"
      SET
        "name" = ${name},
        "gender" = ${gender},
        "profileImage" = ${profileImageUrl},
        "updatedAt" = NOW()
      WHERE "id" = ${authData.data.user.id}
      RETURNING "id", "email", "name", "gender", "profileImage"
    `;

    const profile = rows[0];

    // Keep auth metadata lightweight to prevent oversized JWT/Authorization headers.
    const { error: metadataError } = await supabaseServer.auth.admin.updateUserById(authData.data.user.id, {
      user_metadata: {
        name: profile.name,
        gender: profile.gender,
      },
    });

    if (metadataError) {
      console.error('Failed to update auth metadata:', metadataError.message);
    }

    return NextResponse.json({
      success: true,
      data: profile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      },
      { status: 500 }
    );
  }
}
