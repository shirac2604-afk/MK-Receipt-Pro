-- Applied to production on 2026-08-12.
-- Reconstructed from the live PostgreSQL constraint definitions after migration.
-- Defense in depth: invalid input is rejected even if a client UI is bypassed.

ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_address_len;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_address_len CHECK (address IS NULL OR char_length(address) <= 250);
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_brand_color_format;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_brand_color_format CHECK (brand_color IS NULL OR btrim(brand_color) = '' OR brand_color ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_business_name_len;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_business_name_len CHECK (char_length(btrim(business_name)) BETWEEN 1 AND 120);
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_business_number_format;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_business_number_format CHECK (business_number ~ '^[0-9]{5,15}$');
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_email_format;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_email_format CHECK (email IS NULL OR btrim(email) = '' OR (char_length(email) <= 254 AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'));
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_owner_name_len;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_owner_name_len CHECK (char_length(btrim(owner_name)) BETWEEN 1 AND 120);
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_phone_format;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_phone_format CHECK (phone IS NULL OR btrim(phone) = '' OR phone ~ '^[0-9+() -]{7,20}$');
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_slogan_len;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_slogan_len CHECK (slogan IS NULL OR char_length(slogan) <= 160);
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_tax_status_check;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_tax_status_check CHECK (tax_status IN ('עוסק פטור','עוסק מורשה'));

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_display_name_len;
ALTER TABLE public.customers ADD CONSTRAINT customers_display_name_len CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 160);
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_phone_format;
ALTER TABLE public.customers ADD CONSTRAINT customers_phone_format CHECK (phone IS NULL OR btrim(phone) = '' OR phone ~ '^[0-9+() -]{7,20}$');
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_email_format;
ALTER TABLE public.customers ADD CONSTRAINT customers_email_format CHECK (email IS NULL OR btrim(email) = '' OR (char_length(email) <= 254 AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'));
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_notes_len;
ALTER TABLE public.customers ADD CONSTRAINT customers_notes_len CHECK (notes IS NULL OR char_length(notes) <= 2000);

ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS devices_device_key_len;
ALTER TABLE public.devices ADD CONSTRAINT devices_device_key_len CHECK (char_length(device_key) BETWEEN 8 AND 256);
ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS devices_display_name_len;
ALTER TABLE public.devices ADD CONSTRAINT devices_display_name_len CHECK (display_name IS NULL OR char_length(display_name) <= 120);
ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS devices_platform_allowed;
ALTER TABLE public.devices ADD CONSTRAINT devices_platform_allowed CHECK (platform IN ('windows','android'));

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_amount_positive;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_positive CHECK (amount_agorot BETWEEN 1 AND 1000000000000);
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_supplier_name_len;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_supplier_name_len CHECK (char_length(btrim(supplier_name)) BETWEEN 1 AND 160);
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_len;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_len CHECK (char_length(btrim(category)) BETWEEN 1 AND 80);
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_payment_method_allowed;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_payment_method_allowed CHECK (payment_method IS NULL OR payment_method IN ('cash','bank_transfer','bit','paybox','card','credit_card','check','other'));
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_notes_len;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_notes_len CHECK (notes IS NULL OR char_length(notes) <= 2000);
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_attachment_key_len;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_attachment_key_len CHECK (attachment_storage_key IS NULL OR char_length(attachment_storage_key) <= 1024);
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_attachment_name_len;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_attachment_name_len CHECK (attachment_original_name IS NULL OR char_length(attachment_original_name) <= 255);

ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_amount_positive;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_amount_positive CHECK (amount_agorot BETWEEN 1 AND 1000000000000);
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_client_name_len;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_client_name_len CHECK (char_length(btrim(client_name)) BETWEEN 1 AND 160);
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_phone_format;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_phone_format CHECK (client_phone IS NULL OR btrim(client_phone) = '' OR client_phone ~ '^[0-9+() -]{7,20}$');
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_email_format;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_email_format CHECK (client_email IS NULL OR btrim(client_email) = '' OR (char_length(client_email) <= 254 AND client_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'));
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_description_len;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_description_len CHECK (char_length(btrim(description)) BETWEEN 1 AND 500);
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_payment_method_allowed;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_payment_method_allowed CHECK (payment_method IN ('cash','bank_transfer','bit','paybox'));
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_reference_number_len;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_reference_number_len CHECK (reference_number IS NULL OR char_length(reference_number) <= 120);
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_status_allowed;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_status_allowed CHECK (status IN ('active','cancelled'));
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_cancellation_reason_len;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_cancellation_reason_len CHECK (cancellation_reason IS NULL OR char_length(btrim(cancellation_reason)) BETWEEN 5 AND 500);
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_content_hash_format;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_content_hash_format CHECK (content_hash ~ '^[0-9A-Fa-f]{64}$');
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_pdf_storage_key_len;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_pdf_storage_key_len CHECK (pdf_storage_key IS NULL OR char_length(pdf_storage_key) <= 1024);
ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_cancellation_pdf_key_len;
ALTER TABLE public.receipts ADD CONSTRAINT receipts_cancellation_pdf_key_len CHECK (cancellation_pdf_storage_key IS NULL OR char_length(cancellation_pdf_storage_key) <= 1024);
