import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type CreateClientBody = {
  name?: string;
  email?: string;
};

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await request.json()) as CreateClientBody;
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Nombre y email son obligatorios." },
        { status: 400 },
      );
    }

    const existing = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing.data) {
      return NextResponse.json(
        { error: "Ya existe un cliente con ese email." },
        { status: 409 },
      );
    }

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${request.nextUrl.origin}/login`,
        data: { full_name: name },
      });

    if (inviteError || !inviteData.user) {
      return NextResponse.json(
        { error: inviteError?.message ?? "No se pudo invitar al cliente." },
        { status: 500 },
      );
    }

    const { data: client, error: clientError } = await supabaseAdmin
      .from("clients")
      .insert({
        name,
        email,
        auth_user_id: inviteData.user.id,
      })
      .select("id, name, email, auth_user_id, created_at")
      .single();

    if (clientError || !client) {
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
      return NextResponse.json(
        { error: clientError?.message ?? "No se pudo crear el cliente." },
        { status: 500 },
      );
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: inviteData.user.id,
        role: "cliente",
        full_name: name,
        client_id: client.id,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      return NextResponse.json(
        {
          warning:
            "Cliente creado e invitado, pero hubo un problema al crear su perfil.",
          client,
        },
        { status: 207 },
      );
    }

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Error inesperado al crear el cliente.";
    return NextResponse.json(
      { error: detail },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const clientId = request.nextUrl.searchParams.get("id");
    if (!clientId) {
      return NextResponse.json(
        { error: "Falta id de cliente." },
        { status: 400 },
      );
    }

    const { data: client, error: clientLookupError } = await supabaseAdmin
      .from("clients")
      .select("id, auth_user_id")
      .eq("id", clientId)
      .single();

    if (clientLookupError || !client) {
      return NextResponse.json(
        { error: "Cliente no encontrado." },
        { status: 404 },
      );
    }

    await supabaseAdmin.from("profiles").delete().eq("client_id", clientId);
    await supabaseAdmin.from("personalized_yoga").delete().eq("client_id", clientId);
    await supabaseAdmin.from("routines").delete().eq("client_id", clientId);
    await supabaseAdmin
      .from("routine_templates")
      .delete()
      .eq("client_id", clientId);

    const { error: deleteClientError } = await supabaseAdmin
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (deleteClientError) {
      return NextResponse.json(
        { error: deleteClientError.message },
        { status: 500 },
      );
    }

    if (client.auth_user_id) {
      await supabaseAdmin.auth.admin.deleteUser(client.auth_user_id);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Error inesperado al eliminar el cliente.";
    return NextResponse.json(
      { error: detail },
      { status: 500 },
    );
  }
}
