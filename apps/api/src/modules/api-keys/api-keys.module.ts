import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { OpenAiCompatController } from './openai-compat.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyAuthGuard } from '../../common/guards/api-key.guard';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [ApiKeysController, OpenAiCompatController],
  providers: [ApiKeysService, ApiKeyAuthGuard],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
