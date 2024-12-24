const httpGet = async (url) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
	return await response.json();
};

const getLiveUrl = async (user) => {
	try {
		console.log(`[>] Getting roomId for user ${user}`);
		const roomId = await getRoomIdFromUser(user);
		console.log(`[>] RoomId: ${roomId}`);
		const data = await httpGet(`https://webcast.tiktok.com/webcast/room/info/?aid=1988&room_id=${roomId}`);
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
	async fetch(request) {
		const users = [
			'ohsomefunhouse', 'ohsomescents', 'ohsomebeautyofficial', 'ohsomelovelytoys',
			'ohsometrends', 'ohsomecollections', 'ohsomeunboxfun', 'ohsome.bricksworld', 'ohsometravel'
		];
		const url = new URL(request.url);
		if (url.pathname === '/api/links') {
			const params = new URLSearchParams(url.search);
			let additionalUsers = [];
			const usernamesParam = params.get('usernames');
			if (usernamesParam) {
				try {
					additionalUsers = JSON.parse(usernamesParam);
					if (!Array.isArray(additionalUsers)) throw new Error('usernames parameter must be an array');
				} catch {
					return new Response(JSON.stringify({ error: 'Invalid usernames parameter' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' }
					});
				}
			}

			const allUsers = [...new Set([...users, ...additionalUsers])];
			try {
				const liveUrls = await Promise.all(allUsers.map(async (user) => ({
					user, live_stream_link: await getLiveUrl(user)
				})));

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
