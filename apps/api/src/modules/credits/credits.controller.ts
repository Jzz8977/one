import { Controller, Get, Query } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';

@Controller('credits')
export class CreditsController {
  constructor(private credits: CreditsService) {}

  @Get('account')
  account(@CurrentUser() user: RequestUser) {
    return this.credits.getAccount(user.id);
  }

  @Get('transactions')
  transactions(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('type') type?: string,
  ) {
    return this.credits.listTransactions(user.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      type,
    });
  }
}
