import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegistrarEstudianteDto {
  @ApiProperty({ example: 'CC' })
  @IsString()
  @IsNotEmpty()
  tipoDocumento: string;

  @ApiProperty({ example: '1088345678' })
  @IsString()
  @IsNotEmpty()
  documento: string;

  @ApiProperty({ example: 'Camila' })
  @IsString()
  @IsNotEmpty()
  nombres: string;

  @ApiProperty({ example: 'Giraldo Ospina' })
  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @ApiProperty({ example: '2006-05-14' })
  @IsDateString()
  fechaNacimiento: string;

  @ApiProperty({ example: 'Femenino' })
  @IsString()
  @IsNotEmpty()
  genero: string;

  @ApiProperty({ example: '3124567890' })
  @IsString()
  @IsNotEmpty()
  telefono: string;

  @ApiProperty({ example: 'camila.giraldo@correo.com' })
  @IsEmail()
  correo: string;

  @ApiProperty({ example: 'Calle 21 # 8-45' })
  @IsString()
  @IsNotEmpty()
  direccion: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @IsNotEmpty()
  barrio: string;

  @ApiPropertyOptional({ example: 'Comuna Centro' })
  @IsOptional()
  @IsString()
  comuna?: string;

  @ApiProperty({ example: 'Pereira' })
  @IsString()
  @IsNotEmpty()
  ciudadOrigen: string;

  // Datos de acudiente obligatorios si es menor de edad (Ley 1581 / Sec. 2.6)
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  acudienteNombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  acudienteDocumento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  acudienteTelefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  acudienteCorreo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  acudienteParentesco?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  consentimientoDatos: boolean;

  @ApiPropertyOptional({ description: 'Opcional: ID de grupo para inscribir en el mismo paso' })
  @IsOptional()
  @IsString()
  grupoIdInicial?: string;
}

export class ActualizarPerfilEstudianteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barrio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comuna?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ciudadOrigen?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  acudienteTelefono?: string;
}
