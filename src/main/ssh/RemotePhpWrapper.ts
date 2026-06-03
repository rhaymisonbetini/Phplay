export class RemotePhpWrapper {
  static buildCommand(phpBinary: string, code: string): string {
    const encoded = Buffer.from(code).toString('base64')
    return `${phpBinary} -r "eval(base64_decode('${encoded}'));"`
  }
}
