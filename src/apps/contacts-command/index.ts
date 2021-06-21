import { _ } from 'lodash'
import { App } from '@slack/bolt'
import { time, unixTime, valueOrFallback } from '../../helpers/format'
import { footnote, orEmptyRow } from '../../helpers/blocks'
import {
  getStackerContactUrl,
  searchContacts,
  searchMessages,
} from '../../lib/airtable'

export default function (app: App): void {
  app.command('/contacts', async ({ command, ack, respond }) => {
    await ack()
    if (!command.text) {
      await respond(
        'Please specify text to search to contacts with e.g. `/contacts Kajute`',
      )
      return
    }
    const matchingMessages = await searchMessages(command.text)
    if (!matchingMessages.length) {
      await respond(
        `No slack conversations have been recorded with a user or organisation whose name matches: \`${command.text}\``,
      )
      return
    }

    const matchingContacts = await searchContacts(command.text)
    const records = matchingContacts.map((r) => r.fields)
    const contacts = records.map((record) => {
      const [id, firstName, lastName, email, phone, role, notes] = record[
        'EC-contact-info'
      ].split('|')
      return { id, firstName, lastName, email, phone, role, notes }
    })

    const contactsDisplay = (msg) =>
      msg.contactsList
        .split(', ')
        .map((contact) => `*${contact}*`)
        .join(' and ')

    await respond({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:mag: Search results for \`${command.text}\``,
          },
        },
      ]
        .concat(orEmptyRow(_.flatten(contacts.map(contactCard))))
        .concat(
          _(matchingMessages)
            .map((message) =>
              [
                {
                  type: 'divider',
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `:speech_balloon: <@${
                      message.slackID
                    }> referenced ${contactsDisplay(message)} at ${unixTime(
                      message.timestamp,
                    )}:`,
                  },
                },
              ].concat(
                // Split string into 3K section chunk to bypass character limit in block
                (message.text || '').match(/.{1,3000}/g).map((chunk) => ({
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: chunk,
                  },
                })),
              ),
            )
            .flatten()
            .concat(footnote)
            .value(),
        ),
    })
  })
}

const contactCard = ({
  id,
  firstName,
  lastName,
  email,
  phone,
  role,
  notes,
}) => {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:bust_in_silhouette: *${firstName} ${lastName}*`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Email:* ${valueOrFallback(email)}`,
        },
        {
          type: 'mrkdwn',
          text: `*Phone:* ${valueOrFallback(phone)}`,
        },
        {
          type: 'mrkdwn',
          text: `*Role:* ${valueOrFallback(role)}`,
        },
        {
          type: 'mrkdwn',
          text: `<${getStackerContactUrl(id)}|GrantsTracker profile>`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Notes:*\n${valueOrFallback(notes)}`,
      },
    },
  ]
}
