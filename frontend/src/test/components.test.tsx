import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConceptoBadge, StatCard } from '../components/ui/Badges';
import { SilutLogo } from '../components/ui/SilutLogo';
import { TerminosCondicionesPage } from '../pages/TerminosCondicionesPage';

describe('SILUT - Identidad visual, accesibilidad y componentes UI', () => {
  it('renderiza el logotipo oficial de SILUT con subtítulo institucional', () => {
    render(<SilutLogo variant="full" />);
    expect(screen.getByText('SILUT')).toBeInTheDocument();
    expect(screen.getByText('Centro Cultural Lucy Tejada')).toBeInTheDocument();
  });

  it('renderiza etiquetas de evaluación cualitativa y tarjetas KPI correctamente', () => {
    render(
      <>
        <ConceptoBadge concepto="SOBRESALIENTE" />
        <StatCard label="Estudiantes registrados" value={35} helper="Periodo 2026-2" />
      </>,
    );
    expect(screen.getByText('Sobresaliente')).toBeInTheDocument();
    expect(screen.getByText('Estudiantes registrados')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
  });

  it('renderiza la página pública de Términos y Condiciones (Ley 1581 de 2012)', () => {
    render(
      <MemoryRouter>
        <TerminosCondicionesPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Términos y Condiciones de Uso y Política de Tratamiento de Datos/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Ley Estatutaria 1581 de 2012/i).length).toBeGreaterThan(0);
  });
});
