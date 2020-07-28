import 'reflect-metadata'
import { ConnectionOptions, createConnection, In } from 'typeorm'
import { User } from './entity/User'
import { Message } from './entity/Message'
import { Contact } from './entity/Contact'
import { App } from '@slack/bolt'

let connection
let userRepository
let messageRepository
let contactRepository

const options: ConnectionOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  logging: 'all', //['query', 'error'],
  synchronize: true,
  entities: [__dirname + '/entity/*'],
  migrations: ['src/migration/**/*.ts'],
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
})

const optionForContact = (contact) => ({
  text: {
    type: 'plain_text',
    text: `${contact.firstName} ${contact.lastName}`,
  },
  value: `${contact.id}`,
})

app.options('contact_select', async ({ options, ack }) => {
  const matchingContacts = await contactRepository
    .createQueryBuilder()
    .where('Contact.firstName ~* :value or Contact.lastName ~* :value', {
      value: options.value,
    })
    .getMany()
  await ack({ options: matchingContacts.map(optionForContact) })
})

app.action('contact_select', async ({ action, body, context, ack }) => {
  await ack()
  let selectedValues = action['selected_options'].map((o) => o.value)
  let message = await messageRepository.findOne(body['view'].private_metadata)
  let contacts = selectedValues.length
    ? await contactRepository.find({ id: In(selectedValues || []) })
    : []
  message.contacts = contacts
  await messageRepository.save(message)
})

app.shortcut(
  'record_contact',
  async ({ shortcut, ack, respond, context, client }) => {
    await ack()

    const messageData = shortcut['message']
    let user = await userRepository.findOne({
      slackID: messageData.user,
      team_id: messageData.team,
    })
    if (!user) {
      user = new User()
      user.slackID = messageData.user
      user.team_id = messageData.team
      await userRepository.save(user)
    }

    const channelID = shortcut['channel'].id
    let message = await messageRepository.findOne({
      channelID,
      ts: messageData.ts,
      user: user,
      relations: ['contacts'],
    })
    if (!message) {
      message = new Message()
      message.channelID = channelID
      message.ts = messageData.ts
      message.user = user
      message.text = messageData.text
      await messageRepository.save(message)
    }

    const result = await client.views.open({
      token: context.botToken,
      trigger_id: shortcut.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'update_contact',
        title: { type: 'plain_text', text: 'Record external contact' },
        close: {
          type: 'plain_text',
          text: 'Cancel',
        },
        private_metadata: `${message.id}`,
        submit: {
          type: 'plain_text',
          text: 'Save',
        },
        blocks: [
          {
            type: 'section',
            block_id: 'section678',
            text: {
              type: 'mrkdwn',
              text: 'External contacts mentioned in this post:',
            },
            accessory: {
              action_id: 'contact_select',
              type: 'multi_external_select',
              placeholder: {
                type: 'plain_text',
                text: 'Search existing contacts',
                emoji: true,
              },
              initial_options: message.contacts.map(optionForContact),
              min_query_length: 3,
            },
          },
        ],
      },
    })
  },
)

app.view('update_contact', async ({ ack, body, view, context }) => {
  // Fake this response as data is actually saved when records are selected
  await ack()
})

createConnection(options).then(async (initialisedConnection) => {
  connection = initialisedConnection
  userRepository = connection.getRepository(User)
  messageRepository = connection.getRepository(Message)
  contactRepository = connection.getRepository(Contact)
  await app.start(process.env.PORT || 9000)
  console.log('⚡️ Bolt app is running!')
})
