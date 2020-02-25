# matrix-appservice-wechaty [![[M] Matrix](https://img.shields.io/matrix/matrix-appservice-wechaty:matrix.org?label=%5BM%5D%20Matrix)](https://matrix.to/#/#matrix-appservice-wechaty:matrix.org)

[![NPM Version](https://badge.fury.io/js/matrix-appservice-wechaty.svg)](https://badge.fury.io/js/matrix-appservice-wechaty)
![NPM](https://github.com/wechaty/matrix-appservice-wechaty/workflows/NPM/badge.svg)
![Docker](https://github.com/wechaty/matrix-appservice-wechaty/workflows/Docker/badge.svg)
[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-brightgreen.svg)](https://github.com/wechaty/wechaty)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Greenkeeper badge](https://badges.greenkeeper.io/wechaty/matrix-appservice-wechaty.svg)](https://greenkeeper.io/)

[![dockeri.co](https://dockeri.co/image/wechaty/matrix-appservice)](https://hub.docker.com/r/wechaty/matrix-appservice/)

Matrix Application Services Wechaty Bridge for Wechat Individual Accounts

- [Matrix Bridge Page for Wechaty](https://matrix.org/docs/projects/bridge/matrix-appservice-wechaty)
- [Matrix Bridge List](https://matrix.org/bridges/#we-chat)

![Matrix + Wechaty](https://wechaty.github.io/matrix-appservice-wechaty/images/matrix-wechaty-1280x720.jpg)
> Photo credit: [Matrix Club](https://www.nowshenzhen.com/tag/matrix-club/)

## INTRO

- [Integrate Wechat with Matrix with the power of Wechaty #1737](https://github.com/wechaty/wechaty/issues/1737)

> [Matrix](https://matrix.org/blog/index) is like [Pidgin](http://pidgin.im) on your Phone.
>
> Pidgin try to IM all your friends in one place in Linux, and with Matrix you can have your Phone clinet with your private server which is highly customized. Matrix did not use XMPP protocol, it's server uses REST so that it could be more easy to extend.
>
> This week I had a great talk with YC partner Eric @[ericmigi](https://github.com/ericmigi), who is a serial entrepreneur and also a geek with technology. He uses Matrix a lot and almost integrated all the instance messanger to his Matrix.
>
> But, the matrix does not support Wechat yet. So we'd like to introduce a matrix-wechat bridge to implement the Wechat protocol, and fill the gap between Matrix and Wechat.
>
> @[ericmigi](https://github.com/ericmigi) provide some links that will help us to kick off a starter, hope we could make a workable POC soon, and any contribution will be welcome.
>
> 1. [homeserver install in 1 hr](https://github.com/spantaleev/matrix-docker-ansible-deploy)
> 1. [examples of puppet bridges](https://github.com/matrix-hacks/matrix-puppet-bridge)
>
> &mdash; <cite>Huan, April 2019</cite>

---

> @[tulir](https://github.com/tulir) has very rich experiences with building the matrix bridges such as:
>
> 1. [A Matrix-Telegram hybrid puppeting/relaybot bridge](https://github.com/tulir/mautrix-telegram)
> 1. [A Matrix-WhatsApp puppeting bridge](https://github.com/tulir/mautrix-whatsapp)
>
> &mdash; <cite>Huan, May 2019</cite>

## HOW TO USE MATRIX

I'd like to recommend using Riot for using Matrix. Riot is a universal secure chat app entirely under your control. It supports all types of the platforms, including Web/Browser, Android, and iPhone.

- <https://riot.im/app/>
- <https://riot.chatie.io/>

## INSTALL

`matrix-appservcie-wechaty` is a very easy to use bridge for Matrix. It supports two installation methods:

1. NPM
1. Docker

### NPM

[![NPM Version](https://badge.fury.io/js/matrix-appservice-wechaty.svg)](https://badge.fury.io/js/matrix-appservice-wechaty)
[![npm (next)](https://img.shields.io/npm/v/matrix-appservice-wechaty/next.svg)](https://www.npmjs.com/package/matrix-appservice-wechaty?activeTab=versions)

```sh
sudo npm install -g matrix-appservice-wechaty
```

### Docker

[![dockeri.co](https://dockeri.co/image/wechaty/matrix-appservice)](https://hub.docker.com/r/wechaty/matrix-appservice)

To be documented...

```sh
docker run \
  --rm \
  --name matrix-appservice-wechaty \
  --mount type=bind,source="$(pwd)",target=/data \
  wechaty/matrix-appservice
```

## USAGE

### Authentication

This part is __"steal"__ from <https://github.com/tulir/mautrix-whatsapp/wiki/Authentication>

#### Logging in

1. Start a chat with the bridge bot. The bot should say _"This room has been registered as your bridge management/status room."_ if you started the chat correctly.
1. Run `login`
1. Log in by scanning the QR code. If the code expires before you scan it, the bridge will send an error to notify you.
    1. Open Wechat on your phone.
    1. Tap Menu or Settings and select Scan.
    1. Point your phone at the image sent by the bot to capture the code.
1. Finally, the bot should inform you of a successful login and the bridge should start creating portal rooms for all your Wechat groups and private chats.

#### Logging out

Simply run the `logout` management command.

## SEE ALSO

- [Matrix Application Services](https://matrix.org/docs/guides/application-services)
- [Matrix Javascript SDK v2.0](https://matrix-org.github.io/matrix-js-sdk/2.0.1/index.html)
- [Bridging infrastructure for Application Services - HOWTO](https://github.com/matrix-org/matrix-appservice-bridge/blob/master/HOWTO.md)
- [Matrix Application Service Bridge Node.js SDK](http://matrix-org.github.io/matrix-appservice-bridge/)
- [Matrix Application Service API](https://matrix.org/docs/spec/application_service/r0.1.0.html)
- [Matrix Client-Server API](https://matrix.org/docs/spec/client_server/r0.4.0.html)
- [Matrix Specification](https://matrix.org/docs/spec/)

### Matrix AppService Bridges in TypeScript

- [A bridge between Matrix and Discord](https://github.com/Half-Shot/matrix-appservice-discord)

### Matrix AppService Bridges in JavaScript

- [Matrix<->Skype user-puppeting portal](https://github.com/mobitel-ltd/matrix-skype-bridge)
- [Communication Matrix with Skype via puppet](https://github.com/mobitel-ltd/mobitel-matrix-puppet-skype)
- [Matrix AppService Bridge Gitter](https://github.com/matrix-org/matrix-appservice-gitter)
- [Node.js Telegram bridge for Matrix](https://github.com/FruitieX/matrix-appservice-telegram)
- [Slack-compatible webhooks for matrix](https://github.com/turt2live/matrix-appservice-webhooks)
- [A matrix SMS bridge, powered by Twilio](https://github.com/turt2live/matrix-appservice-twilio)
- [Node.js IRC bridge for Matrix](https://github.com/matrix-org/matrix-appservice-irc)

## HISTORY

### master

### v0.5 (Beta) Feb 25, 2020

1. Testing and refining with Eric @[ericmigi](https://github.com/ericmigi)

### v0.4 (Alpha) July 14, 2019

1. Support receive/send Wechat message in Matrix. (individuals and rooms)
1. Tested with Web API([wechaty-puppet-puppeteer](https://github.com/wechaty/wechaty-puppet-puppeteer)) and Pad API([wechaty-puppet-padpro](https://github.com/botorange/wechaty-puppet-padpro))

#### Known Issues

1. The names/avatars of Wechat users/groups are not set right on Matrix.
1. Only support text message, Image/Audio/Video message is not supported yet. (Will be supported in the future version)
1. Appservice will create more than one matrix room for a Wechat room when receiving messages from it for the very first time. (It will stop creating new rooms after you accepted the invitation)
1. Login QR Code should not use the 3rd party API for security considerations. A better way is to upload the QR Code image to matrix server instead.

### v0.2 July 6,  2019

1. Enable your matrix account to start using `matrix-appservice-wechaty` by talk to the bot `@wechaty:your.domain`
1. After you talk to `@wechaty`, it will send you Wechat Login QR Code. Scan it to login Wechat
1. All Wechat messages will be bridged to the Matrix system, in the room that you talk to the bot at the very first time.

### v0.0.1 May 2019

1. Auto response the message in a Matrix Room.

## DISCLAIMER

Copied from disclaimer part from [matrix-appservice-discord](https://github.com/Half-Shot/matrix-appservice-discord/blob/master/docs/puppeting.md#caveats--disclaimer):

> I accept no responsibility if Tencent ban your IP, Account or even your details on their system. They have never given official support on custom clients.

## Author

[Huan](https://github.com/huan) [(李卓桓)](http://linkedin.com/in/zixia) <zixia@zixia.net>

[![Profile of Huan LI (李卓桓) on StackOverflow](https://stackexchange.com/users/flair/265499.png)](https://stackexchange.com/users/265499)

## Copyright & License

- Code & Docs © 2019 - now Huan (李卓桓) <zixia@zixia.net>
- Code released under the Apache-2.0 License
- Docs released under Creative Commons
