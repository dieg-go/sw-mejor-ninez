import { describe, expect, it } from "vitest";

import { diasDesde, getAlertaResumen } from "@/app/nna/[id]/_components/utils";
import type { NotificacionFamiliar } from "@/lib/api";

/**
 * Las alertas del proceso de despeje se calculan a partir de los dias
 * transcurridos: naranja a los 30 dias sin enviar la 2a carta, roja a los 15
 * dias de la 2a carta sin respuesta, verde si algun familiar acepta evaluacion.
 */

function iso(haceDias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - haceDias);
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function notificacion(campos: Partial<NotificacionFamiliar>): NotificacionFamiliar {
  return {
    id_notificacion: "n-1",
    id_despeje: "d-1",
    id_familiar: "f-1",
    fecha_envio_carta_1: null,
    codigo_seguimiento_1: null,
    estado_entrega_1: null,
    fecha_recepcion_carta_1: null,
    fecha_envio_carta_2: null,
    codigo_seguimiento_2: null,
    estado_entrega_2: null,
    fecha_recepcion_carta_2: null,
    resultado_contacto: null,
    fecha_respuesta: null,
    observacion: null,
    ...campos,
  };
}

describe("diasDesde", () => {
  it("devuelve null sin fecha", () => {
    expect(diasDesde(null)).toBeNull();
  });

  it("devuelve 0 para hoy", () => {
    expect(diasDesde(iso(0))).toBe(0);
  });

  it("cuenta los dias transcurridos", () => {
    expect(diasDesde(iso(1))).toBe(1);
    expect(diasDesde(iso(30))).toBe(30);
    expect(diasDesde(iso(365))).toBe(365);
  });

  it("devuelve un numero negativo para una fecha futura", () => {
    expect(diasDesde(iso(-5))).toBe(-5);
  });

  it("interpreta la fecha en horario local", () => {
    // Sin el sufijo T00:00:00 la fecha se leeria como UTC y en Chile el
    // resultado cambiaria de dia.
    const hoy = iso(0);
    expect(diasDesde(hoy)).toBe(0);
  });
});

describe("getAlertaResumen", () => {
  it("sin notificaciones no hay alerta", () => {
    expect(getAlertaResumen([])).toBeNull();
  });

  it("verde si algun familiar acepta la evaluacion", () => {
    const notifs = [
      notificacion({ resultado_contacto: "Acepta evaluación", fecha_envio_carta_1: iso(60) }),
    ];
    expect(getAlertaResumen(notifs)).toBe("verde");
  });

  it("verde gana sobre una alerta roja de otro familiar", () => {
    const notifs = [
      notificacion({ fecha_envio_carta_1: iso(50), fecha_envio_carta_2: iso(40) }),
      notificacion({ resultado_contacto: "Acepta evaluación" }),
    ];
    expect(getAlertaResumen(notifs)).toBe("verde");
  });

  it("verde gana aunque el verde aparezca despues", () => {
    const notifs = [
      notificacion({ id_notificacion: "a", resultado_contacto: "Acepta evaluación" }),
      notificacion({ id_notificacion: "b", fecha_envio_carta_1: iso(50), fecha_envio_carta_2: iso(40) }),
    ];
    expect(getAlertaResumen(notifs)).toBe("verde");
  });

  it("roja a los 15 dias o mas de la segunda carta sin respuesta", () => {
    const notifs = [notificacion({ fecha_envio_carta_1: iso(60), fecha_envio_carta_2: iso(20) })];
    expect(getAlertaResumen(notifs)).toBe("roja");
  });

  it("roja en el limite exacto de 15 dias", () => {
    const notifs = [notificacion({ fecha_envio_carta_1: iso(60), fecha_envio_carta_2: iso(15) })];
    expect(getAlertaResumen(notifs)).toBe("roja");
  });

  it("no es roja con 14 dias de la segunda carta", () => {
    const notifs = [notificacion({ fecha_envio_carta_1: iso(60), fecha_envio_carta_2: iso(14) })];
    expect(getAlertaResumen(notifs)).toBeNull();
  });

  it("naranja a los 30 dias o mas de la primera carta sin segunda", () => {
    const notifs = [notificacion({ fecha_envio_carta_1: iso(35) })];
    expect(getAlertaResumen(notifs)).toBe("naranja");
  });

  it("naranja en el limite exacto de 30 dias", () => {
    const notifs = [notificacion({ fecha_envio_carta_1: iso(30) })];
    expect(getAlertaResumen(notifs)).toBe("naranja");
  });

  it("no es naranja con 29 dias de la primera carta", () => {
    const notifs = [notificacion({ fecha_envio_carta_1: iso(29) })];
    expect(getAlertaResumen(notifs)).toBeNull();
  });

  it("no hay alerta si la primera carta se envio hace poco", () => {
    const notifs = [notificacion({ fecha_envio_carta_1: iso(3) })];
    expect(getAlertaResumen(notifs)).toBeNull();
  });

  it("una segunda carta reciente desactiva la alerta naranja", () => {
    const notifs = [notificacion({ fecha_envio_carta_1: iso(100), fecha_envio_carta_2: iso(2) })];
    expect(getAlertaResumen(notifs)).toBeNull();
  });

  it("roja gana sobre naranja de otro familiar", () => {
    const notifs = [
      notificacion({ id_notificacion: "a", fecha_envio_carta_1: iso(35) }),
      notificacion({ id_notificacion: "b", fecha_envio_carta_1: iso(60), fecha_envio_carta_2: iso(20) }),
    ];
    expect(getAlertaResumen(notifs)).toBe("roja");
  });

  it("roja gana sobre naranja aunque el naranja aparezca primero", () => {
    const notifs = [
      notificacion({ id_notificacion: "a", fecha_envio_carta_1: iso(60), fecha_envio_carta_2: iso(20) }),
      notificacion({ id_notificacion: "b", fecha_envio_carta_1: iso(35) }),
    ];
    expect(getAlertaResumen(notifs)).toBe("roja");
  });

  it("un familiar con resultado de contacto distinto de aceptar se ignora", () => {
    const notifs = [
      notificacion({
        resultado_contacto: "No responde",
        fecha_envio_carta_1: iso(100),
        fecha_envio_carta_2: iso(90),
      }),
    ];
    expect(getAlertaResumen(notifs)).toBeNull();
  });

  it("un familiar que rechaza participacion no genera alerta", () => {
    const notifs = [notificacion({ resultado_contacto: "Rechaza participación" })];
    expect(getAlertaResumen(notifs)).toBeNull();
  });

  it("un familiar fallecido se ignora", () => {
    const notifs = [
      notificacion({ resultado_contacto: "Fallecido", fecha_envio_carta_1: iso(200) }),
    ];
    expect(getAlertaResumen(notifs)).toBeNull();
  });

  it("una notificacion sin ninguna carta no alerta", () => {
    expect(getAlertaResumen([notificacion({})])).toBeNull();
  });

  it("combina varios familiares sin alerta en null", () => {
    const notifs = [
      notificacion({ id_notificacion: "a", fecha_envio_carta_1: iso(5) }),
      notificacion({ id_notificacion: "b" }),
      notificacion({ id_notificacion: "c", resultado_contacto: "No responde" }),
    ];
    expect(getAlertaResumen(notifs)).toBeNull();
  });
});
