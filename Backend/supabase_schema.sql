CREATE TABLE public."Stock" (
    id SERIAL PRIMARY KEY,
    rice NUMERIC DEFAULT 500,
    wheat NUMERIC DEFAULT 300,
    sugar NUMERIC DEFAULT 100,
    oil NUMERIC DEFAULT 100,
    dal NUMERIC DEFAULT 100,
    salt NUMERIC DEFAULT 100,
    soap NUMERIC DEFAULT 100
);

CREATE TABLE public."User" (
    "rationCard" TEXT PRIMARY KEY,
    name TEXT,
    family_members INTEGER,
    district TEXT,
    monthly_income NUMERIC,
    category TEXT,
    age INTEGER,
    gas_connection TEXT DEFAULT 'Yes',
    status TEXT DEFAULT 'Active'
);

CREATE TABLE public."Booking" (
    id BIGINT PRIMARY KEY,
    "customerName" TEXT,
    phone TEXT,
    "rationCard" TEXT,
    date TEXT,
    time TEXT,
    status TEXT DEFAULT 'booked',
    "predictedCardType" TEXT,
    "isPriority" BOOLEAN DEFAULT FALSE,
    family_members INTEGER DEFAULT 3,
    hash TEXT,
    items_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
