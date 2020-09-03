import { _ } from 'lodash'
import { App } from '@slack/bolt'
import {
  formattedOrganisationNameWithAbbrev,
  toCurrency,
  valueOrFallback,
  functionOrFallback,
  nameForContact,
  grantEmoji,
  programsForContact,
  primaryContactEmoji,
  date,
} from '../../helpers/format'
import { footnote, orEmptyRow } from '../../helpers/blocks'

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
      .leftJoinAndSelect('organisation.grants', 'grant')
      .leftJoinAndSelect('grant.contact', 'contact_grant')
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
    const organisationGrants = _.sortBy(organisation.grants, 'startedAt')
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
              text: `*Website:*\n${valueOrFallback(organisation.website)}`,
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
        {
          type: 'divider',
        },
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Grants',
            emoji: true,
          },
        },
      ]
        .concat(orEmptyRow(_.flatten(organisationGrants.map(grantCard))))
        .concat([
          {
            type: 'divider',
          },
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: 'Staff',
              emoji: true,
            },
          },
        ])
        .concat(orEmptyRow(_.flatten(organisationContacts.map(contactCard))))
        .concat(footnote),
    })
  })
}

const contactCard = (contact) => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `:bust_in_silhouette: ${primaryContactEmoji(
        contact,
      )}*${nameForContact(contact)}*`,
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

const grantCard = (grant) => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${grantEmoji(grant)} *${grant.proposal}*`,
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: `*Status:* ${valueOrFallback(grant.status)}`,
      },
      {
        type: 'mrkdwn',
        text: `*Amount:* ${toCurrency(grant.amount, grant.ccy)}`,
      },
      {
        type: 'mrkdwn',
        text: `*Granted date:* ${functionOrFallback(grant.startedAt, date)}`,
      },
      {
        type: 'mrkdwn',
        text: `*Primary contact:* ${functionOrFallback(
          grant.contact,
          nameForContact,
        )}`,
      },
      {
        type: 'mrkdwn',
        text: `*Code:* ${valueOrFallback(grant.project_code)}`,
      },
    ],
  },
]
