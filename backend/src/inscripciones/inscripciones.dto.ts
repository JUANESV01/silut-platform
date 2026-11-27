import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrearInscripcionDto {
  @ApiProperty()
  @IsUUID()
  grupoId: string;

  @ApiPropertyOptional({ description: 'Solo para uso administrativo al matricular a un tercero' })
  @IsOptional()
  @IsUUID()
  estudianteId?: string;
}

export class CancelarInscripcionDto {
  @ApiPropertyOptional({ example: 'Cruce de horario escolar' })
  @IsOptional()
  @IsString()
  motivo?: string;
}
