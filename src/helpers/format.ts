export const nameForContact = (contact) =>
  `${contact.firstName} ${contact.lastName}`

export const primaryContactEmoji = (contact) =>
  contact.programs.length ? ':calling: ' : ''

export const nameWithOrgs = (contact) =>
  primaryContactEmoji(contact) +
  nameForContact(contact) +
  formattedOrganisationsNames(contact, formattedOrganisationDetails)

export const nameWithOrgsShort = (contact) =>
  nameForContact(contact) + formattedOrganisationsNames(contact, shortFormat)

export const formattedOrganisationsNames = (contact, format) =>
  contact.organisations.length
    ? ` [${contact.organisations.map(format).join(', ')}]`
    : ''

export const shortFormat = (organisation) =>
  organisation.abbreviation || organisation.name

export const formattedOrganisationDetails = (organisation) =>
  organisation.name +
  (organisation.previous_grants ? ':moneybag:' : '') +
  (organisation.future_grants_in_consideration ? ':crystal_ball:' : '')

export const formattedOrganisationNameWithAbbrev = (organisation) =>
  formattedOrganisationDetails(organisation) +
  (organisation.abbreviation ? ` (${organisation.abbreviation})` : '')

export const fallback = '-'
export const valueOrFallback = (value) => value || fallback

export const programsForContact = (contact) =>
  contact.programs.length
    ? contact.programs.map((p) => p.name).join(', ')
    : fallback

export const toCurrency = (field) => {
  if (!field) return fallback
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(field)
}
