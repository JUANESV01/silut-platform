import React from 'react';
import { Link } from 'react-router-dom';
import { Modal } from './Modal';

interface LegalModalProps {
  open: boolean;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ open, onClose }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Términos, Condiciones y Privacidad · SILUT"
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 className="font-semibold text-brand-navy text-base mb-1">
            1. Responsable del Tratamiento (Ley 1581 de 2012)
          </h3>
          <p>
            El <strong>Centro Cultural Lucy Tejada</strong> (Pereira, Colombia), mediante la
            plataforma <strong>SILUT</strong>, garantiza el tratamiento confidencial y exclusivo de
            los datos personales para la gestión académica, matrícula, asistencia, evaluación
            cualitativa y analítica institucional, conforme a la Ley 1581 de 2012 y el Decreto
            1377 de 2013.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-brand-navy text-base mb-1">
            2. Menores de Edad y Acudientes
          </h3>
          <p>
            El registro de menores de 18 años requiere autorización explícita de su representante
            legal o acudiente, bajo el principio del interés superior del menor.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-brand-navy text-base mb-1">
            3. Derechos del Titular y Seguridad
          </h3>
          <p>
            Puedes conocer, actualizar, rectificar o revocar tus datos personales en cualquier
            momento. SILUT cifra las contraseñas con <code>bcrypt</code>, protege el tráfico por
            HTTPS/TLS y registra trazabilidad segura sin exponer credenciales.
          </p>
        </section>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/terminos"
            onClick={onClose}
            className="text-xs font-semibold text-brand-navy hover:text-brand-gold underline"
          >
            Ver documento completo de Términos y Condiciones →
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-brand-navy text-white text-sm font-semibold hover:bg-brand-navy-dark transition"
          >
            Entendido
          </button>
        </div>
      </div>
    </Modal>
  );
};
