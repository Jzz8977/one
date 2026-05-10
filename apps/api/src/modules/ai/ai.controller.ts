import { Body, Controller, Get, Post, Query, UsePipes } from '@nestjs/common';
import { AiService } from './ai.service';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { chatRequestSchema, type ChatRequestDto } from '@app/shared';

@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Get('providers')
  providers() {
    return this.ai.listProviders();
  }

  @Get('models')
  models() {
    return this.ai.listModels();
  }

  @Post('chat')
  @UsePipes(new ZodValidationPipe(chatRequestSchema))
  chat(@CurrentUser() user: RequestUser, @Body() dto: ChatRequestDto) {
    return this.ai.chat({ userId: user.id, dto });
  }

  @Get('usage-logs')
  logs(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ai.listUsageLogs(user.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
