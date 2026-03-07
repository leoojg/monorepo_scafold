import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MikroOrmExceptionFilter } from './common/filters/mikro-orm-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new MikroOrmExceptionFilter(),
  );

  const config = new DocumentBuilder()
    .setTitle('Admin Platform API')
    .setDescription('Multi-tenant admin management API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticacao de Operators')
    .addTag('tenants', 'Gerenciamento de Tenants')
    .addTag('companies', 'Gerenciamento de Empresas')
    .addTag('users', 'Gerenciamento de Usuarios')
    .addTag('audit', 'Activity Log')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.API_PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
