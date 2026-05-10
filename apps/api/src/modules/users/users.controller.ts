import { Body, Controller, Get, Patch, UsePipes } from '@nestjs/common';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod.pipe';
import { updateProfileSchema, type UpdateProfileDto } from '@app/shared';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me/profile')
  getProfile(@CurrentUser() user: RequestUser) {
    return this.users.getProfile(user.id);
  }

  @Patch('me/profile')
  @UsePipes(new ZodValidationPipe(updateProfileSchema))
  updateProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }
}
