/*  
This script is for debug wechaty dependented in the envirenment of this project.

In my envirenment(x64 centos7 wechaty-puppet-wechat@0.28.1), bot.start() will throw a Error (Error: Could not find expected browser (chrome) locally. Run `npm install` to download the correct Chromium revision (848005)).

It similliar to https://github.com/berstend/puppeteer-extra/issues/471 and
https://stackoverflow.com/questions/53997175/puppeteer-error-chromium-revision-is-not-downloaded.

I avoid it by install chrome and modify memory data, but it should be fixed in futrue.
*/


const { Wechaty } = require('wechaty');

const name = 'wechat-puppet-wechat';
let bot = '';
bot = new Wechaty({
  name, // generate xxxx.memory-card.json and save login data for the next login
});

//  二维码生成
function onScan(qrcode, status) {
  require('qrcode-terminal').generate(qrcode); // 在console端显示二维码
  const qrcodeImageUrl = [
    'https://wechaty.js.org/qrcode/',
    encodeURIComponent(qrcode),
  ].join('');
  console.log(qrcodeImageUrl);
}

// 登录
async function onLogin(user) {
  console.log(`贴心小助理${user}登录了`);
  // if (config.AUTOREPLY) {
  //   console.log(`已开启机器人自动聊天模式`);
  // }
  // 登陆后创建定时任务
  // await initDay();
}

//登出
function onLogout(user) {
  console.log(`小助手${user} 已经登出`);
}

bot.on('scan', onScan);
bot.on('login', onLogin);
bot.on('logout', onLogout);

// for my envirenment only, avoid used
console.log(process.arch); // x64
Object.defineProperty(process, 'arch', {
  value: 'arm64',
});
console.log(process.arch);

bot
  .start()
  .then(() => console.log('开始登陆微信'))
  .catch((e) => console.error(e));