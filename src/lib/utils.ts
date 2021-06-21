export const logger = console.log.bind(console)

export const compactSet = (...arrs) => [...new Set(...arrs)].filter(Boolean)
