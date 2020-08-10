export const textSearchSQL = (value) =>
  [
    'contact.firstName ~* :value',
    'contact.lastName ~* :value',
    "concat(contact.firstName, ' ', contact.lastName) ~* :value",
    'organisation.name ~* :value',
  ].join(' or ')
