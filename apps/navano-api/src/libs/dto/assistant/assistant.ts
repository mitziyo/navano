import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { ArrayMaxSize, ArrayMinSize, IsIn, IsNotEmpty, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Product } from '../product/product';

export const ASSISTANT_MAX_TURNS = 12;

@InputType()
export class AssistantTurn {
	@IsNotEmpty()
	@IsIn(['user', 'assistant'])
	@Field(() => String)
	role!: 'user' | 'assistant';

	@IsNotEmpty()
	@Length(1, 1000)
	@Field(() => String)
	text!: string;
}

@InputType()
export class AssistantInput {
	@ArrayMinSize(1)
	@ArrayMaxSize(ASSISTANT_MAX_TURNS)
	@ValidateNested({ each: true })
	@Type(() => AssistantTurn)
	@Field(() => [AssistantTurn])
	messages!: AssistantTurn[];
}

@ObjectType()
export class AssistantReply {
	@Field(() => String)
	text!: string;

	@Field(() => [Product])
	products!: Product[];
}
