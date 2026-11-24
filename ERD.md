# MotoGo — Entity Relationship Diagram (`ERD.md`)

This Entity Relationship Diagram illustrates all **11 normalized PostgreSQL tables** and their cardinality rules in MotoGo.

---

## 1. Mermaid ERD

```mermaid
erDiagram
    PROFILES ||--o| DRIVERS : "extends (driver role)"
    PROFILES ||--o{ RIDES : "requests as passenger"
    PROFILES ||--o{ NOTIFICATIONS : "receives"
    PROFILES ||--o{ ACTIVITY_LOGS : "performs"
    PROFILES ||--o{ FARE_SETTINGS : "updates (admin)"

    DRIVERS ||--o{ VEHICLES : "registers motorcycle"
    DRIVERS ||--o{ RIDES : "assigned to"
    DRIVERS ||--o{ PAYMENTS : "earns from"
    DRIVERS ||--o{ RATINGS : "receives"

    VEHICLES ||--o{ RIDES : "used in"
    FARE_SETTINGS ||--o{ RIDES : "snapshotted into"

    RIDES ||--o{ RIDE_LOCATIONS : "tracks coordinates"
    RIDES ||--|{ RIDE_STATUS_HISTORY : "records transitions"
    RIDES ||--o| PAYMENTS : "settled by (completed)"
    RIDES ||--o| RATINGS : "rated by (completed)"
    RIDES ||--o{ NOTIFICATIONS : "triggers"

    PROFILES {
        uuid id PK
        text email UK
        text full_name
        text phone
        text role
        text account_status
        timestamptz created_at
        timestamptz updated_at
    }

    DRIVERS {
        uuid id PK
        uuid user_id FK
        text license_number UK
        text approval_status
        text availability_status
        numeric rating_average
        int total_ratings
        int total_completed_rides
        timestamptz created_at
        timestamptz updated_at
    }

    VEHICLES {
        uuid id PK
        uuid driver_id FK
        text plate_number
        text make
        text model
        int year
        text color
        text verification_status
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    FARE_SETTINGS {
        uuid id PK
        text name
        numeric base_fare
        numeric per_km_rate
        numeric per_min_rate
        numeric minimum_fare
        numeric commission_rate
        boolean is_active
        uuid updated_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    RIDES {
        uuid id PK
        uuid passenger_id FK
        uuid driver_id FK
        uuid vehicle_id FK
        uuid fare_setting_id FK
        text pickup_address
        text dropoff_address
        numeric estimated_distance_km
        int estimated_duration_min
        numeric estimated_fare
        numeric final_fare
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    RIDE_LOCATIONS {
        uuid id PK
        uuid ride_id FK
        uuid recorded_by FK
        text location_type
        numeric latitude
        numeric longitude
        timestamptz recorded_at
        timestamptz created_at
        timestamptz updated_at
    }

    RIDE_STATUS_HISTORY {
        uuid id PK
        uuid ride_id FK
        text previous_status
        text new_status
        uuid changed_by FK
        text note
        timestamptz created_at
        timestamptz updated_at
    }

    PAYMENTS {
        uuid id PK
        uuid ride_id FK
        uuid passenger_id FK
        uuid driver_id FK
        numeric gross_amount
        numeric platform_fee
        numeric driver_net_earnings
        text payment_method
        text payment_status
        timestamptz created_at
        timestamptz updated_at
    }

    RATINGS {
        uuid id PK
        uuid ride_id FK
        uuid passenger_id FK
        uuid driver_id FK
        smallint score
        text comment
        timestamptz created_at
        timestamptz updated_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        uuid ride_id FK
        text type
        text title
        text body
        boolean is_read
        timestamptz created_at
        timestamptz updated_at
    }

    ACTIVITY_LOGS {
        uuid id PK
        uuid actor_id FK
        text action
        text entity_type
        uuid entity_id
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## 2. Core Relationship Rules Verified

| Relationship | Cardinality | Database Enforcement |
| :--- | :--- | :--- |
| Passenger → Rides | 1 : N | `rides.passenger_id NOT NULL REFERENCES profiles(id)` |
| Driver → Rides | 1 : N (0..1 per ride) | `rides.driver_id NULL REFERENCES drivers(id)` + partial unique index for active ride |
| Driver → Motorcycle (`vehicles`) | 1 : N (1 active) | `vehicles.driver_id REFERENCES drivers(id)` + partial unique index where `is_active = true` |
| Ride → Status History | 1 : N | `ride_status_history.ride_id REFERENCES rides(id) ON DELETE CASCADE` |
| Ride → Locations | 1 : N | `ride_locations.ride_id REFERENCES rides(id) ON DELETE CASCADE` |
| Completed Ride → Payment | 1 : 0..1 | `payments.ride_id UNIQUE REFERENCES rides(id)` |
| Completed Ride → Rating | 1 : 0..1 | `ratings.ride_id UNIQUE REFERENCES rides(id)` |
| Driver ↔ Ride Rejections | N : M (`ride_rejections`, Batch 12) | `UNIQUE(ride_id, driver_id)` — hides declined requests per driver without cancelling the ride (`BR-05`) |
