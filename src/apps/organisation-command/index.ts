import { _ } from 'lodash'
import { App } from '@slack/bolt'
import {
  toCurrency,
  valueOrFallback,
  functionOrFallback,
  nameForContact,
  grantEmoji,
  date,
} from '../../helpers/format'
import { footnote, orEmptyRow } from '../../helpers/blocks'
import { searchOrgs, orgDetails } from '../../lib/airtable'

export default function (app: App): void {
  app.command('/org', async ({ command, ack, respond }) => {
    await ack()
    if (!command.text) {
      await respond(
        'Please specify text to search organisation names with e.g. `/org Sunrise`',
      )
      return
    }

    const matchingOrganisations = await searchOrgs(command.text)
    // console.log(matchingOrganisations)
    if (!matchingOrganisations.length) {
      await respond(
        `No organisation details matched the text: \`${command.text}\``,
      )
      return
    }
    if (matchingOrganisations.length > 1) {
      await respond(
        `${matchingOrganisations
          .map((o) => `*${o['EC-display']}*`)
          .join(' and ')} matched the text: \`${
          command.text
        }\`. Please make it more specific.`,
      )
      return
    }

    const organisation = await orgDetails(matchingOrganisations[0].RECORD_ID)
    const contacts = (organisation['EC-contact-info'] || []).map((info) => {
      const [firstName, lastName, email, phone, role, notes] = info.split('|')
      return { firstName, lastName, email, phone, role, notes }
    })
    console.log(organisation['EC-grant-info'])
    const grants = (organisation['EC-grant-info'] || []).map((info) => {
      const [yearMonth, grant, url, codedAmounts, plannedAUD] = info.split('|')
      return { yearMonth, grant, url, codedAmounts, plannedAUD }
    })
    console.log(grants)
    const organisationContacts = _.sortBy(contacts, 'lastName')
    const organisationGrants = _.sortBy(grants, 'yearMonth')
    console.log(organisationGrants)
    await respond({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: organisation['EC-display'],
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
              text: `*Website:*\n${valueOrFallback(organisation['Website'])}`,
            },
            {
              type: 'mrkdwn',
              text: `*Program areas:*\n${valueOrFallback(
                (organisation['EC-program-display'] || []).sort().join(', '),
              )}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Notes:*\n${valueOrFallback(organisation['Notes'])}`,
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

const contactCard = ({ firstName, lastName, email, phone, role, notes }) => [
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

const grantCard = ({ yearMonth, grant, url, codedAmounts, plannedAUD }) => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `<${url}|${grant}>`,
    },
  },
  {
    type: 'section',
    fields: [
      // {
      //   type: 'mrkdwn',
      //   text: `*Status:* ${valueOrFallback(grant.status)}`,
      // },
      {
        type: 'mrkdwn',
        text: `*Amount:* ${plannedAUD} (${codedAmounts})`,
      },
      {
        type: 'mrkdwn',
        text: `*Granted date:* ${valueOrFallback(yearMonth)}`,
      },
      // {
      //   type: 'mrkdwn',
      //   text: `*Primary contact:* ${valueOrFallback()}`,
      // },
    ],
  },
]

// link to partner record in stacker
// grant summary:
// total grants: how much this year & how much last year
// grant line items:
// this year: grant w/ hyperlink & AUD equiv & USD equiv
// last year: grant w/ hyperlink & AUD equiv & USD equiv

// (grant agreement purpose)
