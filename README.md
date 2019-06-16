# MATRIX-APPSERVICE-WECHATY

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-blue.svg)](https://github.com/chatie/wechaty)
[![NPM Version](https://badge.fury.io/js/matrix-appservice-wechaty.svg)](https://badge.fury.io/js/matrix-appservice-wechaty)
[![Build Status](https://api.travis-ci.com/huan/matrix-appservice-wechaty.svg?branch=master)](https://travis-ci.com/huan/matrix-appservice-wechaty)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Greenkeeper badge](https://badges.greenkeeper.io/huan/matrix-appservice-wechaty.svg)](https://greenkeeper.io/)

![Matrix + Wechaty](https://huan.github.io/matrix-appservice-wechaty/images/matrix-wechaty-1280x720.jpg)
> Photo credit: [Matrix Club](https://www.nowshenzhen.com/tag/matrix-club/)

Matrix Application Services Wechaty Bridge for Wechat Individual Accounts

## UNDER CONSTRUCTING

## INTRO

- [Integrate Wechat with Matrix with the power of Wechaty #1737](https://github.com/Chatie/wechaty/issues/1737)

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
> -- Apr 2019

---

> @[tulir](https://github.com/tulir) has very rich experiences with building the matrix bridges such as:
>
> 1. [A Matrix-Telegram hybrid puppeting/relaybot bridge](https://github.com/tulir/mautrix-telegram)
> 1. [A Matrix-WhatsApp puppeting bridge](https://github.com/tulir/mautrix-whatsapp)
>
> -- May 2019

## HOW TO USE MATRIX

I'd like to recommend using Riot for using Matrix. Riot is a universal secure chat app entirely under your control. It supports all types of the platforms, including Web/Browser, Android, and iPhone.

- <https://riot.im/app/>
- <https://riot.chatie.io/>

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

- [Bridging infrastructure for Application Services - HOWTO](https://github.com/matrix-org/matrix-appservice-bridge/blob/master/HOWTO.md)
- [Matrix Application Service Bridge Node.js SDK](http://matrix-org.github.io/matrix-appservice-bridge/)
- [Matrix Application Service API](https://matrix.org/docs/spec/application_service/r0.1.0.html)
- [Matrix Client-Server API](https://matrix.org/docs/spec/client_server/r0.4.0.html)
- [Matrix Specification](https://matrix.org/docs/spec/)

## HISTORY

### master

### v0.1 May 2019

1. Auto response the message in a Matrix Room.

## AUTHOR

[Huan LI (李卓桓)](http://linkedin.com/in/zixia) <zixia@zixia.net>

[![Profile of Huan LI (李卓桓) on StackOverflow](https://stackexchange.com/users/flair/265499.png)](https://stackexchange.com/users/265499)

## COPYRIGHT & LICENSE

- Code & Docs © 2019 - now Huan LI <zixia@zixia.net>
- Code released under the Apache-2.0 License
- Docs released under Creative Commons
