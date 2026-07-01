-- Switch para elegir cómo se aplica el % administrativo en la nómina.
-- false (default) = modo actual: el % se calcula sobre la parte del salón y se descuenta al estilista.
-- true            = el % se descuenta del total del servicio primero y sobre lo restante se reparte estilista/salón.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS admin_fee_on_service BOOLEAN NOT NULL DEFAULT false;
