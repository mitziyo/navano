import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { Member } from '../../libs/dto/member/member';

// uuid is ESM-only and Jest runs CommonJS; config.ts only needs it for image names
jest.mock('uuid', () => ({ v4: () => 'uuid' }));

describe('AuthService tokens', () => {
	const member = { _id: '650000000000000000000001', memberNick: 'NATHAN', memberPassword: 'hash' } as unknown as Member;
	const service = new AuthService(
		new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1h' } }),
		{} as never,
	);

	it('signs a token without the password and verifies it', async () => {
		const token = await service.createToken(member);
		const result = await service.verifyToken(token);

		expect(result.memberNick).toBe('NATHAN');
		expect(String(result._id)).toBe('650000000000000000000001');
		expect((result as unknown as { memberPassword?: string }).memberPassword).toBeUndefined();
	});

	it('rejects a token signed with another secret', async () => {
		const foreign = await new JwtService({ secret: 'undefined' }).signAsync({ memberNick: 'ADMIN' });

		await expect(service.verifyToken(foreign)).rejects.toThrow(UnauthorizedException);
	});

	it('rejects an expired token', async () => {
		const expired = await new JwtService({ secret: 'test-secret' }).signAsync(
			{ memberNick: 'NATHAN' },
			{ expiresIn: -10 },
		);

		await expect(service.verifyToken(expired)).rejects.toThrow(UnauthorizedException);
	});

	it('rejects garbage', async () => {
		await expect(service.verifyToken('not-a-token')).rejects.toThrow(UnauthorizedException);
	});
});

describe('AuthService refresh tokens', () => {
	type Session = { memberId: string; tokenHash: string; expiresAt: Date };
	let sessions: Session[];
	const sessionModel = {
		create: (doc: Session) => Promise.resolve(sessions.push(doc)),
		findOneAndDelete: (query: { tokenHash: string; expiresAt: { $gt: Date } }) => ({
			exec: () => {
				const index = sessions.findIndex((s) => s.tokenHash === query.tokenHash && s.expiresAt > query.expiresAt.$gt);
				return Promise.resolve(index < 0 ? null : sessions.splice(index, 1)[0]);
			},
		}),
		deleteOne: (query: { tokenHash: string }) => ({
			exec: () => Promise.resolve((sessions = sessions.filter((s) => s.tokenHash !== query.tokenHash))),
		}),
	};
	const service = new AuthService(new JwtService({ secret: 'test-secret' }), sessionModel as never);
	const memberId = '650000000000000000000001' as never;

	const mockRes = () => ({ cookie: jest.fn<void, [string, string, object]>(), clearCookie: jest.fn() });
	const reqWith = (token?: string) =>
		({ headers: { cookie: token ? `theme=dark; nv_rt=${token}` : undefined } }) as never;
	const issuedToken = (res: ReturnType<typeof mockRes>): string => res.cookie.mock.calls[0][1];

	beforeEach(() => (sessions = []));

	it('stores only a hash and sets an httpOnly cookie', async () => {
		const res = mockRes();
		await service.issueRefreshToken(memberId, res as never);

		const token = issuedToken(res);
		expect(res.cookie).toHaveBeenCalledWith('nv_rt', token, expect.objectContaining({ httpOnly: true }));
		expect(sessions).toHaveLength(1);
		expect(sessions[0].tokenHash).not.toBe(token);
	});

	it('rotates: the old token works once, the new one replaces it', async () => {
		const first = mockRes();
		await service.issueRefreshToken(memberId, first as never);
		const oldToken = issuedToken(first);

		const second = mockRes();
		await expect(service.rotateRefreshToken(reqWith(oldToken), second as never)).resolves.toBe(memberId);
		expect(issuedToken(second)).not.toBe(oldToken);
		expect(sessions).toHaveLength(1);

		const third = mockRes();
		await expect(service.rotateRefreshToken(reqWith(oldToken), third as never)).rejects.toThrow(UnauthorizedException);
		expect(third.clearCookie).toHaveBeenCalled();
	});

	it('rejects a missing or expired token', async () => {
		await expect(service.rotateRefreshToken(reqWith(), mockRes() as never)).rejects.toThrow(UnauthorizedException);

		const res = mockRes();
		await service.issueRefreshToken(memberId, res as never);
		sessions[0].expiresAt = new Date(Date.now() - 1000);
		await expect(service.rotateRefreshToken(reqWith(issuedToken(res)), mockRes() as never)).rejects.toThrow(
			UnauthorizedException,
		);
	});

	it('revokes the session on logout', async () => {
		const res = mockRes();
		await service.issueRefreshToken(memberId, res as never);

		const out = mockRes();
		await service.revokeRefreshToken(reqWith(issuedToken(res)), out as never);
		expect(sessions).toHaveLength(0);
		expect(out.clearCookie).toHaveBeenCalled();
	});
});
