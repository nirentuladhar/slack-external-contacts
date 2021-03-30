import { App } from '@slack/bolt'
import {
  fieldSubmission,
  selectSubmission,
  multiSelectSubmission,
} from '../../helpers/submission'
import {
  optionForNewContact,
  optionForExistingContact,
  optionForNewOrg,
  optionForProgram,
} from '../../helpers/blocks'

import { logger, compactSet } from '../../lib/utils'
import {
  findMessage,
  updateMessage,
  searchContacts,
  searchOrgs,
  upsertMessage,
  allPrograms,
  createContact,
  createOrg,
} from '../../lib/airtable'

export default function (app: App): void {
  app.action('contact_select', async ({ action, body, ack }) => {
    logger('action-contact_select')
    await ack()
    const selectedValues = action['selected_options'].map((o) => o.value)
    const message = await findMessage(body['view'].private_metadata)
    const contacts = selectedValues.length
      ? compactSet(selectedValues, message.fields.contacts)
      : []
    await updateMessage(message.id, { contacts })
  })

  app.action('organisation_select', async ({ ack }) => {
    logger('action-organisation_select')
    await ack()
  })

  app.options('contact_select', async ({ options, ack }) => {
    logger('options-contact_select')
    const matchingContacts = await searchContacts(options.value)
    await ack({ options: matchingContacts.map(optionForNewContact) })
  })

  app.options('organisation_select', async ({ options, ack }) => {
    logger('options-organisation_select')
    const matchingOrgs = await searchOrgs(options.value)
    await ack({ options: matchingOrgs.map(optionForNewOrg) })
  })

  app.action('add_contact', async ({ body, context, ack, client }) => {
    logger('action-add_contact')
    await ack()

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
            block_id: 'contact-org',
            label: {
              type: 'plain_text',
              text: 'Partner Organisation',
            },
            hint: {
              type: 'plain_text',
              text:
                'If you cannot find the organisation, click cancel and add the organisation first',
            },
            element: {
              action_id: 'organisation_select',
              type: 'multi_external_select',
              placeholder: {
                type: 'plain_text',
                text: 'Search organisation',
                emoji: true,
              },
              min_query_length: 3,
            },
          },
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
            block_id: 'contact-role',
            label: {
              type: 'plain_text',
              text: 'Role / title',
            },
            element: {
              type: 'plain_text_input',
              action_id: 'role-value',
            },
            optional: true,
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
          },
          {
            type: 'input',
            block_id: 'contact-phone',
            label: {
              type: 'plain_text',
              text: 'Ph. number',
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

  app.action('add_organisation', async ({ body, context, ack, client }) => {
    logger('action-add_organisation')
    await ack()

    const programs = await allPrograms()

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
            optional: true,
            block_id: 'organisation-current_or_future_grantee',
            label: {
              type: 'plain_text',
              text: 'Current or future grantee',
            },
            element: {
              type: 'static_select',
              action_id: 'current_or_future_grantee-value',
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: 'no',
                  },
                  value: 'false',
                },
                {
                  text: {
                    type: 'plain_text',
                    text: 'yes',
                  },
                  value: 'true',
                },
              ],
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
            block_id: 'organisation-notes',
            label: {
              type: 'plain_text',
              text: 'Basic info on partner',
            },
            element: {
              type: 'plain_text_input',
              action_id: 'notes-value',
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
          {
            type: 'input',
            optional: true,
            block_id: 'organisation-programs',
            label: {
              type: 'plain_text',
              text: 'Program areas',
            },
            element: {
              type: 'multi_static_select',
              action_id: 'programs-value',
              options: programs.map(optionForProgram),
            },
            hint: {
              type: 'plain_text',
              text:
                'Note: By choosing which programs, you are ' +
                'giving TSP staff access to this grantees ' +
                'grant history. Choose carefully ;)',
            },
          },
        ],
      },
    })
  })

  app.shortcut('record_contact', async ({ shortcut, ack, context, client }) => {
    logger('shortcut-record_contact')
    await ack()

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
              initial_options,
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
  })

  app.view('create_contact', async ({ ack, view }) => {
    logger('view-create_contact')
    await ack()

    const values = view['state']['values']
    const contact = {}
    contact['First Name'] = fieldSubmission(
      values['contact-first-name'],
      'first-name-value',
    )
    contact['Last Name'] = fieldSubmission(
      values['contact-last-name'],
      'last-name-value',
    )
    contact['Email'] = fieldSubmission(values['contact-email'], 'email-value')
    contact['Number'] = fieldSubmission(values['contact-phone'], 'phone-value')
    contact['Role / title'] = fieldSubmission(
      values['contact-role'],
      'role-value',
    )
    contact['Notes'] = fieldSubmission(values['contact-notes'], 'notes-value')
    contact['Partner organisation'] = multiSelectSubmission(
      values['contact-org'],
      'organisation_select',
    )
    await createContact(contact)
  })

  app.view('create_organisation', async ({ ack, view }) => {
    logger('view-create_organisation')
    await ack()
    const values = view['state']['values']
    const organisation = {}
    organisation['Short Name'] = fieldSubmission(
      values[`organisation-name`],
      `name-value`,
    )
    organisation['Legal name (unless Auspicee)'] = fieldSubmission(
      values[`organisation-legal-name`],
      `legal-name-value`,
    )
    organisation['Website'] = fieldSubmission(
      values[`organisation-website`],
      `website-value`,
    )
    organisation['Notes'] = fieldSubmission(
      values[`organisation-notes`],
      `notes-value`,
    )
    const grantee = selectSubmission(
      values[`organisation-current_or_future_grantee`][
        `current_or_future_grantee-value`
      ],
    )
    organisation['Granted to (or future grant plan)'] = grantee === 'true'
    organisation['Programs'] = multiSelectSubmission(
      values['organisation-programs'],
      'programs-value',
    )
    await createOrg(organisation)
  })

  app.view('update_contact', async ({ ack, body, context }) => {
    logger('view-update_contact')
    await ack()
    // The contact selection is not actually saved here but we'll give the user feedback now.
    const { fields } = await findMessage(body['view'].private_metadata)
    const feedback =
      fields.contacts && fields.contacts.length
        ? `The slack message has been successfully associated with ${fields.contactsList}.`
        : 'Slack message has been updated with no associated contacts.'
    try {
      await app.client.chat.postMessage({
        text: feedback,
        token: context.botToken,
        channel: fields.channelID,
        thread_ts: fields.timestamp,
      })
    } catch (error) {
      // the bot itself needs to be added to the channel
      if (!error.message.match(/channel_not_found|not_in_channel/)) throw error
    }
  })
}
