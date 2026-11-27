import { Controller, Get, Patch, Param, Req, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificacionesService } from './notificaciones.service';
import { Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/enums';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get('mias')
  @ApiOperation({ summary: 'Listar notificaciones del usuario autenticado (EST-06)' })
  misNotificaciones(@Req() req: any) {
    return this.notificacionesService.listarPorUsuario(req.user.id);
  }

  @Patch(':id/leida')
  @ApiOperation({ summary: 'Marcar una notificación como leída' })
  marcarLeida(@Param('id') id: string, @Req() req: any) {
    return this.notificacionesService.marcarLeida(id, req.user.id);
  }

  @Get()
  @Roles(RoleName.ADMINISTRADOR, RoleName.ADMINISTRATIVO)
  @ApiOperation({ summary: 'Historial institucional de correos y notificaciones enviadas' })
  listarTodas(@Query('limit') limit?: number) {
    return this.notificacionesService.listarTodas(Number(limit) || 50);
  }
}
