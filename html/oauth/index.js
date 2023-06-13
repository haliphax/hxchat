import constants from "../constants.js";
import { hs } from "../util.js";

const user = await fetch("https://api.twitch.tv/helix/users", {
	headers: new Headers({
		Authorization: `Bearer ${hs.access_token}`,
		"Client-ID": constants.CLIENT_ID,
	}),
})
	.then((r) => r.json())
	.then((j) => j.data[0]);

const form = document.querySelector("form");

form.action = window.location.href.replace(
	/\/oauth(?:\/index\.html)?.*$/i,
	`#oauth=${hs.access_token}&channel=${user.login}`
);

form.addEventListener("submit", (ev) => {
	// toggles
	["nocommand", "scroll"].forEach((toggle) => {
		if (document.getElementById(toggle).checked) {
			form.action += `&${toggle}=1`;
		}
	});

	// options
	["exclude", "lifetime"].forEach((option) => {
		const value = document.getElementById(option).value;

		if (value) {
			form.action += `&${option}=${encodeURIComponent(value)}`;
		}
	});
});
