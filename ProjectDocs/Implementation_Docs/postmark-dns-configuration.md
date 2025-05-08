# Postmark DNS Configuration Guide

## Overview
This document provides instructions for configuring DNS records for the Graceful Homeschooling domain to ensure proper email authentication and deliverability with Postmark.

## Prerequisites
- Access to your domain's DNS settings (likely through your domain registrar)
- Postmark account with sender signature set up for gracefulhomeschooling.com

## Required DNS Records

### 1. SPF (Sender Policy Framework) Record

SPF helps prevent email spoofing by specifying which servers are authorized to send email on behalf of your domain.

**Record Type:** TXT  
**Host/Name:** @ (or leave blank for the root domain)  
**Value:** `v=spf1 include:spf.mtasv.net ~all`

### 2. DKIM (DomainKeys Identified Mail) Record

DKIM adds a digital signature to your emails that verifies they were sent by an authorized server.

**Record Type:** TXT  
**Host/Name:** [DKIM Selector]._domainkey (get exact value from Postmark dashboard)  
**Value:** [DKIM Value] (get from Postmark dashboard)

> Note: The exact DKIM selector and value must be obtained from your Postmark account under Sender Signatures.

### 3. DMARC (Domain-based Message Authentication, Reporting & Conformance) Record

DMARC builds on SPF and DKIM to provide guidance on how to handle emails that fail authentication.

**Record Type:** TXT  
**Host/Name:** _dmarc  
**Value:** `v=DMARC1; p=none; rua=mailto:dmarc@gracefulhomeschooling.com; pct=100; sp=none`

> This is a monitoring-only policy that requests reports but doesn't reject unauthenticated emails. Once you've reviewed reports, consider changing to `p=quarantine` or `p=reject` for stronger protection.

### 4. Return-Path Record (Optional but Recommended)

Ensures that bounce messages go back to Postmark for proper tracking.

**Record Type:** CNAME  
**Host/Name:** pm-bounces  
**Value:** [Return-Path Value] (get from Postmark dashboard)

## Verification Process

1. Log into your Postmark account
2. Navigate to Sender Signatures
3. Select your domain
4. Click "Verify" for each DNS record
5. Wait for verification (can take up to 24-48 hours for DNS propagation)

## Testing

After DNS records are verified in Postmark:

1. Send a test email using the Postmark test feature
2. Check the email headers of received messages to confirm proper authentication
3. Use a tool like [mail-tester.com](https://www.mail-tester.com/) to evaluate deliverability

## Advanced Settings

For production environments with high email volume, consider:

- Updating DMARC policy to `p=quarantine` or `p=reject` after monitoring
- Setting up DMARC aggregate reports analysis
- Implementing BIMI (Brand Indicators for Message Identification) for logo display in supported email clients

## Troubleshooting

If verification fails:

1. Confirm records were added exactly as specified by Postmark
2. Check for formatting issues or extra spaces
3. Verify you're updating the correct DNS zone
4. Allow sufficient time for DNS propagation (24-48 hours)
5. Contact your DNS provider if records aren't updating properly

## References

- [Postmark's DNS Configuration Guide](https://postmarkapp.com/support/article/1090-spf-dkim-dmarc)
- [SPF Record Syntax](http://www.openspf.org/SPF_Record_Syntax)
- [DMARC.org](https://dmarc.org/)
