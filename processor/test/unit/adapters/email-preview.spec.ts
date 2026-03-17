/**
 * Email preview generator — not a regular test.
 * Run with: npx jest --testPathPattern email-preview --verbose
 * Output: /tmp/email-preview/*.html  (open in any browser)
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createConfigComponent } from '@well-known-components/env-config-provider'
import { NotificationType } from '@dcl/schemas'
import { createEmailRenderer } from '../../../src/adapters/email-renderer'
import { NotificationRecord } from '@notifications/common'

const OUTPUT_DIR = '/tmp/email-preview'

const config = createConfigComponent({
  SIGNING_KEY: 'preview-key',
  SERVICE_BASE_URL: 'https://notifications.decentraland.org',
  ACCOUNT_BASE_URL: 'https://decentraland.zone/account',
  ENV: 'test'
})

const previews: Array<{ filename: string; notification: NotificationRecord }> = [
  {
    filename: 'banned-full.html',
    notification: {
      id: '1',
      type: NotificationType.BANNED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        userName: 'CoolBuilder',
        reason: 'Harassment',
        bannedAt: '2024-06-01T12:00:00.000Z',
        expiresAt: '2024-06-08T12:00:00.000Z',
        customMessage: 'You have been banned for repeated violations of our community guidelines.'
      },
      timestamp: Date.now(),
      eventKey: '1'
    }
  },
  {
    filename: 'banned-minimal.html',
    notification: {
      id: '2',
      type: NotificationType.BANNED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        userName: 'CoolBuilder',
        reason: 'Spam',
        bannedAt: '2024-06-01T12:00:00.000Z'
      },
      timestamp: Date.now(),
      eventKey: '2'
    }
  },
  {
    filename: 'ban_warning.html',
    notification: {
      id: '3',
      type: NotificationType.BAN_WARNING,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        userName: 'CoolBuilder',
        reason: 'Inappropriate language',
        warnedAt: '2024-06-01T12:00:00.000Z'
      },
      timestamp: Date.now(),
      eventKey: '3'
    }
  },
  {
    filename: 'ban_lifted.html',
    notification: {
      id: '4',
      type: NotificationType.BAN_LIFTED,
      address: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      metadata: {
        userName: 'CoolBuilder',
        liftedAt: 1717243200000
      },
      timestamp: Date.now(),
      eventKey: '4'
    }
  }
]

describe('email preview generator', () => {
  beforeAll(() => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  })

  test.each(previews.map((p) => [p.filename, p]))('%s', async (_, { filename, notification }) => {
    const renderer = await createEmailRenderer({ config })
    const email = await renderer.renderEmail('preview@example.com', notification)
    expect(email).not.toBeNull()
    const html = await renderer.renderTemplate(email!)
    const outputPath = path.join(OUTPUT_DIR, filename)
    fs.writeFileSync(outputPath, html)
    console.log(`✔ Written: ${outputPath}`)
  })
})
