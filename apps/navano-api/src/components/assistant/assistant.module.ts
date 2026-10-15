import { Module } from '@nestjs/common';
import { AssistantResolver } from './assistant.resolver';
import { AssistantService } from './assistant.service';
import { AuthModule } from '../auth/auth.module';
import { ProductModule } from '../product/product.module';
import { MemberModule } from '../member/member.module';

@Module({
	imports: [AuthModule, ProductModule, MemberModule],
	providers: [AssistantResolver, AssistantService],
})
export class AssistantModule {}
