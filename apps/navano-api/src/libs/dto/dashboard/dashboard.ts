import { Field, Int, ObjectType } from '@nestjs/graphql';

// One number per bucket of a collection ("value" is an enum value such as ACTIVE or FLOWER)
@ObjectType()
export class StatCount {
	@Field(() => String)
	value!: string;

	@Field(() => Int)
	count!: number;
}

@ObjectType()
export class CollectionStats {
	@Field(() => Int)
	total!: number;

	@Field(() => Int)
	newThisWeek!: number;

	@Field(() => [StatCount])
	byStatus!: StatCount[];

	@Field(() => [StatCount])
	byType!: StatCount[];
}

@ObjectType()
export class AdminStats {
	@Field(() => CollectionStats)
	members!: CollectionStats;

	@Field(() => CollectionStats)
	products!: CollectionStats;

	@Field(() => CollectionStats)
	articles!: CollectionStats;

	@Field(() => CollectionStats)
	inquiries!: CollectionStats;

	@Field(() => CollectionStats)
	notices!: CollectionStats;
}
