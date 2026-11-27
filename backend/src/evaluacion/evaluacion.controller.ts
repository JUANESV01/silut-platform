import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EvaluacionService } from './evaluacion.service';
import { RegistrarEvaluacionDto } from './evaluacion.dto';
import { Auditar, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/enums';

@ApiTags('Evaluación Cualitativa')
@ApiBearerAuth()
@Controller('evaluaciones')
export class EvaluacionController {
  constructor(private readonly evaluacionService: EvaluacionService) {}

  @Post()
  @Roles(RoleName.EDUCADOR, RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @Auditar('REGISTRAR_EVALUACION', 'Evaluacion')
  @ApiOperation({
    summary: 'Registrar o actualizar concepto cualitativo por indicador (EDU-05)',
  })
  registrar(@Body() dto: RegistrarEvaluacionDto, @Req() req: any) {
    return this.evaluacionService.registrar(dto, req.user);
  }

  @Get('grupo/:grupoId')
  @Roles(RoleName.EDUCADOR, RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar evaluaciones cualitativas de los estudiantes de un grupo' })
  listarPorGrupo(@Param('grupoId') grupoId: string, @Req() req: any) {
    return this.evaluacionService.listarPorGrupo(grupoId, req.user);
  }
}
