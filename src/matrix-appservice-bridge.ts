import { 
  AppServiceRegistration,
  Bridge,
  Cli,
}                             from 'matrix-appservice-bridge'

const REGISTRATION_YAML_FILE = 'matrix-appservice-wechaty.registration.yaml'
const LOCAL_PART = 'wechaty'

const ROOM_ID = '!KHasJNPkKLsCkLHqoO:aka.cn'

const registrationPath = REGISTRATION_YAML_FILE

const generateRegistration = (reg: any, callback: any) => {
  reg.setId(AppServiceRegistration.generateToken())
  reg.setHomeserverToken(AppServiceRegistration.generateToken())
  reg.setAppServiceToken(AppServiceRegistration.generateToken())
  reg.setSenderLocalpart(LOCAL_PART)
  reg.setProtocols(['wechaty'])
  reg.addRegexPattern("users", `@${LOCAL_PART}_.+`, true)
  reg.addRegexPattern("rooms", `!${LOCAL_PART}_.+`, true)
  callback(reg)
}

const run = (port: any, config: any) => {
  const bridge = new Bridge({
    homeserverUrl: 'http://matrix.aka.cn:8008',
    domain: 'aka.cn',
    registration: REGISTRATION_YAML_FILE,
    controller: {
      onUserQuery: function(queriedUser: any) {
        console.log('queriedUser', queriedUser)
        return {} // auto-provision users with no additonal data
      },

      onEvent: function(request: any, context: any) {
        console.log('onEvent()', request, context)

        var event = request.getData()
        // replace with your room ID
        if (event.type !== "m.room.message" || !event.content || event.room_id !== ROOM_ID) {
            return;
        }

        const username = event.user_id
        const text = event.content.body

        const intent = bridge.getIntent("@wechaty_" + username.replace(/^@/, ''))
        // intent.sendText(ROOM_ID, `I repeat: ${username} said ${text}`)
        intent.sendText(username, `I repeat: you said ${text}`)
      }    
    }
  });
  console.log("Matrix-side listening on port %s", port)
  bridge.run(port, config)

  const intent = bridge.getIntent("@wechaty_" + 'tester' + ":aka.cn")
  intent.sendText(ROOM_ID, 'hello matrix')
}

const cli = new Cli({
    registrationPath,
    generateRegistration,
    run,
})

cli.run()