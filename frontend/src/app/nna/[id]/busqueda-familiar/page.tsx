"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/lib/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { api, type Familiar, type NNA, type NotificacionFamiliar, type ProcesoDespejeFamiliar } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StepperNav } from "./_components/stepper-nav";
import { Step1Informe } from "./_components/step-1-informe";
import { Step2Identificar } from "./_components/step-2-identificar";
import { Step3Cartas } from "./_components/step-3-cartas";

export default function BusquedaFamiliarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const sp = use(searchParams);
  const idCaso = typeof sp.id_caso === "string" ? sp.id_caso : undefined;
  const [nna, setNna] = useState<NNA | null>(null);
  const [despeje, setDespeje] = useState<ProcesoDespejeFamiliar | null>(null);
  const [notificaciones, setNotificaciones] = useState<NotificacionFamiliar[]>([]);
  const [familiares, setFamiliares] = useState<Familiar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);

  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [nnaData, famList] = await Promise.all([
        api.nna.get(id),
        api.familiares.list(),
      ]);
      setNna(nnaData);
      setFamiliares(famList);

      try {
        const des = await api.despeje.getByNna(id, idCaso);
        setDespeje(des);

        if (des.fecha_recepcion_informe) {
          const notifs = await api.notificacion.list(des.id_despeje);
          setNotificaciones(notifs);
          if (notifs.length > 0) {
            setActiveStep(3);
          } else {
            setActiveStep(2);
          }
        } else {
          setActiveStep(1);
        }
      } catch {
        setActiveStep(1);
      }
    if (idCaso) setIsClosed((await api.casos.get(idCaso)).estado === "Cerrado");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, idCaso]);

  const getFamiliarNombre = (idFamiliar: string) => {
    const f = familiares.find((x) => x.id_familiar === idFamiliar);
    return f?.nombre || idFamiliar;
  };

  const handleRegistrarSolicitud = async (fecha: string) => {
    if (isClosed) return;
    setActionSaving(true);
    setActionError(null);
    try {
      const created = await api.despeje.create(id, {
        fecha_solicitud_informe: fecha,
        estado: "Pendiente Informe",
      } as any);
      setDespeje(created);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionSaving(false);
    }
  };

  const handleRegistrarRecepcion = async (fecha: string, url: string) => {
    if (isClosed || !despeje) return;
    setActionSaving(true);
    setActionError(null);
    try {
      const updated = await api.despeje.update(despeje.id_despeje, {
        fecha_recepcion_informe: fecha,
        url_informe_hijo: url,
        estado: "En Notificación",
      } as any);
      setDespeje(updated);
      setActiveStep(2);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionSaving(false);
    }
  };

  const handleAsociarFamiliarExistente = async (familiarId: string) => {
    if (isClosed || !despeje) return;
    setActionSaving(true);
    try {
      const created = await api.notificacion.create(despeje.id_despeje, {
        id_familiar: familiarId,
      } as any);
      setNotificaciones((prev) => [...prev, created]);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionSaving(false);
    }
  };

  const handleCrearYAsociarFamiliar = async (familiar: Familiar, parentesco: string) => {
    if (isClosed || !despeje) return;
    setActionSaving(true);
    try {
      const created = await api.notificacion.create(despeje.id_despeje, {
        id_familiar: familiar.id_familiar,
        observacion: parentesco ? `Parentesco declarado: ${parentesco}` : "",
      } as any);

      await api.vinculoFamiliar.create(id, {
        id_familiar: familiar.id_familiar,
        parentesco: parentesco || null,
      });

      setFamiliares((prev) => [...prev, familiar]);
      setNotificaciones((prev) => [...prev, created]);
    } catch (e: any) {
      setActionError(e.message);
    } finally {
      setActionSaving(false);
    }
  };

  const handleFinalizarIdentificacion = () => {
    if (notificaciones.length > 0) {
      setActiveStep(3);
    }
  };

  const handleActualizarCarta = async (
    idNotif: string,
    payload: Partial<NotificacionFamiliar>
  ) => {
    if (isClosed) return;
    try {
      const updated = await api.notificacion.update(idNotif, payload as any);
      setNotificaciones((prev) => prev.map((x) => x.id_notificacion === idNotif ? updated : x));
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner className="size-8" /></div>;
  if (error || !nna) return <div className="max-w-4xl mx-auto px-4 py-8"><p className="text-destructive font-medium">{error || "NNA no encontrado"}</p></div>;

  const familiaresDisponibles = familiares.filter(
    (f) => !notificaciones.some((n) => n.id_familiar === f.id_familiar)
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href={`/nna/${id}${idCaso ? `?id_caso=${idCaso}` : ""}`} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" /> Volver al resumen del niño
        </Link>
      </Button>

      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{nna.nombre}</h1>
          <p className="text-sm text-muted-foreground">RUT: {nna.run || "—"} • Proceso Judicial de Búsqueda Familiar</p>
        </div>
      </div>

      <StepperNav
        activeStep={activeStep}
        onStep={setActiveStep}
        hasInforme={!!despeje?.fecha_recepcion_informe}
        hasNotificaciones={notificaciones.length > 0}
      />

      {activeStep === 1 && (
        <Step1Informe
          despeje={despeje}
          saving={actionSaving}
          error={actionError}
          onRegistrarSolicitud={handleRegistrarSolicitud}
          onRegistrarRecepcion={handleRegistrarRecepcion}
          onIrPaso2={() => setActiveStep(2)}
        />
      )}

      {activeStep === 2 && (
        <Step2Identificar
          nnaId={id}
          notificaciones={notificaciones}
          familiaresDisponibles={familiaresDisponibles}
          getFamiliarNombre={getFamiliarNombre}
          saving={actionSaving}
          onAsociarExistente={handleAsociarFamiliarExistente}
          onCrearYAsociar={handleCrearYAsociarFamiliar}
          onFinalizar={handleFinalizarIdentificacion}
          onVolver={() => setActiveStep(1)}
        />
      )}

      {activeStep === 3 && (
        <Step3Cartas
          nnaId={id}
          notificaciones={notificaciones}
          getFamiliarNombre={getFamiliarNombre}
          onUpdateCarta={handleActualizarCarta}
          onVolver={() => setActiveStep(2)}
          onAgregarFamiliar={() => setActiveStep(2)}
        />
      )}
    </div>
  );
}
