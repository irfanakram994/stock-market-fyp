import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServer } from "@/lib/supabaseClient";
import { createSuperAdminAuditLog, extractBearerToken, verifySuperAdminSession } from "@/lib/superAdminAuth";
import { updateRoleProfileImage } from "@/lib/roleProfile";

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

export async function PUT(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get("authorization"));
    const session = await verifySuperAdminSession({ accessToken });
    if (!session.success || !session.superAdmin || !accessToken) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
    const gender = typeof body.gender === "string" && body.gender.trim() ? body.gender.trim() : null;
    const imageDataUrl = typeof body.profileImageDataUrl === "string" ? body.profileImageDataUrl : "";
    const removeProfileImage = Boolean(body.removeProfileImage);

    if (name && name.length > 120) {
      return NextResponse.json({ success: false, error: "Name is too long." }, { status: 400 });
    }

    const existing = await prisma.superAdminUser.findUnique({ where: { id: session.superAdmin.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Super admin account not found." }, { status: 404 });
    }

    const profileImage = await updateRoleProfileImage({
      currentUrl: existing.profileImage,
      imageDataUrl,
      removeProfileImage,
      pathPrefix: `super-admins/${existing.id}`,
    });

    const updated = await prisma.superAdminUser.update({
      where: { id: existing.id },
      data: { name, gender, profileImage },
      select: { id: true, email: true, name: true, gender: true, profileImage: true, role: true },
    });

    try {
      const { data } = await withTimeout<any>(supabaseServer.auth.getUser(accessToken), 5000, "Supabase user lookup");
      if (data.user?.id) {
        await withTimeout(
          supabaseServer.auth.admin.updateUserById(data.user.id, {
            user_metadata: { name: updated.name, gender: updated.gender },
          }),
          5000,
          "Supabase metadata update",
        );
      }
    } catch (metadataError) {
      console.warn("Super admin profile metadata update skipped:", metadataError);
    }

    await createSuperAdminAuditLog(
      existing.id,
      "super_admin_profile_update",
      "super_admin",
      existing.id,
      { name: updated.name, gender: updated.gender, profileImageUpdated: Boolean(imageDataUrl || removeProfileImage) },
      request.headers.get("x-forwarded-for") || "unknown",
    );

    return NextResponse.json({ success: true, data: updated, message: "Profile updated successfully." });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update profile." },
      { status: 500 },
    );
  }
}
