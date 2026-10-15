import { registerEnumType } from '@nestjs/graphql';

// NOTICE = announcements board, FAQ = question (title) + answer (content), TERMS = policy pages
export enum NoticeCategory {
	NOTICE = 'NOTICE',
	FAQ = 'FAQ',
	TERMS = 'TERMS',
}
registerEnumType(NoticeCategory, {
	name: 'NoticeCategory',
});

export enum NoticeStatus {
	HOLD = 'HOLD',
	ACTIVE = 'ACTIVE',
	DELETE = 'DELETE',
}
registerEnumType(NoticeStatus, {
	name: 'NoticeStatus',
});

// Sub-group shown as a tag / tab on the CS page: EVENT-UPDATE for notices, PRODUCTS-COMMUNITY for FAQ
export enum NoticeTopic {
	GENERAL = 'GENERAL',
	EVENT = 'EVENT',
	POLICY = 'POLICY',
	UPDATE = 'UPDATE',
	PRODUCTS = 'PRODUCTS',
	BUYERS = 'BUYERS',
	STORES = 'STORES',
	ACCOUNT = 'ACCOUNT',
	COMMUNITY = 'COMMUNITY',
}
registerEnumType(NoticeTopic, {
	name: 'NoticeTopic',
});
