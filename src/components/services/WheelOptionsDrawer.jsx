import * as React from "react";
import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, Info, AlertTriangle, CheckCircle2 } from "lucide-react";

// shadcn/ui – ajusta imports a tu setup
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

// ───────────────────────────────────────────────────────────────────────────────
// 1) Esquema & Tipos
// ───────────────────────────────────────────────────────────────────────────────
/** @typedef {"car" | "suv"} VehicleType */ // puedes ampliar: "truck", "industrial", "moto"

const formSchema = z.object({
  pinchazo: z.boolean().default(false),                 // si es pinchazo reemplaza "cambio"
  wheels: z.number().int().refine(v => [1,2,4].includes(v), "Elige 1, 2 o 4 ruedas"),
  equilibrado: z.boolean().default(false),              // marcar equilibrado
  equilibradoCount: z.number().int().optional(),        // nº ruedas a equilibrar (si se marca)
  alineado: z.boolean().default(false),                 // alineado eje/dirección
});

/** @typedef {z.infer<typeof formSchema>} FormValues */ // Tipo inferido de Zod

/**
 * @typedef {Object} Props
 * @property {boolean} isOpen
 * @property {() => void} onClose
 * @property {string} [serviceName]
 * @property {VehicleType} [vehicleType]
 * @property {Partial<FormValues>} [defaultValues] // Valores por defecto para el formulario
 * @property {(payload: { values: FormValues; estimateMinutes: number; breakdown: string[]; }) => void} [onSubmitSuccess]
 */

// ───────────────────────────────────────────────────────────────────────────────
// 2) Reglas de taller (de tu tabla guardada en memoria)
//    Aplicamos “regla de deslizador” y tiempos NO lineales por tipo/ruedas
// ───────────────────────────────────────────────────────────────────────────────
const RULES = {
  car: {
    change: { 1: 15, 2: 25, 4: 50 },        // minutos
    puncture: 20,
    balanceByWheels: { 1: 10, 2: 20, 4: 35 }, // +min (nota: 4 no es 40, es 35)
    alignment: 20,
  },
  suv: {
    change: { 1: 25, 2: 50, 4: 90 },
    puncture: 30, // minutos
    balanceByWheels: { 1: 12, 2: 20, 4: 30 },
    alignment: 25,
  },
};

function clampEquilibradoCount(wheels, v) {
  const allowed = [1,2,4].slice(0, [1,2,4].indexOf(wheels)+1); // simplificado
  // garantizamos que equilibradoCount ∈ {1,2,4} y ≤ wheels
  const candidate = [1,2,4].filter(n => n <= wheels);
  const fallback = candidate[candidate.length - 1] ?? wheels;
  return candidate.includes(v) ? v : fallback;
}

function computeEstimate(
  vehicleType, //: VehicleType,
  v //: FormValues
) { //: { minutes: number; breakdown: string[] } {
  const rules = RULES[vehicleType ?? "car"];
  const bd: string[] = [];

  let total = 0;

  if (v.pinchazo) {
    total += rules.puncture;
    bd.push(`Pinchazo: ${rules.puncture}′`); // Minutos
  } else {
    const base = rules.change[v.wheels]; // as 1|2|4];
    total += base;
    bd.push(`Cambio (${v.wheels} rueda${v.wheels>1 ? "s":""}): ${base}′`);
  }

  if (v.equilibrado) {
    const eqCount = clampEquilibradoCount(v.wheels, v.equilibradoCount); // as 1|2|4, v.equilibradoCount);
    const extra = rules.balanceByWheels[eqCount]; // as 1|2|4];
    total += extra;
    bd.push(`Equilibrado (${eqCount}): +${extra}′`);
  }

  if (v.alineado) {
    total += rules.alignment;
    bd.push(`Alineación: +${rules.alignment}′`);
  }

  return { minutes: total, breakdown: bd }; // Retorna el tiempo total y el desglose
}

// ─────────────────────────────────────────────────────────────────────────────── //
// 3) UI Helpers
// ───────────────────────────────────────────────────────────────────────────────
function Section({ title, subtitle, children }: React.PropsWithChildren<{title:string; subtitle?:string;}>) {
  return (
    <section className="rounded-2xl border bg-white/60 backdrop-blur p-4 md:p-5">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function ConfigureWheelsSheet({
  isOpen, //: boolean,
  onClose, //: () => void,
  serviceName = "Cambio de neumáticos", //: string,
  vehicleType = "car", //: VehicleType,
  defaultValues, //: Partial<FormValues>,
  onSubmitSuccess, //: (payload: { values: FormValues; estimateMinutes: number; breakdown: string[]; }) => void,
}) { //: Props) {
  // @ts-ignore
  const {
    control, handleSubmit, watch, setValue, formState: { errors, isValid, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      pinchazo: false,
      wheels: 2,
      equilibrado: false,
      equilibradoCount: 2,
      alineado: false,
      ...defaultValues,
    },
  });

  // Cálculo en vivo (debounce ligero si quisieras)
  const values = watch(); // as FormValues;
  const { minutes, breakdown } = useMemo(
    () => computeEstimate(vehicleType, values), // as FormValues),
    [vehicleType, values]
  );

  // Ajuste UX: si se marca "pinchazo", bloqueamos nº ruedas del cambio
  const isPuncture = values.pinchazo; // boolean
  useEffect(() => {
    if (isPuncture) {
      // Para evitar inconsistencias visuales con slider
      setValue("equilibrado", false, { shouldValidate: true });
      setValue("alineado", false, { shouldValidate: true });
    }
  }, [isPuncture, setValue]);

  // Submit
  const onSubmit = (data) => { //: FormValues) => {
    const result = computeEstimate(vehicleType, data);
    onSubmitSuccess?.({ values: data, estimateMinutes: result.minutes, breakdown: result.breakdown });
    onClose();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-w-lg mx-auto w-full">
        <SheetHeader>
          <SheetTitle>Configurar Ruedas</SheetTitle>
          <SheetDescription>{serviceName}</SheetDescription>
        </SheetHeader>
      <div className="flex flex-col h-full">
        {/* FORM */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-32"
        >
          {/* Modalidad */}
          <Section
            title="Modalidad del servicio"
            subtitle="Si es pinchazo, sustituye al cambio de neumáticos y desactiva extras."
          >
            <Controller
              name="pinchazo"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch id="pinchazo" checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor="pinchazo" className="cursor-pointer">Es un pinchazo (reemplaza cambio)</Label>
                  </div>
                  <span className="text-xs text-gray-500">Vehículo: {vehicleType === "car" ? "Turismo" : "4x4/SUV"}</span>
                </div>
              )}
            />
          </Section>

          {/* Ruedas (solo si NO es pinchazo) */}
          <Section title="Ruedas" subtitle="Elige cuántas ruedas se cambian.">
            <div className={`opacity-100 transition ${isPuncture ? "pointer-events-none opacity-50" : ""}`}>
              <Controller
                name="wheels"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Label id="wheels-label" className="text-sm">Nº de Ruedas: {field.value}</Label>
                    <Slider
                      aria-labelledby="wheels-label"
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                      step={1}
                      min={1}
                      max={4}
                      // Para saltar 1→2→4, “simulamos” escalones: 1,2,4 (3 se salta)
                      onPointerUp={() => {
                        // Snap a 1,2,4
                        const snap = field.value <= 1 ? 1 : field.value <= 2 ? 2 : 4;
                        field.onChange(snap);
                        // Ajusta equilibradoCount para no superar wheels // as 1|2|4, values.equilibradoCount), { shouldValidate: true });
                        setValue("equilibradoCount", clampEquilibradoCount(snap, values.equilibradoCount), { shouldValidate: true });
                      }}
                    />
                    <p className="text-xs text-gray-500">Valores válidos: 1, 2 o 4. Se aplica la tabla de tiempos (no suma lineal).</p>
                  </div>
                )}
              />
              {errors.wheels && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> {errors.wheels.message}
                </p>
              )}
            </div>
          </Section>

          {/* Extras */}
          <Section title="Extras" subtitle="Opcional. El precio/tiempo puede variar.">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isPuncture ? "pointer-events-none opacity-50" : ""}`}>
              <Controller
                name="equilibrado"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-xl border p-3">
                    <div className="flex items-center gap-2">
                      <Switch id="equilibrado" checked={field.value} onCheckedChange={(v) => {
                        field.onChange(v);
                        if (v) {
                          const snap = clampEquilibradoCount(values.wheels, values.equilibradoCount); // as 1|2|4), values.equilibradoCount);
                          setValue("equilibradoCount", snap, { shouldValidate: true });
                        }
                      }} />
                      <Label htmlFor="equilibrado">Equilibrado</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      {values.equilibrado && (
                        <>
                          <span className="text-xs text-gray-500">Ruedas:</span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            className="h-8 w-16"
                            min={1} // min 1
                            max={values.wheels} // max wheels
                            step={1}
                            value={clampEquilibradoCount(values.wheels, values.equilibradoCount)} // as 1|2|4, values.equilibradoCount)}
                            onChange={(e) => {
                              const raw = Number(e.target.value || 0);
                              // “Snap” a 1,2,4 sin sobrepasar wheels
                              const snap = [1,2,4].reduce((acc, n) => (n<=values.wheels && Math.abs(n-raw)<Math.abs(acc-raw) ? n : acc), 1);
                              setValue("equilibradoCount", snap, { shouldValidate: true });
                            }}
                            aria-label="Nº de ruedas a equilibrar"
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}
              />

              <Controller
                name="alineado"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center justify-between rounded-xl border p-3">
                    <div className="flex items-center gap-2">
                      <Switch id="alineado" checked={field.value} onCheckedChange={field.onChange} />
                      <Label htmlFor="alineado">Alineación</Label>
                    </div>
                    <span className="text-xs text-gray-500">+{vehicleType === "car" ? RULES.car.alignment : RULES.suv.alignment}′</span>
                  </div>
                )}
              />
            </div>
          </Section>

          {/* Panel cálculo */}
          <Section title="Tiempo estimado" subtitle="Se calcula automáticamente con las reglas del taller.">
            <div
              className="flex items-start gap-3 rounded-xl border bg-gray-50 p-3"
              role="status"
              aria-live="polite"
            >
              <Clock className="mt-0.5 h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {isSubmitting ? "Calculando…" : `${minutes} minutos (estimado)`}
                </p>
                <ul className="mt-1 text-xs text-gray-600 list-disc pl-4 space-y-0.5">
                  {breakdown.map((b, i) => (<li key={i}>{b}</li>))}
                </ul>
              </div>
            </div>
            <p className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="h-4 w-4" />
              El tiempo es orientativo y puede variar según estado del vehículo y esperas en taller.
            </p>
          </Section>
        </form>

        {/* FOOTER pegajoso */}
        <footer className="p-4 md:p-5 border-t bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 fixed bottom-0 left-0 right-0 md:static">
          <div className="mx-auto max-w-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-semibold">Tiempo estimado:</span>
              </div>
              <div className="text-lg font-bold text-blue-700 tabular-nums">
                {minutes ? `${minutes} min` : "Calculando…"}
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!minutes || isSubmitting}
              onClick={handleSubmit(onSubmit)}
            >
              {isSubmitting ? "Guardando..." : "Continuar"}
            </Button>
            <p className="mt-2 text-[11px] text-gray-500 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Podrás revisar los detalles antes de confirmar la reserva.
            </p>
          </div>
        </footer>
      </div>
      </SheetContent>
    </Sheet>
  );
}
