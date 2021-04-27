import { pick } from 'lodash'

const apiKey = process.env.AIRTABLE_API_KEY
const baseID = process.env.AIRTABLE_BASE_ID
const Airtable = require('airtable')
const base = new Airtable({ apiKey }).base(baseID)

const orgTable = base('Partner Organisations')
const contactsTable = base('Contacts')
const messagesTable = base('Messages')
const programsTable = base('Projects')

const allAttrsFormula = (attrs) =>
  ['AND(', Object.entries(attrs).map(([k, v]) => `${k}="${v}"`), ')'].join('')

export const searchMessages = async (term: string) => {
  const sanitisedTerm = (term || '').replace(/[^\w ]/g, '')
  const params = {
    fields: ['text', 'createdAt', 'slackID', 'contactsList'],
    sort: [{ field: 'createdAt', direction: 'desc' }],
    filterByFormula: `REGEX_MATCH(LOWER({EC-search-index}), LOWER('.*${sanitisedTerm}.*'))`,
  }
  const records = await messagesTable.select(params).all()
  return records.map((r) => r.fields)
}

export const searchContacts = async (term: string) => {
  const sanitisedTerm = (term || '').replace(/[^\w ]/g, '')
  const params = {
    view: 'Slack External Contacts filter',
    fields: ['RECORD_ID', 'EC-display'],
    filterByFormula: `REGEX_MATCH(LOWER({EC-display}), LOWER('.*${sanitisedTerm}.*'))`,
  }
  return contactsTable.select(params).all()
}

export const searchOrgs = async (term: string) => {
  const sanitisedTerm = (term || '').replace(/^'"/, '').replace(/'"$/, '')
  const params = {
    view: 'Slack External Contacts filter',
    fields: ['RECORD_ID', 'EC-display'],
    filterByFormula: `REGEX_MATCH(LOWER({EC-display}), '.*' & LOWER("${sanitisedTerm}") & '.*')`,
  }
  const records = await orgTable.select(params).all()
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
      'Notes',
      'EC-contact-info',
      'EC-program-display',
      'EC-grant-info',
    ],
    filterByFormula: `RECORD_ID()="${recordID}"`,
  }
  const records = await orgTable.select(params).all() // .find() doesn't allow specifiying fields
  return (records || []).map((r) => r.fields)[0]
}

export const allPrograms = async () => {
  const params = {
    view: 'Slack External Contacts filter',
    fields: ['RECORD_ID', 'EC-display'],
  }
  return programsTable.select(params).all()
}

export const findMessage = messagesTable.find

export const updateMessage = messagesTable.update

export const upsertMessage = async (attrs) => {
  const searchFields = ['channelID', 'slackID', 'timestamp', 'text']
  const filterByFormula = allAttrsFormula(pick(attrs, searchFields))
  const searchParams = { maxRecords: 1, filterByFormula }
  let [message] = await messagesTable.select(searchParams).all()
  if (!message) message = await messagesTable.create(attrs)
  return message
}

export const createContact = contactsTable.create
export const createOrg = orgTable.create
