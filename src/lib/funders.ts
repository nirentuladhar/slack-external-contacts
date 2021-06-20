import { pick } from 'lodash'

const apiKey = process.env.AIRTABLE_API_KEY
const baseID = process.env.AIRTABLE_BASE_ID_FUNDER
const Airtable = require('airtable')
const base = new Airtable({ apiKey }).base(baseID)

const orgTable = base('Funding organisations')
const adminTable = base('Admins')
const contactsTable = base('Contacts')

const allAttrsFormula = (attrs) =>
  ['AND(', Object.entries(attrs).map(([k, v]) => `${k}="${v}"`), ')'].join('')

export const getOrgs = async (term: string) => {
  const sanitisedTerm = (term || '').replace(/^'"/, '').replace(/'"$/, '')
  const params = {
    view: 'Slack External Contacts filter',
    fields: ['RECORD_ID', 'EC-display'],
    filterByFormula: `REGEX_MATCH(LOWER({EC-display}), '.*' & LOWER("${sanitisedTerm}") & '.*')`,
  }
  return orgTable.select(params).all()
}

export const searchOrgs = async (term: string) => {
  const records = await getOrgs(term)
  return records.map((r) => r.fields)
}

export const orgDetails = async (recordID: string) => {
  const params = {
    view: 'Slack External Contacts filter',
    maxRecords: 1,
    fields: [
      'RECORD_ID',
      'EC-display',
      'Website',
      // 'Notes',
      'EC-contact-info',
      // 'EC-program-display',
      // 'EC-grant-info',
    ],
    filterByFormula: `RECORD_ID()="${recordID}"`,
  }
  const records = await orgTable.select(params).all() // .find() doesn't allow specifiying fields
  return (records || []).map((r) => r.fields)[0]
}

export const hasPermission = async (username: string) => {
  console.log(username)
  const params = {
    view: 'Slack External Contacts filter',
    maxRecords: 1,
    fields: ['EC-slack-username'],
    filterByFormula: `{EC-slack-username}="${username}"`,
  }
  const record = await adminTable.select(params).all()
  const hasPermission = record.length > 0

  console.log(hasPermission)

  return hasPermission
}
