import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConceptoEvaluacion } from '../common/enums';

export class RegistrarEvaluacionDto {
  @ApiProperty()
  @IsUUID()
  inscripcionId: string;

  @ApiProperty()
  @IsUUID()
  indicadorId: string;

  @ApiProperty({ enum: ConceptoEvaluacion })
  @IsEnum(ConceptoEvaluacion)
  concepto: ConceptoEvaluacion;

  @ApiPropertyOptional({ example: 'Evidencia avance notable en técnica y expresión escénica.' })
  @IsOptional()
  @IsString()
  observacion?: string;

  @ApiPropertyOptional({ example: '2026-2' })
  @IsOptional()
  @IsString()
  periodo?: string;
}
