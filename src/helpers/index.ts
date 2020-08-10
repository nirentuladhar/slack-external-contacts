export const nameForContact = (contact) =>
  `${contact.firstName} ${contact.lastName}`

export const nameWithOrgs = (contact) =>
  `${nameForContact(contact)}${formattedOrganisationsName(contact)}`

export const formattedOrganisationsName = (contact) =>
  contact.organisations.length
    ? ` [${contact.organisations.map(formattedOrganisationDetails).join(', ')}]`
    : ''

export const formattedOrganisationDetails = (organisation) =>
  organisation.name +
  (organisation.previous_grants ? ':moneybag:' : '') +
  (organisation.future_grants_in_consideration ? ':crystal_ball:' : '')

export const formattedOrganisationNameWithAbbrev = (organisation) =>
  formattedOrganisationDetails(organisation) +
  (organisation.abbreviation ? ` (${organisation.abbreviation})` : '')

export const optionForContact = (contact) => ({
  text: {
    type: 'plain_text',
    text: nameWithOrgs(contact),
  },
  value: `${contact.id}`,
})

export const fallback = '-'
export const valueOrFallback = (value) => value || fallback

export const optionForEntity = (entity) => ({
  text: {
    type: 'plain_text',
    text: entity.name,
  },
  value: `${entity.id}`,
})

export const toCurrency = (field) => {
  if (!field) return fallback
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(field)
}

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

export const textSearchSQL = (value) =>
  [
    'contact.firstName ~* :value',
    'contact.lastName ~* :value',
    "concat(contact.firstName, ' ', contact.lastName) ~* :value",
    'organisation.name ~* :value',
  ].join(' or ')
