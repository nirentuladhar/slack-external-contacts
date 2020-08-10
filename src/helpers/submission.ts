export const selectedValuesFromSubmission = (actionValues) => {
  if (!actionValues) return []
  return ['selected_options'].map((o) => o['value'])
}
