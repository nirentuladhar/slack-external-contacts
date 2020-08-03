import 'reflect-metadata'
import { ConnectionOptions, createConnection, In } from 'typeorm'
import { User } from './entity/User'
import { Message } from './entity/Message'
import { Contact } from './entity/Contact'
import { Organisation } from './entity/Organisation'
import { App } from '@slack/bolt'
import { _ } from 'lodash'
import * as moment from 'moment'

let connection
let userRepository
let messageRepository
let contactRepository
let organisationRepository

const options: ConnectionOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  logging: 'all',
  synchronize: true,
  entities: [__dirname + '/entity/*'],
  migrations: ['src/migration/**/*.ts'],
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
})

const nameWithOrgs = (contact) =>
  `${contact.firstName} ${contact.lastName}${formattedOrganisationName(
    contact,
  )}`

const formattedOrganisationName = (contact) =>
  contact.organisations.length
    ? ` [${contact.organisations.map((o) => o.name).join(', ')}]`
    : ''

const optionForContact = (contact) => ({
  text: {
    type: 'plain_text',
    text: nameWithOrgs(contact),
  },
  value: `${contact.id}`,
})

const optionForOrganisation = (organisation) => ({
  text: {
    type: 'plain_text',
    text: organisation.name,
  },
  value: `${organisation.id}`,
})

const textSearchSQL = (value) =>
  [
    'contact.firstName ~* :value',
    'contact.lastName ~* :value',
    "concat(contact.firstName, ' ', contact.lastName) ~* :value",
    'organisation.name ~* :value',
  ].join(' or ')

app.options('contact_select', async ({ options, ack }) => {
  const matchingContacts = await contactRepository
    .createQueryBuilder('contact')
    .leftJoinAndSelect('contact.organisations', 'organisation')
    .where(textSearchSQL, { value: options.value })
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
  const organisations = await organisationRepository.find({
    order: { name: 'ASC' },
  })
  await client.views.push({
    trigger_id: body['trigger_id'],
    token: context.botToken,
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
          block_id: 'contact-org',
          label: {
            type: 'plain_text',
            text: 'Organisations',
          },
          element: {
            action_id: 'organisation_select',
            type: 'multi_static_select',
            placeholder: {
              type: 'plain_text',
              text: 'Search organisation',
              emoji: true,
            },
            options: organisations.map(optionForOrganisation),
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

app.action(
  'add_organisation',
  async ({ action, body, context, ack, client }) => {
    await ack()
    await client.views.push({
      token: context.botToken,
      trigger_id: body['trigger_id'],
      view: {
        type: 'modal',
        callback_id: 'create_organisation',
        title: { type: 'plain_text', text: 'Create organisation' },
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
            block_id: 'organisation-name',
            label: {
              type: 'plain_text',
              text: 'Name',
            },
            element: {
              type: 'plain_text_input',
              action_id: 'name-value',
            },
          },
          {
            type: 'input',
            block_id: 'organisation-notes',
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
  },
)

app.shortcut(
  'record_contact',
  async ({ shortcut, ack, respond, context, client }) => {
    await ack()

    const messageData = shortcut['message']
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
      relations: ['contacts', 'contacts.organisations'],
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
            type: 'actions',
            elements: [
              {
                action_id: 'add_organisation',
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Add new organisation',
                  emoji: true,
                },
                value: 'add_organisation',
              },
              {
                action_id: 'add_contact',
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'Add new contact',
                  emoji: true,
                },
                value: 'add_contact',
              },
            ],
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
  const selectedValues = values['contact-org']['organisation_select'][
    'selected_options'
  ].map((o) => o.value)
  contact.organisations = selectedValues.length
    ? await organisationRepository.find({ id: In(selectedValues || []) })
    : []
  await contactRepository.save(contact)
})

app.view('create_organisation', async ({ ack, body, view, context }) => {
  await ack()
  const organisation = new Organisation()
  const values = view['state']['values']
  organisation.name = values['organisation-name']['name-value']['value']
  organisation.notes = values['organisation-notes']['notes-value']['value']
  await organisationRepository.save(organisation)
})

app.view('update_contact', async ({ ack }) => {
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
    .leftJoinAndSelect('contact.organisations', 'organisation')
    .where(textSearchSQL, { value: command.text })
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
                .map((contact) => '*' + nameWithOrgs(contact) + '*')
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
  organisationRepository = connection.getRepository(Organisation)
  await app.start(process.env.PORT || 9000)
  console.log('⚡️ Bolt app is running!')
})
