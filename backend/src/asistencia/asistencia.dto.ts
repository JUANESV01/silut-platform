import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoAsistencia } from '../common/enums';

export class CrearSesionDto {
  @ApiProperty()
  @IsUUID()
  grupoId: string;

  @ApiProperty({ example: '2026-11-20' })
  @IsDateString()
  fecha: string;

  @ApiPropertyOptional({ example: 'Ensayo coreográfico bloque 2' })
  @IsOptional()
  @IsString()
  tema?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class ItemAsistenciaDto {
  @ApiProperty()
  @IsUUID()
  inscripcionId: string;

  @ApiProperty({ enum: EstadoAsistencia })
  @IsEnum(EstadoAsistencia)
  estado: EstadoAsistencia;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacion?: string;
}

export class GuardarAsistenciaDto {
  @ApiProperty({ type: [ItemAsistenciaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemAsistenciaDto)
  registros: ItemAsistenciaDto[];
}
