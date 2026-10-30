// One-off seed: loads the CS notices and FAQ (formerly static in navano-client csContent.ts)
// into the `notices` collection through the GraphQL API, as an admin.
//
// Usage: ADMIN_NICK=... ADMIN_PASSWORD=... node scripts/seed-cs.mjs [http://localhost:5070/graphql]
// Skips everything when the API already has notices or FAQ, so it is safe to run twice.
import { readFile } from 'node:fs/promises';

const API = process.argv[2] ?? 'http://localhost:5070/graphql';
const { ADMIN_NICK, ADMIN_PASSWORD } = process.env;
if (!ADMIN_NICK || !ADMIN_PASSWORD) {
	console.error('Set ADMIN_NICK and ADMIN_PASSWORD');
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

const { login } = await gql(
	'mutation Login($input: LoginInput!) { login(input: $input) { accessToken memberType } }',
	{ input: { memberNick: ADMIN_NICK, memberPassword: ADMIN_PASSWORD } },
);
if (login.memberType !== 'ADMIN') throw new Error(`${ADMIN_NICK} is not an ADMIN`);
const token = login.accessToken;

const existing = await gql(
	'query { getAllNoticesByAdmin(input: { page: 1, limit: 1, search: {} }) { metaCounter { total } } }',
	{},
	token,
);
if (existing.getAllNoticesByAdmin.metaCounter?.[0]?.total) {
	console.log('Notices already exist, nothing to do.');
	process.exit(0);
}

const data = JSON.parse(await readFile(new URL('./seed-cs.data.json', import.meta.url), 'utf8'));
const create = 'mutation Create($input: NoticeInput!) { createNotice(input: $input) { _id } }';

// Oldest first, so the API's createdAt order matches the original order
for (const input of [...data.notices, ...data.faqs]) {
	await gql(create, { input }, token);
	console.log(`+ ${input.noticeCategory} ${input.noticeTopic}: ${input.noticeTitle}`);
}
console.log(`Done: ${data.notices.length} notices, ${data.faqs.length} FAQ.`);
