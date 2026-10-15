import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { Member } from '../../libs/dto/member/member';

// uuid is ESM-only and Jest runs CommonJS; config.ts only needs it for image names
jest.mock('uuid', () => ({ v4: () => 'uuid' }));

describe('AuthService tokens', () => {
	const member = { _id: '650000000000000000000001', memberNick: 'NATHAN', memberPassword: 'hash' } as unknown as Member;
	const service = new AuthService(new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1h' } }));

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
