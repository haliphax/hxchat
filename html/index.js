import constants from "./constants.js";
import {
	authHeaders,
	isBroadcaster,
	isModerator,
	twitchClient,
} from "./twitch.js";
import { hash, hs } from "./util.js";

for (let prop of ["channel", "oauth"]) {
	if (!hs.hasOwnProperty(prop)) {
		window.location = constants.OAUTH_URL;
	}
}

const headers = authHeaders();

/** user object */
const user = await fetch(
	`https://api.twitch.tv/helix/users?login=${hs.channel}`,
	{ headers },
)
	.then((r) => r.json())
	.then((j) => j.data[0]);

/** channel badges */
const channelBadges = {};

await fetch(
	`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${user.id}`,
	{ headers },
)
	.then((r) => r.json())
	.then((j) =>
		j.data.map((v) => {
			const badges = {};

			v.versions.map((v2) => (badges[v2.id] = v2));
			channelBadges[v.set_id] = badges;
		}),
	);

/** global badges */
const globalBadges = {};

await fetch("https://api.twitch.tv/helix/chat/badges/global", { headers })
	.then((r) => r.json())
	.then((j) =>
		j.data.map((v) => {
			const badges = {};

			v.versions.map((v2) => (badges[v2.id] = v2));
			globalBadges[v.set_id] = badges;
		}),
	);

/** vue shared store */
const store = new Vue({
	data: {
		messages: [],
	},
});

/** scroll message into view if enabled */
const scrollMessagesIntoView = () =>
	hs.scroll &&
	requestAnimationFrame(() =>
		document.querySelector(".messages").scrollIntoView({
			behavior: "smooth",
			block: "end",
			inline: "start",
		}),
	);

Vue.component("chat-message", {
	methods: {
		animationEnd(e) {
			if (e.animationName === "slide-in") {
				this.message.displaying = false;
				scrollMessagesIntoView();
			} else if (e.animationName === "slide-out") {
				this.message.dead = true;
			}
		},
		clean(text) {
			return text.replace(/\x01/g, "&lt;");
		},
	},
	computed: {
		badges() {
			return Object.keys(this.message.tags.badges || {}).map((v) => {
				const version = this.message.tags.badges[v];
				const pool = channelBadges.hasOwnProperty(v)
					? channelBadges
					: globalBadges;

				return pool[v]?.[version]?.image_url_1x;
			});
		},
		color() {
			if (this.message.tags.hasOwnProperty("color")) {
				return this.message.tags["color"];
			}

			const generatedColor = hash(
				this.message.tags["display-name"] || this.message.tags.username,
			).substring(0, 6);

			return `#${generatedColor}`;
		},
		messageClasses() {
			const classes = ["message"];

			if (this.message.displaying) {
				classes.push("displaying");
			}

			if (this.message.expired) {
				classes.push("expired");
			}

			if (this.message.dead) {
				classes.push("dead");
			}

			if (this.message.tags["msg-id"] === "highlighted-message") {
				classes.push("highlight");
			}

			return classes;
		},
		parsedMessage() {
			const message = this.message;
			let parsed = message.message.replace(/</g, "\x01");

			if (message.tags.emotes === null) {
				return this.clean(parsed);
			}

			let all = [];

			for (const key of Object.keys(message.tags.emotes)) {
				const emote = message.tags.emotes[key];

				for (const range of emote) {
					const split = range.split("-");

					all.push({
						emote: key,
						start: parseInt(split[0]),
						end: parseInt(split[1]),
					});
				}
			}

			all.sort((a, b) => a.start - b.start);

			let offset = 0;

			for (const emote of all) {
				const tag = `<img class="emote" src="https://static-cdn.jtvnw.net/emoticons/v2/${emote.emote}/default/dark/1.0" />`;
				const keyword = parsed.slice(
					offset + emote.start,
					offset + emote.end + 1,
				);

				parsed =
					parsed.slice(0, offset + emote.start) +
					tag +
					parsed.slice(offset + emote.end + 1);
				offset = offset + tag.length - keyword.length;
			}

			return this.clean(parsed).replace(/> </g, "><");
		},
		processedMessage() {
			let message = this.parsedMessage;

			if (this.textClasses.indexOf("emote-only") > 0) {
				message = message.replace(/\/1.0"/g, '/2.0"');

				if (this.textClasses.indexOf("yuge") > 0) {
					message = message.replace(/\/2.0"/g, '/3.0"');
				}
			}

			return message;
		},
		textClasses() {
			const classes = ["text"];

			if (this.parsedMessage.replace(/<[^>]+>/g, "").trim().length === 0) {
				classes.push("emote-only");

				if (this.parsedMessage.trim().lastIndexOf("<") === 0) {
					classes.push("yuge");
				}
			}

			if (isBroadcaster(this.message.tags)) {
				classes.push("broadcaster");
			}

			return classes;
		},
	},
	props: ["message"],
	template: /*html*/ `
		<li :class="messageClasses" @animationend="animationEnd">
			<span class="user">
				<span class="badges">
					<img class="badge" v-for="badge in badges" :src="badge" />
				</span>
				<span class="username" :style="{ color: color }">
					{{ message.tags['display-name'] }}
				</span>
			</span>
			<span :class="textClasses" v-html="processedMessage">
			</span>
		</li>
	`,
});

Vue.component("chat-overlay", {
	data() {
		return {
			store: store,
		};
	},
	template: /*html*/ `
		<ul class="messages">
			<chat-message v-for="m in store.messages" v-if="!m.dead"
				:key="m.id" :message="m">
			</chat-message>
		</ul>
	`,
});

/** usernames to exclude from display */
const exclude = (hs.exclude?.replace(/\+|%20/g, " ").split(" ") ?? []).map(
	(v) => v.toLowerCase(),
);

// cleanup routine
setInterval(() => {
	if (store.messages.length === 0) {
		return;
	}

	const idx = store.messages.findIndex((v) => !v.dead);

	if (idx === 0) {
		return;
	}

	store.messages.splice(0, idx < 0 ? store.messages.length : idx);
}, constants.CLEANUP_TIMER);

// vue app
new Vue({ el: "body > div:first-child" });

/** Twitch client */
const twitch = twitchClient();

/** clear all chat messages */
const clearChat = () => store.messages.splice(0, store.messages.length);

/** user was banned or timed-out; remove their messages only */
const bannedOrTimedOut = (channel, username) => {
	const msgIndexes = [];
	const lowered = username.toLowerCase();

	for (let i = 0; i < store.messages.length; i++) {
		if (store.messages[i].tags.username === lowered) {
			msgIndexes.push(i);
		}
	}

	for (let index of msgIndexes) {
		store.messages.splice(index);
	}
};

//--- twitch event handlers ----------------------------------------------------

twitch.on("ban", bannedOrTimedOut);

twitch.on("clearchat", clearChat);

twitch.on("message", (channel, tags, message, self) => {
	if (message.startsWith("!")) {
		if ((isModerator(tags) || isBroadcaster(tags)) && message === "!clear") {
			return clearChat();
		}

		if (hs.nocommand) {
			return;
		}
	}

	if (exclude.includes(tags.username)) {
		return;
	}

	store.messages.push({
		message: message,
		tags: tags,
		displaying: true,
		expired: false,
		dead: false,
	});

	setTimeout(() => {
		store.messages.find((v) => !v.expired).expired = true;
	}, constants.DESTRUCT_TIMER);

	scrollMessagesIntoView();
});

twitch.on("messagedeleted", (channel, username, deletedMessage, tags) => {
	const idx = store.messages.findIndex(
		(v) => v.tags["id"] === tags["target-msg-id"],
	);

	if (idx >= 0) {
		store.messages.splice(idx, 1);
	}
});

twitch.on("timeout", bannedOrTimedOut);

twitch.connect();
