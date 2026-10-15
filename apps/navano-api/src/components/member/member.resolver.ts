import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { Request, Response } from 'express';
import { MemberService } from './member.service';
import { AuthService } from '../auth/auth.service';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '../../libs/dto/member/member.input';
import { Member, Members } from '../../libs/dto/member/member';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import type { ObjectId } from 'mongoose';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import { getSerialForImage, shapeIntoMongoObjectId, validMimeTypes } from '../../libs/config';

// Upload folders a client may write to; anything else (e.g. "../") is rejected
const UPLOAD_TARGETS = ['member', 'product', 'article'];

// uploads/ is not in git, so a fresh server has no folders yet
const uploadDir = (target: string): string => {
	if (!UPLOAD_TARGETS.includes(target)) throw new Error(Message.BAD_REQUEST);
	const dir = `uploads/${target}`;
	mkdirSync(dir, { recursive: true });
	return dir;
};
import { WithoutGuard } from '../auth/guards/without.guard';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { createWriteStream, mkdirSync } from 'fs';
import { Message } from '../../libs/enums/common.enum';

@Resolver()
export class MemberResolver {
	constructor(
		private readonly memberService: MemberService,
		private readonly authService: AuthService,
	) {}

	@Mutation(() => Member)
	public async signup(@Args('input') input: MemberInput, @Context('res') res: Response): Promise<Member> {
		console.log('Mutation: signup');
		const member = await this.memberService.signup(input);
		await this.authService.issueRefreshToken(member._id, res);
		return member;
	}

	///////////////////////////////

	@Mutation(() => Member)
	public async login(@Args('input') input: LoginInput, @Context('res') res: Response): Promise<Member> {
		console.log('Mutation: login');
		const member = await this.memberService.login(input);
		await this.authService.issueRefreshToken(member._id, res);
		return member;
	}

	// Reads the httpOnly refresh cookie, rotates it and returns a new access token
	@Mutation(() => Member)
	public async refreshToken(@Context('req') req: Request, @Context('res') res: Response): Promise<Member> {
		const memberId = await this.authService.rotateRefreshToken(req, res);
		return await this.memberService.getSessionMember(memberId);
	}

	@Mutation(() => Boolean)
	public async logout(@Context('req') req: Request, @Context('res') res: Response): Promise<boolean> {
		await this.authService.revokeRefreshToken(req, res);
		return true;
	}

	@UseGuards(AuthGuard)
	@Query(() => String)
	public async checkAuth(@AuthMember('memberNick') memberNick: string): Promise<String> {
		console.log('checkAuth');
		console.log('memberNick:', memberNick);

		return `Hiii ${memberNick}`;
	}

	@Roles(MemberType.USER, MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Query(() => String)
	public async checkAuthRoles(@AuthMember() authMember: Member): Promise<String> {
		console.log('checkAuthRoles');

		return `Hiii ${authMember.memberNick}, you are ${authMember.memberType} (memberId: ${authMember._id})}`;
	}
	//////////////////////////////////

	// Authenticated
	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async updateMember(
		@Args('input') input: MemberUpdate,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Member> {
		console.log('Mutation: updateMember');
		delete input._id;
		return await this.memberService.updateMember(memberId, input);
	}

	///////////////////////////////////////////////////
	@UseGuards(WithoutGuard)
	@Query(() => Member)
	public async getMember(@Args('memberId') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Member> {
		console.log('Query: getMember');

		const targetId = shapeIntoMongoObjectId(input);
		return await this.memberService.getMember(memberId, targetId);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Members)
	public async getAgents(@Args('input') input: AgentsInquiry, @AuthMember('_id') memberId: ObjectId): Promise<Members> {
		console.log('Query: getAgents');
		return await this.memberService.getAgents(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async likeTargetMember(
		@Args('memberId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Member> {
		console.log('Mutation: likeTargetMember');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.memberService.likeTargetMember(memberId, likeRefId);
	}

	/** ADMIN **/

	/** Authorization: ADMIN **/
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Members)
	public async getAllMembersByAdmin(@Args('input') input: MembersInquiry): Promise<Members> {
		console.log('Query: getAllMembersByAdmin');
		return await this.memberService.getAllMembersByAdmin(input);
	}

	// Authorization: ADMIN
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Member)
	public async updateMemberByAdmin(@Args('input') input: MemberUpdate): Promise<Member> {
		console.log('Query: updateMemberByAdmin');
		return await this.memberService.updateMemberByAdmin(input);
	}

	//**IMage UPLOADER */

	@UseGuards(AuthGuard)
	@Mutation((returns) => String)
	public async imageUploader(
		@Args({ name: 'file', type: () => GraphQLUpload })
		{ createReadStream, filename, mimetype }: FileUpload,
		@Args('target') target: String,
	): Promise<string> {
		console.log('Mutation: imageUploader');
		console.log('filename:', filename);
		console.log('mimetype:', mimetype);
		if (!filename) throw new Error(Message.UPLOAD_FAILED);
		const validMime = validMimeTypes.includes(mimetype);
		if (!validMime) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

		const imageName = getSerialForImage(filename);
		const url = `${uploadDir(String(target))}/${imageName}`;
		const stream = createReadStream();

		const result = await new Promise((resolve, reject) => {
			stream
				.pipe(createWriteStream(url))
				.on('finish', () => resolve(true))
				.on('error', () => reject(new Error(Message.UPLOAD_FAILED)));
		});
		if (!result) throw new Error(Message.UPLOAD_FAILED);

		return url;
	}

	@UseGuards(AuthGuard)
	@Mutation((returns) => [String])
	public async imagesUploader(
		@Args('files', { type: () => [GraphQLUpload] })
		files: Promise<FileUpload>[],
		@Args('target') target: String,
	): Promise<string[]> {
		console.log('Mutation: imagesUploader');
		const dir = uploadDir(String(target));

		const uploadedImages: string[] = [];
		const promisedList = files.map(async (img: Promise<FileUpload>, index: number): Promise<void> => {
			try {
				const { filename, mimetype, encoding, createReadStream } = await img;

				const validMime = validMimeTypes.includes(mimetype);
				if (!validMime) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

				const imageName = getSerialForImage(filename);
				const url = `${dir}/${imageName}`;
				const stream = createReadStream();

				const result = await new Promise((resolve, reject) => {
					stream
						.pipe(createWriteStream(url))
						.on('finish', () => resolve(true))
						.on('error', () => reject(new Error(Message.UPLOAD_FAILED)));
				});
				if (!result) throw new Error(Message.UPLOAD_FAILED);

				uploadedImages[index] = url;
			} catch (err) {
				console.log('Error, file missing!');
			}
		});

		await Promise.all(promisedList);
		return uploadedImages;
	}
}
