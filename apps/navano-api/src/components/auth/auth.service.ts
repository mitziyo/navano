import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { createHash, randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { Member } from '../../libs/dto/member/member';
import { JwtService } from '@nestjs/jwt';
import { T } from '../../libs/types/common';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Message } from '../../libs/enums/common.enum';

const REFRESH_COOKIE = 'nv_rt';
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const cookieOptions = {
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: process.env.NODE_ENV === 'production',
	path: '/graphql',
};

type Session = { memberId: ObjectId; tokenHash: string; expiresAt: Date };

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const readRefreshCookie = (req: Request): string | undefined =>
	req.headers.cookie
		?.split(';')
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${REFRESH_COOKIE}=`))
		?.slice(REFRESH_COOKIE.length + 1);

@Injectable()
export class AuthService {
	constructor(
		private jwtService: JwtService,
		@InjectModel('Session') private readonly sessionModel: Model<Session>,
	) {}

	public async hashPassword(memberPassword: string): Promise<string> {
		const salt = await bcrypt.genSalt();
		return await bcrypt.hash(memberPassword, salt);
	}

	public async comparePasswords(password: string, hashedPassword: string | undefined): Promise<boolean> {
		return await bcrypt.compare(password, hashedPassword);
	}

	public async createToken(member: Member): Promise<string> {
		const payload: T = {};
		Object.keys(member['_doc'] ? member['_doc'] : member).map((ele) => {
			payload[`${ele}`] = member[`${ele}`];
		});
		delete payload.memberPassword;

		return await this.jwtService.signAsync(payload);
	}

	// Expired, malformed or foreign tokens are a 401, not a 500
	public async verifyToken(token: string): Promise<Member> {
		let member: Member;
		try {
			member = await this.jwtService.verifyAsync<Member>(token);
		} catch {
			throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
		}
		member._id = shapeIntoMongoObjectId(member._id);
		return member;
	}

	public async issueRefreshToken(memberId: ObjectId, res: Response): Promise<void> {
		const token = randomBytes(32).toString('hex');
		const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
		await this.sessionModel.create({ memberId, tokenHash: hashToken(token), expiresAt });
		res.cookie(REFRESH_COOKIE, token, { ...cookieOptions, expires: expiresAt });
	}

	// Each refresh token works once: the session is deleted and a new cookie replaces it
	public async rotateRefreshToken(req: Request, res: Response): Promise<ObjectId> {
		const token = readRefreshCookie(req);
		const session = token
			? await this.sessionModel.findOneAndDelete({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } }).exec()
			: null;
		if (!session) {
			res.clearCookie(REFRESH_COOKIE, cookieOptions);
			throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
		}
		await this.issueRefreshToken(session.memberId, res);
		return session.memberId;
	}

	public async revokeRefreshToken(req: Request, res: Response): Promise<void> {
		const token = readRefreshCookie(req);
		if (token) await this.sessionModel.deleteOne({ tokenHash: hashToken(token) }).exec();
		res.clearCookie(REFRESH_COOKIE, cookieOptions);
	}
}
