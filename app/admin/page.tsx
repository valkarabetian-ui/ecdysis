"use client";

import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import {
  BottomNavigation,
  SideNavigation,
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

type Client = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  auth_user_id?: string | null;
  avatar_url?: string | null;
  goals?: string | null;
  attention_notes?: string | null;
};
type Exercise = { id: string; name: string; gif_url: string; category: Category; observations?: string | null };
type Routine = {
  id: string;
  client_id: string;
  day: string;
  routine_date?: string | null;
  category: Category;
  exercise_id: string;
  repetitions: string;
  series: number;
  plan_type: PlanType;
};
type TemplateItem = { id: string; template_id: string; exercise_id: string; repetitions: string; series: number };
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
type LiveClass = { id: string; area: Area; title: string; class_datetime: string; meet_url: string; cover_image_url?: string | null; created_at?: string };
type WelcomeVideo = { id: string; title: string; youtube_url: string; created_at?: string };
type EncounterView = "recorded" | "live";
type ClientActivitySummary = {
  linked: boolean;
  trainingsCompleted: number;
  lastTrainingDate: string | null;
  liveClassesAttended: number;
  videosViewed: number;
};

const tabs: { id: Tab; label: string; shortLabel: string; icon: ReactNode }[] = [
  {
    id: "clientes",
    label: "Gestión",
    shortLabel: "Gestión",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
  {
    id: "fuerza",
    label: "Fuerza",
    shortLabel: "Fuerza",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3.5 9.5v5" />
        <path d="M5.5 8v8" />
        <path d="M8 10v4" />
        <path d="M16 10v4" />
        <path d="M18.5 8v8" />
        <path d="M20.5 9.5v5" />
        <path d="M8 12h8" />
      </svg>
    ),
  },
  {
    id: "yoga",
    label: "Yoga",
    shortLabel: "Yoga",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5.5" r="1.5" />
        <path d="M12 7.5v4.5" />
        <path d="M8.5 20c.4-3 1.7-5.3 3.5-6.8" />
        <path d="M15.5 20c-.4-3-1.7-5.3-3.5-6.8" />
        <path d="M7 12.5c1.5.2 2.9.2 5-.5" />
        <path d="M17 12.5c-1.5.2-2.9.2-5-.5" />
      </svg>
    ),
  },
  {
    id: "bienvenida",
    label: "Bienvenida",
    shortLabel: "Bienvenida",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8.5h12" />
        <path d="M7 8.5V6.8A1.8 1.8 0 0 1 8.8 5h6.4A1.8 1.8 0 0 1 17 6.8v1.7" />
        <rect x="4.5" y="8.5" width="15" height="10.5" rx="2.4" />
        <path d="M9.5 13.75h5" />
        <path d="M12 11.25v5" />
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

const adminSectionTitleByTab: Record<Tab, string> = {
  clientes: "Gestión de clientes",
  fuerza: "Fuerza y movilidad",
  yoga: "Yoga y meditación",
  bienvenida: "Videos de bienvenida",
};

const adminTableCopy = {
  avatar: "Perfil",
  title: "Título",
  name: "Nombre",
  email: "Correo",
  category: "Categoría",
  access: "Acceso",
  date: "Fecha",
};

const adminActionCopy = {
  open: "Ver ficha",
  edit: "Editar",
  remove: "Eliminar",
  close: "Cerrar",
  saveChanges: "Guardar",
  addExercise: "Agregar ejercicio",
  addToTemplate: "Agregar a la plantilla",
  selectVisible: "Seleccionar visibles",
  clearSelection: "Quitar selección",
  removeSelected: "Eliminar seleccionadas",
  watchVideo: "Ver video",
  sendInvite: "Enviar invitación",
  saveFicha: "Guardar ficha",
  saveRoutine: "Guardar rutina",
  saveTemplate: "Guardar plantilla",
  saveRecordedClass: "Guardar clase grabada",
  saveLiveClass: "Guardar clase en vivo",
  saveVideo: "Guardar video",
  showManager: "Ver gestor",
  hideManager: "Ocultar gestor",
};

const adminSubtitleCopy = {
  clientModal: "Rutinas, actividad y notas",
  clientActivity: "Resumen de avance reciente",
};

const adminTitleCopy = {
  createClient: "Crear cliente",
  createExercise: "Crear ejercicio",
  exerciseLibrary: "Biblioteca de ejercicios",
  createRoutine: "Crear rutina",
  createTemplate: "Crear plantilla",
  createRecordedClass: "Crear clase grabada",
  createLiveClass: "Crear clase en vivo",
  manageClasses: "Gestionar clases",
  createCustomVideo: "Crear video personalizado",
  createWelcomeVideo: "Crear video de bienvenida",
  manageWelcomeVideos: "Gestionar videos de bienvenida",
};

const adminWorkflowCopy = {
  createExercise: {
    eyebrow: "Biblioteca premium",
    description: "Definí el nombre, la categoría y el recurso visual para que el ejercicio quede listo para reutilizar.",
  },
  createRoutine: {
    eyebrow: "Paso a paso",
    description: "Armá una rutina guiada: primero elegís el contexto, después sumás ejercicios y al final la dejás lista para publicar.",
  },
  createTemplate: {
    eyebrow: "Base reutilizable",
    description: "Diseñá una plantilla clara y editable para repetir estructuras sin perder consistencia entre clientes.",
  },
  createRecordedClass: {
    eyebrow: "Contenido on demand",
    description: "Cargá una clase grabada con un título claro y un acceso directo para que quede lista en la biblioteca.",
  },
  createLiveClass: {
    eyebrow: "Encuentro en vivo",
    description: "Prepará la clase con fecha, acceso y portada para que el anuncio se vea más editorial dentro del campus.",
  },
};

const adminEmptyCopy = {
  routines: {
    title: "No hay rutinas para mostrar",
    description: "Probá con otro plan, categoría o fecha para volver a ver resultados.",
  },
  clients: {
    title: "No encontramos clientes con esa búsqueda",
    description: "Probá con otro nombre o limpiá la búsqueda para ver el listado completo.",
  },
  exercises: {
    title: "No encontramos ejercicios para esa búsqueda",
    description: "Ajustá el nombre o la categoría para encontrar otras opciones.",
  },
  recorded: {
    title: "Todavía no hay clases grabadas",
    description: "Cargá la primera clase para empezar a armar esta biblioteca.",
  },
  live: {
    title: "Todavía no hay clases en vivo",
    description: "Creá la primera clase para mostrar los próximos encuentros.",
  },
  welcome: {
    title: "Todavía no hay videos de bienvenida",
    description: "Cargá el primer video para darle una bienvenida más cuidada a cada cliente.",
  },
};

function AdminWorkflowHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="ds-admin-workflow-hero">
      <p className="ds-admin-workflow-eyebrow">{eyebrow}</p>
      <h3 className="ds-admin-workflow-title">{title}</h3>
      <p className="ds-admin-workflow-description">{description}</p>
    </div>
  );
}

function AdminWorkflowSection({
  step,
  title,
  description,
  children,
  className = "",
}: {
  step: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ds-admin-workflow-section ${className}`.trim()}>
      <div className="ds-admin-workflow-section-head">
        <span className="ds-admin-workflow-step">{step}</span>
        <div>
          <h4 className="ds-admin-workflow-section-title">{title}</h4>
          <p className="ds-admin-workflow-section-description">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function AdminModalScrollButton() {
  return (
    <button
      type="button"
      className="ds-admin-modal-scroll-btn"
      aria-label="Bajar en el modal"
      onClick={(event) => {
        const panel = event.currentTarget.closest(".ds-routine-modal-panel");
        const body = panel?.querySelector(".ds-routine-modal-body");
        if (!(body instanceof HTMLElement)) return;
        body.scrollBy({ top: Math.max(body.clientHeight * 0.72, 240), behavior: "smooth" });
      }}
    >
      <span aria-hidden>⌄</span>
    </button>
  );
}

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

const daysSinceText = (isoDate?: string | null) => {
  if (!isoDate) return "-";
  const parsed = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "-";

  const today = new Date();
  const todayAtMidday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
  const diffMs = todayAtMidday.getTime() - parsed.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / 86400000));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Hace 1 dia";
  return `Hace ${diffDays} dias`;
};

const isYouTubeUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be");
  } catch {
    return false;
  }
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
  const [clientActivityById, setClientActivityById] = useState<Record<string, ClientActivitySummary>>({});

  const [newClient, setNewClient] = useState({ name: "", email: "" });
  const [newEx, setNewEx] = useState({ name: "", gifUrl: "", category: "fuerza" as Category, observations: "" });
  const [fuerzaPanel, setFuerzaPanel] = useState<
    "createExercise" | "listExercises" | "assignRoutine" | "createTemplate" | "uploadRecorded" | "createLive" | null
  >(null);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<"todas" | Category>("todas");
  const [viewClient, setViewClient] = useState("");
  const [fichaSection, setFichaSection] = useState<"actividad" | "ficha" | "rutinas" | null>(null);
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
    series: "",
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
    series: "",
    reps: "10",
  });
  const [tplDraft, setTplDraft] = useState<{ exercise_id: string; repetitions: string; series: number }[]>([]);

  const [recForm, setRecForm] = useState({ title: "", url: "" });
  const [liveForm, setLiveForm] = useState({ title: "", date: "", url: "", coverImageUrl: "" });
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
  const [showYogaManager, setShowYogaManager] = useState(false);
  const [showFuerzaManager, setShowFuerzaManager] = useState(false);
  const [editingWelcome, setEditingWelcome] = useState<
    Record<string, { title: string; url: string }>
  >({});
  const [toastMessage, setToastMessage] = useState("");
  const [clientFichaDrafts, setClientFichaDrafts] = useState<
    Record<string, { goals: string; attentionNotes: string }>
  >({});
  const toastTimeoutRef = useRef<number | null>(null);
  const bulkUploadInputRef = useRef<HTMLInputElement | null>(null);

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

    try {
      let activityRes: Response | null = null;
      try {
        activityRes = await fetch("/api/admin/client-activity");
      } catch {
        // If fetch fails, create a dummy response
        activityRes = new Response(JSON.stringify({ activityByClientId: {} }), { status: 200 });
      }

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

      if (activityRes && activityRes.ok) {
        const activityPayload = (await activityRes.json()) as {
          activityByClientId?: Record<string, ClientActivitySummary>;
        };
        setClientActivityById(activityPayload.activityByClientId ?? {});
      } else {
        setClientActivityById({});
      }

      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error inesperado.");
      setLoading(false);
    }
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

  useEffect(() => {
    if (!msg) return;
    const timer = window.setTimeout(() => setMsg(""), 2000);
    return () => window.clearTimeout(timer);
  }, [msg]);

  useEffect(() => {
    if (!viewClient) return;
    const client = clients.find((item) => item.id === viewClient);
    if (!client) return;
    setClientFichaDrafts((current) => ({
      ...current,
      [viewClient]: current[viewClient] ?? {
        goals: client.goals ?? "",
        attentionNotes: client.attention_notes ?? "",
      },
    }));
  }, [viewClient, clients]);

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

  const routinesForClient = (clientId: string) =>
    routines.filter((routine) => {
      if (routine.client_id !== clientId) return false;
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
    });

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
      setMsg(data.warning ?? "Cliente creado. Se envió un mail automático para crear contraseña.");
      showSuccessToast(data.warning ?? "Cliente creado exitosamente.");
      setNewClient({ name: "", email: "" });
      await loadAll();
    } catch {
      setError("No se pudo crear el cliente. Verifica SUPABASE_SERVICE_ROLE_KEY y reinicia el servidor.");
    } finally {
      setSaving(false);
    }
  };

  const removeClient = async (clientId: string, clientName: string) => {
    const accepted = window.confirm(
      `Vas a eliminar al cliente "${clientName}". Esta accion no se puede deshacer. Queres continuar?`,
    );
    if (!accepted) return;

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

  const saveClientFicha = async (clientId: string) => {
    const draft = clientFichaDrafts[clientId] ?? { goals: "", attentionNotes: "" };
    setSaving(true);
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        goals: draft.goals.trim() || null,
        attention_notes: draft.attentionNotes.trim() || null,
      })
      .eq("id", clientId);
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    await loadAll();
    showSuccessToast("Ficha del cliente actualizada.");
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
    if (!isYouTubeUrl(newEx.gifUrl)) {
      setError("Ingresa una URL valida de YouTube para el ejercicio.");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("exercises").insert({
      name: newEx.name,
      gif_url: newEx.gifUrl,
      category: newEx.category,
      observations: newEx.observations || null,
    });
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setNewEx({ name: "", gifUrl: "", category: "fuerza", observations: "" });
    await loadAll();
    showSuccessToast("Ejercicio creado exitosamente.");
    setSaving(false);
  };

  const downloadExerciseTemplate = () => {
    const headers = ["Nombre del ejercicio", "Categoria", "Link de YouTube", "Observaciones"];
    const example = [
      "Sentadilla goblet",
      "fuerza",
      "https://www.youtube.com/watch?v=ejemplo",
      "Mantené la espalda derecha",
    ];
    const escape = (value: string) => {
      if (/[";\r\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };
    const csv =
      "\uFEFF" +
      [headers.map(escape).join(";"), example.map(escape).join(";")].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "planilla-ejercicios.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string, sep: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map((value) => value.trim());
  };

  const handleBulkExerciseUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const resetInput = () => {
      if (bulkUploadInputRef.current) bulkUploadInputRef.current.value = "";
    };
    if (!file) return;

    const text = await file.text();
    const cleaned = text.replace(/^\uFEFF/, "");
    const lines = cleaned.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length < 2) {
      setError("La planilla esta vacia o solo tiene el encabezado.");
      resetInput();
      return;
    }

    const sep = lines[0].includes(";") ? ";" : ",";
    const dataLines = lines.slice(1);

    const rows: { name: string; category: Category; gif_url: string; observations: string | null }[] = [];
    const errors: string[] = [];

    dataLines.forEach((line, index) => {
      const rowNumber = index + 2;
      const cols = parseCsvLine(line, sep);
      const name = (cols[0] ?? "").trim();
      const categoryRaw = (cols[1] ?? "").trim();
      const categoryNorm = categoryRaw.toLowerCase();
      const gifUrl = (cols[2] ?? "").trim();
      const observations = (cols[3] ?? "").trim();

      if (!name && !categoryRaw && !gifUrl && !observations) return;

      if (!name) {
        errors.push(`Fila ${rowNumber}: falta el nombre.`);
        return;
      }
      if (categoryNorm !== "fuerza" && categoryNorm !== "movilidad") {
        errors.push(`Fila ${rowNumber}: categoria invalida ("${categoryRaw}"). Usa "fuerza" o "movilidad".`);
        return;
      }
      if (!gifUrl) {
        errors.push(`Fila ${rowNumber}: falta el link de YouTube.`);
        return;
      }
      if (!isYouTubeUrl(gifUrl)) {
        errors.push(`Fila ${rowNumber}: el link no es una URL valida de YouTube.`);
        return;
      }
      rows.push({
        name,
        category: categoryNorm as Category,
        gif_url: gifUrl,
        observations: observations || null,
      });
    });

    if (rows.length === 0) {
      setError(`No se cargaron ejercicios. ${errors.slice(0, 3).join(" ")}`);
      resetInput();
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("exercises").insert(rows);
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      resetInput();
      return;
    }
    await loadAll();
    if (errors.length > 0) {
      setError(`Se cargaron ${rows.length} ejercicio(s). Filas omitidas (${errors.length}): ${errors.slice(0, 3).join(" ")}`);
    }
    showSuccessToast(`Se cargaron ${rows.length} ejercicio(s) exitosamente.`);
    resetInput();
    setFuerzaPanel(null);
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
    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }
    await loadAll();
    showSuccessToast("Ejercicio eliminado exitosamente.");
    setSaving(false);
  };

  const addRoutineToDraft = (event: FormEvent) => {
    event.preventDefault();
    const parsedSeries = Number(assign.series);
    if (!assign.clientId || !assign.exerciseId || !Number.isInteger(parsedSeries) || parsedSeries <= 0) return;
    setAssignDraft((current) => [
      ...current,
      {
        client_id: assign.clientId,
        category: assign.category,
        day: dayNameFromISO(assign.routineDate),
        routine_date: assign.routineDate,
        exercise_id: assign.exerciseId,
        series: parsedSeries,
        repetitions: assign.reps,
        plan_type: assign.planType,
      },
    ]);
    setAssign((current) => ({ ...current, exerciseId: "", series: "", reps: "10" }));
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
    const parsedSeries = Number(tpl.series);
    if (!tpl.exerciseId || !Number.isInteger(parsedSeries) || parsedSeries <= 0) return;
    setTplDraft((current) => [...current, { exercise_id: tpl.exerciseId, repetitions: tpl.reps, series: parsedSeries }]);
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
      series: item.series,
    }));

    const itemsResult = await supabase.from("routine_template_items").insert(rows);
    if (itemsResult.error) {
      // Clean up orphaned template since items failed
      await supabase.from("routine_templates").delete().eq("id", templateResult.data.id);
      setError(itemsResult.error.message);
      setSaving(false);
      return;
    }

    setTplDraft([]);
    setTpl((current) => ({ ...current, name: "", startDate: "", exerciseId: "", series: "", reps: "10" }));
    await loadAll();
    showSuccessToast("Plantilla creada exitosamente.");
    setSaving(false);
  };

  const updateTemplateItem = async (
    itemId: string,
    field: "exercise_id" | "repetitions" | "series",
    value: string,
  ) => {
    const { error: updateError } = await supabase
      .from("routine_template_items")
      .update({ [field]: field === "series" ? Number(value) : value })
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
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setRecForm({ title: "", url: "" });
    await loadAll();
    showSuccessToast("Clase grabada cargada exitosamente.");
    setSaving(false);
  };

  const createLive = async (event: FormEvent, area: Area) => {
    event.preventDefault();
    if (!liveForm.title || !liveForm.date || !liveForm.url) return;
    setSaving(true);
    const parsedDatetime = new Date(liveForm.date);
    if (Number.isNaN(parsedDatetime.getTime())) {
      setError("La fecha y hora de la clase no es válida.");
      setSaving(false);
      return;
    }
    const { error: insertError } = await supabase.from("live_classes").insert({
      area,
      title: liveForm.title,
      class_datetime: parsedDatetime.toISOString(),
      meet_url: liveForm.url,
      cover_image_url: liveForm.coverImageUrl || null,
    });
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setLiveForm({ title: "", date: "", url: "", coverImageUrl: "" });
    await loadAll();
    showSuccessToast("Clase en vivo creada exitosamente.");
    setSaving(false);
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(file);
    });

  const handleLiveCoverPick = async (file?: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("La portada debe pesar menos de 2MB.");
      return;
    }

    try {
      const imageDataUrl = await fileToDataUrl(file);
      setLiveForm((current) => ({ ...current, coverImageUrl: imageDataUrl }));
    } catch {
      setError("No se pudo procesar la portada.");
    }
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
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setYogaForm({ clientId: "", title: "", url: "" });
    await loadAll();
    showSuccessToast("Ejercicio personalizado cargado exitosamente.");
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
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setWelForm({ title: "", url: "" });
    await loadAll();
    showSuccessToast("Video de bienvenida cargado exitosamente.");
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
    <ProtectedRoute allowedRole="admin">
      <div className="ds-admin-scroll-root">
        <div className="ds-page">
        <main className="ds-admin-page-shell">
        <h1 className="ds-h1 ds-admin-page-title">{adminSectionTitleByTab[tab]}</h1>
        {toastMessage && (
          <div className="ds-toast ds-admin-toast" role="status" aria-live="polite">
            <span className="ds-admin-toast-dot" aria-hidden />
            <span>{toastMessage}</span>
          </div>
        )}
        {loading && (
          <div className="ds-stack-md">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={3} />
          </div>
        )}
        {saving && (
          <div className="ds-admin-feedback ds-admin-feedback-info" role="status" aria-live="polite">
            <strong className="ds-admin-feedback-title">Actualizando</strong>
            <p>Guardando cambios...</p>
          </div>
        )}
        {error && (
          <div className="ds-admin-feedback ds-admin-feedback-error" role="alert" aria-live="assertive">
            <strong className="ds-admin-feedback-title">Revisá este paso</strong>
            <p>{error}</p>
          </div>
        )}
        {msg && (
          <div className="ds-admin-feedback ds-admin-feedback-success" role="status" aria-live="polite">
            <strong className="ds-admin-feedback-title">Todo en orden</strong>
            <p>{msg}</p>
          </div>
        )}

      {tab === "clientes" && (
        <>
          <section className="ds-clientes-section">
            <FloatingCard title={adminTitleCopy.createClient}>
              <form onSubmit={createClient} className="ds-clientes-create-form">
                <TextField
                  label="Nombre del cliente"
                  value={newClient.name}
                  onChange={(value) => setNewClient({ ...newClient, name: value })}
                  placeholder="Ej. Maria Perez"
                />
                <TextField
                  label="Correo"
                  value={newClient.email}
                  onChange={(value) => setNewClient({ ...newClient, email: value })}
                  type="email"
                  placeholder="maria@correo.com"
                />
                <SecondaryButton type="submit" className="ds-clientes-create-btn">{adminActionCopy.sendInvite}</SecondaryButton>
              </form>
            </FloatingCard>

            <p className="ds-clientes-list-kicker">Clientes activos ({filteredClients.length})</p>
            <input
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              placeholder="Buscar por nombre"
              className="ds-input"
            />

            {filteredClients.length > 0 && (
              <div className="ds-clients-table-wrap ds-admin-clients-table-wrap">
                <table className="ds-clients-table ds-admin-clients-table">
                  <thead>
                    <tr>
                      <th>{adminTableCopy.avatar}</th>
                      <th>{adminTableCopy.name}</th>
                      <th>{adminTableCopy.email}</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                      <tr key={client.id}>
                        <td>
                          <div className="ds-admin-client-avatar-cell">
                            <div className="ds-client-badge" aria-hidden>
                              {client.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={client.avatar_url} alt="" className="ds-client-avatar" />
                              ) : (
                                client.name.charAt(0).toUpperCase()
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <h3 className="ds-client-line-name ds-client-line-name-table">{client.name}</h3>
                        </td>
                        <td>
                          <p className="ds-client-line-email ds-client-line-email-table">{client.email}</p>
                        </td>
                        <td>
                          <div className="ds-client-line-actions ds-client-line-actions-table">
                            <button
                              type="button"
                              className="ds-client-action"
                              onClick={() => {
                                setViewClient(client.id);
                                setSelectedRoutineIds([]);
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                                <circle cx="12" cy="12" r="2.8" />
                              </svg>
                              <span>{adminActionCopy.open}</span>
                            </button>
                            <button
                              type="button"
                              className="ds-client-action ds-client-action-danger"
                              onClick={() => removeClient(client.id, client.name)}
                              aria-label={`Eliminar cliente ${client.name}`}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M3 6h18" />
                                <path d="M8 6V4h8v2" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                              </svg>
                              <span>{adminActionCopy.remove}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {viewClient && (() => {
              const currentClient = clients.find((item) => item.id === viewClient);
              if (!currentClient) return null;
              const clientRoutines = routinesForClient(currentClient.id);
              const clientActivity = clientActivityById[currentClient.id] ?? {
                linked: Boolean(currentClient.auth_user_id),
                trainingsCompleted: 0,
                lastTrainingDate: null,
                liveClassesAttended: 0,
                videosViewed: 0,
              };
              return (
                <div className="ds-modal-overlay" role="presentation" onClick={() => setViewClient("")}>
                  <div
                    className="ds-modal-panel ds-routine-modal-panel ds-animate-card"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Ficha de ${currentClient.name}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="ds-routine-modal-head">
                      <div>
                        <h3 className="ds-h2">Ficha de {currentClient.name}</h3>
                        <p className="ds-micro">{adminSubtitleCopy.clientModal}</p>
                      </div>
                      <button type="button" className="ds-routine-close" onClick={() => setViewClient("")} aria-label={adminActionCopy.close}>
                        ×
                      </button>
                    </div>
                    <div className="ds-routine-modal-body">

                      {/* ── Actividad reciente ── */}
                      <div className="ds-ficha-accordion">
                        <button
                          type="button"
                          className={`ds-ficha-accordion-row ${fichaSection === "actividad" ? "is-open" : ""}`}
                          onClick={() => setFichaSection(fichaSection === "actividad" ? null : "actividad")}
                        >
                          <span className="ds-ficha-accordion-icon" aria-hidden>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 19h16" /><path d="M7 16V10" /><path d="M12 16V6" /><path d="M17 16v-4" />
                            </svg>
                          </span>
                          <span className="ds-ficha-accordion-label">Actividad reciente</span>
                          <span className="ds-ficha-accordion-chevron" aria-hidden>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </span>
                        </button>
                        {fichaSection === "actividad" && (
                          <div className="ds-ficha-accordion-body ds-client-activity-panel">
                            {clientActivity.linked ? (
                              <div className="ds-activity-stats">
                                <div className="ds-activity-stat">
                                  <span className="ds-activity-stat-value">{clientActivity.trainingsCompleted}</span>
                                  <span className="ds-activity-stat-label">Entrenamientos</span>
                                </div>
                                <div className="ds-activity-stat">
                                  <span className="ds-activity-stat-value">{clientActivity.liveClassesAttended}</span>
                                  <span className="ds-activity-stat-label">Clases en vivo</span>
                                </div>
                                <div className="ds-activity-stat">
                                  <span className="ds-activity-stat-value">{clientActivity.videosViewed}</span>
                                  <span className="ds-activity-stat-label">Videos vistos</span>
                                </div>
                                <div className="ds-activity-stat">
                                  <span className="ds-activity-stat-value" style={{ fontSize: "1rem", marginTop: "2px" }}>{daysSinceText(clientActivity.lastTrainingDate)}</span>
                                  <span className="ds-activity-stat-label">Última actividad</span>
                                </div>
                              </div>
                            ) : (
                              <p className="ds-description">
                                Este cliente todavía no tiene una cuenta vinculada, por eso aún no vemos actividad registrada.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── Ficha del cliente ── */}
                      <div className="ds-ficha-accordion">
                        <button
                          type="button"
                          className={`ds-ficha-accordion-row ${fichaSection === "ficha" ? "is-open" : ""}`}
                          onClick={() => setFichaSection(fichaSection === "ficha" ? null : "ficha")}
                        >
                          <span className="ds-ficha-accordion-icon" aria-hidden>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 12h6M9 16h6M7 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
                              <rect x="9" y="2" width="6" height="4" rx="1" />
                            </svg>
                          </span>
                          <span className="ds-ficha-accordion-label">Ficha del cliente</span>
                          <span className="ds-ficha-accordion-chevron" aria-hidden>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </span>
                        </button>
                        {fichaSection === "ficha" && (
                          <div className="ds-ficha-accordion-body ds-client-ficha-panel">
                            <div className="ds-grid-2">
                              <label className="ds-field">
                                <span className="ds-field-label">Objetivos</span>
                                <textarea
                                  className="ds-input"
                                  value={clientFichaDrafts[currentClient.id]?.goals ?? ""}
                                  onChange={(event) =>
                                    setClientFichaDrafts((current) => ({
                                      ...current,
                                      [currentClient.id]: {
                                        goals: event.target.value,
                                        attentionNotes: current[currentClient.id]?.attentionNotes ?? "",
                                      },
                                    }))
                                  }
                                  rows={4}
                                  placeholder="Ej. Mejorar postura y ganar fuerza de brazos"
                                />
                              </label>
                              <label className="ds-field">
                                <span className="ds-field-label">Puntos a cuidar</span>
                                <textarea
                                  className="ds-input"
                                  value={clientFichaDrafts[currentClient.id]?.attentionNotes ?? ""}
                                  onChange={(event) =>
                                    setClientFichaDrafts((current) => ({
                                      ...current,
                                      [currentClient.id]: {
                                        goals: current[currentClient.id]?.goals ?? "",
                                        attentionNotes: event.target.value,
                                      },
                                    }))
                                  }
                                  rows={4}
                                  placeholder="Ej. Molestia en hombro derecho y evitar impacto"
                                />
                              </label>
                            </div>
                            <div className="ds-client-expanded-actions" style={{ marginTop: "16px" }}>
                              <PrimaryButton onClick={() => saveClientFicha(currentClient.id)}>
                                {adminActionCopy.saveFicha}
                              </PrimaryButton>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── Rutinas ── */}
                      <div className="ds-ficha-accordion">
                        <button
                          type="button"
                          className={`ds-ficha-accordion-row ${fichaSection === "rutinas" ? "is-open" : ""}`}
                          onClick={() => setFichaSection(fichaSection === "rutinas" ? null : "rutinas")}
                        >
                          <span className="ds-ficha-accordion-icon" aria-hidden>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3.5 9.5v5" /><path d="M5.5 8v8" /><path d="M8 10v4" />
                              <path d="M16 10v4" /><path d="M18.5 8v8" /><path d="M20.5 9.5v5" /><path d="M8 12h8" />
                            </svg>
                          </span>
                          <span className="ds-ficha-accordion-label">Rutinas asignadas</span>
                          <span className="ds-ficha-accordion-chevron" aria-hidden>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </span>
                        </button>
                        {fichaSection === "rutinas" && (
                          <div className="ds-ficha-accordion-body">
                            <div className="ds-grid-3" style={{ marginBottom: "16px" }}>
                              <SelectField label="Plan" value={filterPlan} onChange={(value) => setFilterPlan(value as PlanType)}>
                                <option value="semanal">Semanal</option>
                                <option value="mensual">Mensual</option>
                              </SelectField>
                              <SelectField label="Categoría" value={filterCat} onChange={(value) => setFilterCat(value as "todas" | Category)}>
                                <option value="todas">Fuerza y movilidad</option>
                                <option value="fuerza">Fuerza</option>
                                <option value="movilidad">Movilidad</option>
                              </SelectField>
                              <SelectField label="Periodo" value={filterDateMode} onChange={(value) => setFilterDateMode(value as "todas" | "dia" | "rango")}>
                                <option value="todas">Todas las fechas</option>
                                <option value="dia">Solo un día</option>
                                <option value="rango">Rango de días</option>
                              </SelectField>
                            </div>
                            {filterDateMode === "dia" && (
                              <div className="ds-grid-2" style={{ marginBottom: "16px" }}>
                                <TextField label="Fecha" value={filterDateSingle} onChange={setFilterDateSingle} type="date" />
                              </div>
                            )}
                            {filterDateMode === "rango" && (
                              <div className="ds-grid-2" style={{ marginBottom: "16px" }}>
                                <TextField label="Desde" value={filterDateFrom} onChange={setFilterDateFrom} type="date" />
                                <TextField label="Hasta" value={filterDateTo} onChange={setFilterDateTo} type="date" />
                              </div>
                            )}
                            {clientRoutines.length > 0 && (
                              <div className="ds-admin-bulk-bar" style={{ marginBottom: "12px" }}>
                                <div className="ds-admin-bulk-copy">
                                  <span className="ds-admin-bulk-count">{selectedRoutineIds.length}</span>
                                  <span>{selectedRoutineIds.length === 1 ? "rutina seleccionada" : "rutinas seleccionadas"}</span>
                                </div>
                                <div className="ds-admin-bulk-actions">
                                  <GhostButton
                                    className="ds-admin-bulk-btn"
                                    onClick={() =>
                                      setSelectedRoutineIds((current) => {
                                        const visibleIds = clientRoutines.map((routine) => routine.id);
                                        const allSelected = visibleIds.every((id) => current.includes(id));
                                        if (allSelected) return current.filter((id) => !visibleIds.includes(id));
                                        return Array.from(new Set([...current, ...visibleIds]));
                                      })
                                    }
                                  >
                                    {clientRoutines.every((routine) => selectedRoutineIds.includes(routine.id))
                                      ? adminActionCopy.clearSelection
                                      : adminActionCopy.selectVisible}
                                  </GhostButton>
                                  <SecondaryButton className="ds-admin-bulk-btn" onClick={deleteSelectedRoutines}>
                                    {adminActionCopy.removeSelected} ({selectedRoutineIds.length})
                                  </SecondaryButton>
                                </div>
                              </div>
                            )}
                            {clientRoutines.length === 0 ? (
                              <div className="ds-admin-empty-state">
                                <strong>{adminEmptyCopy.routines.title}</strong>
                                <p>{adminEmptyCopy.routines.description}</p>
                              </div>
                            ) : (
                              <div className="ds-ficha-table-wrap">
                                <table className="ds-ficha-table">
                                  <thead>
                                    <tr>
                                      <th>Ejercicio</th>
                                      <th>Series</th>
                                      <th>Reps</th>
                                      <th>Categoría</th>
                                      <th>Fecha / Día</th>
                                      <th aria-label="Seleccionar" />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {clientRoutines.map((routine) => (
                                      <tr key={routine.id} className={selectedRoutineIds.includes(routine.id) ? "is-selected" : ""}>
                                        <td className="ds-ficha-table-name">{exerciseName(routine.exercise_id)}</td>
                                        <td>{routine.series}</td>
                                        <td>{routine.repetitions}</td>
                                        <td className="ds-ficha-table-cat">{routine.category}</td>
                                        <td className="ds-ficha-table-date">{routine.routine_date ?? routine.day}</td>
                                        <td>
                                          <label className="ds-admin-check" aria-label={`Seleccionar ${exerciseName(routine.exercise_id)}`}>
                                            <input
                                              type="checkbox"
                                              checked={selectedRoutineIds.includes(routine.id)}
                                              onChange={(event) => {
                                                if (event.target.checked) {
                                                  setSelectedRoutineIds((current) => [...current, routine.id]);
                                                  return;
                                                }
                                                setSelectedRoutineIds((current) => current.filter((id) => id !== routine.id));
                                              }}
                                            />
                                            <span className="ds-admin-check-ui" aria-hidden="true">
                                              <svg viewBox="0 0 16 16" fill="none">
                                                <path d="M3.5 8.3 6.4 11 12.5 4.9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                              </svg>
                                            </span>
                                          </label>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              );
            })()}
            {filteredClients.length === 0 && (
              <div className="ds-admin-empty-state">
                <strong>{adminEmptyCopy.clients.title}</strong>
                <p>{adminEmptyCopy.clients.description}</p>
              </div>
            )}
          </section>
        </>
      )}

      {tab === "fuerza" && (
        <>
          <div className="ds-admin-fuerza-grid">
            <FloatingCard title="Biblioteca de ejercicios" className="ds-admin-fuerza-card-compact">
              <div className="ds-admin-group-actions">
                <GhostButton onClick={() => setFuerzaPanel("createExercise")}>
                  {adminTitleCopy.createExercise}
                </GhostButton>
                <GhostButton onClick={() => setFuerzaPanel("listExercises")}>
                  {adminTitleCopy.exerciseLibrary}
                </GhostButton>
              </div>
            </FloatingCard>

            <FloatingCard title="Asignar rutina" className="ds-admin-fuerza-card-compact">
              <div className="ds-admin-group-actions">
                <GhostButton onClick={() => setFuerzaPanel("assignRoutine")}>
                  {adminTitleCopy.createRoutine}
                </GhostButton>
                <GhostButton onClick={() => setFuerzaPanel("createTemplate")}>
                  {adminTitleCopy.createTemplate}
                </GhostButton>
              </div>
            </FloatingCard>

            <FloatingCard title="Clases" className="ds-admin-fuerza-card-compact">
              <div className="ds-admin-group-actions">
                <GhostButton onClick={() => setFuerzaPanel("uploadRecorded")}>
                  {adminTitleCopy.createRecordedClass}
                </GhostButton>
                <GhostButton onClick={() => setFuerzaPanel("createLive")}>
                  {adminTitleCopy.createLiveClass}
                </GhostButton>
              </div>
            </FloatingCard>
          </div>

          {fuerzaPanel === "createExercise" && (
          <div className="ds-modal-overlay" role="presentation" onClick={() => setFuerzaPanel(null)}>
            <div className="ds-simple-modal ds-animate-card" role="dialog" aria-modal="true" aria-label={adminTitleCopy.createExercise} onClick={(event) => event.stopPropagation()}>
              <div className="ds-simple-modal-head">
                <h3 className="ds-h3">Crear ejercicio</h3>
                <button type="button" className="ds-routine-close" onClick={() => setFuerzaPanel(null)} aria-label={adminActionCopy.close}>×</button>
              </div>
              <form
                onSubmit={async (event) => {
                  await createExercise(event);
                  setFuerzaPanel(null);
                }}
                className="ds-simple-modal-body"
              >
                <TextField label="Nombre del ejercicio" value={newEx.name} onChange={(value) => setNewEx({ ...newEx, name: value })} placeholder="Ej. Sentadilla goblet" />
                <SelectField label="Categoría" value={newEx.category} onChange={(value) => setNewEx({ ...newEx, category: value as Category })}>
                  <option value="fuerza">Fuerza</option>
                  <option value="movilidad">Movilidad</option>
                </SelectField>
                <TextField label="Link de YouTube" value={newEx.gifUrl} onChange={(value) => setNewEx({ ...newEx, gifUrl: value })} placeholder="https://youtube.com/..." />
                <label className="ds-field">
                  <span className="ds-field-label">Observaciones</span>
                  <textarea
                    value={newEx.observations}
                    onChange={(event) => setNewEx({ ...newEx, observations: event.target.value })}
                    placeholder="Ej. Recordá mantener la espalda derecha"
                    className="ds-input ds-simple-modal-textarea"
                    rows={3}
                  />
                </label>
                <PrimaryButton type="submit">Guardar ejercicio</PrimaryButton>
              </form>
              <div className="ds-bulk-upload">
                <div className="ds-bulk-upload-divider">
                  <span>Carga masiva</span>
                </div>
                <p className="ds-bulk-upload-hint">
                  Descargá la planilla, completá las columnas y subila para crear varios ejercicios de una sola vez.
                </p>
                <div className="ds-bulk-upload-actions">
                  <GhostButton type="button" onClick={downloadExerciseTemplate}>
                    Descargar planilla
                  </GhostButton>
                  <GhostButton type="button" onClick={() => bulkUploadInputRef.current?.click()}>
                    Cargar planilla
                  </GhostButton>
                  <input
                    ref={bulkUploadInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: "none" }}
                    onChange={handleBulkExerciseUpload}
                  />
                </div>
              </div>
            </div>
          </div>
          )}

          {fuerzaPanel === "listExercises" && (
          <div className="ds-modal-overlay" role="presentation" onClick={() => setFuerzaPanel(null)}>
            <div className="ds-simple-modal ds-simple-modal-wide ds-animate-card" role="dialog" aria-modal="true" aria-label={adminTitleCopy.exerciseLibrary} onClick={(event) => event.stopPropagation()}>
              <div className="ds-simple-modal-head">
                <h3 className="ds-h3">{adminTitleCopy.exerciseLibrary}</h3>
                <button type="button" className="ds-routine-close" onClick={() => setFuerzaPanel(null)} aria-label={adminActionCopy.close}>×</button>
              </div>
              <div className="ds-simple-modal-body">
                <div className="ds-simple-modal-filters">
                  <TextField
                    label="Buscar ejercicios"
                    value={exerciseSearch}
                    onChange={setExerciseSearch}
                    placeholder="Ej. Sentadilla"
                  />
                  <SelectField
                    label="Categoría"
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
                          <th>{adminTableCopy.name}</th>
                          <th>{adminTableCopy.category}</th>
                          <th>{adminTableCopy.access}</th>
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
                                {adminActionCopy.watchVideo}
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
                  <div className="ds-admin-empty-state">
                    <strong>{adminEmptyCopy.exercises.title}</strong>
                    <p>{adminEmptyCopy.exercises.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {fuerzaPanel === "assignRoutine" && (
          <div className="ds-modal-overlay" role="presentation" onClick={() => setFuerzaPanel(null)}>
            <div className="ds-simple-modal ds-simple-modal-wide ds-animate-card" role="dialog" aria-modal="true" aria-label={adminTitleCopy.createRoutine} onClick={(event) => event.stopPropagation()}>
              <div className="ds-simple-modal-head">
                <h3 className="ds-h3">Crear rutina</h3>
                <button type="button" className="ds-routine-close" onClick={() => setFuerzaPanel(null)} aria-label={adminActionCopy.close}>×</button>
              </div>
              <div className="ds-simple-modal-body">
                <form id="assign-routine-form" onSubmit={addRoutineToDraft} className="ds-simple-modal-grid">
                  <SelectField label="Cliente" value={assign.clientId} onChange={(value) => setAssign({ ...assign, clientId: value })}>
                    <option value="">Elegir cliente</option>
                    {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </SelectField>
                  <SelectField label="Categoría" value={assign.category} onChange={(value) => setAssign({ ...assign, category: value as Category, exerciseId: "" })}>
                    <option value="fuerza">Fuerza</option>
                    <option value="movilidad">Movilidad</option>
                  </SelectField>
                  <SelectField label="Plan" value={assign.planType} onChange={(value) => setAssign({ ...assign, planType: value as PlanType })}>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                  </SelectField>
                  <TextField label="Fecha de inicio" value={assign.routineDate} onChange={(value) => setAssign({ ...assign, routineDate: value })} type="date" />
                  <SelectField label="Ejercicio" value={assign.exerciseId} onChange={(value) => setAssign({ ...assign, exerciseId: value })}>
                    <option value="">Elegir ejercicio</option>
                    {exercises.filter((e) => e.category === assign.category).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </SelectField>
                  <TextField label="Series" value={assign.series} onChange={(value) => setAssign({ ...assign, series: value })} placeholder="Ej. 4" type="number" />
                  <TextField label="Repeticiones" value={assign.reps} onChange={(value) => setAssign({ ...assign, reps: value })} placeholder="Ej. 10" />
                </form>
                {assignDraft.length > 0 && (
                  <div className="ds-simple-modal-draft">
                    <p className="ds-simple-modal-draft-label">Borrador ({assignDraft.length})</p>
                    {assignDraft.map((item, index) => (
                      <div key={`${item.exercise_id}-${index}`} className="ds-simple-modal-draft-row">
                        <span>{exerciseName(item.exercise_id)}</span>
                        <span className="ds-simple-modal-draft-meta">{item.series} series × {item.repetitions} reps · {item.routine_date ?? item.day}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="ds-simple-modal-actions">
                  <PrimaryButton type="submit" form="assign-routine-form">{adminActionCopy.addExercise}</PrimaryButton>
                  <GhostButton onClick={async () => { await saveRoutineDraft(); setFuerzaPanel(null); }}>{adminActionCopy.saveRoutine}</GhostButton>
                </div>
              </div>
            </div>
          </div>
          )}

          {fuerzaPanel === "createTemplate" && (
          <div className="ds-modal-overlay" role="presentation" onClick={() => setFuerzaPanel(null)}>
            <div className="ds-simple-modal ds-simple-modal-wide ds-animate-card" role="dialog" aria-modal="true" aria-label={adminTitleCopy.createTemplate} onClick={(event) => event.stopPropagation()}>
              <div className="ds-simple-modal-head">
                <h3 className="ds-h3">Crear plantilla</h3>
                <button type="button" className="ds-routine-close" onClick={() => setFuerzaPanel(null)} aria-label={adminActionCopy.close}>×</button>
              </div>
              <div className="ds-simple-modal-body">
                <form onSubmit={async (event) => { await saveTemplate(event); setFuerzaPanel(null); }} className="ds-simple-modal-grid">
                  <SelectField label="Cliente" value={tpl.clientId} onChange={(value) => setTpl({ ...tpl, clientId: value })}>
                    <option value="">Elegir cliente</option>
                    {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </SelectField>
                  <TextField label="Nombre de la plantilla" value={tpl.name} onChange={(value) => setTpl({ ...tpl, name: value })} placeholder="Ej. Semana 1 tren superior" />
                  <SelectField label="Categoría" value={tpl.category} onChange={(value) => setTpl({ ...tpl, category: value as Category, exerciseId: "" })}>
                    <option value="fuerza">Fuerza</option>
                    <option value="movilidad">Movilidad</option>
                  </SelectField>
                  <SelectField label="Plan" value={tpl.planType} onChange={(value) => setTpl({ ...tpl, planType: value as PlanType })}>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                  </SelectField>
                  <TextField label="Fecha de inicio" value={tpl.startDate} onChange={(value) => setTpl({ ...tpl, startDate: value })} type="date" />
                  <SelectField label="Ejercicio" value={tpl.exerciseId} onChange={(value) => setTpl({ ...tpl, exerciseId: value })}>
                    <option value="">Elegir ejercicio</option>
                    {exercises.filter((e) => e.category === tpl.category).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </SelectField>
                  <TextField label="Series" value={tpl.series} onChange={(value) => setTpl({ ...tpl, series: value })} type="number" placeholder="Ej. 4" />
                  <TextField label="Repeticiones" value={tpl.reps} onChange={(value) => setTpl({ ...tpl, reps: value })} placeholder="Ej. 10" />
                  <div className="ds-simple-modal-actions">
                    <GhostButton onClick={addTemplateItemToDraft}>{adminActionCopy.addToTemplate}</GhostButton>
                    <PrimaryButton type="submit">{adminActionCopy.saveTemplate}</PrimaryButton>
                  </div>
                </form>
              </div>
            </div>
          </div>
          )}

          {fuerzaPanel === "uploadRecorded" && (
          <div className="ds-modal-overlay" role="presentation" onClick={() => setFuerzaPanel(null)}>
            <div className="ds-simple-modal ds-animate-card" role="dialog" aria-modal="true" aria-label={adminTitleCopy.createRecordedClass} onClick={(event) => event.stopPropagation()}>
              <div className="ds-simple-modal-head">
                <h3 className="ds-h3">Clase grabada</h3>
                <button type="button" className="ds-routine-close" onClick={() => setFuerzaPanel(null)} aria-label={adminActionCopy.close}>×</button>
              </div>
              <form onSubmit={async (event) => { await createRecorded(event, "fuerza"); setFuerzaPanel(null); }} className="ds-simple-modal-body">
                <TextField label="Título de la clase" value={recForm.title} onChange={(value) => setRecForm({ ...recForm, title: value })} placeholder="Ej. Fuerza express de piernas" />
                <TextField label="Link de YouTube" value={recForm.url} onChange={(value) => setRecForm({ ...recForm, url: value })} placeholder="https://youtube.com/..." />
                <PrimaryButton type="submit">{adminActionCopy.saveRecordedClass}</PrimaryButton>
              </form>
            </div>
          </div>
          )}

          {fuerzaPanel === "createLive" && (
          <div className="ds-modal-overlay" role="presentation" onClick={() => setFuerzaPanel(null)}>
            <div className="ds-simple-modal ds-animate-card" role="dialog" aria-modal="true" aria-label={adminTitleCopy.createLiveClass} onClick={(event) => event.stopPropagation()}>
              <div className="ds-simple-modal-head">
                <h3 className="ds-h3">{adminTitleCopy.createLiveClass}</h3>
                <button type="button" className="ds-routine-close" onClick={() => setFuerzaPanel(null)} aria-label={adminActionCopy.close}>×</button>
              </div>
              <form
                onSubmit={async (event) => { await createLive(event, "fuerza"); setFuerzaPanel(null); }}
                className="ds-simple-modal-body"
              >
                <TextField label="Título de la clase" value={liveForm.title} onChange={(value) => setLiveForm({ ...liveForm, title: value })} placeholder="Ej. Clase en vivo de movilidad" />
                <TextField label="Fecha y hora" value={liveForm.date} onChange={(value) => setLiveForm({ ...liveForm, date: value })} type="datetime-local" />
                <TextField label="Link de Meet" value={liveForm.url} onChange={(value) => setLiveForm({ ...liveForm, url: value })} placeholder="https://meet.google.com/..." />
                <label className="ds-field">
                  <span className="ds-field-label">Foto de portada</span>
                  <input
                    className="ds-input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleLiveCoverPick(event.target.files?.[0])}
                  />
                </label>
                {liveForm.coverImageUrl && (
                  <img src={liveForm.coverImageUrl} alt="Vista previa de portada" className="ds-live-cover-preview" style={{ borderRadius: 12, maxHeight: 160, objectFit: "cover" }} />
                )}
                <PrimaryButton type="submit">{adminActionCopy.saveLiveClass}</PrimaryButton>
              </form>
            </div>
          </div>
          )}

          <FloatingCard title={adminTitleCopy.manageClasses}>
            <GhostButton className="ds-encounters-toggle-btn" onClick={() => setShowFuerzaManager((current) => !current)}>
              {showFuerzaManager ? adminActionCopy.hideManager : adminActionCopy.showManager}
            </GhostButton>

            <ExpandableSection open={showFuerzaManager}>
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
                      <div className="ds-admin-empty-state">
                        <strong>{adminEmptyCopy.recorded.title}</strong>
                        <p>{adminEmptyCopy.recorded.description}</p>
                      </div>
                    )}
                    {fuerzaRecorded.length > 0 && (
                      <div className="ds-clients-table-wrap ds-encounters-table-wrap">
                        <table className="ds-clients-table ds-encounters-table">
                          <thead>
                            <tr>
                              <th>{adminTableCopy.title}</th>
                              <th>{adminTableCopy.access}</th>
                              <th>{adminTableCopy.date}</th>
                              <th className="ds-encounter-actions-col" aria-label="Acciones" />
                            </tr>
                          </thead>
                          <tbody>
                            {fuerzaRecorded.map((item) => {
                              const edit = editingRecorded[item.id];
                              return (
                                <tr key={item.id} className={edit ? "is-editing" : undefined}>
                                  <td>{edit ? <input className="ds-input" value={edit.title} onChange={(event) => setEditingRecorded((current) => ({ ...current, [item.id]: { ...current[item.id], title: event.target.value } }))} /> : item.title}</td>
                                  <td>{edit ? <input className="ds-input" value={edit.url} onChange={(event) => setEditingRecorded((current) => ({ ...current, [item.id]: { ...current[item.id], url: event.target.value } }))} /> : <a className="ds-link-inline" href={item.youtube_url} target="_blank" rel="noreferrer">{item.youtube_url}</a>}</td>
                                  <td>{formatShortDate(item.created_at)}</td>
                                  <td>
                                    <div className={`ds-client-row-actions ${edit ? "is-editing" : ""}`}>
                                      {edit ? <button type="button" className="ds-encounter-action-btn ds-encounter-save-btn" onClick={() => saveRecorded(item.id)} aria-label={adminActionCopy.saveChanges}><span aria-hidden>✓</span></button> : <GhostButton className="ds-encounter-action-btn" onClick={() => startEditRecorded(item)}>{adminActionCopy.edit}</GhostButton>}
                                      <button type="button" className="ds-encounter-action-btn ds-encounter-delete-btn" onClick={() => deleteRecorded(item.id)} aria-label="Borrar clase grabada">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
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
                      <div className="ds-admin-empty-state">
                        <strong>{adminEmptyCopy.live.title}</strong>
                        <p>{adminEmptyCopy.live.description}</p>
                      </div>
                    )}
                    {fuerzaLive.length > 0 && (
                      <div className="ds-clients-table-wrap ds-encounters-table-wrap">
                        <table className="ds-clients-table ds-encounters-table">
                          <thead>
                            <tr>
                              <th>{adminTableCopy.title}</th>
                              <th>{adminTableCopy.access}</th>
                              <th>{adminTableCopy.date}</th>
                              <th className="ds-encounter-actions-col" aria-label="Acciones" />
                            </tr>
                          </thead>
                          <tbody>
                            {fuerzaLive.map((item) => {
                              const edit = editingLive[item.id];
                              return (
                                <tr key={item.id} className={edit ? "is-editing" : undefined}>
                                  <td>{edit ? <input className="ds-input" value={edit.title} onChange={(event) => setEditingLive((current) => ({ ...current, [item.id]: { ...current[item.id], title: event.target.value } }))} /> : item.title}</td>
                                  <td>{edit ? <input className="ds-input" value={edit.url} onChange={(event) => setEditingLive((current) => ({ ...current, [item.id]: { ...current[item.id], url: event.target.value } }))} /> : <a className="ds-link-inline" href={item.meet_url} target="_blank" rel="noreferrer">{item.meet_url}</a>}</td>
                                  <td>{formatShortDate(item.created_at)}</td>
                                  <td>
                                    <div className={`ds-client-row-actions ${edit ? "is-editing" : ""}`}>
                                      {edit ? <button type="button" className="ds-encounter-action-btn ds-encounter-save-btn" onClick={() => saveLive(item.id)} aria-label={adminActionCopy.saveChanges}><span aria-hidden>✓</span></button> : <GhostButton className="ds-encounter-action-btn" onClick={() => startEditLive(item)}>{adminActionCopy.edit}</GhostButton>}
                                      <button type="button" className="ds-encounter-action-btn ds-encounter-delete-btn" onClick={() => deleteLive(item.id)} aria-label="Borrar clase en vivo">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
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
          <div className="ds-admin-fuerza-grid">
            <FloatingCard title="Subir clase grabada" className="ds-admin-fuerza-card-compact">
              <form onSubmit={async (event) => { await createRecorded(event, "yoga"); }} className="ds-admin-inline-form">
                <TextField label="Título de la clase" value={recForm.title} onChange={(value) => setRecForm({ ...recForm, title: value })} placeholder="Ej. Yoga suave" />
                <TextField label="Link de YouTube" value={recForm.url} onChange={(value) => setRecForm({ ...recForm, url: value })} placeholder="https://youtube.com/..." />
                <PrimaryButton type="submit">{adminActionCopy.saveRecordedClass}</PrimaryButton>
              </form>
            </FloatingCard>

            <FloatingCard title="Clase en vivo" className="ds-admin-fuerza-card-compact">
              <form onSubmit={async (event) => { await createLive(event, "yoga"); }} className="ds-admin-inline-form">
                <TextField label="Título" value={liveForm.title} onChange={(value) => setLiveForm({ ...liveForm, title: value })} placeholder="Ej. Vinyasa en vivo" />
                <TextField label="Fecha y hora" value={liveForm.date} onChange={(value) => setLiveForm({ ...liveForm, date: value })} type="datetime-local" />
                <TextField label="Link de Meet" value={liveForm.url} onChange={(value) => setLiveForm({ ...liveForm, url: value })} placeholder="https://meet.google.com/..." />
                <PrimaryButton type="submit">{adminActionCopy.saveLiveClass}</PrimaryButton>
              </form>
            </FloatingCard>

            <FloatingCard title="Video personalizado" className="ds-admin-fuerza-card-compact">
              <form onSubmit={async (event) => { await createPersonalizedYoga(event); }} className="ds-admin-inline-form">
                <TextField label="Título del video" value={yogaForm.title} onChange={(value) => setYogaForm({ ...yogaForm, title: value })} placeholder="Ej. Secuencia personalizada" />
                <TextField label="Link de YouTube" value={yogaForm.url} onChange={(value) => setYogaForm({ ...yogaForm, url: value })} placeholder="https://youtube.com/..." />
                <SelectField label="Cliente" value={yogaForm.clientId} onChange={(value) => setYogaForm({ ...yogaForm, clientId: value })}>
                  <option value="">Elegir cliente</option>
                  {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                </SelectField>
                <PrimaryButton type="submit">{adminActionCopy.saveVideo}</PrimaryButton>
              </form>
            </FloatingCard>

          </div>

          <FloatingCard title="Gestionar clases">
            <GhostButton className="ds-encounters-toggle-btn" onClick={() => setShowYogaManager((current) => !current)}>
              {showYogaManager ? adminActionCopy.hideManager : adminActionCopy.showManager}
            </GhostButton>

            <ExpandableSection open={showYogaManager}>
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
                    <div className="ds-admin-empty-state">
                      <strong>{adminEmptyCopy.recorded.title}</strong>
                      <p>{adminEmptyCopy.recorded.description}</p>
                    </div>
                  )}
                  {yogaRecorded.length > 0 && (
                    <div className="ds-clients-table-wrap ds-encounters-table-wrap">
                      <table className="ds-clients-table ds-encounters-table">
                        <thead>
                          <tr>
                            <th>{adminTableCopy.title}</th>
                            <th>{adminTableCopy.access}</th>
                            <th>{adminTableCopy.date}</th>
                            <th className="ds-encounter-actions-col" aria-label="Acciones" />
                          </tr>
                        </thead>
                        <tbody>
                          {yogaRecorded.map((item) => {
                            const edit = editingRecorded[item.id];
                            return (
                              <tr key={item.id} className={edit ? "is-editing" : undefined}>
                                <td>{edit ? <input className="ds-input" value={edit.title} onChange={(event) => setEditingRecorded((current) => ({ ...current, [item.id]: { ...current[item.id], title: event.target.value } }))} /> : item.title}</td>
                                <td>{edit ? <input className="ds-input" value={edit.url} onChange={(event) => setEditingRecorded((current) => ({ ...current, [item.id]: { ...current[item.id], url: event.target.value } }))} /> : <a className="ds-link-inline" href={item.youtube_url} target="_blank" rel="noreferrer">{item.youtube_url}</a>}</td>
                                <td>{formatShortDate(item.created_at)}</td>
                                <td>
                                  <div className={`ds-client-row-actions ${edit ? "is-editing" : ""}`}>
                                    {edit ? <button type="button" className="ds-encounter-action-btn ds-encounter-save-btn" onClick={() => saveRecorded(item.id)} aria-label={adminActionCopy.saveChanges}><span aria-hidden>✓</span></button> : <GhostButton className="ds-encounter-action-btn" onClick={() => startEditRecorded(item)}>{adminActionCopy.edit}</GhostButton>}
                                    <button type="button" className="ds-encounter-action-btn ds-encounter-delete-btn" onClick={() => deleteRecorded(item.id)} aria-label="Borrar clase grabada">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
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
                    <div className="ds-admin-empty-state">
                      <strong>{adminEmptyCopy.live.title}</strong>
                      <p>{adminEmptyCopy.live.description}</p>
                    </div>
                  )}
                  {yogaLive.length > 0 && (
                    <div className="ds-clients-table-wrap ds-encounters-table-wrap">
                      <table className="ds-clients-table ds-encounters-table">
                        <thead>
                          <tr>
                            <th>{adminTableCopy.title}</th>
                            <th>{adminTableCopy.access}</th>
                            <th>{adminTableCopy.date}</th>
                            <th className="ds-encounter-actions-col" aria-label="Acciones" />
                          </tr>
                        </thead>
                        <tbody>
                          {yogaLive.map((item) => {
                            const edit = editingLive[item.id];
                            return (
                              <tr key={item.id} className={edit ? "is-editing" : undefined}>
                                <td>{edit ? <input className="ds-input" value={edit.title} onChange={(event) => setEditingLive((current) => ({ ...current, [item.id]: { ...current[item.id], title: event.target.value } }))} /> : item.title}</td>
                                <td>{edit ? <input className="ds-input" value={edit.url} onChange={(event) => setEditingLive((current) => ({ ...current, [item.id]: { ...current[item.id], url: event.target.value } }))} /> : <a className="ds-link-inline" href={item.meet_url} target="_blank" rel="noreferrer">{item.meet_url}</a>}</td>
                                <td>{formatShortDate(item.created_at)}</td>
                                <td>
                                  <div className={`ds-client-row-actions ${edit ? "is-editing" : ""}`}>
                                    {edit ? <button type="button" className="ds-encounter-action-btn ds-encounter-save-btn" onClick={() => saveLive(item.id)} aria-label={adminActionCopy.saveChanges}><span aria-hidden>✓</span></button> : <GhostButton className="ds-encounter-action-btn" onClick={() => startEditLive(item)}>{adminActionCopy.edit}</GhostButton>}
                                    <button type="button" className="ds-encounter-action-btn ds-encounter-delete-btn" onClick={() => deleteLive(item.id)} aria-label="Borrar clase en vivo">
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
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
          <FloatingCard title={adminTitleCopy.createWelcomeVideo}>
            <form onSubmit={createWelcomeVideo} className="ds-grid-3 ds-inline-upload-form">
              <TextField label="Título del video" value={welForm.title} onChange={(value) => setWelForm({ ...welForm, title: value })} placeholder="Ej. Bienvenida al campus" />
              <TextField label="Link de YouTube" value={welForm.url} onChange={(value) => setWelForm({ ...welForm, url: value })} placeholder="https://youtube.com/..." />
              <PrimaryButton type="submit">{adminActionCopy.saveVideo}</PrimaryButton>
            </form>
          </FloatingCard>

          <FloatingCard title={adminTitleCopy.manageWelcomeVideos}>
            <GhostButton className="ds-encounters-toggle-btn" onClick={() => setShowWelcomeManager((current) => !current)}>
              {showWelcomeManager ? adminActionCopy.hideManager : adminActionCopy.showManager}
            </GhostButton>

            <ExpandableSection open={showWelcomeManager}>
              <>
                {welcome.length > 0 && (
                  <div className="ds-clients-table-wrap ds-encounters-table-wrap">
                    <table className="ds-clients-table ds-encounters-table">
                      <thead>
                        <tr>
                          <th>{adminTableCopy.title}</th>
                          <th>{adminTableCopy.access}</th>
                          <th>{adminTableCopy.date}</th>
                          <th className="ds-encounter-actions-col" aria-label="Acciones" />
                        </tr>
                      </thead>
                      <tbody>
                        {welcome.map((item) => {
                          const edit = editingWelcome[item.id];
                          return (
                            <tr key={item.id} className={edit ? "is-editing" : undefined}>
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
                                <div className={`ds-client-row-actions ${edit ? "is-editing" : ""}`}>
                                  {edit ? (
                                    <button
                                      type="button"
                                      className="ds-encounter-action-btn ds-encounter-save-btn"
                                      onClick={() => saveWelcome(item.id)}
                                      aria-label={adminActionCopy.saveChanges}
                                    >
                                      <span aria-hidden>✓</span>
                                    </button>
                                  ) : (
                                    <GhostButton className="ds-encounter-action-btn" onClick={() => startEditWelcome(item)}>
                                      {adminActionCopy.edit}
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
                  <div className="ds-admin-empty-state">
                    <strong>{adminEmptyCopy.welcome.title}</strong>
                    <p>{adminEmptyCopy.welcome.description}</p>
                  </div>
                )}
              </>
            </ExpandableSection>
          </FloatingCard>
        </>
      )}

        <SideNavigation
          items={tabs.map((item) => ({ id: item.id, label: item.label, icon: item.icon }))}
          value={tab}
          onChange={(value) => setTab(value as Tab)}
        />
      </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
