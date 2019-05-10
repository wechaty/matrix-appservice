# MATRIX-APPSERVICE-WECHATY

Matrix Application Services Wechaty Bridge

![Matrix + Wechaty](https://huan.github.io/matrix-appservice-wechaty/images/matrix-wechaty-1280x720.jpg)
> Photo credit: [Matrix Club](https://www.nowshenzhen.com/tag/matrix-club/)

## UNDER CONSTRUCTING 

## INTRO

- [Integrate Wechat with Matrix with the power of Wechaty #1737](https://github.com/Chatie/wechaty/issues/1737)

[Matrix](https://matrix.org/blog/index) is like [Pidgin](http://pidgin.im) on your Phone. 

Pidgin try to IM all your friends in one place in Linux, and with Matrix you can have your Phone clinet with your private server which is highly customized. Matrix did not use XMPP protocol, it's server uses REST so that it could be more easy to extend.

This week I had a great talk with YC partner Eric @ericmigi, who is a serial entrepreneur and also a geek with technology. He uses Matrix a lot and almost integrated all the instance messanger to his Matrix.

But, the matrix does not support Wechat yet. So we'd like to introduce a matrix-wechat bridge to implement the Wechat protocol, and fill the gap between Matrix and Wechat.

@[ericmigi](https://github.com/ericmigi) provide some links that will help us to kick off a starter, hope we could make a workable POC soon, and any contribution will be welcome. 

1. [homeserver install in 1 hr](https://github.com/spantaleev/matrix-docker-ansible-deploy)
1. [examples of puppet bridges](https://github.com/matrix-hacks/matrix-puppet-bridge)

@[tulir](https://github.com/tulir) has very rich experiences with building the matrix bridges such as:
1. [A Matrix-Telegram hybrid puppeting/relaybot bridge](https://github.com/tulir/mautrix-telegram)
1. [A Matrix-WhatsApp puppeting bridge](https://github.com/tulir/mautrix-whatsapp)

## SEE ALSO

- [Bridging infrastructure for Application Services - HOWTO](https://github.com/matrix-org/matrix-appservice-bridge/blob/master/HOWTO.md)

## AUTHOR

[Huan LI (李卓桓)](http://linkedin.com/in/zixia) \<zixia@zixia.net\>

<a href="https://stackexchange.com/users/265499">
  <img src="https://stackexchange.com/users/flair/265499.png" width="208" height="58" alt="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites" title="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites">
</a>

## COPYRIGHT & LICENSE

- Code & Docs © 2016-2019 Huan LI \<zixia@zixia.net\>
- Code released under the Apache-2.0 License
- Docs released under Creative Commons
