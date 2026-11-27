import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrearIndicadorDto {
  @ApiProperty({ example: 'Expresión corporal y ritmo' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Demuestra coordinación rítmica y manejo del espacio escénico.' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  orden?: number;
}

export class CrearProgramaDto {
  @ApiProperty({ example: 'Fotografía Cultural' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ example: 'Mayor de 10 años; disponibilidad de asistencia semanal.' })
  @IsOptional()
  @IsString()
  requisitos?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(4)
  edadMinima?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  edadMaxima?: number;

  @ApiPropertyOptional({ type: [CrearIndicadorDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrearIndicadorDto)
  indicadores?: CrearIndicadorDto[];
}

export class CrearSalonDto {
  @ApiProperty({ example: 'Salón de Danza 201' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Piso 2 · Bloque Cultural' })
  @IsString()
  @IsNotEmpty()
  ubicacion: string;

  @ApiProperty({ example: 30 })
  @IsInt()
  @Min(1)
  capacidad: number;
}

export class HorarioItemDto {
  @ApiProperty({ example: 'Martes' })
  @IsString()
  @IsNotEmpty()
  diaSemana: string;

  @ApiProperty({ example: '16:00' })
  @IsString()
  @IsNotEmpty()
  horaInicio: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @IsNotEmpty()
  horaFin: string;
}

export class CrearGrupoDto {
  @ApiProperty()
  @IsUUID()
  programaId: string;

  @ApiProperty()
  @IsUUID()
  educadorId: string;

  @ApiProperty()
  @IsUUID()
  salonId: string;

  @ApiProperty({ example: 'Danza Folclórica · Nivel Inicial A' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 25 })
  @IsInt()
  @Min(1)
  cupoMax: number;

  @ApiProperty({ example: '2026-2' })
  @IsString()
  @IsNotEmpty()
  periodo: string;

  @ApiProperty({ type: [HorarioItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioItemDto)
  horarios: HorarioItemDto[];
}

export class ActualizarHorarioGrupoDto {
  @ApiProperty({ type: [HorarioItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioItemDto)
  horarios: HorarioItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
