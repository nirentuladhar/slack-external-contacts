import { nameWithOrgs } from './format'

const footnoteText = [
  ':moneybag: = Grants in the previous financial year',
  ':crystal_ball: = Future grants',
  ':calling: = Point person',
].join('\n')

export const footnote = [
  { type: 'divider' },
  {
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: footnoteText,
      },
    ],
  },
]

export const optionForEntity = (entity) => ({
  text: {
    type: 'plain_text',
    text: entity.name,
  },
  value: `${entity.id}`,
})

export const optionForContact = (contact) => ({
  text: {
    type: 'plain_text',
    text: nameWithOrgs(contact),
  },
  value: `${contact.id}`,
})
