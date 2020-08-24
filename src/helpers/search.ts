const organisationConditions = [
  'organisation.name ~* :value',
  'organisation.abbreviation ~* :value',
]

export const textSearchSQL = (value) =>
  [
    'contact.firstName ~* :value',
    'contact.lastName ~* :value',
    "concat(contact.firstName, ' ', contact.lastName) ~* :value",
  ]
    .concat(organisationConditions)
    .join(' or ')

export const organisationTextSearchSQL = (value) =>
  organisationConditions.join(' or ')
