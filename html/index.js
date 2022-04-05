import constants from './constants.js'
import { twitchClient } from "./twitch.js";
import { hs } from './util.js';

for (let prop of ['channel', 'oauth', 'username']) {
	if (!hs.hasOwnProperty(prop)) {
		window.location = constants.OAUTH_URL;
	}
}

const headers = new Headers({
	'Authorization': `Bearer ${hs.oauth}`,
	'Client-ID': constants.CLIENT_ID,
});

/** configuration object */
const user = await fetch(
	`https://api.twitch.tv/helix/users?login=${hs.channel}`,
	{ headers })
	.then(r => r.json())
	.then(j => j.data[0]);
/** channel badges */
const channelBadges = await fetch(
	`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${user.id}`,
	{ headers })
	.then(r => r.json())
	.then(j => j.data);
/** global badges */
const globalBadges = await fetch(
	'https://badges.twitch.tv/v1/badges/global/display')
	.then(r => r.json())
	.then(j => j.badge_sets);

/** vue shared store */
const store = new Vue({
	data: {
		messages: [],
	},
});

Vue.component('chat-message', {
	data() {
		return {
			store: store,
		}
	},
	methods: {
		animationEnd(e) {
			if (e.animationName == 'slide-in') {
				this.message.displaying = false;
			}
			else if (e.animationName == 'slide-out') {
				this.message.dead = true;
			}
		},
		clean(text) {
			return text.replace(/\x01/g, '&lt;');
		},
	},
	computed: {
		badges() {
			return Object.keys(this.message.tags.badges || {}).map(v => {
				const version = this.message.tags.badges[v];
				const pool = (channelBadges.hasOwnProperty(v)
					? channelBadges : globalBadges);

				return pool[v]?.versions[version]?.image_url_1x;
			});
		},
		messageClasses() {
			const classes = ['message'];

			if (this.message.displaying) { classes.push('displaying'); }
			if (this.message.expired) { classes.push('expired'); }
			if (this.message.dead) { classes.push('dead'); }

			if (this.message.tags['msg-id'] == 'highlighted-message') {
				classes.push('highlight');
			}

			return classes;
		},
		parsedMessage() {
			const message = this.message;
			let parsed = message.message.replace(/</g, '\x01');

			if (message.tags.emotes === null) {
				return this.clean(parsed);
			}

			let all = [];

			for (const key of Object.keys(message.tags.emotes)) {
				const emote = message.tags.emotes[key];

				for (const range of emote) {
					const split = range.split('-');

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
				const keyword = parsed.slice(offset + emote.start, offset + emote.end + 1);

				parsed = parsed.slice(0, offset + emote.start)
					+ tag + parsed.slice(offset + emote.end + 1);
				offset = offset + tag.length - keyword.length;
			}

			return this.clean(parsed).replace(/> </g, '><');
		},
		processedMessage() {
			let message = this.parsedMessage;

			if (this.textClasses.indexOf('emote-only') > 0) {
				message = message.replace(/\/1.0"/g, '/2.0"');

				if (this.textClasses.indexOf('yuge') > 0) {
					message = message.replace(/\/2.0"/g, '/3.0"');
				}
			}

			return message;
		},
		textClasses() {
			const classes = ['text'];

			if (this.parsedMessage.replace(/<[^>]+>/g, '').trim().length === 0) {
				classes.push('emote-only');

				if (this.parsedMessage.trim().lastIndexOf('<') === 0) {
					classes.push('yuge');
				}
			}

			if (isBroadcaster(this.message.tags)) {
				classes.push('broadcaster');
			}

			return classes;
		},
	},
	props: ['message'],
	template: /*html*/`
		<li :class="messageClasses" @animationend="animationEnd">
			<span class="user">
				<span class="badges">
					<img class="badge" v-for="badge in badges" :src="badge" />
				</span>
				<span class="username" :style="{ color: message.tags['color'] }">
					{{ message.tags['display-name'] }}
				</span>
			</span>
			<span :class="textClasses" v-html="processedMessage">
			</span>
		</li>
	`,
});

Vue.component('chat-overlay', {
	data() {
		return {
			store: store,
		};
	},
	template: /*html*/`
		<ul class="messages">
			<chat-message v-for="m in store.messages" v-if="!m.dead"
				:key="m.id" :message="m">
			</chat-message>
		</ul>
	`,
});

/** Twitch client */
const twitch = twitchClient();

twitch.on('message', (channel, tags, message, self) => {
	store.messages.push({
		message: message,
		tags: tags,
		displaying: true,
		expired: false,
		dead: false,
	});

	setTimeout(
		() => { store.messages.find(v => !v.expired).expired = true; },
		constants.DESTRUCT_TIMER);
});
twitch.connect();

setInterval(
	() => {
		if (store.messages.length === 0) {
			return;
		}

		const idx = store.messages.findIndex(v => !v.dead);

		if (idx === 0) {
			return;
		}

		store.messages.splice(0, idx < 0 ? store.messages.length : idx);
	},
	constants.CLEANUP_TIMER);

new Vue({ el: 'body > div:first-child' });
