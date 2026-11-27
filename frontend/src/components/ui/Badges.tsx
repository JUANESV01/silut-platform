import React from 'react';
import { ConceptoEvaluacion, EstadoAsistencia } from '../../types';

export const ConceptoBadge: React.FC<{ concepto: ConceptoEvaluacion | string }> = ({
  concepto,
}) => {
  const styles: Record<string, string> = {
    SOBRESALIENTE: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    DESTACADO: 'bg-brand-navy-soft text-brand-navy ring-1 ring-inset ring-brand-navy/15',
    EN_PROCESO: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20',
    INICIAL: 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-500/15',
  };
  const labels: Record<string, string> = {
    SOBRESALIENTE: 'Sobresaliente',
    DESTACADO: 'Destacado',
    EN_PROCESO: 'En Proceso',
    INICIAL: 'Inicial',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
        styles[concepto] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {labels[concepto] || concepto}
    </span>
  );
};

export const AsistenciaBadge: React.FC<{ estado: EstadoAsistencia | string }> = ({
  estado,
}) => {
  const styles: Record<string, string> = {
    PRESENTE: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    AUSENTE: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
    EXCUSADO: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
        styles[estado] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {estado}
    </span>
  );
};

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  helper?: string;
  accent?: 'navy' | 'terracotta' | 'emerald' | 'amber';
  icon?: React.ReactNode;
}> = ({ label, value, helper, icon }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200/90 shadow-card p-5 transition-shadow hover:shadow-card-hover">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {icon && (
          <span className="text-gray-400" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2.5 text-2xl sm:text-[28px] font-semibold tracking-tight text-gray-900 tabular-nums leading-none">
        {value}
      </p>
      {helper && <p className="mt-2 text-xs text-gray-500">{helper}</p>}
    </div>
  );
};
