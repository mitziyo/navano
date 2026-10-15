import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { MemberService } from '../member/member.service';
import { ProductService } from '../product/product.service';
import { BoardArticleService } from '../board-article/board-article.service';
import { CommentInput, CommentsInquiry } from '../../libs/dto/comment/comment.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import { Comment, Comments } from '../../libs/dto/comment/comment';
import { lookupMember } from '../../libs/config';
import { T } from '../../libs/types/common';
import { NotificationService } from '../notification/notification.service';
import { NotificationGroup, NotificationType } from '../../libs/enums/notification.enum';

@Injectable()
export class CommentService {
	constructor(
		@InjectModel('Comment') private readonly commentModel: Model<Comment>,
		private readonly notificationService: NotificationService,
		private readonly memberService: MemberService,
		private readonly productService: ProductService,
		private readonly boardArticleService: BoardArticleService,
	) {}

	public async createComment(memberId: ObjectId, input: CommentInput): Promise<Comment> {
		input.memberId = memberId;

		let result: Comment | null = null;
		try {
			result = await this.commentModel.create(input);
		} catch (err) {
			console.log('Error, Service.model:', err instanceof Error ? err.message : err);
			throw new BadRequestException(Message.CREATE_FAILED);
		}

		// The stats editors return the updated target, which tells us whom to notify
		const notice = {
			notificationType: NotificationType.COMMENT,
			authorId: memberId,
			notificationDesc: input.commentContent,
		};
		switch (input.commentGroup) {
			case CommentGroup.PRODUCT: {
				const product = await this.productService.productStatsEditor({
					_id: input.commentRefId,
					targetKey: 'productComments',
					modifier: 1,
				});
				if (product)
					await this.notificationService.notify({
						...notice,
						notificationGroup: NotificationGroup.PRODUCT,
						notificationTitle: product.productTitle,
						receiverId: product.memberId,
						productId: input.commentRefId,
					});
				break;
			}
			case CommentGroup.ARTICLE: {
				const article = await this.boardArticleService.boardArticleStatsEditor({
					_id: input.commentRefId,
					targetKey: 'articleComments',
					modifier: 1,
				});
				if (article)
					await this.notificationService.notify({
						...notice,
						notificationGroup: NotificationGroup.ARTICLE,
						notificationTitle: article.articleTitle,
						receiverId: article.memberId,
						articleId: input.commentRefId,
					});
				break;
			}
			case CommentGroup.MEMBER: {
				const member = await this.memberService.memberStatsEditor({
					_id: input.commentRefId,
					targetKey: 'memberComments',
					modifier: 1,
				});
				if (member)
					await this.notificationService.notify({
						...notice,
						notificationGroup: NotificationGroup.MEMBER,
						notificationTitle: member.memberNick,
						receiverId: input.commentRefId,
					});
				break;
			}
		}

		if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);
		return result;
	}

	public async updateComment(memberId: ObjectId, input: CommentUpdate): Promise<Comment> {
		const { _id } = input;
		const result = await this.commentModel
			.findOneAndUpdate(
				{
					_id: _id,
					memberId: memberId,
					commentStatus: CommentStatus.ACTIVE,
				},
				input,
				{
					new: true,
				},
			)
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		// FIX START:komment DELETE bo'lganda statistikani -1 qilish
		if (input.commentStatus === CommentStatus.DELETE) {
			switch (result.commentGroup) {
				case CommentGroup.PRODUCT:
					await this.productService.productStatsEditor({
						_id: result.commentRefId,
						targetKey: 'productComments',
						modifier: -1,
					});
					break;
				case CommentGroup.ARTICLE:
					await this.boardArticleService.boardArticleStatsEditor({
						_id: result.commentRefId,
						targetKey: 'articleComments',
						modifier: -1,
					});
					break;
				case CommentGroup.MEMBER:
					await this.memberService.memberStatsEditor({
						_id: result.commentRefId,
						targetKey: 'memberComments',
						modifier: -1,
					});
					break;
			}
		}
		// FIX END

		return result;
	}

	public async getComments(memberId: ObjectId, input: CommentsInquiry): Promise<Comments> {
		const { commentRefId } = input.search;
		const match: T = { commentRefId: commentRefId, commentStatus: CommentStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result: Comments[] = await this.commentModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							// meLiked
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async removeCommentByAdmin(input: ObjectId): Promise<Comment> {
		const result = await this.commentModel.findByIdAndDelete(input).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		// FIX START:  o'chirilgan komment uchun statistikani -1 qilish
		switch (result.commentGroup) {
			case CommentGroup.PRODUCT:
				await this.productService.productStatsEditor({
					_id: result.commentRefId,
					targetKey: 'productComments',
					modifier: -1,
				});
				break;
			case CommentGroup.ARTICLE:
				await this.boardArticleService.boardArticleStatsEditor({
					_id: result.commentRefId,
					targetKey: 'articleComments',
					modifier: -1,
				});
				break;
			case CommentGroup.MEMBER:
				await this.memberService.memberStatsEditor({
					_id: result.commentRefId,
					targetKey: 'memberComments',
					modifier: -1,
				});
				break;
		}
		// FIX END

		return result;
	}
}
