import 'reflect-metadata'
import { createConnection } from 'typeorm'
import { User } from './entity/User'
import { Message } from './entity/Message'
import { Contact } from './entity/Contact'
import { Organisation } from './entity/Organisation'
import { ProgramArea } from './entity/ProgramArea'
import addOrganisationCommand from './apps/organisation-command'
import addContactsCommand from './apps/contacts-command'
import addRecordContactsShortcut from './apps/record-contacts-shortcut'
import { App } from '@slack/bolt'

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
})

createConnection().then(async (connection) => {
  const repositories = {
    userRepository: connection.getRepository(User),
    messageRepository: connection.getRepository(Message),
    contactRepository: connection.getRepository(Contact),
    organisationRepository: connection.getRepository(Organisation),
    programRepository: connection.getRepository(ProgramArea),
  }
  addOrganisationCommand(app, repositories)
  addContactsCommand(app, repositories)
  addRecordContactsShortcut(app, repositories)
  await app.start(process.env.PORT || 9000)
  console.log('⚡️ Bolt app is running!')
}, console.error.bind(console))
