import { nameWithOrgsShort } from './format'

const footnoteText = [
  ':moneybag: = Grants in the previous calendar year',
  ':crystal_ball: = Future grants',
  ':calling: = Primary contact for their organisation in their area of expertise',
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
    text: nameWithOrgsShort(contact),
    emoji: true,
  },
  value: `${contact.id}`,
})
