
"use client";

import { FormEvent, Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  AppShell,
  BottomNavigation,
  ExpandableSection,
  EditorialWorkoutCard,
  FloatingCard,
  GhostButton,
  PrimaryButton,
  SecondaryButton,
  SelectField,
  SkeletonCard,
  Tabs,
  TextField,
} from "@/components/ui/design-system";

type Tab = "clientes" | "fuerza" | "yoga" | "bienvenida";
type Category = "fuerza" | "movilidad";
type PlanType = "semanal" | "mensual";
type Area = "fuerza" | "yoga";

type Client = { id: string; name: string; email: string; created_at: string };
type Exercise = { id: string; name: string; gif_url: string; category: Category };
type Routine = {
  id: string;
  client_id: string;
  day: string;
  routine_date?: string | null;
  category: Category;
  exercise_id: string;
  repetitions: string;
  plan_type: PlanType;
};
type TemplateItem = { id: string; template_id: string; exercise_id: string; repetitions: string };
type Template = {
  id: string;
  client_id: string;
  name: string;
  category: Category;
  plan_type: PlanType;
  start_date: string;
  items: TemplateItem[];
};
type RecordedClass = { id: string; area: Area; title: string; youtube_url: string; created_at?: string };
type LiveClass = { id: string; area: Area; title: string; class_datetime: string; meet_url: string; created_at?: string };
type WelcomeVideo = { id: string; title: string; youtube_url: string; created_at?: string };
type EncounterView = "recorded" | "live";

const tabs: { id: Tab; label: string; shortLabel: string; icon: ReactNode }[] = [
  {
    id: "clientes",
    label: "Gestión de clientes",
    shortLabel: "Gestión",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="3.5" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.9" />
        <path d="M16 3.1a3.5 3.5 0 0 1 0 6.8" />
      </svg>
    ),
  },
  {
    id: "fuerza",
    label: "Fuerza / Movilidad",
    shortLabel: "Fuerza",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10h3v4H3zM18 10h3v4h-3zM6 11h3v2H6zM15 11h3v2h-3zM9 10h6v4H9z" />
      </svg>
    ),
  },
  {
    id: "yoga",
    label: "Yoga / Meditación",
    shortLabel: "Yoga",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5.5" r="2.2" />
        <path d="M7 12c1.2-1.3 2.4-2 5-2s3.8.7 5 2" />
        <path d="M5 17c1.6-1.5 3.4-2.2 7-2.2S17.4 15.5 19 17" />
      </svg>
    ),
  },
  {
    id: "bienvenida",
    label: "Videos de Bienvenida",
    shortLabel: "Bienvenida",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M10 9.5l5 2.5-5 2.5z" />
      </svg>
    ),
  },
];

const weekdayNames = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

const dayNameFromISO = (isoDate: string) => {
  const parsed = new Date(`${isoDate}T12:00:00`);
  return weekdayNames[parsed.getDay()] ?? "lunes";
};

const toDateTimeLocal = (isoDate: string) => {
  const date = new Date(isoDate);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const formatShortDate = (isoDate?: string | null) => {
  if (!isoDate) return "-";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function AdminPage() {
  const defaultRoutineDate = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<Tab>("clientes");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [clients, setClients] = useState<Client[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recorded, setRecorded] = useState<RecordedClass[]>([]);
  const [live, setLive] = useState<LiveClass[]>([]);
  const [welcome, setWelcome] = useState<WelcomeVideo[]>([]);

  const [newClient, setNewClient] = useState({ name: "", email: "" });
  const [showCreateClientForm, setShowCreateClientForm] = useState(false);
  const [newEx, setNewEx] = useState({ name: "", gifUrl: "", category: "fuerza" as Category });
  const [showExercises, setShowExercises] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<"todas" | Category>("todas");
  const [viewClient, setViewClient] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<PlanType>("semanal");
  const [filterCat, setFilterCat] = useState<"todas" | Category>("todas");
  const [filterDateMode, setFilterDateMode] = useState<"todas" | "dia" | "rango">("todas");
  const [filterDateSingle, setFilterDateSingle] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<string[]>([]);

  const [assign, setAssign] = useState({
    clientId: "",
    category: "fuerza" as Category,
    routineDate: defaultRoutineDate,
    exerciseId: "",
    reps: "10",
    planType: "semanal" as PlanType,
  });
  const [assignDraft, setAssignDraft] = useState<Omit<Routine, "id">[]>([]);

  const [tpl, setTpl] = useState({
    clientId: "",
    name: "",
    category: "fuerza" as Category,
    planType: "semanal" as PlanType,
    startDate: "",
    exerciseId: "",
    reps: "10",
  });
  const [tplDraft, setTplDraft] = useState<{ exercise_id: string; repetitions: string }[]>([]);

  const [recForm, setRecForm] = useState({ title: "", url: "" });
  const [liveForm, setLiveForm] = useState({ title: "", date: "", url: "" });
  const [yogaForm, setYogaForm] = useState({ clientId: "", title: "", url: "" });
  const [welForm, setWelForm] = useState({ title: "", url: "" });
  const [showEncounters, setShowEncounters] = useState<{ fuerza: boolean; yoga: boolean }>({
    fuerza: false,
    yoga: false,
  });
  const [encounterView, setEncounterView] = useState<{ fuerza: EncounterView; yoga: EncounterView }>({
    fuerza: "recorded",
    yoga: "recorded",
  });
  const [editingRecorded, setEditingRecorded] = useState<
    Record<string, { title: string; url: string }>
  >({});
  const [editingLive, setEditingLive] = useState<
    Record<string, { title: string; date: string; url: string }>
  >({});
  const [showWelcomeManager, setShowWelcomeManager] = useState(false);
  const [editingWelcome, setEditingWelcome] = useState<
    Record<string, { title: string; url: string }>
  >({});
  const [toastMessage, setToastMessage] = useState("");
  const toastTimeoutRef = useRef<number | null>(null);

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage("");
    }, 2000);
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");

    const [clientsQ, exercisesQ, routinesQ, templatesQ, templateItemsQ, recordedQ, liveQ, yogaQ, welcomeQ] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("exercises").select("*").order("created_at", { ascending: false }),
      supabase.from("routines").select("*").order("created_at", { ascending: false }),
      supabase.from("routine_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("routine_template_items").select("*").order("created_at", { ascending: false }),
      supabase.from("recorded_classes").select("*").order("created_at", { ascending: false }),
      supabase.from("live_classes").select("*").order("class_datetime", { ascending: true }),
      supabase.from("personalized_yoga").select("*").order("created_at", { ascending: false }),
      supabase.from("welcome_videos").select("*").order("created_at", { ascending: false }),
    ]);

    const queryErrors = [clientsQ.error, exercisesQ.error, routinesQ.error, templatesQ.error, templateItemsQ.error, recordedQ.error, liveQ.error, yogaQ.error, welcomeQ.error].filter(Boolean);
    if (queryErrors.length > 0) {
      setError(queryErrors[0]?.message ?? "Error cargando datos.");
      setLoading(false);
      return;
    }

    const templatesWithItems: Template[] = (templatesQ.data ?? []).map((template) => ({
      ...template,
      items: (templateItemsQ.data ?? []).filter((item) => item.template_id === template.id),
    }));

    setClients((clientsQ.data as Client[]) ?? []);
    setExercises((exercisesQ.data as Exercise[]) ?? []);
    setRoutines((routinesQ.data as Routine[]) ?? []);
    setTemplates(templatesWithItems);
    setRecorded((recordedQ.data as RecordedClass[]) ?? []);
    setLive((liveQ.data as LiveClass[]) ?? []);
    setWelcome((welcomeQ.data as WelcomeVideo[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadAll();
    });
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const exerciseName = (id: string) => exercises.find((exercise) => exercise.id === id)?.name ?? "Ejercicio";
  const clientName = (id: string) => clients.find((client) => client.id === id)?.name ?? "Cliente";

  const filteredExercises = useMemo(
    () =>
      exercises.filter((exercise) => {
        const byName = exercise.name.toLowerCase().includes(exerciseSearch.toLowerCase());
        const byCategory = exerciseCategoryFilter === "todas" || exercise.category === exerciseCategoryFilter;
        return byName && byCategory;
      }),
    [exercises, exerciseSearch, exerciseCategoryFilter],
  );

  const filteredClients = useMemo(
    () =>
      clients.filter((client) =>
        client.name.toLowerCase().includes(clientSearch.toLowerCase()),
      ),
    [clients, clientSearch],
  );

  const createClient = async (event: FormEvent) => {
    event.preventDefault();
    if (!newClient.name || !newClient.email) return;

    setSaving(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClient),
      });
      const raw = await res.text();
      const data = raw ? (JSON.parse(raw) as { error?: string; warning?: string }) : {};
      if (!res.ok && res.status !== 207) {
        setError(data.error ?? "No se pudo crear el cliente.");
        return;
      }
      setMsg(data.warning ?? "Cliente creado. Se envio un mail automatico para crear contraseÃ±a.");
      showSuccessToast(data.warning ?? "Cliente creado exitosamente.");
      setNewClient({ name: "", email: "" });
      setShowCreateClientForm(false);
      await loadAll();
    } catch {
      setError("No se pudo crear el cliente. Verifica SUPABASE_SERVICE_ROLE_KEY y reinicia el servidor.");
    } finally {
      setSaving(false);
    }
  };

  const removeClient = async (clientId: string) => {
    setSaving(true);
    const res = await fetch(`/api/admin/clients?id=${clientId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar el cliente.");
      setSaving(false);
      return;
    }
    await loadAll();
    showSuccessToast("Cliente eliminado exitosamente.");
    setSaving(false);
  };

  const deleteSelectedRoutines = async () => {
    if (selectedRoutineIds.length === 0) return;
    const accepted = window.confirm(
      `Vas a borrar ${selectedRoutineIds.length} ejercicio(s) de la rutina. Queres continuar?`,
    );
    if (!accepted) return;

    setSaving(true);
    const { error: deleteError } = await supabase
      .from("routines")
      .delete()
      .in("id", selectedRoutineIds);
    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }
    setSelectedRoutineIds([]);
    await loadAll();
    showSuccessToast("Rutinas eliminadas exitosamente.");
    setSaving(false);
  };

  const createExercise = async (event: FormEvent) => {
    event.preventDefault();
    if (!newEx.name || !newEx.gifUrl) return;
    setSaving(true);
    const { error: insertError } = await supabase.from("exercises").insert({
      name: newEx.name,
      gif_url: newEx.gifUrl,
      category: newEx.category,
    });
    if (insertError) setError(insertError.message);
    setNewEx({ name: "", gifUrl: "", category: "fuerza" });
    await loadAll();
    if (!insertError) showSuccessToast("Ejercicio creado exitosamente.");
    setSaving(false);
  };

  const deleteExercise = async (exerciseId: string) => {
    const accepted = window.confirm(
      "Vas a borrar este ejercicio. Tambien se eliminaran asignaciones relacionadas. Queres continuar?",
    );
    if (!accepted) return;

    setSaving(true);
    const { error: deleteError } = await supabase
      .from("exercises")
      .delete()
      .eq("id", exerciseId);
    if (deleteError) setError(deleteError.message);
    await loadAll();
    if (!deleteError) showSuccessToast("Ejercicio eliminado exitosamente.");
    setSaving(false);
  };

  const addRoutineToDraft = (event: FormEvent) => {
    event.preventDefault();
    if (!assign.clientId || !assign.exerciseId) return;
    setAssignDraft((current) => [
      ...current,
      {
        client_id: assign.clientId,
        category: assign.category,
        day: dayNameFromISO(assign.routineDate),
        routine_date: assign.routineDate,
        exercise_id: assign.exerciseId,
        repetitions: assign.reps,
        plan_type: assign.planType,
      },
    ]);
  };

  const saveRoutineDraft = async () => {
    if (!assignDraft.length) return;
    setSaving(true);
    const { error: insertError } = await supabase.from("routines").insert(assignDraft);
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setAssignDraft([]);
    setMsg("Rutina asignada exitosamente");
    showSuccessToast("Rutina asignada exitosamente.");
    await loadAll();
    setSaving(false);
  };

  const addTemplateItemToDraft = () => {
    if (!tpl.exerciseId) return;
    setTplDraft((current) => [...current, { exercise_id: tpl.exerciseId, repetitions: tpl.reps }]);
  };

  const saveTemplate = async (event: FormEvent) => {
    event.preventDefault();
    if (!tpl.clientId || !tpl.name || !tpl.startDate || tplDraft.length === 0) return;
    setSaving(true);

    const templateResult = await supabase
      .from("routine_templates")
      .insert({
        client_id: tpl.clientId,
        name: tpl.name,
        category: tpl.category,
        plan_type: tpl.planType,
        start_date: tpl.startDate,
      })
      .select("id")
      .single();

    if (templateResult.error || !templateResult.data) {
      setError(templateResult.error?.message ?? "No se pudo crear plantilla.");
      setSaving(false);
      return;
    }

    const rows = tplDraft.map((item) => ({
      template_id: templateResult.data.id,
      exercise_id: item.exercise_id,
      repetitions: item.repetitions,
    }));

    const itemsResult = await supabase.from("routine_template_items").insert(rows);
    if (itemsResult.error) {
      setError(itemsResult.error.message);
      setSaving(false);
      return;
    }

    setTplDraft([]);
    setTpl((current) => ({ ...current, name: "", startDate: "", exerciseId: "", reps: "10" }));
    await loadAll();
    showSuccessToast("Plantilla creada exitosamente.");
    setSaving(false);
  };

  const updateTemplateItem = async (
    itemId: string,
    field: "exercise_id" | "repetitions",
    value: string,
  ) => {
    const { error: updateError } = await supabase
      .from("routine_template_items")
      .update({ [field]: value })
      .eq("id", itemId);
    if (updateError) setError(updateError.message);
    await loadAll();
  };

  const createRecorded = async (event: FormEvent, area: Area) => {
    event.preventDefault();
    if (!recForm.title || !recForm.url) return;
    setSaving(true);
    const { error: insertError } = await supabase.from("recorded_classes").insert({
      area,
      title: recForm.title,
      youtube_url: recForm.url,
    });
    if (insertError) setError(insertError.message);
    setRecForm({ title: "", url: "" });
    await loadAll();
    if (!insertError) showSuccessToast("Clase grabada cargada exitosamente.");
    setSaving(false);
  };

  const createLive = async (event: FormEvent, area: Area) => {
    event.preventDefault();
    if (!liveForm.title || !liveForm.date || !liveForm.url) return;
    setSaving(true);
    const { error: insertError } = await supabase.from("live_classes").insert({
      area,
      title: liveForm.title,
      class_datetime: new Date(liveForm.date).toISOString(),
      meet_url: liveForm.url,
    });
    if (insertError) setError(insertError.message);
    setLiveForm({ title: "", date: "", url: "" });
    await loadAll();
    if (!insertError) showSuccessToast("Clase en vivo creada exitosamente.");
    setSaving(false);
  };

  const startEditRecorded = (item: RecordedClass) => {
    setEditingRecorded((current) => ({
      ...current,
      [item.id]: { title: item.title, url: item.youtube_url },
    }));
  };

  const saveRecorded = async (id: string) => {
    const edit = editingRecorded[id];
    if (!edit) return;
    setSaving(true);
    const { error: updateError } = await supabase
      .from("recorded_classes")
      .update({ title: edit.title, youtube_url: edit.url })
      .eq("id", id);
    if (updateError) setError(updateError.message);
    await loadAll();
    if (!updateError) {
      setEditingRecorded((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      showSuccessToast("Clase grabada actualizada exitosamente.");
    }
    setSaving(false);
  };

  const deleteRecorded = async (id: string) => {
    const accepted = window.confirm(
      "Vas a borrar esta clase grabada. Esta accion no se puede deshacer. Queres continuar?",
    );
    if (!accepted) return;

    setSaving(true);
    const { error: deleteError } = await supabase
      .from("recorded_classes")
      .delete()
      .eq("id", id);
    if (deleteError) setError(deleteError.message);
    await loadAll();
    if (!deleteError) showSuccessToast("Clase grabada eliminada exitosamente.");
    setSaving(false);
  };

  const startEditLive = (item: LiveClass) => {
    setEditingLive((current) => ({
      ...current,
      [item.id]: {
        title: item.title,
        date: toDateTimeLocal(item.class_datetime),
        url: item.meet_url,
      },
    }));
  };

  const saveLive = async (id: string) => {
    const edit = editingLive[id];
    if (!edit) return;
    setSaving(true);
    const { error: updateError } = await supabase
      .from("live_classes")
      .update({
        title: edit.title,
        class_datetime: new Date(edit.date).toISOString(),
        meet_url: edit.url,
      })
      .eq("id", id);
    if (updateError) setError(updateError.message);
    await loadAll();
    if (!updateError) {
      setEditingLive((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      showSuccessToast("Clase en vivo actualizada exitosamente.");
    }
    setSaving(false);
  };

  const deleteLive = async (id: string) => {
    const accepted = window.confirm(
      "Vas a borrar esta clase en vivo. Esta accion no se puede deshacer. Queres continuar?",
    );
    if (!accepted) return;

    setSaving(true);
    const { error: deleteError } = await supabase
      .from("live_classes")
      .delete()
      .eq("id", id);
    if (deleteError) setError(deleteError.message);
    await loadAll();
    if (!deleteError) showSuccessToast("Clase en vivo eliminada exitosamente.");
    setSaving(false);
  };

  const createPersonalizedYoga = async (event: FormEvent) => {
    event.preventDefault();
    if (!yogaForm.clientId || !yogaForm.title || !yogaForm.url) return;
    setSaving(true);
    const { error: insertError } = await supabase.from("personalized_yoga").insert({
      client_id: yogaForm.clientId,
      title: yogaForm.title,
      youtube_url: yogaForm.url,
    });
    if (insertError) setError(insertError.message);
    setYogaForm({ clientId: "", title: "", url: "" });
    await loadAll();
    if (!insertError) showSuccessToast("Ejercicio personalizado cargado exitosamente.");
    setSaving(false);
  };

  const createWelcomeVideo = async (event: FormEvent) => {
    event.preventDefault();
    if (!welForm.title || !welForm.url) return;
    setSaving(true);
    const { error: insertError } = await supabase.from("welcome_videos").insert({
      title: welForm.title,
      youtube_url: welForm.url,
    });
    if (insertError) setError(insertError.message);
    setWelForm({ title: "", url: "" });
    await loadAll();
    if (!insertError) showSuccessToast("Video de bienvenida cargado exitosamente.");
    setSaving(false);
  };

  const startEditWelcome = (item: WelcomeVideo) => {
    setEditingWelcome((current) => ({
      ...current,
      [item.id]: { title: item.title, url: item.youtube_url },
    }));
  };

  const saveWelcome = async (id: string) => {
    const edit = editingWelcome[id];
    if (!edit) return;
    setSaving(true);
    const { error: updateError } = await supabase
      .from("welcome_videos")
      .update({ title: edit.title, youtube_url: edit.url })
      .eq("id", id);
    if (updateError) setError(updateError.message);
    await loadAll();
    if (!updateError) {
      setEditingWelcome((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      showSuccessToast("Video de bienvenida actualizado exitosamente.");
    }
    setSaving(false);
  };

  const deleteWelcome = async (id: string) => {
    const accepted = window.confirm(
      "Vas a borrar este video de bienvenida. Esta accion no se puede deshacer. Queres continuar?",
    );
    if (!accepted) return;

    setSaving(true);
    const { error: deleteError } = await supabase
      .from("welcome_videos")
      .delete()
      .eq("id", id);
    if (deleteError) setError(deleteError.message);
    await loadAll();
    if (!deleteError) showSuccessToast("Video de bienvenida eliminado exitosamente.");
    setSaving(false);
  };

  const fuerzaRecorded = recorded.filter((item) => item.area === "fuerza");
  const yogaRecorded = recorded.filter((item) => item.area === "yoga");
  const fuerzaLive = live.filter((item) => item.area === "fuerza");
  const yogaLive = live.filter((item) => item.area === "yoga");

  return (
    <AppShell title="" kicker="">
      <h1 className="ds-h1 ds-admin-page-title">Práctica viva</h1>
      {toastMessage && (
        <div className="ds-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
      {loading && (
        <div className="ds-stack-md">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
        </div>
      )}
      {saving && <p className="ds-description">Guardando cambios...</p>}
      {error && <p className="ds-description">{error}</p>}
      {msg && <p className="ds-description">{msg}</p>}

      {tab === "clientes" && (
        <>
          <FloatingCard
            title="Mis clientes"
            headerRight={(
              <PrimaryButton onClick={() => setShowCreateClientForm(true)}>
                + Crear cliente
              </PrimaryButton>
            )}
          >
            <input
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              placeholder="Buscar por nombre"
              className="ds-input"
            />

            {showCreateClientForm && (
              <div
                className="ds-modal-overlay"
                role="presentation"
                onClick={() => setShowCreateClientForm(false)}
              >
                <div
                  className="ds-modal-panel ds-animate-card"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Crear cliente"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="ds-card-head">
                    <h3 className="ds-h3">Crear cliente</h3>
                    <GhostButton onClick={() => setShowCreateClientForm(false)}>
                      Cerrar
                    </GhostButton>
                  </div>
                  <p className="ds-description">
                    Alta asistida con invitacion por email.
                  </p>
                  <form onSubmit={createClient} className="ds-stack-md">
                    <TextField
                      label="Nombre"
                      value={newClient.name}
                      onChange={(value) => setNewClient({ ...newClient, name: value })}
                    />
                    <TextField
                      label="Mail"
                      value={newClient.email}
                      onChange={(value) => setNewClient({ ...newClient, email: value })}
                      type="email"
                    />
                    <div className="ds-modal-actions">
                      <SecondaryButton onClick={() => setShowCreateClientForm(false)}>
                        Cancelar
                      </SecondaryButton>
                      <PrimaryButton type="submit">Crear</PrimaryButton>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {filteredClients.length > 0 && (
              <div className="ds-clients-table-wrap">
                <table className="ds-clients-table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>E-mail</th>
                      <th>Fecha de alta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => {
                      const isOpen = viewClient === client.id;
                      const clientRoutines = routines.filter(
                        (routine) => {
                          if (routine.client_id !== client.id) return false;
                          if (routine.plan_type !== filterPlan) return false;
                          if (filterCat !== "todas" && routine.category !== filterCat) return false;

                          if (filterDateMode === "todas") return true;

                          const routineDate = routine.routine_date ?? "";
                          if (!routineDate) return false;

                          if (filterDateMode === "dia") {
                            if (!filterDateSingle) return true;
                            return routineDate === filterDateSingle;
                          }

                          if (filterDateMode === "rango") {
                            if (filterDateFrom && routineDate < filterDateFrom) return false;
                            if (filterDateTo && routineDate > filterDateTo) return false;
                            return true;
                          }

                          return true;
                        },
                      );

                      return (
                        <Fragment key={client.id}>
                          <tr
                            className={`ds-client-main-row ${isOpen ? "is-open" : ""}`}
                            onClick={() => {
                              setViewClient((current) => (current === client.id ? "" : client.id));
                              setSelectedRoutineIds([]);
                            }}
                          >
                            <td>
                              <div className="ds-client-name-cell">
                                <span>{client.name}</span>
                              </div>
                            </td>
                            <td>{client.email}</td>
                            <td>
                              {new Date(client.created_at).toLocaleDateString("es-AR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </td>
                          </tr>
                          <tr className={`ds-client-expanded-row ${isOpen ? "is-open" : ""}`}>
                            <td colSpan={3}>
                              <ExpandableSection open={isOpen}>
                                <div className="ds-client-expanded-content">
                                  <div className="ds-client-expanded-actions">
                                    <GhostButton onClick={() => setViewClient("")}>
                                      Ocultar rutina
                                    </GhostButton>
                                    <SecondaryButton onClick={() => removeClient(client.id)}>
                                      Eliminar cliente
                                    </SecondaryButton>
                                  </div>
                                  <div className="ds-grid-3">
                                    <SelectField label="Plan" value={filterPlan} onChange={(value) => setFilterPlan(value as PlanType)}>
                                      <option value="semanal">Semanal</option>
                                      <option value="mensual">Mensual</option>
                                    </SelectField>
                                    <SelectField label="Categoria" value={filterCat} onChange={(value) => setFilterCat(value as "todas" | Category)}>
                                      <option value="todas">Fuerza y movilidad</option>
                                      <option value="fuerza">Fuerza</option>
                                      <option value="movilidad">Movilidad</option>
                                    </SelectField>
                                    <SelectField label="Filtrar por fecha" value={filterDateMode} onChange={(value) => setFilterDateMode(value as "todas" | "dia" | "rango")}>
                                      <option value="todas">Todas las fechas</option>
                                      <option value="dia">Solo un dia</option>
                                      <option value="rango">Rango de dias</option>
                                    </SelectField>
                                  </div>
                                  {filterDateMode === "dia" && (
                                    <div className="ds-grid-2">
                                      <TextField
                                        label="Dia"
                                        value={filterDateSingle}
                                        onChange={setFilterDateSingle}
                                        type="date"
                                      />
                                    </div>
                                  )}
                                  {filterDateMode === "rango" && (
                                    <div className="ds-grid-2">
                                      <TextField
                                        label="Desde"
                                        value={filterDateFrom}
                                        onChange={setFilterDateFrom}
                                        type="date"
                                      />
                                      <TextField
                                        label="Hasta"
                                        value={filterDateTo}
                                        onChange={setFilterDateTo}
                                        type="date"
                                      />
                                    </div>
                                  )}
                                  {clientRoutines.length > 0 && (
                                    <div className="ds-pill-row">
                                      <GhostButton
                                        onClick={() =>
                                          setSelectedRoutineIds((current) => {
                                            const visibleIds = clientRoutines.map((routine) => routine.id);
                                            const allSelected = visibleIds.every((id) => current.includes(id));
                                            if (allSelected) {
                                              return current.filter((id) => !visibleIds.includes(id));
                                            }
                                            return Array.from(new Set([...current, ...visibleIds]));
                                          })
                                        }
                                      >
                                        Seleccionar todos
                                      </GhostButton>
                                      <SecondaryButton onClick={deleteSelectedRoutines}>
                                        Eliminar seleccionados ({selectedRoutineIds.length})
                                      </SecondaryButton>
                                    </div>
                                  )}
                                  {clientRoutines.map((routine) => (
                                    <EditorialWorkoutCard
                                      key={routine.id}
                                      title={`${exerciseName(routine.exercise_id)} - ${routine.repetitions} reps`}
                                      meta={`${routine.routine_date ?? routine.day} / ${routine.category}`}
                                      rightSlot={
                                        <div className="ds-pill-row">
                                          <input
                                            type="checkbox"
                                            checked={selectedRoutineIds.includes(routine.id)}
                                            onChange={(event) => {
                                              if (event.target.checked) {
                                                setSelectedRoutineIds((current) => [...current, routine.id]);
                                                return;
                                              }
                                              setSelectedRoutineIds((current) =>
                                                current.filter((id) => id !== routine.id),
                                              );
                                            }}
                                            aria-label={`Seleccionar ${exerciseName(routine.exercise_id)}`}
                                          />
                                        </div>
                                      }
                                    />
                                  ))}
                                  {clientRoutines.length === 0 && (
                                    <p className="ds-description">No hay rutinas para este filtro.</p>
                                  )}
                                </div>
                              </ExpandableSection>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {filteredClients.length === 0 && (
              <p className="ds-description">No hay clientes con ese nombre.</p>
            )}
          </FloatingCard>
        </>
      )}

      {tab === "fuerza" && (
        <>
          <FloatingCard
            title="Crear ejercicio"
            headerRight={
              <GhostButton onClick={() => setShowExercises((current) => !current)}>
                {showExercises ? "Ocultar ejercicios creados" : "Ver ejercicios creados"}
              </GhostButton>
            }
          >
            <form onSubmit={createExercise} className="ds-create-exercise-form">
              <div className="ds-create-exercise-row-top">
                <TextField label="Nombre" value={newEx.name} onChange={(value) => setNewEx({ ...newEx, name: value })} />
                <SelectField label="Categoría" value={newEx.category} onChange={(value) => setNewEx({ ...newEx, category: value as Category })}>
                  <option value="fuerza">Fuerza</option>
                  <option value="movilidad">Movilidad</option>
                </SelectField>
              </div>
              <div className="ds-create-exercise-row-bottom">
                <TextField label="URL GIF" value={newEx.gifUrl} onChange={(value) => setNewEx({ ...newEx, gifUrl: value })} />
                <PrimaryButton type="submit">Crear ejercicio</PrimaryButton>
              </div>
            </form>

            <ExpandableSection open={showExercises}>
              <>
                <div className="ds-grid-2">
                  <TextField
                    label="Buscar por nombre"
                    value={exerciseSearch}
                    onChange={setExerciseSearch}
                    placeholder="Ej: sentadilla"
                  />
                  <SelectField
                    label="Filtrar por categoría"
                    value={exerciseCategoryFilter}
                    onChange={(value) => setExerciseCategoryFilter(value as "todas" | Category)}
                  >
                    <option value="todas">Todas</option>
                    <option value="fuerza">Fuerza</option>
                    <option value="movilidad">Movilidad</option>
                  </SelectField>
                </div>
                {filteredExercises.length > 0 && (
                  <div className="ds-clients-table-wrap ds-encounters-table-wrap">
                    <table className="ds-clients-table ds-encounters-table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Categoría</th>
                          <th>GIF</th>
                          <th className="ds-encounter-actions-col" aria-label="Acciones" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExercises.map((exercise) => (
                          <tr key={exercise.id}>
                            <td>{exercise.name}</td>
                            <td>{exercise.category}</td>
                            <td>
                              <a className="ds-link-inline" href={exercise.gif_url} target="_blank" rel="noreferrer">
                                Ver GIF
                              </a>
                            </td>
                            <td>
                              <div className="ds-client-row-actions">
                                <button
                                  type="button"
                                  className="ds-encounter-action-btn ds-encounter-delete-btn"
                                  onClick={() => deleteExercise(exercise.id)}
                                  aria-label={`Borrar ejercicio ${exercise.name}`}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4h8v2" />
                                    <path d="M19 6l-1 14H6L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {filteredExercises.length === 0 && (
                  <p className="ds-description">No hay ejercicios con ese nombre.</p>
                )}
              </>
            </ExpandableSection>
          </FloatingCard>

          <FloatingCard title="Asignar rutina">
            <form id="assign-routine-form" onSubmit={addRoutineToDraft} className="ds-grid-3">
              <SelectField label="Cliente" value={assign.clientId} onChange={(value) => setAssign({ ...assign, clientId: value })}>
                <option value="">Seleccionar</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </SelectField>
              <SelectField label="Categoria" value={assign.category} onChange={(value) => setAssign({ ...assign, category: value as Category, exerciseId: "" })}>
                <option value="fuerza">Fuerza</option>
                <option value="movilidad">Movilidad</option>
              </SelectField>
              <SelectField label="Plan" value={assign.planType} onChange={(value) => setAssign({ ...assign, planType: value as PlanType })}>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
              </SelectField>
              <TextField label="Fecha" value={assign.routineDate} onChange={(value) => setAssign({ ...assign, routineDate: value })} type="date" />
              <SelectField label="Ejercicio" value={assign.exerciseId} onChange={(value) => setAssign({ ...assign, exerciseId: value })}>
                <option value="">Seleccionar</option>
                {exercises.filter((exercise) => exercise.category === assign.category).map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                ))}
              </SelectField>
              <TextField
                label="Repeticiones"
                value={assign.reps}
                onChange={(value) => setAssign({ ...assign, reps: value })}
                placeholder="Ej: 3x12"
              />
            </form>
            {assignDraft.map((item, index) => (
              <EditorialWorkoutCard
                key={`${item.exercise_id}-${index}`}
                title={`${exerciseName(item.exercise_id)} - ${item.repetitions} reps`}
                meta={`${item.routine_date ?? item.day} / ${item.plan_type}`}
              />
            ))}
            <div className="ds-assign-bottom-actions">
              <PrimaryButton className="ds-assign-add-btn" type="submit" form="assign-routine-form">Agregar ejercicio</PrimaryButton>
              <GhostButton className="ds-assign-routine-btn ds-assign-save-btn" onClick={saveRoutineDraft}>
                Asignar rutina
              </GhostButton>
            </div>
          </FloatingCard>

          <FloatingCard title="Crear plantilla">
            <form onSubmit={saveTemplate} className="ds-grid-3">
              <SelectField label="Cliente" value={tpl.clientId} onChange={(value) => setTpl({ ...tpl, clientId: value })}>
                <option value="">Seleccionar</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </SelectField>
              <TextField label="Nombre plantilla" value={tpl.name} onChange={(value) => setTpl({ ...tpl, name: value })} />
              <SelectField label="Categoria" value={tpl.category} onChange={(value) => setTpl({ ...tpl, category: value as Category, exerciseId: "" })}>
                <option value="fuerza">Fuerza</option>
                <option value="movilidad">Movilidad</option>
              </SelectField>
              <SelectField label="Plan" value={tpl.planType} onChange={(value) => setTpl({ ...tpl, planType: value as PlanType })}>
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
              </SelectField>
              <TextField label="Inicio" value={tpl.startDate} onChange={(value) => setTpl({ ...tpl, startDate: value })} type="date" />
              <SelectField label="Ejercicio" value={tpl.exerciseId} onChange={(value) => setTpl({ ...tpl, exerciseId: value })}>
                <option value="">Seleccionar</option>
                {exercises.filter((exercise) => exercise.category === tpl.category).map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                ))}
              </SelectField>
              <TextField label="Repeticiones" value={tpl.reps} onChange={(value) => setTpl({ ...tpl, reps: value })} />
              <div className="ds-template-actions">
                <GhostButton onClick={addTemplateItemToDraft}>
                  Agregar a plantilla
                </GhostButton>
                <PrimaryButton type="submit">
                  Crear plantilla
                </PrimaryButton>
              </div>
            </form>

            {templates.map((template) => (
              <FloatingCard key={template.id} title={`${template.name} - ${clientName(template.client_id)}`} description={template.plan_type}>
                {template.items.map((item) => (
                  <div key={item.id} className="ds-grid-2">
                    <SelectField label="Ejercicio" value={item.exercise_id} onChange={(value) => updateTemplateItem(item.id, "exercise_id", value)}>
                      {exercises.filter((exercise) => exercise.category === template.category).map((exercise) => (
                        <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                      ))}
                    </SelectField>
                    <TextField label="Repeticiones" value={item.repetitions} onChange={(value) => updateTemplateItem(item.id, "repetitions", value)} />
                  </div>
                ))}
              </FloatingCard>
            ))}
          </FloatingCard>

          <FloatingCard title="Subir clases grabadas">
            <form onSubmit={(event) => createRecorded(event, "fuerza")} className="ds-grid-3 ds-inline-upload-form">
              <TextField label="Nombre" value={recForm.title} onChange={(value) => setRecForm({ ...recForm, title: value })} />
              <TextField label="Link YouTube" value={recForm.url} onChange={(value) => setRecForm({ ...recForm, url: value })} />
              <PrimaryButton type="submit">Subir clase</PrimaryButton>
            </form>
          </FloatingCard>

          <FloatingCard title="Crear clase en vivo">
            <form onSubmit={(event) => createLive(event, "fuerza")} className="ds-grid-4 ds-inline-upload-form">
              <TextField label="Nombre" value={liveForm.title} onChange={(value) => setLiveForm({ ...liveForm, title: value })} />
              <TextField label="Fecha y hora" value={liveForm.date} onChange={(value) => setLiveForm({ ...liveForm, date: value })} type="datetime-local" />
              <TextField label="Link Meet" value={liveForm.url} onChange={(value) => setLiveForm({ ...liveForm, url: value })} />
              <PrimaryButton type="submit">Crear clase</PrimaryButton>
            </form>
          </FloatingCard>

          <FloatingCard title="Gestion de encuentros">
            <GhostButton
              onClick={() =>
                setShowEncounters((current) => ({
                  ...current,
                  fuerza: !current.fuerza,
                }))
              }
            >
              {showEncounters.fuerza ? "Ocultar encuentros" : "Ver encuentros"}
            </GhostButton>

            <ExpandableSection open={showEncounters.fuerza}>
              <>
                <Tabs
                  items={[
                    { id: "recorded", label: "Clases grabadas" },
                    { id: "live", label: "Clases en vivo" },
                  ]}
                  value={encounterView.fuerza}
                  onChange={(value) =>
                    setEncounterView((current) => ({
                      ...current,
                      fuerza: value as EncounterView,
                    }))
                  }
                />

                {encounterView.fuerza === "recorded" && (
                  <>
                    {fuerzaRecorded.length === 0 && (
                      <p className="ds-description">No hay clases grabadas cargadas.</p>
                    )}
                    {fuerzaRecorded.length > 0 && (
                      <div className="ds-clients-table-wrap ds-encounters-table-wrap">
                        <table className="ds-clients-table ds-encounters-table">
                          <thead>
                            <tr>
                              <th>Nombre</th>
                              <th>Link</th>
                              <th>Fecha</th>
                              <th className="ds-encounter-actions-col" aria-label="Acciones" />
                            </tr>
                          </thead>
                          <tbody>
                            {fuerzaRecorded.map((item) => {
                              const edit = editingRecorded[item.id];
                              return (
                                <tr key={item.id}>
                                  <td>
                                    {edit ? (
                                      <input
                                        className="ds-input"
                                        value={edit.title}
                                        onChange={(event) =>
                                          setEditingRecorded((current) => ({
                                            ...current,
                                            [item.id]: { ...current[item.id], title: event.target.value },
                                          }))
                                        }
                                      />
                                    ) : item.title}
                                  </td>
                                  <td>
                                    {edit ? (
                                      <input
                                        className="ds-input"
                                        value={edit.url}
                                        onChange={(event) =>
                                          setEditingRecorded((current) => ({
                                            ...current,
                                            [item.id]: { ...current[item.id], url: event.target.value },
                                          }))
                                        }
                                      />
                                    ) : (
                                      <a className="ds-link-inline" href={item.youtube_url} target="_blank" rel="noreferrer">
                                        {item.youtube_url}
                                      </a>
                                    )}
                                  </td>
                                  <td>{formatShortDate(item.created_at)}</td>
                                  <td>
                                    <div className="ds-client-row-actions">
                                      {edit ? (
                                        <button
                                          type="button"
                                          className="ds-encounter-action-btn ds-encounter-save-btn"
                                          onClick={() => saveRecorded(item.id)}
                                          aria-label="Guardar cambios"
                                        >
                                          <span aria-hidden>✓</span>
                                        </button>
                                      ) : (
                                        <GhostButton className="ds-encounter-action-btn" onClick={() => startEditRecorded(item)}>
                                          Editar
                                        </GhostButton>
                                      )}
                                      <button
                                        type="button"
                                        className="ds-encounter-action-btn ds-encounter-delete-btn"
                                        onClick={() => deleteRecorded(item.id)}
                                        aria-label="Borrar clase grabada"
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                          <path d="M3 6h18" />
                                          <path d="M8 6V4h8v2" />
                                          <path d="M19 6l-1 14H6L5 6" />
                                          <path d="M10 11v6M14 11v6" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {encounterView.fuerza === "live" && (
                  <>
                    {fuerzaLive.length === 0 && (
                      <p className="ds-description">No hay clases en vivo cargadas.</p>
                    )}
                    {fuerzaLive.length > 0 && (
                      <div className="ds-clients-table-wrap ds-encounters-table-wrap">
                        <table className="ds-clients-table ds-encounters-table">
                          <thead>
                            <tr>
                              <th>Nombre</th>
                              <th>Link</th>
                              <th>Fecha</th>
                              <th className="ds-encounter-actions-col" aria-label="Acciones" />
                            </tr>
                          </thead>
                          <tbody>
                            {fuerzaLive.map((item) => {
                              const edit = editingLive[item.id];
                              return (
                                <tr key={item.id}>
                                  <td>
                                    {edit ? (
                                      <input
                                        className="ds-input"
                                        value={edit.title}
                                        onChange={(event) =>
                                          setEditingLive((current) => ({
                                            ...current,
                                            [item.id]: { ...current[item.id], title: event.target.value },
                                          }))
                                        }
                                      />
                                    ) : item.title}
                                  </td>
                                  <td>
                                    {edit ? (
                                      <input
                                        className="ds-input"
                                        value={edit.url}
                                        onChange={(event) =>
                                          setEditingLive((current) => ({
                                            ...current,
                                            [item.id]: { ...current[item.id], url: event.target.value },
                                          }))
                                        }
                                      />
                                    ) : (
                                      <a className="ds-link-inline" href={item.meet_url} target="_blank" rel="noreferrer">
                                        {item.meet_url}
                                      </a>
                                    )}
                                  </td>
                                  <td>{formatShortDate(item.created_at)}</td>
                                  <td>
                                    <div className="ds-client-row-actions">
                                      {edit ? (
                                        <button
                                          type="button"
                                          className="ds-encounter-action-btn ds-encounter-save-btn"
                                          onClick={() => saveLive(item.id)}
                                          aria-label="Guardar cambios"
                                        >
                                          <span aria-hidden>✓</span>
                                        </button>
                                      ) : (
                                        <GhostButton className="ds-encounter-action-btn" onClick={() => startEditLive(item)}>
                                          Editar
                                        </GhostButton>
                                      )}
                                      <button
                                        type="button"
                                        className="ds-encounter-action-btn ds-encounter-delete-btn"
                                        onClick={() => deleteLive(item.id)}
                                        aria-label="Borrar clase en vivo"
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                          <path d="M3 6h18" />
                                          <path d="M8 6V4h8v2" />
                                          <path d="M19 6l-1 14H6L5 6" />
                                          <path d="M10 11v6M14 11v6" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            </ExpandableSection>
          </FloatingCard>
        </>
      )}

      {tab === "yoga" && (
        <>
          <FloatingCard title="Subir clases grabadas">
            <form onSubmit={(event) => createRecorded(event, "yoga")} className="ds-grid-3 ds-inline-upload-form">
              <TextField label="Nombre" value={recForm.title} onChange={(value) => setRecForm({ ...recForm, title: value })} />
              <TextField label="Link YouTube" value={recForm.url} onChange={(value) => setRecForm({ ...recForm, url: value })} />
              <PrimaryButton type="submit">Subir clase</PrimaryButton>
            </form>
          </FloatingCard>

          <FloatingCard title="Crear clase en vivo">
            <form onSubmit={(event) => createLive(event, "yoga")} className="ds-grid-4 ds-inline-upload-form">
              <TextField label="Nombre" value={liveForm.title} onChange={(value) => setLiveForm({ ...liveForm, title: value })} />
              <TextField label="Fecha y hora" value={liveForm.date} onChange={(value) => setLiveForm({ ...liveForm, date: value })} type="datetime-local" />
              <TextField label="Link Meet" value={liveForm.url} onChange={(value) => setLiveForm({ ...liveForm, url: value })} />
              <PrimaryButton type="submit">Crear clase</PrimaryButton>
            </form>
          </FloatingCard>

          <FloatingCard title="Subir ejercicios personalizados">
            <form onSubmit={createPersonalizedYoga} className="ds-grid-4 ds-inline-upload-form">
              <TextField label="Nombre del video" value={yogaForm.title} onChange={(value) => setYogaForm({ ...yogaForm, title: value })} />
              <TextField label="Link YouTube" value={yogaForm.url} onChange={(value) => setYogaForm({ ...yogaForm, url: value })} />
              <SelectField label="Asignar a cliente" value={yogaForm.clientId} onChange={(value) => setYogaForm({ ...yogaForm, clientId: value })}>
                <option value="">Seleccionar</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </SelectField>
              <PrimaryButton type="submit">Guardar</PrimaryButton>
            </form>
          </FloatingCard>

          <FloatingCard title="Gestion de encuentros">
            <GhostButton
              onClick={() =>
                setShowEncounters((current) => ({
                  ...current,
                  yoga: !current.yoga,
                }))
              }
            >
              {showEncounters.yoga ? "Ocultar encuentros" : "Ver encuentros"}
            </GhostButton>

            <ExpandableSection open={showEncounters.yoga}>
              <>
                <Tabs
                  items={[
                    { id: "recorded", label: "Clases grabadas" },
                    { id: "live", label: "Clases en vivo" },
                  ]}
                  value={encounterView.yoga}
                  onChange={(value) =>
                    setEncounterView((current) => ({
                      ...current,
                      yoga: value as EncounterView,
                    }))
                  }
                />

                {encounterView.yoga === "recorded" && (
                  <>
                    {yogaRecorded.length === 0 && (
                      <p className="ds-description">No hay clases grabadas cargadas.</p>
                    )}
                    {yogaRecorded.length > 0 && (
                      <div className="ds-clients-table-wrap ds-encounters-table-wrap">
                        <table className="ds-clients-table ds-encounters-table">
                          <thead>
                            <tr>
                              <th>Nombre</th>
                              <th>Link</th>
                              <th>Fecha</th>
                              <th className="ds-encounter-actions-col" aria-label="Acciones" />
                            </tr>
                          </thead>
                          <tbody>
                            {yogaRecorded.map((item) => {
                              const edit = editingRecorded[item.id];
                              return (
                                <tr key={item.id}>
                                  <td>
                                    {edit ? (
                                      <input
                                        className="ds-input"
                                        value={edit.title}
                                        onChange={(event) =>
                                          setEditingRecorded((current) => ({
                                            ...current,
                                            [item.id]: { ...current[item.id], title: event.target.value },
                                          }))
                                        }
                                      />
                                    ) : item.title}
                                  </td>
                                  <td>
                                    {edit ? (
                                      <input
                                        className="ds-input"
                                        value={edit.url}
                                        onChange={(event) =>
                                          setEditingRecorded((current) => ({
                                            ...current,
                                            [item.id]: { ...current[item.id], url: event.target.value },
                                          }))
                                        }
                                      />
                                    ) : (
                                      <a className="ds-link-inline" href={item.youtube_url} target="_blank" rel="noreferrer">
                                        {item.youtube_url}
                                      </a>
                                    )}
                                  </td>
                                  <td>{formatShortDate(item.created_at)}</td>
                                  <td>
                                    <div className="ds-client-row-actions">
                                      {edit ? (
                                        <button
                                          type="button"
                                          className="ds-encounter-action-btn ds-encounter-save-btn"
                                          onClick={() => saveRecorded(item.id)}
                                          aria-label="Guardar cambios"
                                        >
                                          <span aria-hidden>✓</span>
                                        </button>
                                      ) : (
                                        <GhostButton className="ds-encounter-action-btn" onClick={() => startEditRecorded(item)}>
                                          Editar
                                        </GhostButton>
                                      )}
                                      <button
                                        type="button"
                                        className="ds-encounter-action-btn ds-encounter-delete-btn"
                                        onClick={() => deleteRecorded(item.id)}
                                        aria-label="Borrar clase grabada"
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                          <path d="M3 6h18" />
                                          <path d="M8 6V4h8v2" />
                                          <path d="M19 6l-1 14H6L5 6" />
                                          <path d="M10 11v6M14 11v6" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}

                {encounterView.yoga === "live" && (
                  <>
                    {yogaLive.length === 0 && (
                      <p className="ds-description">No hay clases en vivo cargadas.</p>
                    )}
                    {yogaLive.length > 0 && (
                      <div className="ds-clients-table-wrap ds-encounters-table-wrap">
                        <table className="ds-clients-table ds-encounters-table">
                          <thead>
                            <tr>
                              <th>Nombre</th>
                              <th>Link</th>
                              <th>Fecha</th>
                              <th className="ds-encounter-actions-col" aria-label="Acciones" />
                            </tr>
                          </thead>
                          <tbody>
                            {yogaLive.map((item) => {
                              const edit = editingLive[item.id];
                              return (
                                <tr key={item.id}>
                                  <td>
                                    {edit ? (
                                      <input
                                        className="ds-input"
                                        value={edit.title}
                                        onChange={(event) =>
                                          setEditingLive((current) => ({
                                            ...current,
                                            [item.id]: { ...current[item.id], title: event.target.value },
                                          }))
                                        }
                                      />
                                    ) : item.title}
                                  </td>
                                  <td>
                                    {edit ? (
                                      <input
                                        className="ds-input"
                                        value={edit.url}
                                        onChange={(event) =>
                                          setEditingLive((current) => ({
                                            ...current,
                                            [item.id]: { ...current[item.id], url: event.target.value },
                                          }))
                                        }
                                      />
                                    ) : (
                                      <a className="ds-link-inline" href={item.meet_url} target="_blank" rel="noreferrer">
                                        {item.meet_url}
                                      </a>
                                    )}
                                  </td>
                                  <td>{formatShortDate(item.created_at)}</td>
                                  <td>
                                    <div className="ds-client-row-actions">
                                      {edit ? (
                                        <button
                                          type="button"
                                          className="ds-encounter-action-btn ds-encounter-save-btn"
                                          onClick={() => saveLive(item.id)}
                                          aria-label="Guardar cambios"
                                        >
                                          <span aria-hidden>✓</span>
                                        </button>
                                      ) : (
                                        <GhostButton className="ds-encounter-action-btn" onClick={() => startEditLive(item)}>
                                          Editar
                                        </GhostButton>
                                      )}
                                      <button
                                        type="button"
                                        className="ds-encounter-action-btn ds-encounter-delete-btn"
                                        onClick={() => deleteLive(item.id)}
                                        aria-label="Borrar clase en vivo"
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                          <path d="M3 6h18" />
                                          <path d="M8 6V4h8v2" />
                                          <path d="M19 6l-1 14H6L5 6" />
                                          <path d="M10 11v6M14 11v6" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </>
            </ExpandableSection>
          </FloatingCard>
        </>
      )}

      {tab === "bienvenida" && (
        <>
          <FloatingCard title="Agregar video de bienvenida">
            <form onSubmit={createWelcomeVideo} className="ds-grid-3 ds-inline-upload-form">
              <TextField label="Titulo" value={welForm.title} onChange={(value) => setWelForm({ ...welForm, title: value })} />
              <TextField label="Link YouTube" value={welForm.url} onChange={(value) => setWelForm({ ...welForm, url: value })} />
              <PrimaryButton type="submit">Agregar video</PrimaryButton>
            </form>
          </FloatingCard>

          <FloatingCard title="Gestionar videos">
            <GhostButton onClick={() => setShowWelcomeManager((current) => !current)}>
              {showWelcomeManager ? "Ocultar videos" : "Ver videos"}
            </GhostButton>

            <ExpandableSection open={showWelcomeManager}>
              <>
                {welcome.length > 0 && (
                  <div className="ds-clients-table-wrap ds-encounters-table-wrap">
                    <table className="ds-clients-table ds-encounters-table">
                      <thead>
                        <tr>
                          <th>Título</th>
                          <th>Link</th>
                          <th>Fecha</th>
                          <th className="ds-encounter-actions-col" aria-label="Acciones" />
                        </tr>
                      </thead>
                      <tbody>
                        {welcome.map((item) => {
                          const edit = editingWelcome[item.id];
                          return (
                            <tr key={item.id}>
                              <td>
                                {edit ? (
                                  <input
                                    className="ds-input"
                                    value={edit.title}
                                    onChange={(event) =>
                                      setEditingWelcome((current) => ({
                                        ...current,
                                        [item.id]: { ...current[item.id], title: event.target.value },
                                      }))
                                    }
                                  />
                                ) : item.title}
                              </td>
                              <td>
                                {edit ? (
                                  <input
                                    className="ds-input"
                                    value={edit.url}
                                    onChange={(event) =>
                                      setEditingWelcome((current) => ({
                                        ...current,
                                        [item.id]: { ...current[item.id], url: event.target.value },
                                      }))
                                    }
                                  />
                                ) : (
                                  <a className="ds-link-inline" href={item.youtube_url} target="_blank" rel="noreferrer">
                                    {item.youtube_url}
                                  </a>
                                )}
                              </td>
                              <td>{formatShortDate(item.created_at)}</td>
                              <td>
                                <div className="ds-client-row-actions">
                                  {edit ? (
                                    <button
                                      type="button"
                                      className="ds-encounter-action-btn ds-encounter-save-btn"
                                      onClick={() => saveWelcome(item.id)}
                                      aria-label="Guardar cambios"
                                    >
                                      <span aria-hidden>✓</span>
                                    </button>
                                  ) : (
                                    <GhostButton className="ds-encounter-action-btn" onClick={() => startEditWelcome(item)}>
                                      Editar
                                    </GhostButton>
                                  )}
                                  <button
                                    type="button"
                                    className="ds-encounter-action-btn ds-encounter-delete-btn"
                                    onClick={() => deleteWelcome(item.id)}
                                    aria-label="Borrar video de bienvenida"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                      <path d="M3 6h18" />
                                      <path d="M8 6V4h8v2" />
                                      <path d="M19 6l-1 14H6L5 6" />
                                      <path d="M10 11v6M14 11v6" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {welcome.length === 0 && (
                  <p className="ds-description">Aun no hay videos de bienvenida.</p>
                )}
              </>
            </ExpandableSection>
          </FloatingCard>
        </>
      )}

      <BottomNavigation
        items={tabs.map((item) => ({ id: item.id, label: item.label }))}
        value={tab}
        onChange={(value) => setTab(value as Tab)}
      />
    </AppShell>
  );
}
