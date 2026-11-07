import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cho phép CORS khi dev
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const prisma = app.get(PrismaService);
  app.useGlobalFilters(new AllExceptionsFilter(prisma));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3030;
  await app.listen(port);
  console.log(`===============================================`);
  console.log(`🚀 HRM Backend API đang chạy tại: http://localhost:${port}`);
  console.log(`===============================================`);
}
bootstrap();
