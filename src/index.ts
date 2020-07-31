import 'reflect-metadata'
import { ConnectionOptions, createConnection, In } from 'typeorm'
import { User } from './entity/User'
import { Message } from './entity/Message'
import { Contact } from './entity/Contact'
import { App } from '@slack/bolt'
import { _ } from 'lodash'
import * as moment from 'moment'

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
    .createQueryBuilder('contact')
    .where(
      "contact.firstName ~* :value or contact.lastName ~* :value or concat(contact.firstName, ' ', contact.lastName) ~* :value",
      { value: options.value },
    )
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

app.action('add_contact', async ({ action, body, context, ack, client }) => {
  await ack()
  await client.views.push({
    token: context.botToken,
    trigger_id: body['trigger_id'],
    view: {
      type: 'modal',
      callback_id: 'create_contact',
      title: { type: 'plain_text', text: 'Create external contact' },
      close: {
        type: 'plain_text',
        text: 'Cancel',
      },
      private_metadata: body['view']['private_metadata'],
      submit: {
        type: 'plain_text',
        text: 'Save',
      },
      blocks: [
        {
          type: 'input',
          block_id: 'contact-first-name',
          label: {
            type: 'plain_text',
            text: 'First Name',
          },
          element: {
            type: 'plain_text_input',
            action_id: 'first-name-value',
          },
        },
        {
          type: 'input',
          block_id: 'contact-last-name',
          label: {
            type: 'plain_text',
            text: 'Last Name',
          },
          element: {
            type: 'plain_text_input',
            action_id: 'last-name-value',
          },
        },
        {
          type: 'input',
          block_id: 'contact-email',
          label: {
            type: 'plain_text',
            text: 'Email',
          },
          element: {
            type: 'plain_text_input',
            action_id: 'email-value',
          },
          optional: true,
        },
        {
          type: 'input',
          block_id: 'contact-phone',
          label: {
            type: 'plain_text',
            text: 'Phone',
          },
          element: {
            type: 'plain_text_input',
            action_id: 'phone-value',
          },
          optional: true,
        },
        {
          type: 'input',
          block_id: 'contact-notes',
          label: {
            type: 'plain_text',
            text: 'Additional Notes',
          },
          element: {
            type: 'plain_text_input',
            action_id: 'notes-value',
            multiline: true,
          },
          optional: true,
        },
      ],
    },
  })
})

app.shortcut(
  'record_contact',
  async ({ shortcut, ack, respond, context, client }) => {
    await ack()

    const messageData = shortcut['message']
    console.dir(messageData)
    let user = await userRepository.findOne({
      slackID: messageData.user,
    })
    if (!user) {
      user = new User()
      user.slackID = messageData.user
      user.team_id = messageData.team
      await userRepository.save(user)
    }

    const channelID = shortcut['channel'].id
    let message = await messageRepository.findOne({
      where: {
        channelID,
        ts: messageData.ts,
        user: user,
      },
      relations: ['contacts'],
    })
    if (!message) {
      message = new Message()
      message.channelID = channelID
      message.ts = messageData.ts
      message.user = user
      message.text = messageData.text
      message.contacts = []
      await messageRepository.save(message)
    }

    await client.views.open({
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
            text: {
              type: 'mrkdwn',
              text: 'External contacts mentioned in this post:',
            },
            accessory: {
              action_id: 'contact_select',
              type: 'multi_external_select',
              placeholder: {
                type: 'plain_text',
                text: 'Search contacts',
                emoji: true,
              },
              initial_options: message.contacts.map(optionForContact),
              min_query_length: 3,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: ' ',
            },
            accessory: {
              action_id: 'add_contact',
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Add new contact',
                emoji: true,
              },
              value: 'add_contact',
            },
          },
        ],
      },
    })
  },
)

app.view('create_contact', async ({ ack, body, view, context }) => {
  await ack()
  const contact = new Contact()
  const values = view['state']['values']
  contact.firstName = values['contact-first-name']['first-name-value']['value']
  contact.lastName = values['contact-last-name']['last-name-value']['value']
  contact.email = values['contact-email']['email-value']['value']
  contact.phone = values['contact-phone']['phone-value']['value']
  contact.notes = values['contact-notes']['notes-value']['value']
  await contactRepository.save(contact)
})

app.view('update_contact', async ({ ack, body, view, context }) => {
  // Fake this response as data is actually saved when records are selected
  await ack()
})

app.command('/contacts', async ({ command, ack, respond }) => {
  await ack()
  if (!command.text) {
    await respond(
      'Please specify text to search to contacts with e.g. `/contacts Kajute`',
    )
    return
  }
  const matchingMessages = await messageRepository
    .createQueryBuilder('message')
    .innerJoinAndSelect('message.user', 'user')
    .innerJoinAndSelect('message.contacts', 'contact')
    .where(
      "contact.firstName ~* :value or contact.lastName ~* :value or concat(contact.firstName, ' ', contact.lastName) ~* :value",
      {
        value: command.text,
      },
    )
    .orderBy('message.createdAt', 'DESC')
    .getMany()
  if (!matchingMessages.length) {
    await respond(`No contact details matched the text: \`${command.text}\``)
    return
  }
  await respond({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:mag: Search results for \`${command.text}\``,
        },
      },
    ].concat(
      _(matchingMessages)
        .map((message) => [
          {
            type: 'divider',
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:speech_balloon: <@${
                message.user.slackID
              }> spoke to ${message.contacts
                .map(
                  (contact) =>
                    '*' + contact.firstName + ' ' + contact.lastName + '*',
                )
                .join(' and ')} at ${moment(message.createdAt).format(
                'h:mm a on MMMM Do YYYY',
              )}:`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message.text,
            },
          },
        ])
        .flatten()
        .value(),
    ),
  })
})

createConnection(options).then(async (initialisedConnection) => {
  connection = initialisedConnection
  userRepository = connection.getRepository(User)
  messageRepository = connection.getRepository(Message)
  contactRepository = connection.getRepository(Contact)
  await app.start(process.env.PORT || 9000)
  console.log('⚡️ Bolt app is running!')
})
