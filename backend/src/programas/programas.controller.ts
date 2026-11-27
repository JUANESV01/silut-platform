import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProgramasService } from './programas.service';
import {
  CrearIndicadorDto,
  CrearProgramaDto,
  CrearSalonDto,
} from './programas.dto';
import { Auditar, Public, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/enums';

@ApiTags('Programas, Salones y Educadores')
@Controller('programas')
export class ProgramasController {
  constructor(private readonly programasService: ProgramasService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar programas formativos con grupos y cupos disponibles (EST-02)' })
  listarProgramas() {
    return this.programasService.listarProgramas();
  }

  @ApiBearerAuth()
  @Post()
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @Auditar('CREAR_PROGRAMA', 'Programa')
  @ApiOperation({
    summary: 'Crear nuevo programa formativo configurable sin modificar código (ATAM M1)',
  })
  crearPrograma(@Body() dto: CrearProgramaDto) {
    return this.programasService.crearPrograma(dto);
  }

  @ApiBearerAuth()
  @Post(':id/indicadores')
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @Auditar('CREAR_INDICADOR', 'IndicadorEvaluacion')
  @ApiOperation({ summary: 'Agregar indicador de evaluación cualitativa a un programa' })
  agregarIndicador(@Param('id') id: string, @Body() dto: CrearIndicadorDto) {
    return this.programasService.agregarIndicador(id, dto);
  }

  @ApiBearerAuth()
  @Get('salones')
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR, RoleName.EDUCADOR)
  @ApiOperation({ summary: 'Listar salones del Centro Cultural Lucy Tejada' })
  listarSalones() {
    return this.programasService.listarSalones();
  }

  @ApiBearerAuth()
  @Post('salones')
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @Auditar('CREAR_SALON', 'Salon')
  @ApiOperation({ summary: 'Crear salón físico' })
  crearSalon(@Body() dto: CrearSalonDto) {
    return this.programasService.crearSalon(dto);
  }

  @ApiBearerAuth()
  @Get('educadores')
  @Roles(RoleName.ADMINISTRATIVO, RoleName.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar educadores registrados' })
  listarEducadores() {
    return this.programasService.listarEducadores();
  }
}
