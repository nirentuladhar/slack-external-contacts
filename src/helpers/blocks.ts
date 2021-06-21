import { truncateForOption, fallback } from './format'

// const footnoteText = [
//   ':moneybag: = Distributed grants',
//   ':crystal_ball: = Future grants',
//   ':calling: = Primary contact for their organisation in their area of expertise',
// ].join('\n')

export const footnote = [
  { type: 'divider' },
  // {
  //   type: 'context',
  //   elements: [
  //     {
  //       type: 'mrkdwn',
  //       text: footnoteText,
  //     },
  //   ],
  // },
]

export const optionForNewOrg = ({ fields }) => ({
  text: {
    type: 'plain_text',
    text: truncateForOption(fields['EC-display']),
  },
  value: fields['RECORD_ID'],
})

export const optionForProgram = ({ fields }) => ({
  text: {
    type: 'plain_text',
    text: truncateForOption(fields['EC-display']),
  },
  value: fields['RECORD_ID'],
})

export const optionForEntity = (entity) => ({
  text: {
    type: 'plain_text',
    text: truncateForOption(entity.name),
  },
  value: `${entity.id}`,
})

export const optionForNewContact = ({ fields }) => ({
  text: {
    type: 'plain_text',
    text: truncateForOption(fields['EC-display']),
    emoji: true,
  },
  value: fields['RECORD_ID'],
})

export const optionForExistingContact = ([text, value]) => ({
  text: {
    type: 'plain_text',
    text,
    emoji: true,
  },
  value,
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
