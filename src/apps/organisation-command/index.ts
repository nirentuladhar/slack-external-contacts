import { _ } from 'lodash'
import { App } from '@slack/bolt'
import {
  toCurrency,
  valueOrFallback,
  functionOrFallback,
  nameForContact,
  grantEmoji,
  date,
  currentYear,
} from '../../helpers/format'
import { footnote, orEmptyRow } from '../../helpers/blocks'
import { searchOrgs, orgDetails, fxRates } from '../../lib/airtable'

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
      const [id, firstName, lastName, email, phone, role, notes] = info.split(
        '|',
      )
      return { id, firstName, lastName, email, phone, role, notes }
    })
    const stackerURL =
      'https://granttracker.sunriseproject.org.au/partner-organisations2/view/po2_' +
      organisation['RECORD_ID']
    // console.log(organisation['EC-grant-info'])
    const grants = (organisation['EC-grant-info'] || []).map((info) => {
      const [yearMonth, grant, url, codedAmounts, plannedAUD] = info.split('|')
      return { yearMonth, grant, url, codedAmounts, plannedAUD }
    })
    // console.log(grants)
    const organisationContacts = _.sortBy(contacts, 'lastName')
    const organisationGrants = _.sortBy(grants, 'yearMonth')
    // console.log('Organisation grants: ', organisationGrants)
    // console.log(currentYear())

    console.log(contacts)

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
              text: `*GrantsTracker profile:*\n<${stackerURL}|${organisation['EC-display']}>`,
            },
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
      ]
        .concat([
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: 'Grant Summary',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*This year: ${totalGrantsInAYear(
                organisationGrants,
                currentYear(),
              )}*`,
            },
          },
        ])
        .concat(
          orEmptyRow(
            _.flatten(
              organisationGrantsByYear(organisationGrants, currentYear()).map(
                grantCard,
              ),
            ),
          ),
        )
        .concat([
          {
            type: 'divider',
          },
        ])
        .concat([
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Last year: ${totalGrantsInAYear(
                organisationGrants,
                currentYear() - 1,
              )}*`,
            },
          },
        ])
        .concat(
          orEmptyRow(
            _.flatten(
              organisationGrantsByYear(
                organisationGrants,
                currentYear() - 1,
              ).map(grantCard),
            ),
          ),
        )
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

const organisationGrantsByYear = (grants, year) => {
  return grants.filter((grant) => grant.yearMonth.slice(0, 4) == year)
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
  const stackerURL =
    'https://granttracker.sunriseproject.org.au/contacts/view/con_' + id

  console.log(id)

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
          text: `<${stackerURL}|GrantsTracker profile>`,
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

const totalGrantsInAYear = (grants, year) => {
  let amount

  if (year == currentYear()) {
    amount = grants.map((grant) =>
      grant.yearMonth.slice(0, 4) == year
        ? parseInt((grant.plannedAUD || '').replace(/\D/g, '')) || 0
        : 0,
    )
  } else {
    amount = grants.map((grant) =>
      grant.yearMonth.slice(0, 4) == year
        ? parseInt(
            (grant.codedAmounts.split(':')[1] || '').replace(/\D/g, ''),
          ) || 0
        : 0,
    )
  }

  const aud = amount.reduce((a, b) => a + b, 0)

  return `${toCurrency(aud, 'aud')}(${toCurrency(aud, 'usd')})`
}

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
        text: `*Amount:* ${plannedAmount(plannedAUD)} ${codedAmount(
          codedAmounts,
        )}`,
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

const plannedAmount = (aud) => {
  if (aud == 0) return ''
  const amt = (parseInt(aud.replace(/\D/g, '')) || 0) * 1.33

  return `${aud}(${toCurrency(amt, 'usd')})`
}

const codedAmount = (amt) => {
  if (amt == '') return ''

  const _amt =
    parseInt((amt.split(':')[1] || '').replace(/\D/g, '')) || 0 * 1.33

  return `${amt}(${toCurrency(_amt, 'usd')})`
}

// link to partner record in stacker
// grant summary:
// total grants: how much this year & how much last year
// grant line items:
// this year: grant w/ hyperlink & AUD equiv & USD equiv
// last year: grant w/ hyperlink & AUD equiv & USD equiv

// (grant agreement purpose)

// total grants:
// this year:
// last year:
