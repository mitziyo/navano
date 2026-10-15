import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { ObjectId } from 'mongoose';
import { AssistantService } from './assistant.service';
import { AssistantInput, AssistantReply } from '../../libs/dto/assistant/assistant';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';

@Resolver()
export class AssistantResolver {
	constructor(private readonly assistantService: AssistantService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => AssistantReply)
	public async askAssistant(
		@Args('input') input: AssistantInput,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<AssistantReply> {
		console.log('Mutation: askAssistant');
		return await this.assistantService.askAssistant(memberId, input);
	}
}
