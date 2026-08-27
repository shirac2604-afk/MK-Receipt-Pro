# Blue receipt template v2

## Scope

This change applies an approved **display-only** receipt layout to both clients:

- Android: `apps/android/src/services/ReceiptPdfService.ts`
- Windows: `apps/windows/packages/pdf/src/ReceiptTemplateV1.ts`

It uses the blue layout approved from the preview on 2026-08-27.

## Visual changes

- A4 right-to-left receipt with a centered business logo and identity.
- Separate “לכבוד” and “מאת” sections.
- Blue document divider and blue total row.
- Grey-header item and payment tables.
- Clear total, payment, notes, and digital-confirmation sections.
- The existing cancellation banner, watermark, and cancellation details remain red when a Windows receipt is cancelled.

## Non-visual guarantees

The change does not alter:

- receipt-number issuance or reservations;
- amount calculations;
- payment data, dates, reference numbers, or client/business data;
- Supabase schema, RPCs, storage keys, or security configuration;
- application identifiers or installation/upgrade identity.

Windows newly-created PDFs record `templateVersion: 2`; an existing PDF remains an existing file and retains its original template metadata.

## Verification

The Android PDF-parity guard was updated to assert the blue document line, blue accent, receipt tables, total row, RTL A4 layout, legal notice, technical footer, and business-profile source.

Manual acceptance after release:

1. Generate a normal receipt on Windows and Android.
2. Verify the PDF visually matches the approved blue layout.
3. Generate a cancelled Windows receipt and confirm the cancellation marking is retained.
4. Verify the receipt number, amount, payment method, date, and reference match the issued record.
