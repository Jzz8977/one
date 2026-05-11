import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import express from 'express';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { loadEnv } from './config/env';

async function bootstrap() {
  const env = loadEnv();
  // 关掉 Nest 自带 body parser，改用带 verify 的 express.json，把原始 body 缓存到 req.rawBody
  // 用于微信支付回调的 RSA-SHA256 验签（必须用未经修改的字节）
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'debug'],
    bodyParser: false,
  });

  app.use(
    express.json({
      limit: '2mb',
      verify: (req: express.Request & { rawBody?: string }, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  app.setGlobalPrefix('api', { exclude: ['health', 'version'] });
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  });

  await app.listen(env.API_PORT, env.API_HOST);
  Logger.log(`API listening on http://${env.API_HOST}:${env.API_PORT}`, 'Bootstrap');
}

bootstrap();
