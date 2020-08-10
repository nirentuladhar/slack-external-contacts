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

export const fallback = '-'
export const valueOrFallback = (value) => value || fallback

export const toCurrency = (field) => {
  if (!field) return fallback
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(field)
}
