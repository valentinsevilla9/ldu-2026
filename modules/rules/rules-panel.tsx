"use client";

import { useId, useState, type FormEvent } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, fetchJson, useApi } from "@/hooks/use-api";
import { SENSOR_KINDS } from "@/modules/sensors/simulate";
import { OPERATOR_LABELS, RULE_OPERATORS } from "./engine";
import { KIND_LABELS } from "./live-schema";
import {
  RULE_ACTIONS,
  RULE_KINDS,
  ruleListSchema,
  ruleSchema,
  type Rule,
  type RuleFormValues,
} from "./schema";

const number = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

/** La regla leída en voz alta: «SI … ENTONCES …». */
export function ruleSentence(
  rule: Pick<Rule, "kind" | "operator" | "threshold" | "durationMin" | "fromHour" | "toHour">,
) {
  const sensor = SENSOR_KINDS[rule.kind];
  const when =
    rule.fromHour === rule.toHour || (rule.fromHour === 0 && rule.toHour === 24)
      ? "a cualquier hora"
      : `entre las ${rule.fromHour}:00 y las ${rule.toHour}:00`;
  const duration = rule.durationMin > 0 ? ` durante ${rule.durationMin} minutos seguidos` : "";
  return {
    condition: `${sensor.label} ${OPERATOR_LABELS[rule.operator]} ${number.format(rule.threshold)} ${sensor.unit}${duration}, ${when}`,
    action: RULE_ACTIONS[rule.kind],
  };
}

const EMPTY: RuleFormValues = {
  name: "",
  kind: "heat",
  operator: "gte",
  threshold: 40,
  durationMin: 30,
  fromHour: 12,
  toHour: 19,
  cooldownMin: 120,
  notify: "",
  enabled: true,
};

const FIELDS = [
  { name: "threshold", label: "Umbral", step: "0.1" },
  { name: "durationMin", label: "Durante (minutos)", step: "5" },
  { name: "fromHour", label: "Desde la hora", step: "1" },
  { name: "toHour", label: "Hasta la hora", step: "1" },
  { name: "cooldownMin", label: "Espera entre avisos (min)", step: "5" },
] as const;

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none";

function RuleForm({
  initial,
  ruleId,
  onSaved,
  onCancel,
}: {
  initial: RuleFormValues;
  ruleId?: string;
  onSaved: (rule: Rule) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (name: string, value: unknown) =>
    setValues((current) => ({ ...current, [name]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      const saved = await fetchJson(ruleId ? `/api/rules/${ruleId}` : "/api/rules", {
        method: ruleId ? "PATCH" : "POST",
        json: values,
        schema: ruleSchema,
      });
      toast.success(ruleId ? "Regla guardada." : "Regla creada.");
      onSaved(saved);
    } catch (cause) {
      if (cause instanceof ApiError && cause.fieldErrors) setErrors(cause.fieldErrors);
      setFormError(cause instanceof Error ? cause.message : "No se ha podido guardar.");
    } finally {
      setSaving(false);
    }
  }

  const error = (name: string) =>
    errors[name]?.[0] && (
      <p id={`${id}-${name}-error`} className="text-sm text-destructive">
        {errors[name][0]}
      </p>
    );
  const described = (name: string) => (errors[name] ? `${id}-${name}-error` : undefined);

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor={`${id}-name`}>Nombre de la regla</Label>
          <Input
            id={`${id}-name`}
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={described("name")}
          />
          {error("name")}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-kind`}>Sensor (SI…)</Label>
          <select
            id={`${id}-kind`}
            className={selectClass}
            value={values.kind}
            onChange={(event) => set("kind", event.target.value)}
          >
            {RULE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {SENSOR_KINDS[kind].label} ({SENSOR_KINDS[kind].unit}) · {KIND_LABELS[kind].short}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-operator`}>Comparación</Label>
          <select
            id={`${id}-operator`}
            className={selectClass}
            value={values.operator}
            onChange={(event) => set("operator", event.target.value)}
          >
            {RULE_OPERATORS.map((operator) => (
              <option key={operator} value={operator}>
                {OPERATOR_LABELS[operator]}
              </option>
            ))}
          </select>
        </div>
        {FIELDS.map((field) => (
          <div key={field.name} className="flex flex-col gap-2">
            <Label htmlFor={`${id}-${field.name}`}>{field.label}</Label>
            <Input
              id={`${id}-${field.name}`}
              type="number"
              inputMode="decimal"
              step={field.step}
              value={String(values[field.name] ?? "")}
              onChange={(event) => set(field.name, event.target.value)}
              aria-invalid={Boolean(errors[field.name])}
              aria-describedby={described(field.name)}
            />
            {error(field.name)}
          </div>
        ))}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor={`${id}-notify`}>Avisar a (ENTONCES…)</Label>
          <Input
            id={`${id}-notify`}
            value={values.notify ?? ""}
            onChange={(event) => set("notify", event.target.value)}
            aria-describedby={`${id}-action`}
          />
          <p id={`${id}-action`} className="text-sm text-muted-foreground">
            Acción: {RULE_ACTIONS[values.kind as keyof typeof RULE_ACTIONS]}
          </p>
        </div>
      </div>
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Guardando…" : "Guardar regla"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** Pantalla de reglas: cada regla en lenguaje natural, con alta, edición, pausa y borrado. */
export function RulesPanel() {
  const { data, error, refetch, mutate } = useApi("/api/rules", ruleListSchema);
  const [editing, setEditing] = useState<string | "new" | null>(null);

  if (!data) {
    if (error) return <ErrorState message={error} onRetry={refetch} />;
    return <LoadingState label="Cargando reglas…" />;
  }

  const replace = (rule: Rule) =>
    mutate((current) => {
      const list = current ?? [];
      return list.some((r) => r.id === rule.id)
        ? list.map((r) => (r.id === rule.id ? rule : r))
        : [...list, rule];
    });

  async function toggle(rule: Rule) {
    try {
      replace(
        await fetchJson(`/api/rules/${rule.id}`, {
          method: "PATCH",
          json: { enabled: !rule.enabled },
          schema: ruleSchema,
        }),
      );
      toast.success(rule.enabled ? "Regla en pausa." : "Regla activada.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se ha podido guardar.");
    }
  }

  async function remove(rule: Rule) {
    if (!window.confirm(`¿Borrar la regla «${rule.name}»? No se puede deshacer.`)) return;
    try {
      await fetchJson(`/api/rules/${rule.id}`, { method: "DELETE" });
      mutate((current) => current?.filter((r) => r.id !== rule.id));
      toast.success("Regla borrada.");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "No se ha podido borrar.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {editing === "new" ? (
        <RuleForm
          initial={EMPTY}
          onSaved={(rule) => {
            replace(rule);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <Button className="w-fit" onClick={() => setEditing("new")}>
          <PlusIcon aria-hidden="true" />
          Nueva regla
        </Button>
      )}

      {data.length === 0 ? (
        <EmptyState title="No hay reglas" description="Crea la primera con «Nueva regla»." />
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((rule) => {
            const sentence = ruleSentence(rule);
            return (
              <li key={rule.id} className="flex flex-col gap-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-muted-foreground">{KIND_LABELS[rule.kind].title}</p>
                    <h2 className="font-semibold">{rule.name}</h2>
                  </div>
                  <Badge variant={rule.enabled ? "default" : "outline"}>
                    {rule.enabled ? "Activa" : "En pausa"}
                  </Badge>
                </div>
                <p className="font-mono text-sm leading-relaxed">
                  <strong>SI</strong> {sentence.condition}
                  <br />
                  <strong>ENTONCES</strong> {sentence.action}
                  {rule.notify && ` · avisar a ${rule.notify}`}
                  <br />
                  <span className="text-muted-foreground">
                    Un aviso por episodio; espera mínima entre avisos: {rule.cooldownMin} min.
                  </span>
                </p>
                {editing === rule.id ? (
                  <RuleForm
                    initial={rule}
                    ruleId={rule.id}
                    onSaved={(saved) => {
                      replace(saved);
                      setEditing(null);
                    }}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditing(rule.id)}>
                      <PencilIcon aria-hidden="true" />
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggle(rule)}>
                      {rule.enabled ? "Pausar" : "Activar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(rule)}>
                      <Trash2Icon aria-hidden="true" />
                      Borrar
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
