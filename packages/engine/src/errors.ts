/** Erro de regra: o comando não é válido no estado atual. */
export class RuleError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "RuleError";
  }
}
