import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardsService } from './dashboards.service';
import { Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/enums';

@ApiTags('Dashboards Interactivos')
@ApiBearerAuth()
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get(':tipo')
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @ApiOperation({
    summary:
      'Obtener datos agregados de los seis dashboards interactivos (matricula, geografico, asistencia, evaluaciones, programas, desercion, resumen) (ADM-05)',
  })
  obtener(
    @Param('tipo') tipo: string,
    @Query('refresh') refresh?: string,
  ) {
    return this.dashboardsService.obtenerDashboard(tipo, refresh === 'true');
  }
}
