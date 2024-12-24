const staticFiles = {
	'/index.html': `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Live Stream Links</title>
	<link rel="stylesheet" href="style.css">
</head>
<body>
	<h1>Live Stream Links</h1>
	<div id="live-urls"></div>
	<script src="app.js"></script>
</body>
</html>
`,
	'/app.js': `
document.addEventListener('DOMContentLoaded', async () => {
	const response = await fetch('/api/links');
	const liveUrls = await response.json();
	const liveUrlsContainer = document.getElementById('live-urls');
	liveUrls.forEach(({ user, live_stream_link }) => {
		const userDiv = document.createElement('div');
		userDiv.className = 'user';
		userDiv.innerHTML = \`
			<h2>\${user}</h2>
			<p><a href="\${live_stream_link}" target="_blank">\${live_stream_link}</a></p>
		\`;
		liveUrlsContainer.appendChild(userDiv);
	});
});
`,
	'/style.css': `
body {
	font-family: Arial, sans-serif;
	margin: 0;
	padding: 20px;
	background-color: #f0f0f0;
}

h1 {
	text-align: center;
}

.user {
	background-color: #fff;
	border: 1px solid #ddd;
	border-radius: 5px;
	padding: 10px;
	margin: 10px 0;
}

.user h2 {
	margin: 0 0 10px;
}

.user a {
	color: #007bff;
	text-decoration: none;
}

	user a:hover {
	text-decoration: underline;
}
`
};

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

const getContentType = (path) => {
	if (path.endsWith(".html")) return "text/html";
	if (path.endsWith(".js")) return "application/javascript";
	if (path.endsWith(".css")) return "text/css";
	return "text/plain";
};

export default {
	async fetch(request) {
		const url = new URL(request.url);
		const path = url.pathname;

		// Serve static files (HTML, CSS, JS)
		if (staticFiles[path]) {
			return new Response(staticFiles[path], {
				headers: { "Content-Type": getContentType(path) },
			});
		}

		// Serve index.html for the root path
		if (url.pathname === '/' || url.pathname === '') {
			return new Response(staticFiles['/index.html'], {
				headers: { "Content-Type": "text/html" },
			});
		}

		const users = [
			'ohsomefunhouse', 'ohsomescents', 'ohsomebeautyofficial', 'ohsomelovelytoys',
			'ohsometrends', 'ohsomecollections', 'ohsomeunboxfun', 'ohsome.bricksworld', 'ohsometravel'
		];

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
