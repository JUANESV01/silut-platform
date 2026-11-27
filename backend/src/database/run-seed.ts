import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(SeedService);
  const result = await seedService.seedIfEmpty();
  console.log('[GEA Seed]', result);
  await app.close();
}

bootstrap().catch((err) => {
  console.error('Error ejecutando seed:', err);
  process.exit(1);
});
