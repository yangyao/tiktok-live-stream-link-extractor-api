const staticFiles = {
	'/index.html': `<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no,minimal-ui" />
		<meta name="referrer" content="no-referrer" />
		<title>tiktok直播大屏</title>
		<style type="text/css">
			html,
			body {
				width: 100%;
				padding: 0;
				margin: 0;
			}
			#container {
				width: 100%;
				display: flex;
				justify-content: center;
				flex-flow: row wrap;
				row-gap: 5px;
			}
			#container .item {
				min-width: 25vw;
				font-size: 0;
				box-sizing: border-box;
			}

			@media screen and (max-width: 600px) {
				#container .item {
					max-width: 100vw;
					min-width: 100vw;
					font-size: 0;
					box-sizing: border-box;
				}
			}
			.xgplayer {
				width: 100% !important;
				background-color: transparent !important;
			}
			.item:has(.xgplayer-is-error) {
				display: none;
			}
			.item {
				position: relative;
			}
			.item > .live-name {
				position: absolute;
				top: 4px;
				left: 0;
				width: 100%;
				text-align: center;
				color: #303133;
				font-size: 20px;
				z-index: 9999;
				font-weight: 600;
			}
		</style>
		<link rel="stylesheet" href="https://unpkg.byted-static.com/xgplayer/3.0.10/dist/index.min.css" />
	</head>
	<body>
		<div id="container"></div>
		<script src="https://unpkg.byted-static.com/xgplayer/3.0.10/dist/index.min.js" charset="utf-8"></script>
		<script src="https://unpkg.byted-static.com/xgplayer-mp4/3.0.10/dist/index.min.js" charset="utf-8"></script>
		<script src="//unpkg.com/xgplayer-hls@latest/dist/index.min.js"></script>
		<script src="//unpkg.com/xgplayer@latest/dist/index.min.js"></script>
		<script src="//unpkg.com/xgplayer@latest/dist/index.min.css"></script>
		<script src="//unpkg.com/xgplayer-flv@latest/dist/index.min.js"></script>
		<script type="text/javascript">
			const run = async() => {
				const response = await fetch('/api/links')
				const liveUrls = await response.json() ?? []
				// 如果里面 live_stream_link 全部是空的，那么使用 window.liveStreamUrls 中的数据
				if (liveUrls.every(({ live_stream_link }) => !live_stream_link)) {
					liveUrls = window.liveStreamUrls
				}
				let MAX_COL = 4 //最多3列
				const config = {
					autoplayMuted: true,
					autoplay: true,
					volume: 0,
					playsinline: true,
					controls: false,
					plugins: [window.FlvPlayer]
				}

				const playerConfig = liveUrls.map(({ live_stream_link: url, user }) => ({ url, ...config, user }))
				const count = playerConfig.length
				/**
				 * 非立即执行防抖函数
				 * @param {Function} func
				 * @param {number} delay
				 * @returns
				 */
				const debounce = (func, delay = 500) => {
					let timeout
					return function () {
						const _this = this
						const args = [...arguments]
						if (timeout) {
							clearTimeout(timeout)
						}
						timeout = setTimeout(() => {
							func.apply(_this, args)
						}, delay)
					}
				}

				const initLive = () => {
					let el = ''
					for (let i = 0; i < count; i++) {
						const liveNameEl = playerConfig[i]?.user ? \`<span class="live-name">\${playerConfig[i].user}</span>\` : \`\`
						el += \`<div class="item">\${liveNameEl}<div class="warp"></div></div>\`
					}
					container.innerHTML = el

					const ids = document.querySelectorAll('#container .warp')
					const players = playerConfig.map((config, index) => ({ p: new Player({ ...config, el: ids[index] }), el: ids[index] }))
					const Events = window.Player.Events
					players.forEach(({ p, el }) => {
						p.on(Events.ERROR, () => {
							container.removeChild(el.parentElement)
							layout()
						})
					})
				}

				const layout = debounce(() => {
					const playerEl = [...document.querySelectorAll('#container .warp')]
					const playerLength = playerEl.length
					const col = Math.ceil(playerLength / MAX_COL)
					container.style.justifyContent = playerLength < MAX_COL ? 'center' : 'flex-start'
					const w = window.innerWidth
					const h = \`\${w <= 600 ? window.innerHeight : window.innerHeight / col}px\`
					for (let i = 0; i < count; i++) {
						if (playerEl[i]) {
							playerEl[i].style.height = h
							playerEl[i].parentElement.style.minWidth = \`\${playerLength >= 9 ? 33.333 : 25}vw\`
						}
					}
				})

				initLive()
				layout()
				window.addEventListener('resize', layout)
			}
			
			run()
		</script>
	</body>
</html>`
};

// The rest of your code remains unchanged
const fetchJson = async (url) => {
	// 强制使用 us 地区
	const response = await fetch(url, { 'X-Region': 'us' });
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
