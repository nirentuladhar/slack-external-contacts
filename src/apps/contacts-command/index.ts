import { _ } from 'lodash'
import * as moment from 'moment'
import { App } from '@slack/bolt'
import { nameWithOrgs } from '../../helpers/format'
import { footnote } from '../../helpers/blocks'
import { textSearchSQL } from '../../helpers/search'

export default function (app: App, { messageRepository }) {
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
          .concat(footnote)
          .value(),
      ),
    })
  })
}
