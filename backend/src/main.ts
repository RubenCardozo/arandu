import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // OWASP A05:2021-Security Misconfiguration: Enable Helmet to set secure HTTP headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Enable CORS with restricted configuration matching trusted origins
  const allowedOrigins = [
    'http://localhost:4200', // Public frontend local dev server
    'http://localhost:4201', // Admin frontend local dev server
    process.env.FRONTEND_URL,
    process.env.ADMIN_URL,
  ].filter((origin): origin is string => !!origin);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // OWASP A03:2021-Injection & A08:2021-Software and Data Integrity Failures: Input Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // strip non-decorated properties automatically
    forbidNonWhitelisted: true, // reject requests containing non-whitelisted params
    transform: true, // transform incoming payloads into DTO instances
  }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
