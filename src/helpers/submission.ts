export const selectSubmission = (actionValue) => {
  const selected_option = actionValue['selected_option']
  return selected_option ? selected_option.value : null
}

export const multiSelectSubmission = (section, fieldName) => {
  if (!section || !section[fieldName]) return []
  const actionValues = section[fieldName]
  if (!actionValues || !actionValues['selected_options']) return []
  return actionValues['selected_options'].map((o) => o['value'])
}
