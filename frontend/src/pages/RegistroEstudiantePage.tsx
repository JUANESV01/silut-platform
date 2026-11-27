import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { BarrioPereira } from '../types';
import { LegalModal } from '../components/ui/LegalModal';

function calcularEdadCliente(fecha: string): number | null {
  if (!fecha) return null;
  const dob = new Date(fecha);
  if (isNaN(dob.getTime())) return null;
  const hoy = new Date();
  let age = hoy.getFullYear() - dob.getFullYear();
  const m = hoy.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < dob.getDate())) age--;
  return age;
}

export const RegistroEstudiantePage: React.FC = () => {
  const [barrios, setBarrios] = useState<BarrioPereira[]>([]);
  const [ciudades, setCiudades] = useState<string[]>(['Pereira']);
  const [legalOpen, setLegalOpen] = useState(false);

  const [form, setForm] = useState({
    tipoDocumento: 'CC',
    documento: '',
    nombres: '',
    apellidos: '',
    fechaNacimiento: '',
    genero: 'Femenino',
    telefono: '',
    correo: '',
    direccion: '',
    barrio: 'Centro',
    comuna: 'Comuna Centro',
    ciudadOrigen: 'Pereira',
    acudienteNombre: '',
    acudienteDocumento: '',
    acudienteTelefono: '',
    acudienteCorreo: '',
    acudienteParentesco: 'Madre / Padre',
    consentimientoDatos: false,
  });

  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{
    correo: string;
    claveTemporalDemo: string;
  } | null>(null);

  useEffect(() => {
    apiClient
      .get<{ barrios: BarrioPereira[]; ciudades: string[] }>('/estudiantes/catalogos/ubicacion')
      .then((res) => {
        setBarrios(res.data.barrios);
        setCiudades(res.data.ciudades);
      })
      .catch(() => undefined);
  }, []);

  const edad = useMemo(() => calcularEdadCliente(form.fechaNacimiento), [form.fechaNacimiento]);
  const esMenor = edad !== null && edad < 18;

  const handleBarrioChange = (barrioNombre: string) => {
    const match = barrios.find((b) => b.barrio === barrioNombre);
    setForm((prev) => ({
      ...prev,
      barrio: barrioNombre,
      comuna: match?.comuna || prev.comuna,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { data } = await apiClient.post('/estudiantes/registro', {
        ...form,
        acudienteCorreo: form.acudienteCorreo || undefined,
      });
      setResultado({
        correo: data.usuario.correo,
        claveTemporalDemo: data.claveTemporalDemo,
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'No se pudo completar el registro'));
    } finally {
      setEnviando(false);
    }
  };

  if (resultado) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-[#F6F7F9]">
        <div className="w-full max-w-lg silut-card p-8 space-y-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Registro completado en SILUT</h1>
              <p className="text-xs text-gray-500">Credenciales temporales generadas</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            Tus datos fueron registrados bajo la Ley 1581 de 2012. Al iniciar sesión por primera vez
            el sistema te solicitará definir tu contraseña personal.
          </p>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Usuario</span>
              <span className="font-mono font-medium text-gray-900">{resultado.correo}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Contraseña temporal</span>
              <span className="font-mono font-semibold text-brand-navy bg-white px-2 py-0.5 rounded border border-gray-200">
                {resultado.claveTemporalDemo}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Link to="/" className="silut-btn-secondary">
              Inicio
            </Link>
            <Link to="/login" className="silut-btn-primary">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#F6F7F9] py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto silut-card p-6 sm:p-10 space-y-8">
        <div className="border-b border-gray-100 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">Registro de Estudiante</h1>
          <p className="text-sm text-gray-500 mt-1">
            Completa tus datos para crear tu cuenta gratuita en SILUT e inscribirte en los programas
            del Centro Cultural Lucy Tejada.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold uppercase tracking-wider text-brand-gold mb-2">
              01 · Identificación y Contacto
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="reg-tipodoc" className="silut-label">Tipo documento *</label>
                <select
                  id="reg-tipodoc"
                  value={form.tipoDocumento}
                  onChange={(e) => setForm({ ...form, tipoDocumento: e.target.value })}
                  className="silut-select"
                >
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="TI">Tarjeta de Identidad</option>
                  <option value="RC">Registro Civil</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="PPT">Permiso Protección Temporal</option>
                </select>
              </div>
              <div>
                <label htmlFor="reg-doc" className="silut-label">Número de documento *</label>
                <input
                  id="reg-doc"
                  required
                  value={form.documento}
                  onChange={(e) => setForm({ ...form, documento: e.target.value })}
                  className="silut-input"
                />
              </div>
              <div>
                <label htmlFor="reg-dob" className="silut-label">
                  Fecha de nacimiento * {edad !== null && <span className="text-brand-navy">({edad} años)</span>}
                </label>
                <input
                  id="reg-dob"
                  type="date"
                  required
                  value={form.fechaNacimiento}
                  onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
                  className="silut-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-nombres" className="silut-label">Nombres *</label>
                <input
                  id="reg-nombres"
                  required
                  value={form.nombres}
                  onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                  className="silut-input"
                />
              </div>
              <div>
                <label htmlFor="reg-apellidos" className="silut-label">Apellidos *</label>
                <input
                  id="reg-apellidos"
                  required
                  value={form.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                  className="silut-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="reg-genero" className="silut-label">Género *</label>
                <select
                  id="reg-genero"
                  value={form.genero}
                  onChange={(e) => setForm({ ...form, genero: e.target.value })}
                  className="silut-select"
                >
                  <option value="Femenino">Femenino</option>
                  <option value="Masculino">Masculino</option>
                  <option value="No binario">No binario</option>
                  <option value="Prefiero no indicar">Prefiero no indicar</option>
                </select>
              </div>
              <div>
                <label htmlFor="reg-tel" className="silut-label">Teléfono celular *</label>
                <input
                  id="reg-tel"
                  required
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="silut-input"
                />
              </div>
              <div>
                <label htmlFor="reg-correo" className="silut-label">Correo electrónico *</label>
                <input
                  id="reg-correo"
                  type="email"
                  required
                  value={form.correo}
                  onChange={(e) => setForm({ ...form, correo: e.target.value })}
                  className="silut-input"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4 pt-6 border-t border-gray-100">
            <legend className="text-xs font-semibold uppercase tracking-wider text-brand-gold mb-2">
              02 · Residencia en Pereira y Origen
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-dir" className="silut-label">Dirección *</label>
                <input
                  id="reg-dir"
                  required
                  placeholder="Calle 21 # 8-45"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className="silut-input"
                />
              </div>
              <div>
                <label htmlFor="reg-barrio" className="silut-label">Barrio / Sector *</label>
                <select
                  id="reg-barrio"
                  value={form.barrio}
                  onChange={(e) => handleBarrioChange(e.target.value)}
                  className="silut-select"
                >
                  {barrios.map((b) => (
                    <option key={b.barrio} value={b.barrio}>
                      {b.barrio} ({b.comuna})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="reg-comuna" className="silut-label">Comuna / Corregimiento</label>
                <input
                  id="reg-comuna"
                  readOnly
                  value={form.comuna}
                  className="silut-input bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="reg-ciudad" className="silut-label">Ciudad de origen *</label>
                <select
                  id="reg-ciudad"
                  value={form.ciudadOrigen}
                  onChange={(e) => setForm({ ...form, ciudadOrigen: e.target.value })}
                  className="silut-select"
                >
                  {ciudades.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {esMenor && (
            <fieldset className="rounded-xl border border-amber-200 bg-brand-gold-soft p-5 space-y-4">
              <legend className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900">
                <ShieldAlert className="w-4 h-4 text-brand-gold" />
                03 · Representante Legal / Acudiente (Menor de edad · Ley 1581)
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="acu-nombre" className="silut-label">Nombre del acudiente *</label>
                  <input
                    id="acu-nombre"
                    required={esMenor}
                    value={form.acudienteNombre}
                    onChange={(e) => setForm({ ...form, acudienteNombre: e.target.value })}
                    className="silut-input"
                  />
                </div>
                <div>
                  <label htmlFor="acu-doc" className="silut-label">Documento del acudiente *</label>
                  <input
                    id="acu-doc"
                    required={esMenor}
                    value={form.acudienteDocumento}
                    onChange={(e) => setForm({ ...form, acudienteDocumento: e.target.value })}
                    className="silut-input"
                  />
                </div>
                <div>
                  <label htmlFor="acu-tel" className="silut-label">Teléfono del acudiente *</label>
                  <input
                    id="acu-tel"
                    required={esMenor}
                    value={form.acudienteTelefono}
                    onChange={(e) => setForm({ ...form, acudienteTelefono: e.target.value })}
                    className="silut-input"
                  />
                </div>
                <div>
                  <label htmlFor="acu-parentesco" className="silut-label">Parentesco</label>
                  <input
                    id="acu-parentesco"
                    value={form.acudienteParentesco}
                    onChange={(e) => setForm({ ...form, acudienteParentesco: e.target.value })}
                    className="silut-input"
                  />
                </div>
              </div>
            </fieldset>
          )}

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-gray-600 leading-relaxed">
              <input
                type="checkbox"
                required
                checked={form.consentimientoDatos}
                onChange={(e) => setForm({ ...form, consentimientoDatos: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-navy"
              />
              <span>
                Autorizo de forma expresa al{' '}
                <strong className="text-gray-900">Centro Cultural Lucy Tejada</strong> para el
                tratamiento de los datos personales suministrados
                {esMenor ? ' en calidad de representante legal del menor' : ''}, de acuerdo con la{' '}
                <strong className="text-gray-900">Ley 1581 de 2012</strong> y los{' '}
                <button
                  type="button"
                  onClick={() => setLegalOpen(true)}
                  className="font-semibold text-brand-navy underline"
                >
                  Términos, Condiciones y Política de Privacidad
                </button>
                . *
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Link to="/login" className="text-xs font-medium text-gray-600 hover:text-brand-navy">
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
            <button type="submit" disabled={enviando} className="silut-btn-primary h-11 px-6">
              {enviando ? 'Registrando...' : 'Completar registro'}
            </button>
          </div>
        </form>

        <LegalModal open={legalOpen} onClose={() => setLegalOpen(false)} />
      </div>
    </div>
  );
};
