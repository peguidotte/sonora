/** Deliberately synthetic: never a claim about a real address or live measurement. */
export const scenarios = {
  morning: {
    label: "Manhã",
    period: "06h–12h",
    values: [48, 51, 58, 62, 57, 53],
    note: "O movimento da manhã muda a leitura do lugar.",
  },
  afternoon: {
    label: "Tarde",
    period: "12h–18h",
    values: [55, 58, 54, 52, 60, 56],
    note: "Observe as variações, não apenas um número isolado.",
  },
  evening: {
    label: "Noite",
    period: "18h–00h",
    values: [61, 57, 52, 47, 44, 42],
    note: "Outro período, outra perspectiva sobre o mesmo lugar.",
  },
  empty: {
    label: "Sem dados",
    period: "Período sem observações",
    values: [],
    note: "Ausência de observações não significa ausência de ruído.",
  },
};
export function energyAverage(values) {
  if (!values.length) return null;
  if (
    values.some((value) => !Number.isFinite(value) || value < 0 || value > 140)
  )
    throw new RangeError("Invalid acoustic value");
  return (
    10 *
    Math.log10(
      values.reduce((sum, value) => sum + 10 ** (value / 10), 0) /
        values.length,
    )
  );
}
export function profileFor(key) {
  const scenario = scenarios[key];
  if (!scenario) throw new RangeError("Unknown scenario");
  return { ...scenario, level: energyAverage(scenario.values) };
}
