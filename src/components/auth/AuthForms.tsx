"use client";

import React, { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, Bike, CheckCircle2, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, TextInput } from "@/components/ui/FormComponents";
import {
  loginAction,
  registerDriverAction,
  registerPassengerAction,
  requestPasswordResetAction,
  updatePasswordAction,
  updateProfileAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const INITIAL_STATE: AuthActionState = {};

function FormFeedback({ state }: { state: AuthActionState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-700"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.success) {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-medium text-emerald-700"
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{state.success}</span>
      </div>
    );
  }
  return null;
}

type LoginRoleMode = "passenger" | "driver" | "admin";

const ROLE_META: Record<
  LoginRoleMode,
  { title: string; subtitle: string; cta: string; placeholder: string }
> = {
  passenger: {
    title: "Passenger Sign In",
    subtitle: "Book verified motorcycle rides across Iligan City.",
    cta: "Sign In",
    placeholder: "passenger@motogo.test",
  },
  driver: {
    title: "Driver Partner Sign In",
    subtitle: "Go online, accept rides, and track your daily earnings.",
    cta: "Sign In as Driver",
    placeholder: "driver@motogo.test",
  },
  admin: {
    title: "Administrator Sign In",
    subtitle: "SakayNa operations console, verifications, and reports.",
    cta: "Sign In as Admin",
    placeholder: "admin@motogo.test",
  },
};

export function LoginForm({ initialError }: { initialError?: string }) {
  const [selectedRole, setSelectedRole] = useState<LoginRoleMode>("passenger");
  const [state, action, pending] = useActionState(loginAction, INITIAL_STATE);
  const current = ROLE_META[selectedRole];

  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
    >
      <input type="hidden" name="expected_role" value={selectedRole} />

      <div className="border-b border-slate-100 pb-3">
        <p className="text-sm font-bold text-[#181A20]">{current.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{current.subtitle}</p>
      </div>

      {initialError && !state.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-medium text-amber-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{initialError}</span>
        </div>
      )}

      <FormFeedback state={state} />

      <FormField label="Email Address" htmlFor="login-email" required>
        <TextInput
          id="login-email"
          name="email"
          type="email"
          required
          placeholder={current.placeholder}
          autoComplete="email"
        />
      </FormField>

      <FormField label="Password" htmlFor="login-password" required>
        <TextInput
          id="login-password"
          name="password"
          type="password"
          required
          placeholder="Enter your password"
          autoComplete="current-password"
        />
      </FormField>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-xs font-semibold text-orange-600 hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" variant="primary" fullWidth disabled={pending}>
        {pending ? "Signing in..." : current.cta}
      </Button>

      <div className="text-center text-xs text-slate-500">
        {selectedRole === "passenger" && (
          <>
            New to SakayNa?{" "}
            <Link
              href="/register/passenger"
              className="font-semibold text-orange-600 hover:underline"
            >
              Create Passenger Account
            </Link>
          </>
        )}
        {selectedRole === "driver" && (
          <>
            Want to drive with SakayNa?{" "}
            <Link
              href="/register/driver"
              className="font-semibold text-orange-600 hover:underline"
            >
              Apply as a SakayNa Driver
            </Link>
          </>
        )}
        {selectedRole === "admin" && (
          <span>Administrator accounts are provisioned by operations.</span>
        )}
      </div>

      {/* Lower portion: Driver login button + Admin login button below it */}
      <div className="space-y-2 border-t border-slate-100 pt-4">
        {selectedRole !== "passenger" && (
          <button
            type="button"
            onClick={() => setSelectedRole("passenger")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-[#181A20] transition hover:border-orange-300 hover:bg-orange-50/50"
          >
            <User className="h-3.5 w-3.5 text-orange-500" />
            <span>Log in as Passenger</span>
          </button>
        )}

        {selectedRole !== "driver" && (
          <button
            type="button"
            onClick={() => setSelectedRole("driver")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-[#181A20] transition hover:border-orange-300 hover:bg-orange-50/50"
          >
            <Bike className="h-3.5 w-3.5 text-orange-500" />
            <span>Log in as Driver</span>
          </button>
        )}

        {selectedRole !== "admin" && (
          <button
            type="button"
            onClick={() => setSelectedRole("admin")}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-[#181A20]"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            <span>Log in as Admin</span>
          </button>
        )}
      </div>
    </form>
  );
}

export function PassengerRegisterForm() {
  const [state, action, pending] = useActionState(
    registerPassengerAction,
    INITIAL_STATE
  );

  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <FormFeedback state={state} />

      <FormField label="Full Name" htmlFor="p-name" required>
        <TextInput
          id="p-name"
          name="full_name"
          required
          placeholder="Juan Dela Cruz"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email Address" htmlFor="p-email" required>
          <TextInput
            id="p-email"
            name="email"
            type="email"
            required
            placeholder="juan@example.com"
          />
        </FormField>
        <FormField label="Mobile Number" htmlFor="p-phone" required>
          <TextInput
            id="p-phone"
            name="phone"
            type="tel"
            required
            placeholder="+63 917 000 0000"
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Password" htmlFor="p-pass" required>
          <TextInput
            id="p-pass"
            name="password"
            type="password"
            minLength={8}
            required
            placeholder="Min. 8 characters"
          />
        </FormField>
        <FormField label="Confirm Password" htmlFor="p-confirm" required>
          <TextInput
            id="p-confirm"
            name="confirm_password"
            type="password"
            minLength={8}
            required
            placeholder="Re-enter password"
          />
        </FormField>
      </div>

      <Button type="submit" variant="primary" fullWidth disabled={pending}>
        {pending ? "Creating Account..." : "Create Passenger Account"}
      </Button>

      <p className="text-center text-xs text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-orange-600 hover:underline"
        >
          Sign in
        </Link>{" "}
        · Want to drive instead?{" "}
        <Link
          href="/register/driver"
          className="font-semibold text-[#181A20] hover:underline"
        >
          Driver Registration
        </Link>
      </p>
    </form>
  );
}

export function DriverRegisterForm() {
  const [state, action, pending] = useActionState(
    registerDriverAction,
    INITIAL_STATE
  );

  return (
    <form
      action={action}
      className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
    >
      <FormFeedback state={state} />

      <div className="space-y-4">
        <h2 className="border-b border-slate-100 pb-2 text-base font-bold text-[#181A20]">
          1. Personal &amp; Account Information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full Name" htmlFor="d-name" required>
            <TextInput
              id="d-name"
              name="full_name"
              required
              placeholder="Marco Santos"
            />
          </FormField>
          <FormField label="Mobile Number" htmlFor="d-phone" required>
            <TextInput
              id="d-phone"
              name="phone"
              type="tel"
              required
              placeholder="+63 918 000 0000"
            />
          </FormField>
          <FormField label="Email Address" htmlFor="d-email" required>
            <TextInput
              id="d-email"
              name="email"
              type="email"
              required
              placeholder="marco@example.com"
            />
          </FormField>
          <FormField label="Password" htmlFor="d-pass" required>
            <TextInput
              id="d-pass"
              name="password"
              type="password"
              minLength={8}
              required
              placeholder="Min. 8 characters"
            />
          </FormField>
          <FormField label="Residential Address" htmlFor="d-address" required>
            <TextInput
              id="d-address"
              name="address"
              required
              placeholder="123 Rizal St., Metro City"
            />
          </FormField>
          <FormField
            label="Driver's License Number"
            htmlFor="d-license"
            hint="Must be unique. Verification documents are uploaded in your Driver Verification portal."
            required
          >
            <TextInput
              id="d-license"
              name="license_number"
              required
              placeholder="N01-23-456789"
            />
          </FormField>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="border-b border-slate-100 pb-2 text-base font-bold text-[#181A20]">
          2. Motorcycle Details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Plate Number" htmlFor="m-plate" required>
            <TextInput
              id="m-plate"
              name="plate_number"
              required
              placeholder="ABC-1234"
            />
          </FormField>
          <FormField label="Make / Brand" htmlFor="m-make" required>
            <TextInput id="m-make" name="make" required placeholder="Honda" />
          </FormField>
          <FormField label="Model" htmlFor="m-model" required>
            <TextInput
              id="m-model"
              name="model"
              required
              placeholder="Click 125i"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Year" htmlFor="m-year" required>
              <TextInput
                id="m-year"
                name="year"
                type="number"
                min={1990}
                max={2100}
                required
                placeholder="2024"
              />
            </FormField>
            <FormField label="Color" htmlFor="m-color" required>
              <TextInput
                id="m-color"
                name="color"
                required
                placeholder="Matte Black"
              />
            </FormField>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          All new driver accounts start in{" "}
          <span className="font-semibold text-amber-700">Pending Approval</span>{" "}
          status until reviewed by an Administrator.
        </p>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Submitting Application..." : "Submit Driver Application"}
        </Button>
      </div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    INITIAL_STATE
  );

  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <FormFeedback state={state} />
      <FormField label="Registered Email Address" htmlFor="fp-email" required>
        <TextInput
          id="fp-email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
        />
      </FormField>
      <Button type="submit" variant="primary" fullWidth disabled={pending}>
        {pending ? "Sending Reset Link..." : "Send Password Reset Link"}
      </Button>
      <p className="text-center text-xs text-slate-500">
        Remembered your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-orange-600 hover:underline"
        >
          Back to Sign In
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    INITIAL_STATE
  );

  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <FormFeedback state={state} />
      <FormField label="New Password" htmlFor="rp-pass" required>
        <TextInput
          id="rp-pass"
          name="password"
          type="password"
          minLength={8}
          required
          placeholder="Min. 8 characters"
        />
      </FormField>
      <FormField label="Confirm New Password" htmlFor="rp-confirm" required>
        <TextInput
          id="rp-confirm"
          name="confirm_password"
          type="password"
          minLength={8}
          required
          placeholder="Re-enter new password"
        />
      </FormField>
      <Button type="submit" variant="primary" fullWidth disabled={pending}>
        {pending ? "Updating Password..." : "Update Password"}
      </Button>
      {state.success && (
        <div className="text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-orange-600 hover:underline"
          >
            Continue to Sign In →
          </Link>
        </div>
      )}
    </form>
  );
}

interface ProfileFormProps {
  fullName: string;
  email: string;
  phone: string;
  roleLabel: string;
}

export function ProfileForm({
  fullName,
  email,
  phone,
  roleLabel,
}: ProfileFormProps) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    INITIAL_STATE
  );

  return (
    <form action={action} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormFeedback state={state} />
      </div>
      <FormField label="Full Name" htmlFor="pf-name" required>
        <TextInput
          id="pf-name"
          name="full_name"
          required
          defaultValue={fullName}
        />
      </FormField>
      <FormField label="Phone Number" htmlFor="pf-phone">
        <TextInput
          id="pf-phone"
          name="phone"
          type="tel"
          defaultValue={phone}
          placeholder="+63 917 000 0000"
        />
      </FormField>
      <FormField label="Email Address" htmlFor="pf-email">
        <TextInput id="pf-email" type="email" defaultValue={email} disabled />
      </FormField>
      <FormField label="Assigned Role" htmlFor="pf-role">
        <TextInput id="pf-role" defaultValue={roleLabel} disabled />
      </FormField>
      <div className="sm:col-span-2 pt-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving..." : "Save Profile Changes"}
        </Button>
      </div>
    </form>
  );
}
