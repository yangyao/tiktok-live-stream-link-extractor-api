const staticFiles = {
	'/index.html': `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Live Stream Links</title>
	<link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="https://unpkg.byted-static.com/xgplayer/3.0.10/dist/index.min.css">
</head>
<body>
	<h1>Live Stream Links</h1>
	<div id="live-urls" class="card-container"></div>
  <script src="https://unpkg.byted-static.com/xgplayer/3.0.10/dist/index.min.js" charset="utf-8"></script>
  <script src="https://unpkg.byted-static.com/xgplayer-mp4/3.0.10/dist/index.min.js" charset="utf-8"></script>
  <script src="//unpkg.com/xgplayer-hls@latest/dist/index.min.js"></script>
  <script src="//unpkg.com/xgplayer@latest/dist/index.min.js"></script>
<script src="//unpkg.com/xgplayer@latest/dist/index.min.css"></script>
<script src="//unpkg.com/xgplayer-flv@latest/dist/index.min.js"></script>
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
		userDiv.className = 'card';
		userDiv.innerHTML = \`
			<h2>\${user}</h2>
			<div id="player-\${user}" class="player"></div>
		\`;
		liveUrlsContainer.appendChild(userDiv);

		if (live_stream_link) {
			const player = new Player({
				id: 'player-' + user,
				url: live_stream_link,
				autoplay: true,
				volume: 0.3,
				autoplay: true,
				playsinline: true,
				width: 300,
				plugins: [window.FlvPlayer]
			});
		}
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

.card-container {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
}

.card {
	background-color: #fff;
	border: 1px solid #ddd;
	border-radius: 10px;
	padding: 10px;
	margin: 10px;
	width: 300px;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.card h2 {
	margin: 0 0 10px;
	text-align: center;
}

.player {
	width: 100%;
	height: 0;
	padding-bottom: 56.25%; /* 16:9 aspect ratio */
	position: relative;
}

.player video {
	position: absolute;
	width: 100%;
	height: 100%;
	top: 0;
	left: 0;
}
`
};

// The rest of your code remains unchanged
const fetchJson = async (url) => {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
	return await response.json();
};

const getLiveUrl = async (user) => {
	try {
		const roomId = await getRoomIdFromUser(user);
		const data = await fetchJson(`https://webcast.tiktok.com/webcast/room/info/?aid=1988&room_id=${roomId}`);
		const liveUrlFlv = data?.data?.stream_url?.rtmp_pull_url;
		if (!liveUrlFlv && data.status_code === 4003110) throw new Error('LiveNotFound');
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
	if (!match) throw new Error("Error extracting roomId");
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

const handleApiLinksRequest = async (url) => {
	const params = new URLSearchParams(url.search);
	const usernamesParam = params.get('usernames');
	let additionalUsers = [];
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

	const users = [
		'ohsomefunhouse', 'ohsomescents', 'ohsomebeautyofficial', 'ohsomelovelytoys',
		'ohsometrends', 'ohsomecollections', 'ohsomeunboxfun', 'ohsome.bricksworld', 'ohsometravel'
	];
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
};

const handleRequest = async (request) => {
	const url = new URL(request.url);
	const path = url.pathname;

	if (staticFiles[path]) {
		return new Response(staticFiles[path], {
			headers: { "Content-Type": getContentType(path) },
		});
	}

	if (url.pathname === '/' || url.pathname === '') {
		return new Response(staticFiles['/index.html'], {
			headers: { "Content-Type": "text/html" },
		});
	}

	if (url.pathname === '/api/links') {
		return handleApiLinksRequest(url);
	}

	return new Response("Hello World!");
};

export default {
	async fetch(request) {
		return handleRequest(request);
	},
};
