export const selectSubmission = (actionValue) => {
  const selected_option = actionValue['selected_option']
  return selected_option ? selected_option.value : null
}

export const multiSelectSubmission = (actionValues) => {
  if (!actionValues || !actionValues['selected_options']) return []
  return actionValues['selected_options'].map((o) => o['value'])
}
