/// <reference lib="es2020" />
import fs from 'fs';
import path from 'path';

export class CynicalLogger {
  private logFile: string;

  constructor() {
    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join('logs', `${date}.log`);
    if (!fs.existsSync('logs')) fs.mkdirSync('logs', { recursive: true });
  }

  private formatMessage(level: string, msg: string): string {
    const timestamp = new Date().toISOString();
    const cynicalPrefix = {
      'INFO': '[INFO] ',
      'WARN': '[WARN] ',
      'ERROR': '[ERROR] 💀 ',
      'DEBUG': '[DEBUG] 🐛 ',
      'LUNCH': '[LUNCH] 🍕 '
    }[level] || '[?] ';
    
    return `${timestamp} ${cynicalPrefix}${msg}\n`;
  }

  log(msg: string) {
    const formatted = this.formatMessage('INFO', msg);
    console.log(`\x1b[36m${formatted}\x1b[0m`);
    fs.appendFileSync(this.logFile, formatted);
  }

  error(msg: string) {
    const formatted = this.formatMessage('ERROR', msg);
    console.error(`\x1b[31m${formatted}\x1b[0m`);
    fs.appendFileSync(this.logFile, formatted);
  }

  lunch(msg: string) {
    const formatted = this.formatMessage('LUNCH', `🦞 LOBSTER BREAK: ${msg}`);
    console.log(`\x1b[33m${formatted}\x1b[0m`);
    fs.appendFileSync(this.logFile, formatted);
  }

  existential(msg: string) {
    const formatted = this.formatMessage('WARN', `🌌 EXISTENTIAL: ${msg}`);
    console.warn(`\x1b[35m${formatted}\x1b[0m`);
    fs.appendFileSync(this.logFile, formatted);
  }
}

export const logger = new CynicalLogger();
