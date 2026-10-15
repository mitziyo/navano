// Demo community articles: every store writes about how it makes its flowers, chocolates or cakes.
// Each article is posted by the store's own account on the FREE board; the cover is the photo of the product named in coverProduct (else the store's first product).
//
// Usage: DEMO_PASSWORD=... node scripts/seed-articles.mjs [http://localhost:3007/graphql]
// Safe to run again: an article with the same title by the same store is not created twice (only its cover is synced).
import { readFile } from 'node:fs/promises';

const API = process.argv[2] ?? 'http://localhost:3007/graphql';
const PASSWORD = process.env.DEMO_PASSWORD;
if (!PASSWORD) {
	console.error('Set DEMO_PASSWORD (the password of the store accounts)');
	process.exit(1);
}

const gql = async (query, variables, token) => {
	const res = await fetch(API, {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
		body: JSON.stringify({ query, variables }),
	});
	const body = await res.json();
	if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join('; '));
	return body.data;
};

const articles = JSON.parse(await readFile(new URL('./seed-articles.data.json', import.meta.url), 'utf8'));
const stores = {};
let created = 0;

for (const article of articles) {
	if (!stores[article.store]) {
		const { login } = await gql('mutation($i: LoginInput!) { login(input: $i) { _id accessToken } }', {
			i: { memberNick: article.store, memberPassword: PASSWORD },
		});
		const lists = await gql(
			`query($p: ProductsInquiry!, $a: BoardArticlesInquiry!) {
				getProducts(input: $p) { list { productTitle productImages } }
				getBoardArticles(input: $a) { list { _id articleTitle articleImage } }
			}`,
			{
				p: { page: 1, limit: 20, search: { memberId: login._id } },
				a: { page: 1, limit: 100, search: { memberId: login._id } },
			},
		);
		stores[article.store] = {
			token: login.accessToken,
			products: lists.getProducts.list,
			existing: lists.getBoardArticles.list,
		};
	}
	const store = stores[article.store];
	const product = store.products.find((item) => item.productTitle === article.coverProduct) ?? store.products[0];
	const cover = product?.productImages?.[0];
	const existing = store.existing.find((item) => item.articleTitle === article.title);
	if (existing) {
		if (cover && existing.articleImage !== cover) {
			await gql(
				'mutation($i: BoardArticleUpdate!) { updateBoardArticle(input: $i) { _id } }',
				{ i: { _id: existing._id, articleImage: cover } },
				store.token,
			);
			console.log(`~ cover ${article.store}: ${article.title}`);
		}
		continue;
	}

	await gql(
		'mutation($i: BoardArticleInput!) { createBoardArticle(input: $i) { _id } }',
		{
			i: {
				articleCategory: 'FREE',
				articleTitle: article.title,
				articleContent: article.content,
				...(cover && { articleImage: cover }),
			},
		},
		store.token,
	);
	created++;
	console.log(`+ ${article.store}: ${article.title}`);
}
console.log(`Done: ${created} new articles.`);
