import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  recipient?: string
  inviterEmail?: string
  role?: string
}

export const InviteEmail = ({
  siteName = 'TotalReward',
  siteUrl,
  confirmationUrl,
  inviterEmail,
  role,
}: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName} — accept your invitation</Preview>
    <Body style={main}>
      <Container style={container}>

        {/* Logo / Brand */}
        <Section style={logoSection}>
          <Text style={logoText}>{siteName}</Text>
        </Section>

        {/* Hero */}
        <Section style={heroSection}>
          <Heading style={h1}>You've been invited 🎉</Heading>
          <Text style={text}>
            {inviterEmail
              ? <><strong>{inviterEmail}</strong> has invited you</>
              : <>You've been invited</>
            } to join{' '}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>
            {role ? <> as <strong style={roleBadge}>{role}</strong></> : ''}.
          </Text>
          <Text style={text}>
            Click the button below to accept your invitation and set up your account.
            This link will expire in <strong>24 hours</strong>.
          </Text>
        </Section>

        {/* CTA */}
        <Section style={btnSection}>
          <Button style={button} href={confirmationUrl}>
            Accept Invitation &amp; Set Password
          </Button>
        </Section>

        {/* What to expect */}
        <Section style={infoBox}>
          <Text style={infoTitle}>What happens next:</Text>
          <Text style={infoItem}>✓ Click the button above</Text>
          <Text style={infoItem}>✓ Enter your name and choose a password</Text>
          <Text style={infoItem}>✓ Access the organization dashboard immediately</Text>
        </Section>

        <Hr style={hr} />

        {/* Fallback link */}
        <Text style={smallText}>
          If the button doesn't work, copy and paste this link into your browser:
        </Text>
        <Text style={linkText}>
          <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this email.
          You will not be added to any organization unless you click the link above.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

// ── Styles ───────────────────────────────────────────────
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  padding: '0',
  maxWidth: '560px',
  borderRadius: '12px',
  border: '1px solid #e4e9f0',
  overflow: 'hidden' as const,
}
const logoSection = {
  backgroundColor: '#0f172a',
  padding: '20px 32px',
}
const logoText = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold' as const,
  margin: '0',
}
const heroSection = {
  padding: '32px 32px 0',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const roleBadge = {
  backgroundColor: '#f0f9ff',
  color: '#0284c7',
  padding: '2px 8px',
  borderRadius: '4px',
  fontWeight: 'bold' as const,
}
const btnSection = {
  padding: '8px 32px 24px',
}
const button = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const infoBox = {
  backgroundColor: '#f8fafc',
  margin: '0 32px 24px',
  padding: '16px 20px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
}
const infoTitle = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 8px',
}
const infoItem = {
  fontSize: '13px',
  color: '#475569',
  margin: '0 0 4px',
}
const hr = {
  borderColor: '#e2e8f0',
  margin: '0 32px 24px',
}
const smallText = {
  fontSize: '12px',
  color: '#94a3b8',
  padding: '0 32px',
  margin: '0 0 8px',
}
const linkText = {
  fontSize: '12px',
  color: '#94a3b8',
  padding: '0 32px',
  margin: '0 0 24px',
  wordBreak: 'break-all' as const,
}
const link = {
  color: '#0284c7',
  textDecoration: 'underline',
}
const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  padding: '0 32px 32px',
  lineHeight: '1.5',
  margin: '0',
}
