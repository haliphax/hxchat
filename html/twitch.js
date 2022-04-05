import { hs } from './util.js';

/** Twitch client */
const twitchClient = () => new tmi.Client({
	channels: [hs.channel],
	identity: {
		username: hs.channel,
		password: `oauth:${hs.oauth}`,
	},
	options: { debug: true, },
});

/** based on tags, is this user the broadcaster? */
const isBroadcaster = tags => tags.badges.hasOwnProperty('broadcaster');
/** based on tags, is this user a moderator? */
const isModerator = tags => tags.mod;

export {
	isBroadcaster,
	isModerator,
	twitchClient,
};
