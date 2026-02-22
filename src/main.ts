import { NestFactory } from '@nestjs/core';
import { BadRequestException } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global exception filter (centralized error handling)
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const hasNonWhitelisted = errors.some((error) =>
          Object.values(error.constraints ?? {}).some((msg) => msg.includes('should not exist')),
        );

        if (hasNonWhitelisted) {
          return new BadRequestException('unknown property detected (not whitelisted)');
        }

        const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));

        return new BadRequestException(messages);
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Blog API')
    .setDescription('Blog API with nested comments system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}

void bootstrap();
