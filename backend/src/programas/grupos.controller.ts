import { Controller, Get, Post, Patch, Body, Param, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProgramasService } from './programas.service';
import { ActualizarHorarioGrupoDto, CrearGrupoDto } from './programas.dto';
import { Auditar, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/enums';

@ApiTags('Grupos y Horarios')
@ApiBearerAuth()
@Controller('grupos')
export class GruposController {
  constructor(private readonly programasService: ProgramasService) {}

  @Get()
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR, RoleName.EDUCADOR)
  @ApiOperation({ summary: 'Listar todos los grupos académicos' })
  listarTodos() {
    return this.programasService.listarTodosLosGrupos();
  }

  @Get('mis-grupos')
  @Roles(RoleName.EDUCADOR, RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @ApiOperation({ summary: 'Consultar grupos asignados al educador y sus estudiantes (EDU-02)' })
  misGrupos(@Req() req: any) {
    return this.programasService.listarGruposDelEducador(req.user.id);
  }

  @Post()
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @Auditar('CREAR_GRUPO', 'Grupo')
  @ApiOperation({ summary: 'Crear grupo con salón, educador, cupo y horarios (valida conflictos)' })
  crearGrupo(@Body() dto: CrearGrupoDto) {
    return this.programasService.crearGrupo(dto);
  }

  @Patch(':id/horarios')
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @Auditar('ACTUALIZAR_HORARIO_GRUPO', 'Grupo')
  @ApiOperation({ summary: 'Actualizar horarios de un grupo y notificar a los inscritos (EST-06)' })
  actualizarHorarios(
    @Param('id') id: string,
    @Body() dto: ActualizarHorarioGrupoDto,
  ) {
    return this.programasService.actualizarHorariosGrupo(id, dto);
  }
}
