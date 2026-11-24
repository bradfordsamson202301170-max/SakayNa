# MotoGo — Supabase Realtime Documentation (`REALTIME_DOCUMENTATION.md`)

**Batch:** Batch 13 — Secure Supabase Realtime Subscriptions & Live Location Updates  
**Migration:** `supabase/migrations/202611230007_realtime_publication.sql`  
**Hook:** `src/lib/realtime/useRealtimeSubscription.ts`

---

## 1. Realtime Channels & Security Model

All MotoGo Realtime subscriptions use **Supabase Realtime (`postgres_changes`)** backed by **PostgreSQL Row Level Security (RLS)**. Supabase Realtime evaluates the subscriber's authenticated JWT against table `SELECT` policies before dispatching any event—ensuring unauthorized or anonymous clients **never** receive private ride or location payloads.

| Screen / Role | Channel Name | Subscribed Table(s) & Filter | What Updates Live |
| :--- | :--- | :--- | :--- |
| **Passenger Active Ride** (`/passenger/active-ride`) | `passenger-ride-<rideId>` | `rides` (`id=eq.<rideId>`), `ride_status_history` (`ride_id=eq.<rideId>`), `ride_locations` (`ride_id=eq.<rideId>`) | Driver acceptance, arrival/start/completion/cancellation, status timeline, and live driver map marker coordinates |
| **Driver Available Rides** (`/driver/available-rides`) | `driver-available-rides` | `rides` (RLS restricts to open `requested` rides for approved online drivers only) | New passenger ride requests and immediate removal of rides claimed by another driver |
| **Driver Active Ride** (`/driver/active-ride`) | `driver-active-ride-<rideId>` | `rides` (`id=eq.<rideId>`) | Passenger or Admin booking cancellations and status changes |

---

## 2. Subscription Lifecycle & Unmount Cleanup

Every Realtime channel is managed through `useRealtimeSubscription`:
1. Subscribes with the authenticated browser session (`createSupabaseBrowserClient()`).
2. Exposes live connection state (`connecting` → `subscribed` / `error` / `closed`) displayed as a **`Realtime Live`** badge.
3. Reconciles state on `visibilitychange` when a user switches back to the browser tab (`NFR-REL-03`).
4. **Strict Cleanup on Unmount:** Calls `document.removeEventListener(...)` and `supabase.removeChannel(channel)` inside the `useEffect` cleanup function so zero zombie WebSockets or listeners remain.

---

## 3. Live GPS vs. Simulated Driver Coordinates

- **Live GPS Broadcast:** On `/driver/active-ride`, the assigned driver can click **Capture Browser GPS** (permission-first) and **Broadcast Live GPS Ping** (`publishDriverLocationPingAction`), inserting into `public.ride_locations` (guarded by RLS `ride_locations_insert_assigned_driver`).
- **Simulated Academic Demo:** Both the Driver's **"Send Simulated Ping (Demo)"** button and the Passenger's **"Simulate Driver (Demo)"** button are explicitly labeled **`SIMULATED`** (`SIMULATED DRIVER MOVEMENT` badge and `MOTO (SIM)` map marker) so demo simulations are never confused with live GPS.

---

## 4. Testing Realtime Across Two Browser Sessions

1. Ensure migrations `0001`–`0007` are applied on your Online Supabase project (`euiifsblmwuwquershku`).
2. Open **Browser Session A** (Normal window) signed in as a **Passenger** → go to `/passenger/book` and confirm a ride request → lands on `/passenger/active-ride` showing **`Realtime Live`**.
3. Open **Browser Session B** (Incognito/Private window) signed in as an **Approved Online Driver** → `/driver/available-rides` immediately receives the new ride request without refreshing.
4. Click **Accept Ride** in Session B → Session A automatically transitions from `REQUESTED` to `ACCEPTED` and reveals the Driver & Motorcycle card.
5. Click **Broadcast Live GPS Ping** or **Send Simulated Ping (Demo)** in Session B → Session A's Leaflet map moves the driver marker immediately.
6. Progress **Mark Arrived → Start Ride → Complete Ride** in Session B → Session A updates every timeline step in real time.
