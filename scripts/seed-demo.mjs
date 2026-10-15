// Demo data for Navano through the GraphQL API (so counters and notifications stay right).
// 1. stores, customers, their profiles and follows
// 2. products with photos, and cover photos for the stores that have one listed
//
// Usage: DEMO_PASSWORD=... DEMO_IMAGES=<folder with the photos> node scripts/seed-demo.mjs [http://localhost:3007/graphql]
// Safe to run again: existing members log in, existing follows and products (same store + title) are skipped.
// Products whose photo file is missing are skipped with a warning, so they can be added on a later run.
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const API = process.argv[2] ?? 'http://localhost:3007/graphql';
const PASSWORD = process.env.DEMO_PASSWORD;
const IMAGES = process.env.DEMO_IMAGES;
if (!PASSWORD) {
	console.error('Set DEMO_PASSWORD (the password of every demo account)');
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

// GraphQL multipart upload (same request the client's AddNewProduct sends)
const upload = async (files, target, token) => {
	const form = new FormData();
	form.append(
		'operations',
		JSON.stringify({
			query: 'mutation Upload($files: [Upload!]!, $target: String!) { imagesUploader(files: $files, target: $target) }',
			variables: { files: files.map(() => null), target },
		}),
	);
	form.append('map', JSON.stringify(Object.fromEntries(files.map((_, i) => [String(i), [`variables.files.${i}`]]))));
	for (const [i, file] of files.entries()) {
		const type = /\.png$/i.test(file) ? 'image/png' : 'image/jpeg';
		form.append(String(i), new Blob([await readFile(file)], { type }), path.basename(file));
	}
	const res = await fetch(API, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'apollo-require-preflight': 'true' },
		body: form,
	});
	const body = await res.json();
	const urls = body.data?.imagesUploader ?? [];
	if (body.errors?.length || urls.length !== files.length || urls.some((url) => !url)) {
		throw new Error(`upload failed: ${JSON.stringify(body.errors ?? urls)}`);
	}
	return urls;
};

const exists = (file) =>
	access(file).then(
		() => true,
		() => false,
	);

const LOGIN = 'mutation Login($input: LoginInput!) { login(input: $input) { _id accessToken memberCover memberImage memberAddress } }';
const SIGNUP = 'mutation Signup($input: MemberInput!) { signup(input: $input) { _id accessToken memberCover memberImage memberAddress } }';
const UPDATE = 'mutation Update($input: MemberUpdate!) { updateMember(input: $input) { _id } }';
const FOLLOW = 'mutation Follow($id: String!) { subscribe(input: $id) { _id } }';
const STORE_TITLES =
	'query Titles($input: ProductsInquiry!) { getProducts(input: $input) { list { productTitle } } }';
const CREATE_PRODUCT = 'mutation Create($input: ProductInput!) { createProduct(input: $input) { _id } }';

const data = JSON.parse(await readFile(new URL('./seed-demo.data.json', import.meta.url), 'utf8'));

/** 1. MEMBERS AND FOLLOWS **/

// Log in, or sign up when the nick does not exist yet
const session = async (member) => {
	try {
		return (await gql(LOGIN, { input: { memberNick: member.nick, memberPassword: PASSWORD } })).login;
	} catch (err) {
		if (!/No member/i.test(err.message)) throw err;
		const input = { memberNick: member.nick, memberPassword: PASSWORD, memberPhone: member.phone, memberType: member.type };
		const created = (await gql(SIGNUP, { input })).signup;
		console.log(`+ ${member.type} ${member.nick}`);
		return created;
	}
};

const accounts = {};
for (const member of [...data.stores, ...data.customers]) {
	const { _id, accessToken, memberCover, memberImage, memberAddress } = await session(member);
	accounts[member.nick] = { _id, token: accessToken, cover: memberCover, image: memberImage, address: member.address ?? memberAddress, member };
	// Profile texts only for the members this file defines
	if (member.fullName) {
		await gql(
			UPDATE,
			{ input: { _id, memberFullName: member.fullName, memberAddress: member.address, memberDesc: member.desc } },
			accessToken,
		);
	}
}

// Every store gets the same number of followers: customer i follows stores i, i+1, ... (round robin)
let follows = 0;
for (const [i, nick] of data.followCustomers.entries()) {
	for (let k = 0; k < data.followsPerCustomer; k++) {
		const store = data.followStores[(i + k) % data.followStores.length];
		try {
			await gql(FOLLOW, { id: accounts[store]._id }, accounts[nick].token);
			follows++;
			console.log(`  ${nick} -> ${store}`);
		} catch (err) {
			if (!/Create failed/i.test(err.message)) throw err; // already following
		}
	}
}

/** 2. PRODUCTS AND STORE COVERS **/

let products = 0;
const missing = [];
if (!IMAGES) {
	console.log('DEMO_IMAGES not set: skipping products and covers.');
} else {
	for (const product of data.products ?? []) {
		const owner = accounts[product.store];
		const files = product.images.map((name) => path.join(IMAGES, name));
		if (!(await Promise.all(files.map(exists))).every(Boolean)) {
			missing.push(`${product.store}: ${product.title}`);
			continue;
		}
		const titles = (
			await gql(STORE_TITLES, {
				input: { page: 1, limit: 100, search: { memberId: owner._id } },
			})
		).getProducts.list.map((item) => item.productTitle);
		if (titles.includes(product.title)) continue;

		const productImages = await upload(files, 'product', owner.token);
		await gql(
			CREATE_PRODUCT,
			{
				input: {
					productType: product.type,
					productLocation: product.location,
					productAddress: product.address ?? owner.address,
					productOccasion: product.occasion,
					productTitle: product.title,
					productPrice: product.price,
					productItemCount: product.count,
					productImages,
					productDesc: product.desc,
				},
			},
			owner.token,
		);
		products++;
		console.log(`+ product ${product.store}: ${product.title}`);
	}

	for (const store of data.stores.filter((item) => item.cover)) {
		const account = accounts[store.nick];
		const file = path.join(IMAGES, store.cover);
		if (account.cover || !(await exists(file))) continue;
		const [memberCover] = await upload([file], 'member', account.token);
		await gql(UPDATE, { input: { _id: account._id, memberCover } }, account.token);
		console.log(`+ cover ${store.nick}`);
	}

	// Avatar = a square product photo of the store, set only when the store has no photo yet
	for (const store of data.stores.filter((item) => item.avatar)) {
		const account = accounts[store.nick];
		const file = path.join(IMAGES, store.avatar);
		if (account.image || !(await exists(file))) continue;
		const [memberImage] = await upload([file], 'member', account.token);
		await gql(UPDATE, { input: { _id: account._id, memberImage } }, account.token);
		console.log(`+ avatar ${store.nick}`);
	}
}

console.log(`Done: ${Object.keys(accounts).length} accounts, ${follows} new follows, ${products} new products.`);
if (missing.length) console.log(`Waiting for photos: ${missing.join('; ')}`);
