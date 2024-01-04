-- Device Info table
Drop table if exists device_info;
CREATE TABLE device_info (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(250) UNIQUE,
    publisher_name VARCHAR(250) UNIQUE,
    token VARCHAR(250) UNIQUE,
    initialized boolean default false,
    inserted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Device Binding table
Drop table if exists device_binding;
CREATE TABLE device_binding (
    publisher_name VARCHAR(250) PRIMARY KEY,
    owner_address VARCHAR(250) not null,
    inserted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Charge Info table
Drop table if exists charge_info;
CREATE TABLE charge_info (
    id BIGSERIAL PRIMARY KEY,
    publisher_name VARCHAR(250) not null,
    voltage NUMERIC not null,
    session_id INT not null,
    current NUMERIC not null,
    power NUMERIC not null,
    energy NUMERIC not null,
    start_time TIMESTAMP WITHOUT TIME ZONE,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    start_meter NUMERIC not null,
    end_meter NUMERIC not null,
    inserted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Charge Session Info table
Drop table if exists charge_session_info;
CREATE TABLE charge_session_info (
    id SERIAL PRIMARY KEY,
    publisher_name VARCHAR(250) not null,
    session_id INT not null,
    start_time TIMESTAMP WITHOUT TIME ZONE,
    end_time TIMESTAMP WITHOUT TIME ZONE,
    start_meter NUMERIC,
    end_meter NUMERIC,
    inserted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    constraint charge_session_info_unq unique (publisher_name, session_id)
);

-- Charge Statistics table
Drop table if exists charge_statistics;
CREATE TABLE charge_statistics (
    publisher_name VARCHAR(250) PRIMARY KEY,
    sum_energy NUMERIC DEFAULT 0,
    consumed_energy NUMERIC DEFAULT 0,
    remaining_energy NUMERIC DEFAULT 0,
    inserted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Charge Statistics table
Drop table if exists charge_session_statistics;
CREATE TABLE charge_session_statistics (
    id SERIAL PRIMARY KEY,
    publisher_name VARCHAR(250) not null,
    session_id INT not null,
    sum_energy NUMERIC DEFAULT 0,
    inserted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    constraint charge_session_statistics_unq unique (publisher_name, session_id)
);

Drop table if exists t_nonces;
CREATE TABLE t_nonces (
    public_address VARCHAR(250) PRIMARY KEY,
    nonce VARCHAR(250) not null,
    inserted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

----------------------------------------
CREATE TABLE charge_session_statistics (
    id bigint PRIMARY KEY,
    publisher_name VARCHAR(250) not null,
    session_id INT not null,
    total_amount NUMERIC DEFAULT 0,
    total_secs NUMERIC DEFAULT 0,
    constraint charge_session_statistics_unq unique (publisher_name, session_id)
);

create table t_trace (
    id int primary key,
    content varchar(200),
    progress TIMESTAMP WITHOUT TIME ZONE
);
----------------------------------------