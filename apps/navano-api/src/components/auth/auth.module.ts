import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import SessionSchema from '../../schemas/Session.model';

@Module({
	imports: [
		HttpModule,
		MongooseModule.forFeature([{ name: 'Session', schema: SessionSchema }]),
		// Async factory: runs after ConfigModule.forRoot() has loaded .env. A static
		// register() read process.env at import time and signed tokens with "undefined".
		JwtModule.registerAsync({
			useFactory: () => {
				const secret = process.env.SECRET_TOKEN;
				if (!secret) throw new Error('SECRET_TOKEN is not set');
				// Short-lived: the refresh cookie (AuthService.issueRefreshToken) renews it
				return { secret, signOptions: { expiresIn: '15m' } };
			},
		}),
	],
	providers: [AuthService],
	exports: [AuthService],
})
export class AuthModule {}
