import { registerEnumType } from '@nestjs/graphql';

export enum ProductType {
	FLOWER = 'FLOWER',
	CHOCOLATE = 'CHOCOLATE',
	CAKE = 'CAKE',
}
registerEnumType(ProductType, {
	name: 'ProductType',
});

export enum ProductStatus {
	HOLD = 'HOLD',
	ACTIVE = 'ACTIVE',
	SOLD = 'SOLD',
	DELETE = 'DELETE',
}
registerEnumType(ProductStatus, {
	name: 'ProductStatus',
});

export enum ProductLocation {
	SEOUL = 'SEOUL',
	BUSAN = 'BUSAN',
	INCHEON = 'INCHEON',
	DAEGU = 'DAEGU',
	GYEONGJU = 'GYEONGJU',
	GWANGJU = 'GWANGJU',
	CHONJU = 'CHONJU',
	DAEJON = 'DAEJON',
	JEJU = 'JEJU',
}
registerEnumType(ProductLocation, {
	name: 'ProductLocation',
});

export enum ProductOccasion {
	BIRTHDAY = 'BIRTHDAY',
	WEDDING = 'WEDDING',
	ANNIVERSARY = 'ANNIVERSARY',
	HOLIDAY = 'HOLIDAY',
}
registerEnumType(ProductOccasion, {
	name: 'ProductOccasion',
});
