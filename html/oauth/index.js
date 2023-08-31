import { authHeaders } from "../twitch.js";
import { hs } from "../util.js";

const headers = authHeaders("access_token");

const user = await fetch("https://api.twitch.tv/helix/users", { headers })
	.then((r) => r.json())
	.then((j) => j.data[0]);

const form = document.querySelector("form");

form.action = window.location.href.replace(
	/\/oauth(?:\/index\.html)?.*$/i,
	`#oauth=${hs.access_token}&channel=${user.login}`,
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
