/**
 * Catálogo cerrado de comunas y barrios reales de Pereira (Risaralda)
 * con coordenadas aproximadas para el Dashboard Geográfico (ADM-05)
 * y mitigación del riesgo R16 (direcciones y barrios normalizados).
 */
export interface BarrioPereira {
  barrio: string;
  comuna: string;
  lat: number;
  lng: number;
}

export const BARRIOS_PEREIRA: BarrioPereira[] = [
  { barrio: 'Centro', comuna: 'Comuna Centro', lat: 4.8143, lng: -75.6946 },
  { barrio: 'Lago Uribe', comuna: 'Comuna Centro', lat: 4.8112, lng: -75.6928 },
  { barrio: 'Los Álamos', comuna: 'Comuna Universidad', lat: 4.7978, lng: -75.6894 },
  { barrio: 'Pinares', comuna: 'Comuna Universidad', lat: 4.8054, lng: -75.6862 },
  { barrio: 'La Julita', comuna: 'Comuna Universidad', lat: 4.7924, lng: -75.6911 },
  { barrio: 'Boston', comuna: 'Comuna Boston', lat: 4.8076, lng: -75.7024 },
  { barrio: 'El Jardín', comuna: 'Comuna El Jardín', lat: 4.8032, lng: -75.7082 },
  { barrio: 'Cuba', comuna: 'Comuna Cuba', lat: 4.8065, lng: -75.7368 },
  { barrio: 'San Fernando', comuna: 'Comuna Cuba', lat: 4.8041, lng: -75.7412 },
  { barrio: 'El Oso', comuna: 'Comuna El Oso', lat: 4.8122, lng: -75.7456 },
  { barrio: 'Perla del Otún', comuna: 'Comuna Perla del Otún', lat: 4.8012, lng: -75.7485 },
  { barrio: 'Consota', comuna: 'Comuna Consota', lat: 4.8085, lng: -75.7244 },
  { barrio: 'Villa Olímpica', comuna: 'Comuna Olímpica', lat: 4.8129, lng: -75.7192 },
  { barrio: 'El Poblado I y II', comuna: 'Comuna El Poblado', lat: 4.7945, lng: -75.7061 },
  { barrio: 'Samaria', comuna: 'Comuna El Poblado', lat: 4.7902, lng: -75.7095 },
  { barrio: 'Villa Santana', comuna: 'Comuna Villa Santana', lat: 4.8185, lng: -75.6762 },
  { barrio: 'Las Brisas', comuna: 'Comuna Villa Santana', lat: 4.8211, lng: -75.6738 },
  { barrio: 'Villavicencio', comuna: 'Comuna Villavicencio', lat: 4.8205, lng: -75.6878 },
  { barrio: 'Kennedy', comuna: 'Comuna Oriente', lat: 4.8174, lng: -75.6835 },
  { barrio: 'San Nicolás', comuna: 'Comuna San Nicolás', lat: 4.8168, lng: -75.7052 },
  { barrio: 'El Rocío', comuna: 'Comuna El Rocío', lat: 4.7975, lng: -75.7145 },
  { barrio: 'Parque Industrial', comuna: 'Comuna Café', lat: 4.8098, lng: -75.7554 },
  { barrio: 'Cerritos', comuna: 'Corregimiento Cerritos', lat: 4.8089, lng: -75.8142 },
  { barrio: 'Dosquebradas (Área Met.)', comuna: 'Área Metropolitana', lat: 4.8364, lng: -75.6725 },
  { barrio: 'Santa Rosa de Cabal', comuna: 'Área Metropolitana', lat: 4.8682, lng: -75.6215 },
];

export const CIUDADES_ORIGEN: string[] = [
  'Pereira',
  'Dosquebradas',
  'Santa Rosa de Cabal',
  'La Virginia',
  'Marsella',
  'Chinchiná',
  'Manizales',
  'Armenia',
  'Cartago',
  'Cali',
  'Medellín',
  'Bogotá',
  'Otra',
];

export function findBarrioCoords(barrio?: string): BarrioPereira | undefined {
  if (!barrio) return undefined;
  const normalized = barrio.trim().toLowerCase();
  return BARRIOS_PEREIRA.find(
    (b) => b.barrio.toLowerCase() === normalized || b.comuna.toLowerCase() === normalized,
  );
}
