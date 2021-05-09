import moment from 'moment'
import { _ } from 'lodash'

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

export const truncateForOption = (option) =>
  option && option.length > 75 ? option.slice(0, 72) + '…' : option

export const shortFormat = (organisation) =>
  organisation.abbreviation || organisation.name

export const futureGrant = (grant) =>
  grant.status && grant.status.match(/approved|new/i)

export const grantEmoji = (grant) =>
  futureGrant(grant) ? ':crystal_ball:' : ':moneybag:'

export const orgHasPastGrants = (organisation) =>
  organisation.grants &&
  _.some(organisation.grants, (grant) => !futureGrant(grant))

export const orgHasFutureGrants = (organisation) =>
  organisation.grants && _.some(organisation.grants, futureGrant)

export const formattedOrganisationDetails = (organisation) =>
  organisation.name +
  (orgHasPastGrants(organisation) ? ':moneybag:' : '') +
  (orgHasFutureGrants(organisation) ? ':crystal_ball:' : '')

export const formattedOrganisationNameWithAbbrev = (organisation) =>
  formattedOrganisationDetails(organisation) +
  (organisation.abbreviation ? ` (${organisation.abbreviation})` : '')

export const fallback = '-'
export const valueOrFallback = (value) => value || fallback
export const functionOrFallback = (value, fn) => (value ? fn(value) : fallback)

export const programsForContact = (contact) =>
  contact.programs.length
    ? contact.programs.map((p) => p.name).join(', ')
    : fallback

export const toCurrency = (field, currency) => {
  if (!field) return fallback
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'AUD',
    minimumFractionDigits: 2,
  }).format(field)
}

export const time = (timestamp) =>
  moment(timestamp).format('h:mm a on MMMM Do YYYY')

export const date = (date) => moment(date).format('MMMM Do YYYY')

export const currentYear = () => moment().year()
