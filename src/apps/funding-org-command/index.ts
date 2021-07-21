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
import {
  searchOrgs,
  orgDetails,
  hasPermission,
  // fxRates,
  getStackerContactUrl,
} from '../../lib/funders'

export default function (app: App): void {
  app.command('/funding-org', async ({ command, ack, respond }) => {
    await ack()

    if (!(await hasPermission(command.user_name))) {
      await respond('Sorry! You cannot access this command.')
      return
    }

    if (!command.text) {
      await respond(
        'Please specify text to search organisation names with e.g. `/funding-org Sunrise`',
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

    // console.log(matchingOrganisations)

    const organisation = await orgDetails(matchingOrganisations[0].RECORD_ID)
    const contacts = (organisation['EC-contact-info'] || []).map((info) => {
      const [id, firstName, lastName, email, phone, role, notes] = info.split(
        '|',
      )
      return { id, firstName, lastName, email, phone, role, notes }
    })
    const stackerURL =
      'https://thesunriseproject.stackerhq.com/fundertracker/funding-organisations/view/for_' +
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

    const grantReports = (organisation['EC-grant-report-info'] || []).map(
      (info) => {
        const [
          reportId,
          grant,
          reportStatus,
          stackerLink,
          dueDate,
        ] = info.split('|')
        return { reportId, grant, reportStatus, stackerLink, dueDate }
      },
    )
    // console.log('Grant reports', grantReports)

    // console.log(contacts)

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
              text: `*Website:* ${valueOrFallback(organisation['Website'])}`,
            },
            {
              type: 'mrkdwn',
              text: `*GrantsTracker profile:*\n<${stackerURL}|${organisation['EC-display']}>`,
            },
          ],
        },
      ]
        .concat([
          {
            type: 'divider',
          },
        ])
        .concat([
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: 'Grant Reports',
              emoji: true,
            },
          },
        ])
        .concat(
          orEmptyRow(
            _.flatten(futureGrantReports(grantReports).map(grantCard)),
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

const futureGrantReports = (grants) => {
  return grants.filter((grant) => Date.parse(grant.dueDate) > Date.now())
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
          text: `<${getStackerContactUrl(id)}|GrantsTracker profile>`,
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

const grantCard = ({ reportId, grant, reportStatus, stackerLink, dueDate }) => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `<${stackerLink}|${reportId}>`,
    },
  },
  {
    type: 'section',
    fields: [
      {
        type: 'mrkdwn',
        text: `*Status:* ${valueOrFallback(reportStatus)}`,
      },
      {
        type: 'mrkdwn',
        text: `*Due date:* ${date(dueDate)}`,
      },
    ],
  },
]
