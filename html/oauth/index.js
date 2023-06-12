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

const form = document.querySelector('form');

form.action = window.location.href.replace(
	/\/oauth(?:\/index\.html)?.*$/i,
	`#oauth=${hs.access_token}&channel=${user.login}`);

form.addEventListener('submit', ev => {
	if (document.getElementById('nocommand').checked) {
		form.action += "&nocommand=1";
	}

	const exclude = document.getElementById('exclude').value;

	if (exclude) {
		form.action += `&exclude=${encodeURIComponent(exclude)}`;
	}

	const lifetime = document.getElementById('lifetime').value;

	if (lifetime) {
		form.action += `&lifetime=${encodeURIComponent(lifetime)}`;
	}
});
