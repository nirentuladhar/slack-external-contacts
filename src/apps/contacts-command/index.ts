import { _ } from 'lodash'
import { App } from '@slack/bolt'
import { nameWithOrgs, time } from '../../helpers/format'
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
      .leftJoinAndSelect('contact.programs', 'program')
      .leftJoinAndSelect('organisation.grants', 'grant')
      .where(textSearchSQL, { value: command.text })
      .orderBy('message.createdAt', 'DESC')
      .getMany()
    if (!matchingMessages.length) {
      await respond(
        `No slack conversations have been recorded with a user or organisation whose name matches: \`${command.text}\``,
      )
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
                    message.user.slackID
                  }> referenced ${message.contacts
                    .map((contact) => '*' + nameWithOrgs(contact) + '*')
                    .join(' and ')} at ${time(message.createdAt)}:`,
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
