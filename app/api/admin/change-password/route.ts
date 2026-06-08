import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabaseClient";
import { createAuditLog, extractBearerToken, verifyAdminSession } from "@/lib/adminAuth";

function validPassword(value: unknown) {
  return typeof value === "string" && value.length >= 8;
}

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase client configuration is missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = extractBearerToken(request.headers.get("authorization"));
    const session = await verifyAdminSession({ accessToken });
    if (!session.success || !session.admin || !accessToken) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!currentPassword) {
      return NextResponse.json({ success: false, error: "Current password is required." }, { status: 400 });
    }
    if (!validPassword(newPassword)) {
      return NextResponse.json({ success: false, error: "New password must be at least 8 characters." }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ success: false, error: "New password and confirmation do not match." }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ success: false, error: "New password must be different from current password." }, { status: 400 });
    }

    const authUser = await supabaseServer.auth.getUser(accessToken);
    const email = authUser.data.user?.email || session.admin.email;
    const authUserId = authUser.data.user?.id;
    if (!authUserId || !email) {
      return NextResponse.json({ success: false, error: "Unable to resolve authenticated admin." }, { status: 401 });
    }

    const signInCheck = await createAnonClient().auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInCheck.error) {
      return NextResponse.json({ success: false, error: "Current password is incorrect." }, { status: 400 });
    }

    const { error } = await supabaseServer.auth.admin.updateUserById(authUserId, {
      password: newPassword,
    });
    if (error) {
      return NextResponse.json({ success: false, error: error.message || "Unable to update password." }, { status: 400 });
    }

    await createAuditLog(
      session.admin.id,
      "admin_password_update",
      "admin",
      session.admin.id,
      { email },
      request.headers.get("x-forwarded-for") || "unknown",
    );

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to update password." },
      { status: 500 },
    );
  }
}
