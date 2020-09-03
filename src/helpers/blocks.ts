import { nameWithOrgsShort, truncateForOption, fallback } from './format'

const footnoteText = [
  ':moneybag: = Distributed grants',
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
    text: truncateForOption(entity.name),
  },
  value: `${entity.id}`,
})

export const optionForContact = (contact) => ({
  text: {
    type: 'plain_text',
    text: truncateForOption(nameWithOrgsShort(contact)),
    emoji: true,
  },
  value: `${contact.id}`,
})

export const orEmptyRow = (data) =>
  data.length
    ? data
    : [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: fallback,
          },
        },
      ]
