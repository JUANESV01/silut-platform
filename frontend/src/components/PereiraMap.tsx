import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export interface PuntoGeografico {
  barrio: string;
  comuna: string;
  total: number;
  lat: number;
  lng: number;
}

/**
 * Mapa interactivo de Pereira (OpenStreetMap + Leaflet) para el Dashboard Geográfico (ADM-05).
 */
export const PereiraMap: React.FC<{ puntos: PuntoGeografico[] }> = ({ puntos }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [4.8133, -75.6961], // Centro Cultural Lucy Tejada, Pereira
        zoom: 12,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Limpiar capas previas de marcadores
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    const maxTotal = Math.max(1, ...puntos.map((p) => p.total));

    puntos.forEach((p) => {
      const radius = 8 + Math.round((p.total / maxTotal) * 18);
      L.circleMarker([p.lat, p.lng], {
        radius,
        fillColor: '#B47B2B',
        color: '#1B365D',
        weight: 2,
        opacity: 0.95,
        fillOpacity: 0.72,
      })
        .bindPopup(
          `<div style="font-family:sans-serif">
            <strong style="color:#1B365D">${p.barrio}</strong><br/>
            <span style="color:#475569;font-size:12px">${p.comuna}</span><br/>
            <strong style="color:#B47B2B">${p.total} estudiante(s)</strong>
          </div>`,
        )
        .addTo(map);
    });

    return () => {
      // mantener mapa vivo entre renders hasta desmontaje
    };
  }, [puntos]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Mapa interactivo de distribución geográfica de estudiantes en Pereira"
      className="w-full h-[380px] rounded-2xl border border-slate-200 overflow-hidden z-10"
    />
  );
};
