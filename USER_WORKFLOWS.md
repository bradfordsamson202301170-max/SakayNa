# MotoGo — User Workflows (`USER_WORKFLOWS.md`)

This document maps the core end-to-end user journeys in MotoGo, including the complete **Passenger-to-Driver Ride Process** and **Driver Onboarding & Approval**.

---

## 1. Complete Passenger-to-Driver Ride Workflow (Mermaid)

```mermaid
flowchart TD
    P1["Passenger logs in and opens Booking Screen"] --> P2["Select Pickup and Destination Locations"]
    P2 --> P3["System calculates Fare Estimate using active Fare Configuration"]
    P3 --> P4{"Passenger confirms Ride Request?"}
    P4 -- No --> P2
    P4 -- Yes --> R1["Create Ride (status: requested, Fare Snapshot locked)"]

    R1 --> D1["Supabase Realtime broadcasts Ride Offer to Approved Online Drivers"]
    D1 --> D2{"Any Online Driver responds?"}

    D2 -- "Passenger cancels before acceptance" --> C1["Ride status: cancelled_by_passenger"]
    D2 -- "Driver rejects offer" --> D3["Dismiss offer for that Driver only (Ride stays requested)"]
    D3 --> D2
    D2 -- "Timeout / No Driver accepts" --> C2["Ride status: expired (Notify Passenger)"]

    D2 -- "Driver clicks Accept" --> A1["Atomic PostgreSQL RPC checks status = requested and driver_id IS NULL"]
    A1 --> A2{"Did this Driver win the lock?"}
    A2 -- No --> A3["Notify losing Driver: Ride already taken"]
    A2 -- Yes --> R2["Ride status: accepted | Driver status: on_trip"]

    R2 --> P5["Passenger sees Assigned Driver and Motorcycle details in real time"]
    P5 --> E1{"Cancelled before pickup?"}
    E1 -- "Passenger cancels" --> C3["Ride status: cancelled_by_passenger | Driver returns to online"]
    E1 -- "Driver cancels" --> C4["Ride status: cancelled_by_driver | Driver returns to online"]

    E1 -- "Driver reaches pickup" --> R3["Driver marks Arrived (status: driver_arrived)"]
    R3 --> R4["Passenger boards and Driver starts trip (status: in_progress)"]
    R4 --> R5["Driver reaches destination and completes trip (status: completed)"]

    R5 --> F1["System auto-creates Driver Earnings entry (final_fare minus platform commission)"]
    F1 --> F2["Driver availability returns to online"]
    F2 --> P6["Passenger views Trip Summary and submits 1-5 Star Rating"]
    P6 --> P7["System saves Rating, updates Driver average rating, and archives Ride in History"]
```

---

## 2. Driver Onboarding & Admin Approval Workflow (Mermaid)

```mermaid
flowchart TD
    DR1["Driver registers account (role: driver, approval: pending)"] --> DR2["Driver submits Motorcycle details (plate, make, model, year, color)"]
    DR2 --> DR3["Driver uploads Verification Documents to private Supabase Storage"]
    DR3 --> DR4["Driver awaits Admin review on Onboarding Status screen"]

    DR4 --> AD1["Admin opens Pending Drivers queue"]
    AD1 --> AD2["Admin inspects Motorcycle details and views Documents via signed URLs"]
    AD2 --> AD3{"Admin Decision"}

    AD3 -- Reject --> AD4["Admin enters mandatory Rejection Reason"]
    AD4 --> AD5["Update Driver approval_status = rejected and write Activity Log"]
    AD5 --> DR5["Driver sees Rejection Reason, fixes/re-uploads documents, and resubmits"]
    DR5 --> DR4

    AD3 -- Approve --> AD6["Update Driver approval_status = approved, verify Motorcycle, write Activity Log"]
    AD6 --> DR6["Driver unlocks Online/Offline toggle and can receive Ride Requests"]
```

---

## 3. Step-by-Step Walkthroughs

### 3.1 Passenger Ride Journey
1. **Sign In & Setup:** Passenger signs in and lands on `/passenger`. If they already have an active ride, MotoGo automatically resumes their live ride tracker (`BR-02`).
2. **Route & Fare Preview:** Passenger picks pickup and destination points. MotoGo computes distance, estimated duration, and upfront fare using the active Fare Configuration (`BR-08`).
3. **Request & Matching:** Clicking **Request Ride** locks the fare snapshot (`BR-07`) and broadcasts the ride in real time. Passenger sees a "Finding nearby driver..." state with a **Cancel** option.
4. **Live Tracking:** Once a driver accepts, Passenger immediately sees the driver's name, rating, phone number, and motorcycle plate/model/color, plus live status updates (`accepted` → `driver_arrived` → `in_progress` → `completed`).
5. **Completion & Rating:** Upon completion, Passenger sees the final fare summary and can submit a one-time 1–5 star rating and comment (`BR-10`). The trip is saved in **Ride History**.

### 3.2 Driver Daily Shift Journey
1. **Approval Check:** Unapproved drivers see only their onboarding checklist and approval status (`BR-01`).
2. **Going Online:** Approved drivers with an active motorcycle toggle **Go Online** on `/driver`.
3. **Receiving & Accepting Rides:** Incoming `requested` rides appear in real time. Rejecting hides the request only for that driver (`BR-05`). Accepting triggers the atomic PostgreSQL RPC (`BR-04`); if successful, the driver enters `on_trip` mode (`BR-03`).
4. **Executing the Trip:** Driver taps **Mark Arrived** (`driver_arrived`) → **Start Ride** (`in_progress`) → **Complete Ride** (`completed`).
5. **Earnings:** Completing the ride automatically credits the driver's earnings ledger (`final_fare - platform_commission`) and returns the driver to `online` (`BR-09`).

### 3.3 Administrator Governance Journey
1. **Driver Vetting:** Admin reviews pending drivers, opens private verification documents via short-lived signed URLs, and approves or rejects with a reason (`BR-13`).
2. **Operations Monitoring:** Admin monitors live rides on `/admin/rides`, manages users and motorcycles, and can intervene on stuck rides with an audited cancellation.
3. **Pricing & Reporting:** Admin updates Fare Configuration (affecting only *future* rides per `BR-07`), reviews KPI/revenue reports, and inspects immutable `activity_logs` (`BR-14`).
