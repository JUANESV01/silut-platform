import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditoriaService } from './auditoria.service';
import { Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/enums';

@ApiTags('Auditoría')
@ApiBearerAuth()
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  @Roles(RoleName.ADMINISTRADOR, RoleName.ADMINISTRATIVO)
  @ApiOperation({
    summary: 'Consultar registros de auditoría (ADM-01 / Seguridad)',
  })
  listar(
    @Query('accion') accion?: string,
    @Query('entidad') entidad?: string,
    @Query('correo') correo?: string,
    @Query('exitoso') exitoso?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditoriaService.listar({
      accion,
      entidad,
      correo,
      exitoso,
      desde,
      hasta,
      page,
      limit,
    });
  }
}
