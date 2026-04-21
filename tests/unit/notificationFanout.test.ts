import { describe, it, expect } from 'vitest'

interface FanOutPayload {
  user_id: string
  partner_id: number
  type: string
  title_en: string
  title_fr: string
  message_en: string
  message_fr: string
  phone: string
  email: string
  locale: 'en' | 'fr'
  related_entity_id?: string
}

function buildInAppPayload(p: FanOutPayload) {
  return {
    partner_id: p.partner_id,
    user_id: p.user_id,
    type: p.type,
    title: p.locale === 'fr' ? p.title_fr : p.title_en,
    message: p.locale === 'fr' ? p.message_fr : p.message_en,
    is_read: false,
  }
}

function buildSmsPayload(p: FanOutPayload) {
  const message = p.locale === 'fr' ? p.message_fr : p.message_en
  return {
    to: p.phone,
    message: message.slice(0, 160),
  }
}

function buildEmailPayload(p: FanOutPayload) {
  return {
    to: [{ email: p.email }],
    params: {
      title: p.locale === 'fr' ? p.title_fr : p.title_en,
      message: p.locale === 'fr' ? p.message_fr : p.message_en,
    },
  }
}

const samplePayload: FanOutPayload = {
  user_id: 'uuid-123',
  partner_id: 42,
  type: 'credit_low',
  title_en: 'Low Credit',
  title_fr: 'Crédit faible',
  message_en: 'Your balance is low',
  message_fr: 'Votre solde est faible',
  phone: '+221701234567',
  email: 'user@example.com',
  locale: 'fr',
}

describe('Notification Fan-Out Payload Shape', () => {
  it('in-app payload has required fields and uses locale', () => {
    const result = buildInAppPayload(samplePayload)
    expect(result).toMatchObject({ partner_id: 42, user_id: 'uuid-123', is_read: false })
    expect(result.title).toBe('Crédit faible')
    expect(result.message).toBe('Votre solde est faible')
  })

  it('in-app payload uses English when locale is en', () => {
    const result = buildInAppPayload({ ...samplePayload, locale: 'en' })
    expect(result.title).toBe('Low Credit')
  })

  it('SMS truncates message to 160 characters', () => {
    const longMsg = 'A'.repeat(200)
    const sms = buildSmsPayload({ ...samplePayload, message_fr: longMsg })
    expect(sms.message.length).toBeLessThanOrEqual(160)
  })

  it('SMS uses French message for FR locale', () => {
    const sms = buildSmsPayload(samplePayload)
    expect(sms.message).toBe('Votre solde est faible')
  })

  it('email payload uses correct locale for title and message', () => {
    const email = buildEmailPayload(samplePayload)
    expect(email.params.title).toBe('Crédit faible')
    expect(email.to[0].email).toBe('user@example.com')
  })
})
