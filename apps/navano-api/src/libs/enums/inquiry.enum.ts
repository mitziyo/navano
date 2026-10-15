import { registerEnumType } from '@nestjs/graphql';

export enum InquiryType {
	ORDER = 'ORDER',
	PRODUCT = 'PRODUCT',
	STORE = 'STORE',
	ACCOUNT = 'ACCOUNT',
	OTHER = 'OTHER',
}
registerEnumType(InquiryType, {
	name: 'InquiryType',
});

export enum InquiryStatus {
	WAIT = 'WAIT',
	ANSWERED = 'ANSWERED',
	DELETE = 'DELETE',
}
registerEnumType(InquiryStatus, {
	name: 'InquiryStatus',
});
