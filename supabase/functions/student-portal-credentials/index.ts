// Center or brand staff: provision student learn-portal Auth user + link students.user_id

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  studentId?: string;
  centerId?: string;
  brandId?: string;
  email?: string;
  password?: string;
  fullName?: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (match?.id) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }
  if (!authHeader) {
    return jsonResponse({ error: "Authorization required" }, 401);
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const studentId = body.studentId?.trim();
  const centerId = body.centerId?.trim();
  const brandId = body.brandId?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim() ?? "";
  const fullName = body.fullName?.trim() ?? "";

  if (!studentId || !centerId || !brandId || !email) {
    return jsonResponse({ error: "studentId, centerId, brandId, and email are required" }, 400);
  }
  if (password && password.length < 6) {
    return jsonResponse(
      { error: "Password must be at least 6 characters. “admin” is only 5 and cannot be saved." },
      400,
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await userClient.auth.getUser();
  if (callerError || !caller) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const { data: isAdmin, error: adminError } = await userClient.rpc("is_platform_admin");
  if (adminError) {
    return jsonResponse({ error: adminError.message }, 500);
  }

  const { data: hasBrand, error: brandError } = await userClient.rpc("has_brand_access", {
    p_brand_id: brandId,
  });
  if (brandError) {
    return jsonResponse({ error: brandError.message }, 500);
  }

  const { data: hasCenter, error: centerAccessError } = await userClient.rpc("has_center_access", {
    p_center_id: centerId,
  });
  if (centerAccessError) {
    return jsonResponse({ error: centerAccessError.message }, 500);
  }

  if (!isAdmin && !hasBrand && !hasCenter) {
    return jsonResponse({ error: "Center or brand access required" }, 403);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: enrollment, error: enrollmentError } = await adminClient
    .from("student_enrollments")
    .select("id, students!inner(id, brand_id, full_name, deleted_at)")
    .eq("student_id", studentId)
    .eq("center_id", centerId)
    .eq("brand_id", brandId)
    .eq("status", "active")
    .is("students.deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (enrollmentError) {
    return jsonResponse({ error: enrollmentError.message }, 500);
  }
  if (!enrollment) {
    return jsonResponse({ error: "Student not enrolled at this center" }, 404);
  }

  const studentRel = enrollment.students as
    | { id: string; brand_id: string; full_name: string | null }
    | { id: string; brand_id: string; full_name: string | null }[]
    | null;
  const studentRow = Array.isArray(studentRel) ? studentRel[0] : studentRel;
  if (!studentRow || studentRow.brand_id !== brandId) {
    return jsonResponse({ error: "Student not found for brand" }, 404);
  }

  let userId = await findUserIdByEmail(adminClient, email);
  let passwordWasSet = false;

  if (!userId) {
    if (!password) {
      return jsonResponse({ error: "Password required for a new student portal login" }, 400);
    }
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || studentRow.full_name || undefined,
      },
    });
    if (createError) {
      return jsonResponse({ error: createError.message }, 400);
    }
    userId = created.user?.id ?? null;
    passwordWasSet = true;
  } else if (password) {
    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      return jsonResponse({ error: updateError.message }, 400);
    }
    passwordWasSet = true;
  }

  if (!userId) {
    return jsonResponse({ error: "Failed to resolve auth user" }, 500);
  }

  const { error: syncError } = await adminClient.rpc("sync_student_portal_credentials", {
    p_student_id: studentId,
    p_center_id: centerId,
    p_brand_id: brandId,
    p_user_id: userId,
    p_login_email: email,
  });

  if (syncError) {
    return jsonResponse({ error: syncError.message }, 400);
  }

  return jsonResponse({
    ok: true,
    userId,
    loginEmail: email,
    passwordWasSet,
  });
});
