import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Patrón Adapter (Entrega 2, Figura 6 y Sec. 5.1).
 * Aísla el proveedor de correo externo del resto del negocio.
 */
export interface MailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface MailAdapter {
  enviar(msg: MailMessage): Promise<{ delivered: boolean; mode: 'smtp' | 'simulated'; error?: string }>;
}

export const MAIL_ADAPTER = Symbol('MAIL_ADAPTER');

@Injectable()
export class SmtpMailAdapter implements MailAdapter {
  private readonly logger = new Logger(SmtpMailAdapter.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') ||
      'Centro Cultural Lucy Tejada <no-reply@lucytejada.pereira.gov.co>';

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass } : undefined,
      });
      this.logger.log(`SmtpMailAdapter configurado hacia ${host}:${port}`);
    } else {
      this.logger.log(
        'SMTP_HOST no configurado: entregas en modo simulado registradas en bandeja interna.',
      );
    }
  }

  async enviar(msg: MailMessage): Promise<{ delivered: boolean; mode: 'smtp' | 'simulated'; error?: string }> {
    if (!this.transporter) {
      this.logger.log(`[CORREO SIMULADO] Para: ${msg.to} | Asunto: ${msg.subject}`);
      return { delivered: true, mode: 'simulated' };
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: msg.to,
        subject: msg.subject,
        text: msg.body,
      });
      return { delivered: true, mode: 'smtp' };
    } catch (err) {
      const errorMsg = (err as Error).message;
      this.logger.warn(`Error enviando correo SMTP a ${msg.to}: ${errorMsg}`);
      return { delivered: false, mode: 'smtp', error: errorMsg };
    }
  }
}
