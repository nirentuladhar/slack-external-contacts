import { _ } from 'lodash'
import { App } from '@slack/bolt'
import { time } from '../../helpers/format'
import { footnote } from '../../helpers/blocks'
import { searchMessages } from '../../lib/airtable'

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
      ].concat(
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
                  }> referenced ${contactsDisplay(message)} at ${time(
                    message.createdAt,
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
