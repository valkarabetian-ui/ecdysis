
"use client";

import { TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import {
  AppShell,
  BottomNavigation,
  DatePills,
  ExpandableSection,
  EditorialWorkoutCard,
  FloatingCard,
  GhostButton,
  PrimaryButton,
  ProgressRing,
  SecondaryButton,
  SkeletonCard,
  TextField,
} from "@/components/ui/design-system";

type Tab = "inicio" | "biblioteca" | "progreso" | "perfil";

type Profile = { full_name: string | null; created_at: string | null; client_id: string | null };
type ClientLink = { id: string };
type Routine = {
  id: string;
  day: string;
  routine_date?: string | null;
  category: "fuerza" | "movilidad";
  repetitions: string;
  exercise_id: string;
};
type Exercise = { id: string; name: string; gif_url: string };
type WelcomeVideo = { id: string; title: string; youtube_url: string };
type RecordedClass = {
  id: string;
  area: "fuerza" | "yoga";
  title: string;
  youtube_url: string;
  created_at?: string;
};
type LiveClass = {
  id: string;
  area?: "fuerza" | "yoga";
  title: string;
  class_datetime: string;
  meet_url: string;
};
type PersonalizedYoga = { id: string; title: string; youtube_url: string };
type CompletionRow = { completion_date: string };
type YogaViewRow = { video_id: string; created_at: string };
type RecordedViewRow = { video_id: string; created_at: string };
type AttendanceRow = { live_class_id: string; created_at: string };

const tabs: { id: Tab; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "biblioteca", label: "Biblioteca" },
  { id: "progreso", label: "Progreso" },
  { id: "perfil", label: "Perfil" },
];

const week = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const weekShort = ["L", "M", "X", "J", "V", "S", "D"];
const calendarIconByLabel: Record<string, string> = {
  Fuerza: "F",
  Movilidad: "M",
  "Clase en vivo": "Y",
};

const toWeekName = (date: Date) => {
  const day = date.getDay();
  if (day === 0) return "domingo";
  return week[day - 1];
};

const sameDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const dateKeyFromIso = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return localDateKey(date);
};

const formatShortDate = (isoDate?: string) => {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR");
};

const getYouTubeThumbnail = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.replace("/", "");
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
    }
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
    }
    return "";
  } catch {
    return "";
  }
};

export default function ClientePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("inicio");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState("");
  const [name, setName] = useState("Cliente");
  const [email, setEmail] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exerciseById, setExerciseById] = useState<
    Record<string, { name: string; gifUrl: string }>
  >({});
  const [welcomeVideos, setWelcomeVideos] = useState<WelcomeVideo[]>([]);
  const [recordedFuerza, setRecordedFuerza] = useState<RecordedClass[]>([]);
  const [recordedYoga, setRecordedYoga] = useState<RecordedClass[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [personalizedYoga, setPersonalizedYoga] = useState<PersonalizedYoga[]>([]);

  const [showMonth, setShowMonth] = useState(false);
  const [showTodayWorkout, setShowTodayWorkout] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [checked, setChecked] = useState<string[]>([]);
  const [completedToday, setCompletedToday] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [completionRows, setCompletionRows] = useState<CompletionRow[]>([]);
  const [yogaViewRows, setYogaViewRows] = useState<YogaViewRow[]>([]);
  const [recordedViewRows, setRecordedViewRows] = useState<RecordedViewRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [clientLinkWarning, setClientLinkWarning] = useState("");
  const [libraryCategory, setLibraryCategory] = useState<"yoga" | "fuerza" | null>(
    null,
  );
  const [recordedSort, setRecordedSort] = useState<"recent" | "old">("recent");
  const [pullDistance, setPullDistance] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const welcomeStripRef = useRef<HTMLDivElement | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const isHorizontalSwipeRef = useRef(false);
  const completionTimeoutRef = useRef<number | null>(null);

  const today = new Date();
  const nowMs = today.getTime();
  const todayName = toWeekName(today);
  const todayDateISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayPlan = routines.filter(
    (routine) =>
      (routine.routine_date && routine.routine_date === todayDateISO) ||
      (!routine.routine_date && routine.day === todayName),
  );

  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  const weekLabels = week.map((day, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return `${day.slice(0, 3)} ${date.getDate()}`;
  });

  const triggerHaptic = (duration = 10) => {
    if (typeof window === "undefined") return;
    if ("vibrate" in navigator) {
      navigator.vibrate(duration);
    }
  };

  const loadData = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    setError("");
    setClientLinkWarning("");

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      router.push("/login");
      return;
    }

    const currentUserId = authData.user.id;
    setUserId(currentUserId);
    setEmail(authData.user.email ?? "");

    const profileQ = await supabase
      .from("profiles")
      .select("full_name, created_at, client_id")
      .eq("id", currentUserId)
      .single();

    const profile = (profileQ.data as Profile | null) ?? null;
    if (profile?.full_name) setName(profile.full_name);
    else if (authData.user.email) setName(authData.user.email.split("@")[0]);

    setCreatedAt(profile?.created_at ?? authData.user.created_at ?? "");

    let resolvedClientId = profile?.client_id ?? null;
    if (!resolvedClientId) {
      const [byAuthQ, byEmailQ] = await Promise.all([
        supabase
          .from("clients")
          .select("id")
          .eq("auth_user_id", currentUserId)
          .maybeSingle(),
        authData.user.email
          ? supabase
              .from("clients")
              .select("id")
              .eq("email", authData.user.email)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      resolvedClientId =
        (byAuthQ.data as ClientLink | null)?.id ??
        (byEmailQ.data as ClientLink | null)?.id ??
        null;

      if (resolvedClientId) {
        await supabase
          .from("profiles")
          .update({ client_id: resolvedClientId })
          .eq("id", currentUserId);
      }
    }

    if (!resolvedClientId) {
      setClientLinkWarning(
        "Tu cuenta no esta vinculada a un cliente. Veras clases generales, pero no rutina personalizada.",
      );
    }

    const [welcomeQ, recordedQ, liveQ, completionsQ, yogaViewsQ, recordedViewsQ, meetQ, welcomeViewsQ] = await Promise.all([
      supabase.from("welcome_videos").select("id, title, youtube_url").order("created_at", { ascending: true }),
      supabase
        .from("recorded_classes")
        .select("id, area, title, youtube_url, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("live_classes")
        .select("id, area, title, class_datetime, meet_url")
        .order("class_datetime", { ascending: true }),
      supabase.from("training_completions").select("completion_date").eq("user_id", currentUserId),
      supabase.from("video_views").select("video_id, created_at").eq("user_id", currentUserId).eq("video_type", "yoga"),
      supabase.from("video_views").select("video_id, created_at").eq("user_id", currentUserId).eq("video_type", "recorded"),
      supabase.from("class_attendance").select("live_class_id, created_at").eq("user_id", currentUserId),
      supabase.from("video_views").select("video_id").eq("user_id", currentUserId).eq("video_type", "welcome"),
    ]);

    if (welcomeQ.error || recordedQ.error || liveQ.error) {
      setError(
        welcomeQ.error?.message ??
          recordedQ.error?.message ??
          liveQ.error?.message ??
          "No se pudo cargar la app.",
      );
      setLoading(false);
      return;
    }

    let routinesData: Routine[] = [];
    let personalizedData: PersonalizedYoga[] = [];
    if (resolvedClientId) {
      const [routinesQ, personalizedQ] = await Promise.all([
        supabase
          .from("routines")
          .select("id, day, routine_date, category, repetitions, exercise_id")
          .eq("client_id", resolvedClientId),
        supabase
          .from("personalized_yoga")
          .select("id, title, youtube_url")
          .eq("client_id", resolvedClientId)
          .order("created_at", { ascending: false }),
      ]);

      if (routinesQ.error || personalizedQ.error) {
        setError(
          routinesQ.error?.message ??
            personalizedQ.error?.message ??
            "No se pudo cargar la rutina personalizada.",
        );
        setLoading(false);
        return;
      }

      routinesData = (routinesQ.data as Routine[]) ?? [];
      personalizedData = (personalizedQ.data as PersonalizedYoga[]) ?? [];
    }

    setRoutines(routinesData);

    const exerciseIds = Array.from(new Set(routinesData.map((routine) => routine.exercise_id)));
    if (exerciseIds.length > 0) {
      const exercisesQ = await supabase
        .from("exercises")
        .select("id, name, gif_url")
        .in("id", exerciseIds);
      if (!exercisesQ.error) {
        const map: Record<string, { name: string; gifUrl: string }> = {};
        ((exercisesQ.data as Exercise[]) ?? []).forEach((exercise) => {
          map[exercise.id] = {
            name: exercise.name,
            gifUrl: exercise.gif_url,
          };
        });
        setExerciseById(map);
      }
    } else {
      setExerciseById({});
    }

    const welcomeData = (welcomeQ.data as WelcomeVideo[]) ?? [];
    setWelcomeVideos(welcomeData);
    setRecordedFuerza(((recordedQ.data as RecordedClass[]) ?? []).filter((item) => item.area === "fuerza"));
    setRecordedYoga(((recordedQ.data as RecordedClass[]) ?? []).filter((item) => item.area === "yoga"));
    setLiveClasses((liveQ.data as LiveClass[]) ?? []);
    setPersonalizedYoga(personalizedData);

    const welcomeViewIds = new Set(((welcomeViewsQ.data as { video_id: string }[]) ?? []).map((item) => item.video_id));
    setWelcomeSeen(welcomeData.length > 0 && welcomeData.every((item) => welcomeViewIds.has(item.id)));

    const completionData = (completionsQ.data as CompletionRow[]) ?? [];
    const yogaData = (yogaViewsQ.data as YogaViewRow[]) ?? [];
    const recordedData = (recordedViewsQ.data as RecordedViewRow[]) ?? [];
    const attendanceData = (meetQ.data as AttendanceRow[]) ?? [];
    setCompletionRows(completionData);
    setYogaViewRows(yogaData);
    setRecordedViewRows(recordedData);
    setAttendanceRows(attendanceData);

    const todayCompletionQ = await supabase
      .from("training_completions")
      .select("id")
      .eq("user_id", currentUserId)
      .eq("completion_date", todayDateISO)
      .maybeSingle();
    setCompletedToday(Boolean(todayCompletionQ.data));

    setLoading(false);
  }, [router, todayDateISO]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, [loadData]);

  useEffect(
    () => () => {
      if (completionTimeoutRef.current) {
        window.clearTimeout(completionTimeoutRef.current);
      }
    },
    [],
  );

  const tabOrder = useMemo<Tab[]>(
    () => ["inicio", "biblioteca", "progreso", "perfil"],
    [],
  );

  const shouldIgnoreGesture = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest("button, a, input, select, textarea, label"));
  };

  const onGestureStart = (event: TouchEvent<HTMLDivElement>) => {
    if (shouldIgnoreGesture(event.target)) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      isPullingRef.current = false;
      isHorizontalSwipeRef.current = false;
      return;
    }

    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    isPullingRef.current = window.scrollY <= 0;
    isHorizontalSwipeRef.current = false;
  };

  const onGestureMove = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const touch = event.touches[0];
    const dx = touch.clientX - touchStartXRef.current;
    const dy = touch.clientY - touchStartYRef.current;

    if (Math.abs(dx) > Math.abs(dy)) {
      isHorizontalSwipeRef.current = true;
      setIsSwiping(true);
    }

    if (
      isPullingRef.current &&
      !isHorizontalSwipeRef.current &&
      dy > 0 &&
      Math.abs(dy) > Math.abs(dx) &&
      window.scrollY <= 0
    ) {
      event.preventDefault();
      setPullDistance(Math.min(dy * 0.45, 96));
    } else if (isHorizontalSwipeRef.current) {
      const damped = Math.max(-84, Math.min(84, dx * 0.35));
      setSwipeOffset(damped);
    }
  };

  const onGestureEnd = async (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartXRef.current;
    const dy = touch.clientY - touchStartYRef.current;

    if (pullDistance >= 72 && !refreshing) {
      triggerHaptic(12);
      setRefreshing(true);
      await loadData(true);
      setRefreshing(false);
    } else if (Math.abs(dx) >= 70 && Math.abs(dy) <= 44) {
      const current = tabOrder.indexOf(tab);
      if (dx < 0 && current < tabOrder.length - 1) {
        setTab(tabOrder[current + 1]);
        triggerHaptic(10);
      }
      if (dx > 0 && current > 0) {
        setTab(tabOrder[current - 1]);
        triggerHaptic(10);
      }
    }

    setPullDistance(0);
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isPullingRef.current = false;
    isHorizontalSwipeRef.current = false;
  };

  const nextLive = useMemo(() => {
    const now = new Date();
    return liveClasses
      .map((item) => ({ ...item, parsed: new Date(item.class_datetime) }))
      .filter((item) => item.parsed >= now)
      .sort((a, b) => a.parsed.getTime() - b.parsed.getTime())[0];
  }, [liveClasses]);

  const displayedRecordedYoga = useMemo(() => {
    const list = [...recordedYoga];
    list.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return recordedSort === "recent" ? bTime - aTime : aTime - bTime;
    });
    return list;
  }, [recordedYoga, recordedSort]);

  const displayedRecordedFuerza = useMemo(() => {
    const list = [...recordedFuerza];
    list.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return recordedSort === "recent" ? bTime - aTime : aTime - bTime;
    });
    return list;
  }, [recordedFuerza, recordedSort]);

  const viewedRecordedIds = useMemo(
    () => new Set(recordedViewRows.map((row) => row.video_id)),
    [recordedViewRows],
  );

  const nextLiveCountdown = (() => {
    if (!nextLive) return "";
    const target = new Date(nextLive.class_datetime).getTime();
    const diff = target - nowMs;
    if (diff <= 0) return "Empieza ahora";
    const totalMinutes = Math.floor(diff / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `Empieza en ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  })();

  const todayFocus = useMemo(() => {
    const labels = new Set<string>();
    if (todayPlan.some((item) => item.category === "fuerza")) {
      labels.add("Fuerza");
    }
    if (todayPlan.some((item) => item.category === "movilidad")) {
      labels.add("Movilidad");
    }
    const hasLiveToday = liveClasses.some((item) => {
      const date = new Date(item.class_datetime);
      return localDateKey(date) === todayDateISO;
    });
    if (hasLiveToday) {
      labels.add("Clase en vivo");
    }
    return Array.from(labels).slice(0, 2);
  }, [todayPlan, liveClasses, todayDateISO]);

  const todayLiveClass = useMemo(() => {
    const now = new Date();
    const todays = liveClasses
      .filter((item) => localDateKey(new Date(item.class_datetime)) === todayDateISO)
      .sort((a, b) => new Date(a.class_datetime).getTime() - new Date(b.class_datetime).getTime());
    if (todays.length === 0) return null;
    return todays.find((item) => new Date(item.class_datetime) >= now) ?? todays[0];
  }, [liveClasses, todayDateISO]);

  const progressMetrics = (() => {
    const now = new Date(nowMs);
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const monthStartKey = localDateKey(monthStart);
    const monthEndKey = localDateKey(monthEnd);

    const completedThisMonth = completionRows.filter(
      (item) => item.completion_date >= monthStartKey && item.completion_date <= monthEndKey,
    ).length;

    const plannedDates = new Set<string>();
    const recurringWeekdays = new Set<string>();
    routines.forEach((routine) => {
      if (routine.routine_date) {
        if (routine.routine_date >= monthStartKey && routine.routine_date <= monthEndKey) {
          plannedDates.add(routine.routine_date);
        }
        return;
      }
      recurringWeekdays.add(routine.day);
    });

    recurringWeekdays.forEach((dayName) => {
      for (let day = 1; day <= monthEnd.getDate(); day += 1) {
        const date = new Date(year, month, day);
        if (toWeekName(date) === dayName) {
          plannedDates.add(localDateKey(date));
        }
      }
    });

    const trainingTarget = Math.max(plannedDates.size, 1);
    const trainingPercent = Math.min(
      100,
      Math.round((completedThisMonth / trainingTarget) * 100),
    );

    const yogaViewedUnique = new Set(yogaViewRows.map((row) => row.video_id)).size;
    const yogaTotalAvailable = Math.max(recordedYoga.length + personalizedYoga.length, 1);
    const yogaPercent = Math.min(
      100,
      Math.round((yogaViewedUnique / yogaTotalAvailable) * 100),
    );

    const liveClassesThisMonth = liveClasses.filter((item) => {
      const date = new Date(item.class_datetime);
      return date.getFullYear() === year && date.getMonth() === month;
    }).length;
    const attendedUnique = new Set(attendanceRows.map((row) => row.live_class_id)).size;
    const meetPercent = Math.min(
      100,
      Math.round((attendedUnique / Math.max(liveClassesThisMonth, 1)) * 100),
    );

    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
    const weekKeys = weekDays.map((date) => localDateKey(date));

    const completionByDay = completionRows.reduce<Record<string, number>>((acc, item) => {
      acc[item.completion_date] = (acc[item.completion_date] ?? 0) + 1;
      return acc;
    }, {});
    const yogaByDay = yogaViewRows.reduce<Record<string, number>>((acc, item) => {
      const key = dateKeyFromIso(item.created_at);
      if (!key) return acc;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const meetByDay = attendanceRows.reduce<Record<string, number>>((acc, item) => {
      const key = dateKeyFromIso(item.created_at);
      if (!key) return acc;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const weeklyBars = weekKeys.map((key, index) => {
      const trainings = completionByDay[key] ?? 0;
      const yoga = yogaByDay[key] ?? 0;
      const meet = meetByDay[key] ?? 0;
      const total = trainings * 2 + yoga + meet;
      return {
        key,
        dayShort: weekShort[index],
        value: total,
      };
    });

    const maxValue = Math.max(1, ...weeklyBars.map((item) => item.value));
    const weeklyBarsScaled = weeklyBars.map((item) => ({
      ...item,
      percent: item.value === 0 ? 10 : Math.max(18, Math.round((item.value / maxValue) * 100)),
    }));

    const weeklyTotal = weeklyBars.reduce((acc, item) => acc + item.value, 0);
    const motivation =
      completedThisMonth === 0
        ? "Primer paso: cuando completes tu primer entrenamiento vas a ver tu racha."
        : weeklyTotal >= 8
          ? "Racha activa: mantuviste una semana muy consistente."
          : "Buen comienzo: sigue así para sostener tu práctica.";

    return {
      trainingPercent,
      yogaPercent,
      meetPercent,
      completedThisMonth,
      yogaViewedUnique,
      attendedUnique,
      weeklyBars: weeklyBarsScaled,
      motivation,
    };
  })();

  const daysInMonth = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const first = new Date(year, month, 1);
    const total = new Date(year, month + 1, 0).getDate();
    const initialBlanks = (first.getDay() + 6) % 7;
    const cells: (Date | null)[] = Array.from({ length: initialBlanks }, () => null);
    for (let i = 1; i <= total; i += 1) cells.push(new Date(year, month, i));
    return cells;
  }, [monthCursor]);

  const calendarLabels = useMemo(() => {
    const labelsByDate: Record<string, Set<string>> = {};

    routines.forEach((routine) => {
      const key = routine.routine_date || todayDateISO;
      if (!labelsByDate[key]) labelsByDate[key] = new Set<string>();
      labelsByDate[key].add(
        routine.category === "fuerza" ? "Fuerza" : "Movilidad",
      );
    });

    liveClasses.forEach((liveClass) => {
      const localDate = new Date(liveClass.class_datetime);
      const key = `${localDate.getFullYear()}-${String(
        localDate.getMonth() + 1,
      ).padStart(2, "0")}-${String(localDate.getDate()).padStart(2, "0")}`;
      if (!labelsByDate[key]) labelsByDate[key] = new Set<string>();
      labelsByDate[key].add("Clase en vivo");
    });

    return labelsByDate;
  }, [routines, liveClasses, todayDateISO]);
  const monthTitle = monthCursor
    .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    .toUpperCase();
  const todayCalendarLabels = Array.from(calendarLabels[todayDateISO] ?? []);

  const toggleCheck = (idx: number) => {
    const key = `${todayDateISO}-${idx}`;
    setChecked((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));
    triggerHaptic(8);
  };

  const markDone = async () => {
    if (!userId || completedToday || checked.length < todayPlan.length) return;
    const { error: insertError } = await supabase.from("training_completions").upsert({ user_id: userId, completion_date: todayDateISO }, { onConflict: "user_id,completion_date" });
    if (insertError) {
      setProfileMsg("No se pudo guardar el progreso de hoy.");
      return;
    }
    triggerHaptic(16);
    setCompletedToday(true);
    setShowTodayWorkout(false);
    setChecked([]);
    setShowCompletionScreen(true);
    if (completionTimeoutRef.current) {
      window.clearTimeout(completionTimeoutRef.current);
    }
    completionTimeoutRef.current = window.setTimeout(() => {
      setShowCompletionScreen(false);
      void loadData(true);
      router.replace("/cliente");
      router.refresh();
    }, 1500);
    setCompletionRows((current) =>
      current.some((item) => item.completion_date === todayDateISO)
        ? current
        : [...current, { completion_date: todayDateISO }],
    );
  };

  const startTodayWorkout = () => {
    triggerHaptic(10);
    setShowTodayWorkout(true);
  };

  const markWelcomeSeen = async () => {
    if (!userId || welcomeVideos.length === 0) return;
    const rows = welcomeVideos.map((video) => ({ user_id: userId, video_type: "welcome", video_id: video.id }));
    const { error: upsertError } = await supabase.from("video_views").upsert(rows, { onConflict: "user_id,video_type,video_id" });
    if (upsertError) {
      setProfileMsg("No se pudieron registrar los videos de bienvenida.");
      return;
    }
    setWelcomeSeen(true);
  };

  const joinLiveClass = async (item: LiveClass) => {
    if (userId) {
      await supabase.from("class_attendance").upsert({ user_id: userId, live_class_id: item.id }, { onConflict: "user_id,live_class_id" });
      setAttendanceRows((current) =>
        current.some((row) => row.live_class_id === item.id)
          ? current
          : [...current, { live_class_id: item.id, created_at: new Date().toISOString() }],
      );
    }
    window.open(item.meet_url, "_blank", "noopener,noreferrer");
  };

  const watchYoga = async (videoId: string, url: string) => {
    if (userId) {
      await supabase.from("video_views").upsert({ user_id: userId, video_type: "yoga", video_id: videoId }, { onConflict: "user_id,video_type,video_id" });
      setYogaViewRows((current) =>
        current.some((row) => row.video_id === videoId)
          ? current
          : [...current, { video_id: videoId, created_at: new Date().toISOString() }],
      );
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const watchRecorded = async (videoId: string, url: string) => {
    if (userId) {
      await supabase
        .from("video_views")
        .upsert(
          { user_id: userId, video_type: "recorded", video_id: videoId },
          { onConflict: "user_id,video_type,video_id" },
        );
      setRecordedViewRows((current) =>
        current.some((row) => row.video_id === videoId)
          ? current
          : [...current, { video_id: videoId, created_at: new Date().toISOString() }],
      );
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const changePassword = async () => {
    setProfileMsg("");
    if (!newPassword) return;
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setProfileMsg("No se pudo actualizar la contraseña.");
      return;
    }
    setProfileMsg("Contraseña actualizada.");
    setNewPassword("");
    setShowPasswordChange(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const scrollWelcome = (direction: "left" | "right") => {
    if (!welcomeStripRef.current) return;
    const amount = direction === "right" ? 260 : -260;
    welcomeStripRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (loading) {
    return (
      <AppShell
        kicker=""
        title="Práctica viva"
      >
        <FloatingCard title="Cargando" description="Sincronizando tu experiencia.">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </FloatingCard>
        <BottomNavigation items={tabs} value={tab} onChange={(value) => setTab(value as Tab)} />
      </AppShell>
    );
  }

  if (showCompletionScreen) {
    return (
      <AppShell
        kicker=""
        title="Práctica viva"
      >
        <FloatingCard
          title="\u00a1Hoy ya cumpliste! Muy bien."
          description="Redirigiendo..."
        >
          <SkeletonCard lines={1} />
        </FloatingCard>
      </AppShell>
    );
  }

  return (
    <ProtectedRoute allowedRole="cliente">
      <AppShell kicker="" title="Práctica viva">
      <div
        className={`ds-pull-indicator ${refreshing ? "is-refreshing" : ""}`}
        style={{
          transform: `translate(-50%, ${Math.round(-56 + pullDistance)}px)`,
        }}
      >
        {refreshing ? "Actualizando..." : pullDistance >= 72 ? "Solta para actualizar" : "Desliza hacia abajo"}
      </div>

      <div
        className="ds-cliente-flow"
        onTouchStart={onGestureStart}
        onTouchMove={onGestureMove}
        onTouchEnd={onGestureEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? "none" : "transform 180ms ease",
          willChange: "transform",
        }}
      >
      {tab === "inicio" && (
          <FloatingCard
            title={`Hola, ${name}`}
          >
            {!welcomeSeen && welcomeVideos.length > 0 && (
              <div className="ds-section-block">
                <div className="ds-welcome-carousel-shell">
                  <button
                    type="button"
                    className="ds-carousel-arrow ds-carousel-arrow-left"
                    aria-label="Ver videos anteriores"
                    onClick={() => scrollWelcome("left")}
                  >
                    ←
                  </button>
                  <div className="ds-welcome-strip-wrap">
                    <div ref={welcomeStripRef} className="ds-welcome-strip">
                      {welcomeVideos.map((video) => (
                        <div key={video.id} className="ds-welcome-preview ds-welcome-preview-compact">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getYouTubeThumbnail(video.youtube_url)}
                            alt={`Previsualizacion de ${video.title}`}
                            className="ds-welcome-thumb"
                            loading="lazy"
                          />
                          <div className="ds-welcome-content">
                            <h3 className="ds-h3 ds-welcome-title">{video.title}</h3>
                            <GhostButton
                              onClick={() =>
                                window.open(video.youtube_url, "_blank", "noopener,noreferrer")
                              }
                            >
                              Ver
                            </GhostButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ds-carousel-arrow ds-carousel-arrow-right"
                    aria-label="Ver mas videos"
                    onClick={() => scrollWelcome("right")}
                  >
                    →
                  </button>
                </div>
                <PrimaryButton onClick={markWelcomeSeen}>Marcar como vistos</PrimaryButton>
              </div>
            )}
            <div className="ds-section-block">
            <p className="ds-description">
              Hoy te toca:{" "}
              {todayFocus.length ? (
                todayFocus.map((label, index) => (
                  <span key={`${label}-${index}`}>
                    {label === "Fuerza" ? (
                      <button
                        type="button"
                        className="ds-inline-action"
                        onClick={startTodayWorkout}
                      >
                        {label}
                      </button>
                    ) : label === "Clase en vivo" && todayLiveClass ? (
                      <button
                        type="button"
                        className="ds-inline-action ds-inline-live-action"
                        onClick={() => joinLiveClass(todayLiveClass)}
                      >
                        Clase en vivo
                      </button>
                    ) : (
                      <span>{label}</span>
                    )}
                    {index < todayFocus.length - 1 ? " + " : ""}
                  </span>
                ))
              ) : (
                "Sin asignaciones para hoy"
              )}
            </p>
            <DatePills days={week} current={todayName} labels={weekLabels} />
            <GhostButton onClick={() => setShowMonth((current) => !current)}>
                {showMonth ? "Minimizar calendario" : "Abrir calendario mensual"}
              </GhostButton>

            <ExpandableSection open={showMonth}>
              <div
                className="rounded-[20px] border p-4"
                style={{
                  borderColor: "var(--ds-border)",
                  boxShadow: "var(--ds-shadow-2)",
                  color: "#f4e2d0",
                  background:
                    "linear-gradient(165deg, rgba(58,86,53,.92), rgba(58,86,53,.78), rgba(213,123,14,.84))",
                }}
              >
                <div
                  className="mb-2 grid items-center gap-2"
                  style={{ gridTemplateColumns: "40px 1fr 40px" }}
                >
                  <button
                    onClick={() =>
                      setMonthCursor(
                        (date) => new Date(date.getFullYear(), date.getMonth() - 1, 1),
                      )
                    }
                    className="h-9 rounded-full border text-sm font-bold"
                    style={{
                      borderColor: "rgba(244,226,208,.35)",
                      background: "rgba(244,226,208,.08)",
                      color: "#f4e2d0",
                    }}
                  >
                    {"<"}
                  </button>
                  <p className="m-0 text-center text-xs font-bold tracking-[0.08em]">
                    {monthTitle}
                  </p>
                  <button
                    onClick={() =>
                      setMonthCursor(
                        (date) => new Date(date.getFullYear(), date.getMonth() + 1, 1),
                      )
                    }
                    className="h-9 rounded-full border text-sm font-bold"
                    style={{
                      borderColor: "rgba(244,226,208,.35)",
                      background: "rgba(244,226,208,.08)",
                      color: "#f4e2d0",
                    }}
                  >
                    {">"}
                  </button>
                </div>

                <div
                  className="mb-1 grid gap-1 text-center text-[11px]"
                  style={{ gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}
                >
                  {weekShort.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                <div
                  className="grid gap-x-1 gap-y-1.5"
                  style={{ gridTemplateColumns: "repeat(7,minmax(0,1fr))" }}
                >
                  {daysInMonth.map((day, idx) => {
                    if (!day) {
                      return <div key={idx} className="min-h-[42px] opacity-0" />;
                    }
                    const key = localDateKey(day);
                    const labels = Array.from(calendarLabels[key] ?? []);
                    const badgeCodes = labels
                      .map((label) => calendarIconByLabel[label])
                      .filter(Boolean);
                    const badgeText =
                      badgeCodes.length === 0
                        ? ""
                        : badgeCodes.length === 1
                          ? badgeCodes[0]
                          : `${badgeCodes[0]}+${badgeCodes.length - 1}`;
                    const isToday = sameDate(day, today);
                    return (
                      <div key={key} className="flex min-h-[42px] flex-col items-center">
                        <button
                          onClick={() => undefined}
                          disabled={!isToday}
                          className="relative h-[34px] w-[34px] rounded-full border text-[12px] font-bold"
                          style={
                            isToday
                              ? {
                                  borderColor: "#f4e2d0",
                                  background: "#f4e2d0",
                                  color: "var(--ds-accent)",
                                }
                              : {
                                  borderColor: "rgba(244,226,208,.22)",
                                  background: "rgba(244,226,208,.08)",
                                  color: "#f4e2d0",
                                  opacity: 0.75,
                                }
                          }
                        >
                          <span>{day.getDate()}</span>
                          {badgeText && (
                            <span className="ds-month-mini-badge" title={labels.join(" / ")}>
                              {badgeText}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="ds-month-footer mt-4 rounded-[14px] border px-3 py-2"
                  style={{
                    borderColor: "rgba(244,226,208,.22)",
                    background: "rgba(244,226,208,.1)",
                  }}
                >
                  <p className="ds-micro">
                    HOY {today.getDate()} -{" "}
                    {todayCalendarLabels.length
                      ? todayCalendarLabels
                          .join(" / ")
                      : "Sin actividades"}
                  </p>
                </div>
              </div>
            </ExpandableSection>
            </div>

          {(!completedToday || showTodayWorkout) && (
          <div className="ds-section-block">
            <h3 className="ds-h3">Entrenamiento completo de hoy</h3>
            {!showTodayWorkout ? (
              <>
                <p className="ds-description">
                  {todayPlan.length > 0
                    ? "Estas listo para entrenar hoy?"
                    : "Hoy no tenes rutina asignada."}
                </p>
                <PrimaryButton
                  onClick={startTodayWorkout}
                  disabled={todayPlan.length === 0}
                >
                 ¡Empecemos!
                </PrimaryButton>
              </>
            ) : (
              <>
                <div className="ds-inline-panel">
                  <h4 className="ds-h3">{todayFocus[0] ?? "Entrenamiento del dia"}</h4>
                  <p className="ds-description">Rutina completa asignada para hoy.</p>
                  <GhostButton onClick={() => setShowTodayWorkout(false)}>
                    Volver
                  </GhostButton>
                </div>

                {todayPlan.map((item, idx) => {
                  const key = `${todayDateISO}-${idx}`;
                  const exerciseUrl = exerciseById[item.exercise_id]?.gifUrl ?? "";
                  const exercisePreviewUrl = getYouTubeThumbnail(exerciseUrl) || exerciseUrl;
                  return (
                    <EditorialWorkoutCard
                      key={key}
                      title={`${exerciseById[item.exercise_id]?.name ?? "Ejercicio"} - ${item.repetitions} reps`}
                      meta={item.category}
                      rightSlot={
                        <div className="ds-pill-row">
                          {exercisePreviewUrl && (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={exercisePreviewUrl}
                                alt={`Video ${exerciseById[item.exercise_id]?.name ?? "ejercicio"}`}
                                className="ds-gif-thumb"
                                loading="lazy"
                              />
                            </>
                          )}
                          {!completedToday && (
                            <button
                              type="button"
                              className={`ds-check ${checked.includes(key) ? "is-checked" : ""}`}
                              aria-pressed={checked.includes(key)}
                              aria-label={`Marcar ${exerciseById[item.exercise_id]?.name ?? "ejercicio"} como completado`}
                              onClick={() => toggleCheck(idx)}
                            >
                              {checked.includes(key) ? "âœ“" : ""}
                            </button>
                          )}
                        </div>
                      }
                    />
                  );
                })}

                {todayPlan.length === 0 && (
                  <p className="ds-description">No hay rutina asignada para hoy.</p>
                )}
                {completedToday ? (
                  <SecondaryButton disabled>
                    Entrenamiento ya completado hoy
                  </SecondaryButton>
                ) : (
                  <SecondaryButton onClick={markDone}>
                    Marcar entrenamiento como completado
                  </SecondaryButton>
                )}
              </>
            )}
          </div>
          )}
        </FloatingCard>
      )}

      {tab === "biblioteca" && (
          <FloatingCard title="Biblioteca" className="ds-library-shell">
            <div className="ds-section-block">
              <h3 className="ds-h3">Próxima clase en vivo</h3>
              {nextLive ? (
                <article className="ds-library-live-card">
                  <div className="ds-library-live-media">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        nextLive.area === "yoga"
                          ? (recordedYoga[0] ? getYouTubeThumbnail(recordedYoga[0].youtube_url) : "/fondoverde.jpg")
                          : (recordedFuerza[0] ? getYouTubeThumbnail(recordedFuerza[0].youtube_url) : "/fondoverde.jpg")
                      }
                      alt={`Vista previa de ${nextLive.title}`}
                      className="ds-library-thumb"
                      loading="lazy"
                    />
                  </div>
                  <div className="ds-library-live-content">
                    <h4 className="ds-h3 ds-library-live-video-title" style={{ color: "#ece8df" }}>{nextLive.title}</h4>
                    <p className="ds-micro">
                      {new Date(nextLive.class_datetime).toLocaleDateString("es-AR")},{" "}
                      {new Date(nextLive.class_datetime).toLocaleTimeString("es-AR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="ds-library-pill">{nextLiveCountdown}</p>
                  </div>
                  <PrimaryButton onClick={() => joinLiveClass(nextLive)}>Unirme</PrimaryButton>
                </article>
              ) : (
                <p className="ds-description">No hay clases en vivo programadas.</p>
              )}
            </div>

            <div className="ds-section-block">
              <div className="ds-library-head-row">
                <h3 className="ds-h3">Clases grabadas</h3>
                <div className="ds-library-sort-bar">
                  <span>Ordenar por:</span>
                  <button
                    type="button"
                    className="ds-library-sort-btn"
                    onClick={() =>
                      setRecordedSort((current) => (current === "recent" ? "old" : "recent"))
                    }
                  >
                    {recordedSort === "recent" ? "Más recientes" : "Más antiguas"}
                    <span aria-hidden>↕</span>
                  </button>
                </div>
              </div>
              <div className="ds-library-grid">
                <article className="ds-library-category-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/pelele.jpeg"
                    alt="Yoga y meditación"
                    className="ds-library-thumb"
                    loading="lazy"
                  />
                  <div className="ds-library-category-content">
                    <h4 className="ds-h3 ds-library-category-title" style={{ color: "#3f6343" }}>Yoga & meditación</h4>
                    <p className="ds-micro">{recordedYoga.length} clases</p>
                    <GhostButton
                      onClick={() =>
                        setLibraryCategory((current) => (current === "yoga" ? null : "yoga"))
                      }
                    >
                      {libraryCategory === "yoga" ? "Ocultar" : "Ver"}
                    </GhostButton>
                  </div>
                </article>
                <article className="ds-library-category-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/china.jpeg"
                    alt="Fuerza y movilidad"
                    className="ds-library-thumb"
                    loading="lazy"
                  />
                  <div className="ds-library-category-content">
                    <h4 className="ds-h3 ds-library-category-title" style={{ color: "#3f6343" }}>Fuerza & movilidad</h4>
                    <p className="ds-micro">{recordedFuerza.length} clases</p>
                    <GhostButton
                      onClick={() =>
                        setLibraryCategory((current) => (current === "fuerza" ? null : "fuerza"))
                      }
                    >
                      {libraryCategory === "fuerza" ? "Ocultar" : "Ver"}
                    </GhostButton>
                  </div>
                </article>
              </div>

              {libraryCategory === "yoga" && (
                <div className="ds-library-recorded-list">
                  {displayedRecordedYoga.map((video) => (
                    <EditorialWorkoutCard
                      key={video.id}
                      title={video.title}
                      meta={`Subida: ${formatShortDate(video.created_at)} · ${viewedRecordedIds.has(video.id) ? "Visto" : "No visto"}`}
                      rightSlot={
                        <PrimaryButton
                          onClick={() => watchRecorded(video.id, video.youtube_url)}
                        >
                          Ver
                        </PrimaryButton>
                      }
                    />
                  ))}
                </div>
              )}

              {libraryCategory === "fuerza" && (
                <div className="ds-library-recorded-list">
                  {displayedRecordedFuerza.map((video) => (
                    <EditorialWorkoutCard
                      key={video.id}
                      title={video.title}
                      meta={`Subida: ${formatShortDate(video.created_at)} · ${viewedRecordedIds.has(video.id) ? "Visto" : "No visto"}`}
                      rightSlot={
                        <GhostButton
                          onClick={() => watchRecorded(video.id, video.youtube_url)}
                        >
                          Ver
                        </GhostButton>
                      }
                    />
                  ))}
                </div>
              )}
              {personalizedYoga.length > 0 && (
                <>
                  <p className="ds-micro">Ejercicios personalizados</p>
                  {personalizedYoga.map((video) => (
                    <EditorialWorkoutCard key={video.id} title={video.title} meta="Asignado para ti" rightSlot={<PrimaryButton onClick={() => watchYoga(video.id, video.youtube_url)}>Ver</PrimaryButton>} />
                  ))}
                </>
              )}
            </div>
          </FloatingCard>
      )}

      {tab === "progreso" && (
        <FloatingCard title="Tu progreso" className="ds-progress-shell">
          <p className="ds-description">Sigue construyendo tu práctica</p>

          <div className="ds-progress-grid">
            <article className="ds-progress-metric-card">
              <h3 className="ds-h3">Entrenamientos</h3>
              <ProgressRing value={progressMetrics.trainingPercent} label={`${progressMetrics.trainingPercent}%`} />
              <p className="ds-description">{progressMetrics.completedThisMonth} completado(s) este mes</p>
            </article>
            <article className="ds-progress-metric-card">
              <h3 className="ds-h3">Yoga visto</h3>
              <ProgressRing value={progressMetrics.yogaPercent} label={`${progressMetrics.yogaPercent}%`} />
              <p className="ds-description">{progressMetrics.yogaViewedUnique} clase(s) vistas</p>
            </article>
            <article className="ds-progress-metric-card">
              <h3 className="ds-h3">Encuentros</h3>
              <ProgressRing value={progressMetrics.meetPercent} label={`${progressMetrics.meetPercent}%`} />
              <p className="ds-description">{progressMetrics.attendedUnique} asistencia(s)</p>
            </article>
          </div>

          <div className="ds-section-block">
            <h3 className="ds-h3">Actividad semanal</h3>
            <div className="ds-progress-week-wrap">
              <article className="ds-progress-bars-card">
                <div className="ds-progress-bars">
                  {progressMetrics.weeklyBars.map((item) => (
                    <div key={item.key} className="ds-progress-bar-col">
                      <div
                        className="ds-progress-bar-fill"
                        style={{ height: `${item.percent}%` }}
                        title={`${item.dayShort}: ${item.value} punto(s)`}
                      />
                      <span className="ds-micro">{item.dayShort}</span>
                    </div>
                  ))}
                </div>
              </article>
              <article className="ds-progress-note-card">
                <h4 className="ds-h3">🔥 ¡Buen progreso!</h4>
                <p className="ds-description">{progressMetrics.motivation}</p>
              </article>
            </div>
          </div>
        </FloatingCard>
      )}

      {tab === "perfil" && (
        <FloatingCard title="Perfil" className="ds-profile-shell">
          <div className="ds-profile-grid">
            <article className="ds-profile-card">
              <h3 className="ds-h3">Cuenta</h3>
              <div className="ds-profile-row">
                <p className="ds-micro">Correo</p>
                <p className="ds-description">{email || "-"}</p>
              </div>
              <div className="ds-profile-row">
                <p className="ds-micro">Miembro desde</p>
                <p className="ds-description">
                  {createdAt ? new Date(createdAt).toLocaleDateString("es-AR") : "-"}
                </p>
              </div>
            </article>
            <article className="ds-profile-card ds-profile-security-card">
              <h3 className="ds-h3">Seguridad</h3>
              {!showPasswordChange ? (
                <PrimaryButton onClick={() => setShowPasswordChange(true)} className="ds-profile-action">
                  Cambiar contraseña
                </PrimaryButton>
              ) : (
                <div className="ds-stack-md">
                  <TextField label="Nueva contraseña" value={newPassword} onChange={setNewPassword} type="password" />
                  <div className="ds-pill-row">
                    <PrimaryButton onClick={changePassword}>Actualizar contraseña</PrimaryButton>
                    <GhostButton
                      onClick={() => {
                        setShowPasswordChange(false);
                        setNewPassword("");
                        setProfileMsg("");
                      }}
                    >
                      Cancelar
                    </GhostButton>
                  </div>
                </div>
              )}
              <GhostButton onClick={logout} className="ds-profile-logout">Cerrar sesión</GhostButton>
            </article>
          </div>
          {profileMsg && <p className="ds-description ds-profile-msg">{profileMsg}</p>}
        </FloatingCard>
      )}

      {error && <FloatingCard title="Atencion"><p className="ds-description">{error}</p></FloatingCard>}
      {clientLinkWarning && (
        <FloatingCard title="Aviso">
          <p className="ds-description">{clientLinkWarning}</p>
        </FloatingCard>
      )}
      </div>

      <BottomNavigation items={tabs} value={tab} onChange={(value) => setTab(value as Tab)} />
      </AppShell>
    </ProtectedRoute>
  );
}
