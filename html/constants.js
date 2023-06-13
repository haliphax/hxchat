import { hs } from "./util.js";

const constants = {
	/** number of milliseconds between cleanup sweeps */
	CLEANUP_TIMER: 10 * 1000,
	/** number of milliseconds before messages disappear */
	DESTRUCT_TIMER: parseInt(hs.lifetime ?? "90") * 1000,
	CLIENT_ID: "0k7bszf8tyc215ocmvp5hiuo7y5nsr",
	OAUTH_REDIRECT_URI: "",
	OAUTH_URL: "",
};

constants.OAUTH_REDIRECT_URI = encodeURIComponent(
	window.location.href.replace(/(?:\/index\.html)?$/i, "oauth")
);

constants.OAUTH_URL =
	`https://id.twitch.tv/oauth2/authorize` +
	`?client_id=${constants.CLIENT_ID}` +
	`&redirect_uri=${constants.OAUTH_REDIRECT_URI}` +
	"&response_type=token" +
	"&scope=chat:read%20chat:edit";

export default constants;
