import { App } from '@slack/bolt'
import {
  optionForExistingContact,
  optionForNewContact,
} from '../../helpers/blocks'
import {
  fieldSubmission,
  multiSelectSubmission,
  selectSubmission,
} from '../../helpers/submission'
import {
  findMessage,
  updateMessage,
  upsertMessage,
  searchContacts,
  hasPermission,
  createOrg,
} from '../../lib/funders'
import { compactSet, logger } from '../../lib/utils'

export default function (app: App): void {
  app.options('funder_contact_select', async ({ options, ack }) => {
    logger('options-funder_contact_select')
    const matchingContacts = await searchContacts(options.value)
    await ack({ options: matchingContacts.map(optionForNewContact) })
  })

  app.action(
    'add_funding_organisation',
    async ({ body, context, ack, client }) => {
      logger('action-add_funding_organisation')
      await ack()

      // const programs = await allPrograms()

      await client.views.push({
        token: context.botToken,
        trigger_id: body['trigger_id'],
        view: {
          type: 'modal',
          callback_id: 'create_funding_organisation',
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
                text: 'Common name',
              },
              element: {
                type: 'plain_text_input',
                action_id: 'name-value',
              },
            },
            {
              type: 'input',
              optional: true,
              block_id: 'organisation-legal-name',
              label: {
                type: 'plain_text',
                text: 'Legal name',
              },
              element: {
                type: 'plain_text_input',
                action_id: 'legal-name-value',
              },
              hint: {
                type: 'plain_text',
                text: 'If not different, copy the common name in here too',
              },
            },
            {
              type: 'input',
              block_id: 'organisation-website',
              label: {
                type: 'plain_text',
                text: 'Website',
              },
              element: {
                type: 'plain_text_input',
                action_id: 'website-value',
              },
              optional: true,
            },
            {
              type: 'input',
              block_id: 'organisation-background',
              label: {
                type: 'plain_text',
                text: 'Organisation background',
              },
              element: {
                type: 'plain_text_input',
                action_id: 'background-value',
                multiline: true,
              },
              hint: {
                type: 'plain_text',
                text:
                  'Record background context for the organisation - ' +
                  'the role they play broadly and in relation to ' +
                  'Sunrise, how we work with them, and notes on ' +
                  'the depth and quality of our relationship.',
              },
              optional: true,
            },
          ],
        },
      })
    },
  )

  app.view('create_funding_organisation', async ({ ack, view }) => {
    logger('view-create_funding_organisation')
    await ack()
    const values = view['state']['values']

    console.log(values)

    const organisation = {}
    organisation['Short name'] = fieldSubmission(
      values[`organisation-name`],
      `name-value`,
    )
    organisation['Organisation name'] = fieldSubmission(
      values[`organisation-legal-name`],
      `legal-name-value`,
    )
    organisation['Website'] = fieldSubmission(
      values[`organisation-website`],
      `website-value`,
    )
    organisation['Organisation background'] = fieldSubmission(
      values[`organisation-background`],
      `background-value`,
    )
    await createOrg(organisation)
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
            {
              type: 'actions',
              elements: [
                {
                  action_id: 'add_funding_organisation',
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'Add new funding organisation',
                    emoji: true,
                  },
                  value: 'add_funding_organisation',
                },
                // {
                //   action_id: 'add_funder_contact',
                //   type: 'button',
                //   text: {
                //     type: 'plain_text',
                //     text: 'Add new contact',
                //     emoji: true,
                //   },
                //   value: 'add_contact',
                // },
              ],
            },
          ],
        },
      })
    },
  )
}
