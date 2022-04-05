import constants from '../constants.js';
import { hs } from '../util.js';

const user = await fetch(
	'https://api.twitch.tv/helix/users',
	{
		headers: new Headers({
			'Authorization': `Bearer ${hs.access_token}`,
			'Client-ID': constants.CLIENT_ID,
		})
	})
	.then(r => r.json())
	.then(j => j.data[0]);

window.location = window.location.href.replace(
	/\/oauth(?:\/index\.html)?.*$/i,
	`#oauth=${hs.access_token}&channel=${user.login}`);
