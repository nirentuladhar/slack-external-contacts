import { App } from '@slack/bolt'
import {
  optionForExistingContact,
  optionForNewContact,
} from '../../helpers/blocks'
import {
  findMessage,
  updateMessage,
  upsertMessage,
  searchContacts,
  hasPermission,
} from '../../lib/funders'
import { compactSet, logger } from '../../lib/utils'

export default function (app: App): void {
  app.options('funder_contact_select', async ({ options, ack }) => {
    logger('options-funder_contact_select')
    const matchingContacts = await searchContacts(options.value)
    await ack({ options: matchingContacts.map(optionForNewContact) })
  })

  app.shortcut(
    'record_funder_contact',
    async ({ shortcut, ack, context, client }) => {
      logger('shortcut-record_funder_contact')
      await ack()

      if (!(await hasPermission(shortcut['user'].username))) {
        logger('shortcut-record_funder_contact_permission_denied')
        await client.views.open({
          token: context.botToken,
          trigger_id: shortcut.trigger_id,
          view: {
            type: 'modal',
            callback_id: 'update_contact',
            title: { type: 'plain_text', text: 'Record external contact' },
            close: {
              type: 'plain_text',
              text: 'Close',
            },
            private_metadata: 'xyz',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: 'Sorry! You cannot access this shortcut.',
                },
              },
            ],
          },
        })
      }

      const { id, fields } = await upsertMessage({
        channelID: shortcut['channel'].id,
        slackID: shortcut['message'].user,
        timestamp: shortcut['message'].ts,
        text: shortcut['message'].text,
      })

      const initial_options = (fields.contactsIDList || [])
        .map((v) => v.split('|||'))
        .map(optionForExistingContact)

      console.log(initial_options)

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
          private_metadata: id,
          submit: {
            type: 'plain_text',
            text: 'Save',
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'Funder contacts mentioned in this post:',
              },
              accessory: {
                action_id: 'funder_contact_select',
                type: 'multi_external_select',
                placeholder: {
                  type: 'plain_text',
                  text: 'Search funder contacts',
                  emoji: true,
                },
                initial_options,
                min_query_length: 3,
              },
            },
          ],
          // blocks: [
          //   {
          //     type: 'section',
          //     text: {
          //       type: 'mrkdwn',
          //       text: 'External contacts mentioned in this post:',
          //     },
          //     accessory: {
          //       action_id: 'contact_select',
          //       type: 'multi_external_select',
          //       placeholder: {
          //         type: 'plain_text',
          //         text: 'Search contacts',
          //         emoji: true,
          //       },
          //       initial_options,
          //       min_query_length: 3,
          //     },
          //   },
          // {
          //   type: 'actions',
          //   elements: [
          //     {
          //       action_id: 'add_organisation',
          //       type: 'button',
          //       text: {
          //         type: 'plain_text',
          //         text: 'Add new organisation',
          //         emoji: true,
          //       },
          //       value: 'add_organisation',
          //     },
          //     {
          //       action_id: 'add_contact',
          //       type: 'button',
          //       text: {
          //         type: 'plain_text',
          //         text: 'Add new contact',
          //         emoji: true,
          //       },
          //       value: 'add_contact',
          //     },
          //   ],
          // },
          // ],
        },
      })
    },
  )
}
