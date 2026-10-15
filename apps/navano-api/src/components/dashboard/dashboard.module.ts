import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from '../../schemas/Member.model';
import ProductSchema from '../../schemas/Product.model';
import BoardArticleSchema from '../../schemas/BoardArticle.model';
import InquirySchema from '../../schemas/Inquiry.model';
import NoticeSchema from '../../schemas/Notice.model';
import { AuthModule } from '../auth/auth.module';
import { DashboardResolver } from './dashboard.resolver';
import { DashboardService } from './dashboard.service';

// Read-only counts for the admin home page
@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'Member', schema: MemberSchema },
			{ name: 'Product', schema: ProductSchema },
			{ name: 'BoardArticle', schema: BoardArticleSchema },
			{ name: 'Inquiry', schema: InquirySchema },
			{ name: 'Notice', schema: NoticeSchema },
		]),
		AuthModule,
	],
	providers: [DashboardResolver, DashboardService],
})
export class DashboardModule {}
