import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ClientRow = {
  id: string;
  auth_user_id: string | null;
};

type ProfileRow = {
  id: string;
  client_id: string | null;
};

type CompletionRow = {
  user_id: string;
  completion_date: string;
};

type AttendanceRow = {
  user_id: string;
  live_class_id: string;
  created_at: string;
};

type VideoViewRow = {
  user_id: string;
  video_type: string;
  video_id: string;
  created_at: string;
};

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const [clientsQ, profilesQ] = await Promise.all([
      supabaseAdmin.from("clients").select("id, auth_user_id"),
      supabaseAdmin.from("profiles").select("id, client_id").not("client_id", "is", null),
    ]);

    if (clientsQ.error || profilesQ.error) {
      return NextResponse.json(
        { error: clientsQ.error?.message ?? profilesQ.error?.message ?? "No se pudo cargar la actividad." },
        { status: 500 },
      );
    }

    const clients = (clientsQ.data as ClientRow[]) ?? [];
    const profiles = (profilesQ.data as ProfileRow[]) ?? [];

    const profileUserIdByClientId = new Map<string, string>();
    profiles.forEach((profile) => {
      if (profile.client_id && !profileUserIdByClientId.has(profile.client_id)) {
        profileUserIdByClientId.set(profile.client_id, profile.id);
      }
    });

    const userIds = Array.from(
      new Set(
        clients
          .map((client) => client.auth_user_id ?? profileUserIdByClientId.get(client.id) ?? null)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (userIds.length === 0) {
      return NextResponse.json({ activityByClientId: {} });
    }

    const [completionsQ, attendanceQ, videoViewsQ] = await Promise.all([
      supabaseAdmin.from("training_completions").select("user_id, completion_date").in("user_id", userIds),
      supabaseAdmin.from("class_attendance").select("user_id, live_class_id, created_at").in("user_id", userIds),
      supabaseAdmin.from("video_views").select("user_id, video_type, video_id, created_at").in("user_id", userIds),
    ]);

    if (completionsQ.error || attendanceQ.error || videoViewsQ.error) {
      return NextResponse.json(
        {
          error:
            completionsQ.error?.message ??
            attendanceQ.error?.message ??
            videoViewsQ.error?.message ??
            "No se pudo resumir la actividad.",
        },
        { status: 500 },
      );
    }

    const completions = (completionsQ.data as CompletionRow[]) ?? [];
    const attendance = (attendanceQ.data as AttendanceRow[]) ?? [];
    const videoViews = (videoViewsQ.data as VideoViewRow[]) ?? [];

    const completionsByUserId = new Map<string, string[]>();
    completions.forEach((row) => {
      const current = completionsByUserId.get(row.user_id) ?? [];
      current.push(row.completion_date);
      completionsByUserId.set(row.user_id, current);
    });

    const attendanceByUserId = new Map<string, string[]>();
    attendance.forEach((row) => {
      const current = attendanceByUserId.get(row.user_id) ?? [];
      current.push(row.live_class_id);
      attendanceByUserId.set(row.user_id, current);
    });

    const attendanceLastSeenByUserId = new Map<string, string>();
    attendance.forEach((row) => {
      const current = attendanceLastSeenByUserId.get(row.user_id);
      if (!current || row.created_at > current) {
        attendanceLastSeenByUserId.set(row.user_id, row.created_at);
      }
    });

    const videoViewsByUserId = new Map<string, string[]>();
    const videoLastSeenByUserId = new Map<string, string>();
    videoViews.forEach((row) => {
      const current = videoViewsByUserId.get(row.user_id) ?? [];
      current.push(`${row.video_type}:${row.video_id}`);
      videoViewsByUserId.set(row.user_id, current);

      const lastSeen = videoLastSeenByUserId.get(row.user_id);
      if (!lastSeen || row.created_at > lastSeen) {
        videoLastSeenByUserId.set(row.user_id, row.created_at);
      }
    });

    const activityByClientId = Object.fromEntries(
      clients.map((client) => {
        const userId = client.auth_user_id ?? profileUserIdByClientId.get(client.id) ?? null;
        const completionDates = userId ? completionsByUserId.get(userId) ?? [] : [];
        const attendedClassIds = userId ? attendanceByUserId.get(userId) ?? [] : [];
        const viewedVideoKeys = userId ? videoViewsByUserId.get(userId) ?? [] : [];
        const lastTrainingDate =
          completionDates.length > 0
            ? [...completionDates].sort((a, b) => b.localeCompare(a))[0]
            : null;
        const latestActivityDate = [
          lastTrainingDate ? `${lastTrainingDate}T12:00:00` : null,
          userId ? attendanceLastSeenByUserId.get(userId) ?? null : null,
          userId ? videoLastSeenByUserId.get(userId) ?? null : null,
        ]
          .filter((value): value is string => Boolean(value))
          .sort((a, b) => b.localeCompare(a))[0] ?? null;

        return [
          client.id,
          {
            linked: Boolean(userId),
            trainingsCompleted: completionDates.length,
            lastTrainingDate: latestActivityDate,
            liveClassesAttended: new Set(attendedClassIds).size,
            videosViewed: new Set(viewedVideoKeys).size,
          },
        ];
      }),
    );

    return NextResponse.json({ activityByClientId });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Error inesperado al cargar actividad.";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
