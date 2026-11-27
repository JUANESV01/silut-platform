import { MigracionService } from './migracion.service';

describe('MigracionService (Alcaldía de Pereira / R05)', () => {
  const mockRepo = (data: any[] = []) => ({
    find: jest.fn().mockResolvedValue(data),
    findOne: jest.fn(),
    save: jest.fn((x) => Promise.resolve({ id: 'id-1', ...x })),
    create: jest.fn((x) => x),
    count: jest.fn().mockResolvedValue(0),
  });

  it('valida filas CSV, detecta duplicados, menores sin acudiente y calcula alerta R05 (>2%)', async () => {
    const service = new MigracionService(
      mockRepo([{ documento: '1088999999' }]) as any,
      mockRepo([{ correo: 'dup@correo.com' }]) as any,
      mockRepo() as any,
      mockRepo() as any,
      mockRepo() as any,
      { emit: jest.fn() } as any,
      { delByPrefix: jest.fn() } as any,
    );

    const csv = [
      'tipo_documento,documento,nombres,apellidos,fecha_nacimiento,genero,telefono,correo,direccion,barrio,ciudad_origen,programa,acudiente_nombre,acudiente_documento,acudiente_telefono',
      'CC,1088111111,Laura,Mejía,2000-02-10,Femenino,3105551111,laura@correo.com,Cra 7,Centro,Pereira,Danza,,,',
      'CC,1088999999,Carlos,Dup,1999-01-01,Masculino,3105552222,dup@correo.com,Cra 8,Cuba,Pereira,Teatro,,,',
      'TI,1088333333,Niño,SinAcudiente,2014-06-15,Masculino,3105553333,nino@correo.com,Cra 9,Boston,Pereira,Coros,,,',
    ].join('\n');

    const res = await service.ejecutarMigracion(csv, true);
    expect(res.totalFilas).toBe(3);
    expect(res.validos).toBe(1);
    expect(res.rechazados).toBe(2);
    expect(res.alertaR05).toBe(true);
  });
});
