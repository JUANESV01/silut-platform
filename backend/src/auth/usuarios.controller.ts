import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ActualizarRolUsuarioDto, CrearUsuarioDto } from './auth.dto';
import { Auditar, Roles } from '../common/decorators/auth.decorators';
import { RoleName } from '../common/enums';

@ApiTags('Usuarios y Roles')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @Roles(RoleName.ADMINISTRADOR)
  @ApiOperation({ summary: 'Listar usuarios del sistema (ADM-01)' })
  listar() {
    return this.authService.listarUsuarios();
  }

  @Post()
  @Roles(RoleName.ADMINISTRADOR)
  @Auditar('CREAR_USUARIO', 'Usuario')
  @ApiOperation({ summary: 'Crear cuenta institucional o docente con rol (ADM-01)' })
  crear(@Body() dto: CrearUsuarioDto) {
    return this.authService.crearUsuario(dto);
  }

  @Patch(':id/rol')
  @Roles(RoleName.ADMINISTRADOR)
  @Auditar('ACTUALIZAR_ROL', 'Usuario')
  @ApiOperation({ summary: 'Actualizar roles o estado de un usuario (ADM-01)' })
  actualizarRol(@Param('id') id: string, @Body() dto: ActualizarRolUsuarioDto) {
    return this.authService.actualizarRolUsuario(id, dto);
  }
}
