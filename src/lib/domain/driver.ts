export type DriverApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type DriverAvailabilityStatus = "offline" | "online" | "on_trip";

export type DriverDocumentKind =
  | "profile_photo"
  | "license_doc"
  | "vehicle_registration"
  | "motorcycle_photo";

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export function canDriverGoOnline(params: {
  approvalStatus: DriverApprovalStatus;
  availabilityStatus: DriverAvailabilityStatus;
  hasActiveVehicle: boolean;
}): { allowed: boolean; reason?: string } {
  if (params.approvalStatus !== "approved") {
    return {
      allowed: false,
      reason: `Driver approval status is "${params.approvalStatus}". Only approved drivers can go online (BR-01).`,
    };
  }
  if (!params.hasActiveVehicle) {
    return {
      allowed: false,
      reason:
        "You must register an active motorcycle before going online (BR-01).",
    };
  }
  if (params.availabilityStatus === "on_trip") {
    return {
      allowed: false,
      reason: "Complete your active ride before changing online availability.",
    };
  }
  return { allowed: true };
}

export function canDriverAcceptRides(params: {
  approvalStatus: DriverApprovalStatus;
  availabilityStatus: DriverAvailabilityStatus;
  hasActiveVehicle: boolean;
}): { allowed: boolean; reason?: string } {
  if (params.approvalStatus !== "approved") {
    return {
      allowed: false,
      reason: "Only approved drivers can receive or accept ride requests (BR-01).",
    };
  }
  if (!params.hasActiveVehicle) {
    return {
      allowed: false,
      reason: "An active registered motorcycle is required to accept rides.",
    };
  }
  if (params.availabilityStatus !== "online") {
    return {
      allowed: false,
      reason: "Switch your status to Online to receive and accept ride requests.",
    };
  }
  return { allowed: true };
}

export function validateUploadFile(file: {
  size: number;
  type: string;
  name: string;
}): { valid: boolean; error?: string } {
  if (!file || file.size <= 0) {
    return { valid: false, error: "Please choose a non-empty file to upload." };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return { valid: false, error: "File size must be 5 MB or smaller." };
  }
  if (
    !ALLOWED_DOCUMENT_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number]
    )
  ) {
    return {
      valid: false,
      error: "Only JPEG, PNG, and PDF files are allowed.",
    };
  }
  return { valid: true };
}

export function buildPrivateDocumentPath(
  userId: string,
  kind: DriverDocumentKind,
  mimeType: string
): string {
  const ext =
    mimeType === "application/pdf"
      ? "pdf"
      : mimeType === "image/png"
        ? "png"
        : "jpg";
  return `${userId}/${kind}-${Date.now()}.${ext}`;
}
