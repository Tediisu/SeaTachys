CREATE TABLE IF NOT EXISTS rider_profiles (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    motor_model text NOT NULL CHECK (length(trim(motor_model)) > 0),
    contact_number text NOT NULL CHECK (length(trim(contact_number)) > 0),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_messages (
    id uuid PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_role user_role NOT NULL,
    message text NOT NULL CHECK (length(trim(message)) BETWEEN 1 AND 500),
    sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_order_messages_order_id_sent_at
    ON order_messages(order_id, sent_at);
