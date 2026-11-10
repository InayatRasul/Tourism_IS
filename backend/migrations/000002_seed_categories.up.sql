INSERT INTO categories (name) VALUES
    ('City tour'),
    ('Nature & Hiking'),
    ('History & Culture'),
    ('Food & Drinks'),
    ('Adventure'),
    ('Multi-day trip')
ON CONFLICT (name) DO NOTHING;
