# hxChat

A [Twitch] chat overlay as a service. Uses no back-end; static files only.

_Note: This overlay's OAuth token **must** belong to the channel broadcaster
or else subscriber badges will not display properly._

## Usage

You may use the [official instance] hosted on GitHub Pages or you may spin up
a version yourself using the provided `docker-compose` setup. Browsing to the
service's homepage will launch the OAuth flow and eventually take you to the
overlay page. Copy and paste the overlay's URL into your streaming software of
choice as a browser source.


[official instance]: https://haliphax.github.io/hxchat
[twitch]: https://twitch.tv
