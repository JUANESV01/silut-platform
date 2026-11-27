import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  Matches,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleName } from '../common/enums';

export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.#_\-+])[A-Za-z\d@$!%*?&.#_\-+]{8,}$/;

export const STRONG_PASSWORD_MESSAGE =
  'La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula, número y carácter especial.';

export class LoginDto {
  @ApiProperty({ example: 'admin@lucytejada.pereira.gov.co' })
  @IsEmail({}, { message: 'Ingrese un correo electrónico válido' })
  correo: string;

  @ApiProperty({ example: 'Admin2026*' })
  @IsString()
  @MinLength(1, { message: 'La contraseña es requerida' })
  clave: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  codigoMfa?: string;
}

export class CambiarClaveDto {
  @ApiProperty()
  @IsString()
  claveActual: string;

  @ApiProperty()
  @IsString()
  @Matches(STRONG_PASSWORD_REGEX, { message: STRONG_PASSWORD_MESSAGE })
  claveNueva: string;
}

export class VerificarMfaDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  codigo: string;
}

export class SolicitarRecuperacionDto {
  @ApiProperty({ example: 'estudiante@lucytejada.pereira.gov.co' })
  @IsEmail({}, { message: 'Ingrese un correo electrónico válido' })
  correo: string;
}

export class RestablecerClaveDto {
  @ApiProperty({ example: 'estudiante@lucytejada.pereira.gov.co' })
  @IsEmail({}, { message: 'Ingrese un correo electrónico válido' })
  correo: string;

  @ApiProperty({ example: '482910' })
  @IsString()
  @MinLength(6, { message: 'El código de recuperación debe tener 6 dígitos' })
  codigo: string;

  @ApiProperty({ example: 'NuevaClave2026*' })
  @IsString()
  @Matches(STRONG_PASSWORD_REGEX, { message: STRONG_PASSWORD_MESSAGE })
  claveNueva: string;
}

export class CrearUsuarioDto {
  @ApiProperty({ example: 'coordinador@lucytejada.pereira.gov.co' })
  @IsEmail()
  correo: string;

  @ApiProperty({ example: 'ClaveTemp2026*' })
  @IsString()
  @Matches(STRONG_PASSWORD_REGEX, { message: STRONG_PASSWORD_MESSAGE })
  clave: string;

  @ApiProperty({ enum: RoleName, isArray: true })
  @IsArray()
  @IsEnum(RoleName, { each: true })
  roles: RoleName[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  debeCambiarClave?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombres?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apellidos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  especialidad?: string;
}

export class ActualizarRolUsuarioDto {
  @ApiProperty({ enum: RoleName, isArray: true })
  @IsArray()
  @IsEnum(RoleName, { each: true })
  roles: RoleName[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
