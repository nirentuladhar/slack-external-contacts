import { _ } from 'lodash'
import { App } from '@slack/bolt'
import {
  formattedOrganisationNameWithAbbrev,
  toCurrency,
  valueOrFallback,
  nameForContact,
  programsForContact,
  primaryContactEmoji,
} from '../../helpers/format'
import { footnote } from '../../helpers/blocks'

export default function (app: App, { organisationRepository }) {
  app.command('/organisation', async ({ command, ack, respond }) => {
    await ack()
    if (!command.text) {
      await respond(
        'Please specify text to search organisation names with with e.g. `/organisations Sunrise`',
      )
      return
    }
    const matchingOrganisations = await organisationRepository
      .createQueryBuilder('organisation')
      .leftJoinAndSelect('organisation.programs', 'program')
      .leftJoinAndSelect('organisation.contacts', 'contact')
      .leftJoinAndSelect('contact.programs', 'contact_program')
      .where(
        'organisation.name ~* :value or organisation.abbreviation ~* :value',
        { value: command.text },
      )
      .getMany()
    if (!matchingOrganisations.length) {
      await respond(
        `No organisation details matched the text: \`${command.text}\``,
      )
      return
    }
    if (matchingOrganisations.length > 1) {
      await respond(
        `${matchingOrganisations
          .map((o) => `*${o.name}*`)
          .join(' and ')} both matched the text: \`${
          command.text
        }\`. Please make it more specific.`,
      )
      return
    }
    const organisation = matchingOrganisations[0]
    const organisationContacts = _.sortBy(organisation.contacts, 'lastName')
    await respond({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: formattedOrganisationNameWithAbbrev(organisation),
            emoji: true,
          },
        },
        {
          type: 'divider',
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Grants in previous calendar year:*\n${toCurrency(
                organisation.previous_grants,
              )}`,
            },
            {
              type: 'mrkdwn',
              text: `*Approved grants in current year:*\n${toCurrency(
                organisation.grants_approved,
              )}`,
            },
            {
              type: 'mrkdwn',
              text: `*Grants distributed to date:*\n${toCurrency(
                organisation.grants_distributed,
              )}`,
            },
            {
              type: 'mrkdwn',
              text: `*Grants in process:*\n${
                organisation.grants_in_process ? 'yes' : 'no'
              }`,
            },
            {
              type: 'mrkdwn',
              text: `*Future grants in consideration:*\n${valueOrFallback(
                organisation.future_grants_in_consideration,
              )}`,
            },
            {
              type: 'mrkdwn',
              text: `*Program areas:*\n${valueOrFallback(
                organisation.programs
                  .map((p) => p.name)
                  .sort()
                  .join(', '),
              )}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Notes:*\n${valueOrFallback(organisation.notes)}`,
          },
        },
      ]
        .concat(_.flatten(organisationContacts.map(contactCard)))
        .concat(footnote),
    })
  })
}

const contactCard = (contact) => [
  {
    type: 'divider',
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${primaryContactEmoji(
        contact,
      )}:bust_in_silhouette: *${nameForContact(contact)}*`,
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: `*Primary contact for:* ${programsForContact(contact)}`,
      },
      {
        type: 'mrkdwn',
        text: `*Email:* ${valueOrFallback(contact.email)}`,
      },
      {
        type: 'mrkdwn',
        text: `*Phone:* ${valueOrFallback(contact.phone)}`,
      },
      {
        type: 'mrkdwn',
        text: `*Role:* ${valueOrFallback(contact.role)}`,
      },
    ],
  },
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Notes:*\n${valueOrFallback(contact.notes)}`,
    },
  },
]
