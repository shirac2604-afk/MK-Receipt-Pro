-- Supports revocation cleanup and covers the reservation-to-device foreign key.
create index if not exists receipt_number_reservations_device_id_idx
  on public.receipt_number_reservations (device_id);
