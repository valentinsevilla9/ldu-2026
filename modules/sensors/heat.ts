// Temperatura en la calle, anclada a un día real.
//
// Dato real: el 12 de agosto de 2025 fue el día más caluroso de 2025 en la serie de
// Open-Meteo (reanálisis ERA5), con 43,8 °C de máxima y 27,4 °C de mínima
// (public/data/abiertos/clima/diario.csv; un test comprueba que estas cifras coinciden).
//
// Hipótesis a validar (no hay dato horario ni por calle):
//  - la forma del día: mínima al amanecer (6:30) y máxima a media tarde (16:30);
//  - el recargo de calle: cada sensor suma de 0 a 3 °C sobre el valor de la cuadrícula,
//    porque ERA5 suaviza los extremos y no recoge la isla de calor. Medirlo es,
//    precisamente, para lo que sirven los sensores.

export const HEAT_DAY = { date: "2025-08-12", tmax: 43.8, tmin: 27.4 } as const;

export const STREET_SURCHARGE_MAX = 3;

const MIN_HOUR = 6.5;
const MAX_HOUR = 16.5;

/** Where the day is between its minimum (0) and its maximum (1) at a given hour. */
export function heatShare(hour: number): number {
  if (hour >= MIN_HOUR && hour <= MAX_HOUR) {
    return (1 - Math.cos((Math.PI * (hour - MIN_HOUR)) / (MAX_HOUR - MIN_HOUR))) / 2;
  }
  // Cooling from the afternoon maximum down to the next dawn minimum.
  const sinceMax = (hour - MAX_HOUR + 24) % 24;
  const coolingHours = 24 - (MAX_HOUR - MIN_HOUR);
  return (1 + Math.cos((Math.PI * sinceMax) / coolingHours)) / 2;
}

/** Grid temperature (°C) of the real day at a given hour, before the street surcharge. */
export function gridTemperature(hour: number): number {
  return HEAT_DAY.tmin + heatShare(hour) * (HEAT_DAY.tmax - HEAT_DAY.tmin);
}
