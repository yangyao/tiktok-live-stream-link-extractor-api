/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npx wrangler dev src/index.js` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npx wrangler publish src/index.js --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const httpGet = async (url) => {
	try {
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		return await response.json();
	} catch (error) {
		throw error;
	}
};

const getLiveUrl = async (user) => {
	try {
		console.log(`[>] Getting roomId for user ${user}`);
		const roomId = await getRoomIdFromUser(user);
		console.log(`[>] RoomId: ${roomId}`);
		const responseText = await httpGet(`https://webcast.tiktok.com/webcast/room/info/?aid=1988&room_id=${roomId}`);
		const data = responseText;
		const liveUrlFlv = data?.data?.stream_url?.rtmp_pull_url;
		if (!liveUrlFlv && data.status_code === 4003110) throw new Error('LiveNotFound');
		console.info(`[>] LIVE URL: ${liveUrlFlv}`);
		return liveUrlFlv;
	} catch (e) {
		console.error(`Error getting live URL for user ${user}: ${e.message}`);
		return '';
	}
};

const getRoomIdFromUser = async (user) => {
	const content = await fetch(`https://www.tiktok.com/@${user}/live`).then(res => res.text());
	if (content.includes('Please wait...')) throw new Error('IPBlockedByWAF');
	const match = content.match(/<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/);
	if (!match) throw new Error("[-] Error extracting roomId");
	const data = JSON.parse(match[1]);
	const roomId = data?.LiveRoom?.liveRoomUserInfo?.user?.roomId;
	if (!roomId) throw new Error("RoomId not found.");
	return roomId;
};

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		if (url.pathname === '/api/links') {
			const users = [
				'ohsomefunhouse',
				'ohsomescents',
				'ohsomebeautyofficial',
				'ohsomelovelytoys',
				'ohsometrends',
				'ohsomecollections',
				'ohsomeunboxfun',
				'ohsome.bricksworld',
				'ohsometravel'
			];

			try {
				const liveUrls = await Promise.all(users.map(async (user) => {
					const liveUrl = await getLiveUrl(user);
					return { user, live_stream_link: liveUrl };
				}));

				return new Response(JSON.stringify(liveUrls), {
					headers: { 'Content-Type': 'application/json' }
				});
			} catch (error) {
				return new Response(JSON.stringify({ error: error.message }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		return new Response("Hello World!");
	},
};
