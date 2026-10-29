import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import {
  UserRound,
  BriefcaseBusiness,
  MapPin,
  ShieldCheck,
  BadgeCheck,
  GraduationCap,
  Eye,
  EyeOff,
  Upload,
  Loader2,
  Edit2,
  X,
  Check,
  Camera,
  RotateCcw,
  RotateCw,
  RefreshCw,
  ZoomIn,
  MessageSquareText,
} from "lucide-react";
import ContentContainer from "../components/layout/ContentContainer";
import PageHeader from "../components/layout/PageHeader";
import { useAuth } from "../context/AuthContext";
import ConfirmationDialog from "../components/common/ConfirmationDialog";
import Modal from "../components/common/Modal";
import { useToast } from "../components/common/ToastProvider";
import api from "../services/api";
import { resolveEmployeeDisplayId } from "../utils/employeeExport";
import {
  notifyEmployeeProfileUpdated,
  subscribeToEmployeeProfileUpdates,
} from "../utils/employeeSync";

const inputCls =
  "mt-2 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
const fieldBoxCls =
  "flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-4 py-3";
const labelCls =
  "uppercase tracking-[0.25em] text-[10px] font-medium text-slate-400";
const valueCls = "mt-2 text-sm font-medium text-slate-900";
const passportPhotoAspect = 1 / 1;

const defaultProfileVerification = {
  label: "Verified",
  message: "Your profile has been verified by the administrator.",
  reason: "",
};

const reviewFieldAliases = {
  university: ["university", "college"],
  college: ["college", "university"],
  resume_url: ["resume_url", "resume"],
  resume: ["resume", "resume_url"],
  aadhaar_document_path: ["aadhaar_document_path", "aadhaar_document"],
  pan_document_path: ["pan_document_path", "pan_document"],
  degree_certificate_url: ["degree_certificate_url", "degree_certificate"],
  profile_photo: ["profile_photo"],
};

const getReviewFieldAliases = (fieldName) =>
  reviewFieldAliases[fieldName] || [fieldName];

const isDocumentField = (fieldName) =>
  [
    "resume_url",
    "aadhaar_document_path",
    "pan_document_path",
    "degree_certificate_url",
    "profile_photo",
  ].includes(fieldName);

const fieldLabelMap = {
  full_name: "Full Name",
  phone: "Phone Number",
  email: "Email Address",
  date_of_birth: "Date of Birth",
  gender: "Gender",
  location: "Location",
  current_address: "Current Address",
  permanent_address: "Permanent Address",
  pin_code: "PIN Code",
  emergency_contact: "Emergency Contact",
  linkedin: "LinkedIn",
  github: "GitHub",
  skills: "Skills",
  college: "College",
  university: "University",
  degree: "Degree",
  branch: "Branch",
  graduation_year: "Graduation Year",
  cgpa: "CGPA",
  resume_url: "Resume",
  profile_photo: "Profile Photo",
  degree_certificate_url: "Degree Certificate",
  aadhaar_number: "Aadhaar Number",
  pan_number: "PAN Number",
  role: "Role",
  employee_id: "Employee ID",
};

function formatPendingFieldLabel(value) {
  return String(value || "Pending update")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPendingFieldLabel(fieldName) {
  return fieldLabelMap[fieldName] || formatPendingFieldLabel(fieldName);
}

function formatPendingValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function buildSkillTags(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return String(v)
    .split(/[|,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function maskPan(v) {
  if (!v) return "Not provided";
  const c = String(v).trim();
  if (!c) return "Not provided";
  return c.length <= 4
    ? c
    : `${c.slice(0, 5).replace(/./g, "X")}${c.slice(-4)}`;
}

function maskAadhaar(v) {
  if (!v) return "Not provided";
  const c = String(v).replace(/\s+/g, "");
  if (!c) return "Not provided";
  return c.length <= 2 ? c : `XXXX XXXX XX${c.slice(-2)}`;
}

function buildAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${api.defaults.baseURL}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatDisplayDate(v) {
  if (!v) return "Not provided";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "Not provided";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeIST(v) {
  if (!v) return "Not available";
  let dateStr = String(v);

  if (!dateStr.endsWith("Z") && !dateStr.match(/[+-]\d\d:?\d\d$/)) {
    dateStr = dateStr.replace(" ", "T") + "Z";
  }

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Not available";

  const istTime = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);

  const day = String(istTime.getUTCDate()).padStart(2, "0");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[istTime.getUTCMonth()];
  const year = istTime.getUTCFullYear();

  let hours = istTime.getUTCHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const minutes = String(istTime.getUTCMinutes()).padStart(2, "0");

  return `${day} ${month} ${year} • ${String(hours).padStart(2, "0")}:${minutes} ${ampm} (IST)`;
}

const formatLastUpdatedValue = formatDateTimeIST;

function getProfileLastUpdatedValue(source) {
  return formatLastUpdatedValue(
    source?.updated_at || source?.last_updated || source?.created_at,
  );
}

function getRequestTypeLabel(requestType) {
  if (requestType === "profile_verification") return "Verification";
  if (requestType === "document_upload") return "Document Upload";
  return "Profile Update";
}

function getRequestStatusClasses(status) {
  if (status === "approved")
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "rejected") return "bg-rose-100 text-rose-700 border-rose-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

function dv(v) {
  return v || "Not provided";
}

function dvLink(v) {
  return v || "Not Added";
}

function dvDate(v) {
  if (!v) return "Not provided";
  return formatDisplayDate(v);
}

function getBackendVerificationStatus(profile) {
  if (!profile) return null;
  return (
    profile.verification_status ||
    profile.verificationStatus ||
    profile.user?.verification_status ||
    profile.user?.verificationStatus ||
    null
  );
}

function getProfileVerificationStateFromBackend(status, rejectionReason = "") {
  if (status === "Pending") {
    return {
      label: "Pending Verification",
      message:
        "Profile submitted successfully. Waiting for administrator verification.",
      reason: "",
    };
  }
  if (status === "Rejected") {
    return {
      label: "Rejected",
      message: "Your profile verification was rejected by the administrator.",
      reason: rejectionReason ? `Rejection Reason: ${rejectionReason}` : "",
    };
  }
  return defaultProfileVerification;
}

function deriveProfileVerification(profile, requests = []) {
  const pendingUpdates = requests.filter((r) => r.status === "pending");
  const hasVerification = pendingUpdates.some(
    (r) => r.request_type === "profile_verification",
  );
  const hasUpdate = pendingUpdates.some(
    (r) => r.request_type === "profile_update",
  );

  if (hasVerification) {
    return {
      label: "Pending Verification",
      message: "Waiting for administrator verification.",
      reason: "",
    };
  }
  if (hasUpdate) {
    return {
      label: "Pending",
      message: "Profile changes waiting for administrator verification.",
      reason: "",
    };
  }
  const backendStatus = getBackendVerificationStatus(profile);
  if (backendStatus === "Rejected") {
    return {
      label: "Rejected",
      message: "Your profile verification was rejected by the administrator.",
      reason: "",
    };
  }
  if (backendStatus === "Pending") {
    return {
      label: "Pending Verification",
      message: "Waiting for administrator verification.",
      reason: "",
    };
  }
  return defaultProfileVerification;
}

function SectionCard({ icon, title, children, className = "" }) {
  return (
    <ContentContainer className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-slate-500">{icon}</span>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="flex-1 flex flex-col justify-between">{children}</div>
    </ContentContainer>
  );
}

function FieldBox({ label, children, className = "", reviewData = null }) {
  const isReviewChanged = Boolean(reviewData);
  return (
    <div
      className={`${fieldBoxCls} ${className} ${isReviewChanged ? "border-amber-300 bg-amber-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={labelCls}>{label}</p>
          {isReviewChanged && (
            <span className="mt-2 inline-flex rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-800">
              Pending Approval
            </span>
          )}
        </div>
      </div>
      {isReviewChanged && reviewData && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-white/80 p-3">
          {reviewData.isDocument ? (
            // FIX: This layout needs to be responsive.
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,auto,1fr] xl:items-center">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Current Value
                </p>
                {reviewData.currentRaw ? (
                  <a
                    href={buildAssetUrl(reviewData.currentRaw)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-slate-100"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> View Current
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No current document
                  </p>
                )}
              </div>
              {/* FIX: Move the arrow to a separate element for responsiveness */}
              <div className="md:hidden flex justify-center text-slate-400 font-bold">
                ↓
              </div>
              <div className="hidden md:flex justify-center text-slate-400 font-bold">
                →
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Requested Value
                </p>
                {reviewData.requestedRaw ? (
                  <a
                    href={buildAssetUrl(reviewData.requestedRaw)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-slate-100"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" /> View Requested
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No requested document
                  </p>
                )}
              </div>
            </div>
          ) : (
            // FIX: This layout needs to be responsive.
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr,auto,1fr] xl:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Current Value
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {reviewData.currentValue}
                </p>
              </div>
              {/* FIX: Move the arrow to a separate element for responsiveness */}
              <div className="md:hidden flex justify-center text-slate-400 font-bold">
                ↓
              </div>
              <div className="hidden md:flex justify-center text-slate-400 font-bold">
                →
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Requested Value
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {reviewData.requestedValue}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

function ProfilePage() {
  const { user: authUser, updateUser, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { employeeId: routeEmployeeId, requestId: routeRequestId } =
    useParams();
  const { addToast } = useToast();

  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showPan, setShowPan] = useState(false);
  const [docPreviewOpen, setDocPreviewOpen] = useState(false);
  const [docPreviewData, setDocPreviewData] = useState({
    url: "",
    title: "",
    type: "",
  });
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [viewedProfile, setViewedProfile] = useState(null);
  const [viewedProfileLoading, setViewedProfileLoading] = useState(false);
  const [viewedProfileError, setViewedProfileError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [deletePhotoConfirmOpen, setDeletePhotoConfirmOpen] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isLoadingResume, setIsLoadingResume] = useState(false);
  const [isUploadingCertificate, setIsUploadingCertificate] = useState(false);
  const [isLoadingCertificate, setIsLoadingCertificate] = useState(false);
  const [isUploadingAadhaar, setIsUploadingAadhaar] = useState(false);
  const [isUploadingPan, setIsUploadingPan] = useState(false);

  const [photoError, setPhotoError] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [certificateError, setCertificateError] = useState("");

  const [candidateInfo, setCandidateInfo] = useState(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState("");
  const [cropPreviewUrl, setCropPreviewUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [resumeChoiceOpen, setResumeChoiceOpen] = useState(false);
  const [resumeSummaryOpen, setResumeSummaryOpen] = useState(false);
  const [pendingResumeFile, setPendingResumeFile] = useState(null);
  const [resumeSummaryData, setResumeSummaryData] = useState(null);
  const [resumePreviewData, setResumePreviewData] = useState(null);
  const [leavePromptOpen, setLeavePromptOpen] = useState(false);
  const pendingLeaveActionRef = useRef(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [verificationComment, setVerificationComment] = useState("");
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [verificationDecision, setVerificationDecision] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isUpdatingVerification, setIsUpdatingVerification] = useState(false);
  const [sendMessageModalOpen, setSendMessageModalOpen] = useState(false);
  const [sendMessageText, setSendMessageText] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [employeeRequests, setEmployeeRequests] = useState([]);
  const [profileVerification, setProfileVerification] = useState(
    defaultProfileVerification,
  );
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [fieldDecisions, setFieldDecisions] = useState({});
  const [isProcessingReview, setIsProcessingReview] = useState(false);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const [profileChangesShowingCurrent, setProfileChangesShowingCurrent] =
    useState(true);
  const [hasPreviousProfileSnapshot, setHasPreviousProfileSnapshot] =
    useState(false);
  const [profileChangesConfirmOpen, setProfileChangesConfirmOpen] =
    useState(false);
  const [isRevertingProfile, setIsRevertingProfile] = useState(false);

  const readOnlyParams = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const employeeId = params.get("employeeId") || routeEmployeeId || null;
    const reviewRequestId = params.get("requestId") || routeRequestId || null;
    const requestType = params.get("requestType") || null;
    const isReadOnly =
      Boolean(routeEmployeeId) ||
      Boolean(reviewRequestId) ||
      (params.get("view") === "employee" && Boolean(employeeId));
    return { employeeId, reviewRequestId, requestType, isReadOnly };
  }, [location.search, routeEmployeeId, routeRequestId]);

  const isReadOnlyView = readOnlyParams.isReadOnly;
  const viewedEmployeeId = readOnlyParams.employeeId;
  const reviewRequestId = readOnlyParams.reviewRequestId;
  const requestType = readOnlyParams.requestType;

  const user = isReadOnlyView ? viewedProfile || authUser : authUser;
  const profileSource = isReadOnlyView
    ? viewedProfile
    : employeeProfile || user;

  const statusVal =
    profileSource?.status || profileSource?.user?.status || user?.status;
  const activeVal =
    profileSource?.is_active ??
    profileSource?.user?.is_active ??
    user?.is_active;

  const employeeActiveStatus = statusVal
    ? String(statusVal).toLowerCase() !== "inactive"
    : activeVal !== undefined
      ? activeVal
      : true;

  const photoInputRef = useRef(null);
  const cropperContainerRef = useRef(null);
  const resumeInputRef = useRef(null);
  const certificateInputRef = useRef(null);
  const aadhaarInputRef = useRef(null);
  const panInputRef = useRef(null);

  const activeVerificationStatus =
    getBackendVerificationStatus(viewedProfile) ||
    getBackendVerificationStatus(employeeProfile) ||
    getBackendVerificationStatus(user) ||
    "Pending";

  const hasPendingProfileUpdateReq = useMemo(() => {
    return (employeeRequests || []).some(
      (r) => r.request_type === "profile_update" && r.status === "pending",
    );
  }, [employeeRequests]);

  const isProfileUpdateReview = Boolean(
    requestType === "profile_update" ||
    (reviewRequestId && requestType !== "profile_verification") ||
    hasPendingProfileUpdateReq,
  );

  const isReviewMode = isReadOnlyView && isProfileUpdateReview;

  const hasPendingVerificationReq = useMemo(() => {
    return (employeeRequests || []).some(
      (r) =>
        r.request_type === "profile_verification" && r.status === "pending",
    );
  }, [employeeRequests]);

  const verificationToggleValue =
    activeVerificationStatus === "Verified" ? "Verified" : "Pending";

  const showVerificationAction =
    isReadOnlyView &&
    !isReviewMode &&
    (activeVerificationStatus !== "Verified" || hasPendingVerificationReq);
  const verificationActionLabel =
    reviewRequestId ||
    requestType === "profile_verification" ||
    profileVerification.label === "Pending Review"
      ? "Review Verification"
      : "Verify Employee";

  const fetchFreshRequestsForSelf = async () => {
    if (!user?.id) return;
    try {
      const { data: reqs } = await api.get(
        "/admin/update-requests?include_all=true",
      );
      const employeeReqs = (Array.isArray(reqs) ? reqs : [])
        .filter((r) => Number(r.employee_id) === Number(user.id))
        .sort(
          (left, right) =>
            new Date(right.created_at || 0) - new Date(left.created_at || 0),
        );
      setEmployeeRequests(employeeReqs);
      setPendingRequests(employeeReqs.filter((r) => r.status === "pending"));
    } catch (e) {
      // Intentionally silent
    }
  };

  const createFormData = (src) => ({
    full_name: src?.full_name || src?.user?.full_name || "",
    role: src?.role || src?.user?.role || "candidate",
    phone: src?.phone || src?.user?.phone || "",
    linkedin: src?.linkedin || src?.user?.linkedin || "",
    github: src?.github || src?.user?.github || "",
    location: src?.location || src?.user?.location || "",
    skills: src?.skills || src?.user?.skills || "",
    date_of_birth: src?.date_of_birth || src?.user?.date_of_birth || "",
    gender: src?.gender || src?.user?.gender || "",
    emergency_contact:
      src?.emergency_contact || src?.user?.emergency_contact || "",
    current_address: src?.current_address || src?.user?.current_address || "",
    permanent_address:
      src?.permanent_address || src?.user?.permanent_address || "",
    pin_code:
      src?.pin_code ||
      src?.pincode ||
      src?.user?.pin_code ||
      src?.user?.pincode ||
      "",
    college: src?.college || src?.user?.college || "",
    university: src?.university || src?.user?.university || "",
    degree: src?.degree || src?.user?.degree || "",
    branch: src?.branch || src?.user?.branch || "",
    graduation_year: src?.graduation_year || src?.user?.graduation_year || "",
    cgpa: src?.cgpa || src?.user?.cgpa || "",
    aadhaar_number: src?.aadhaar_number || src?.user?.aadhaar_number || "",
    pan_number: src?.pan_number || src?.user?.pan_number || "",
    aadhaar_document_path:
      src?.aadhaar_document_path || src?.user?.aadhaar_document_path || "",
    pan_document_path:
      src?.pan_document_path || src?.user?.pan_document_path || "",
    profile_photo: src?.profile_photo || src?.user?.profile_photo || "",
    resume_url: src?.resume_url || src?.user?.resume_url || "",
    resume_filename: src?.resume_filename || src?.user?.resume_filename || "",
    degree_certificate_url:
      src?.degree_certificate_url || src?.user?.degree_certificate_url || "",
    degree_certificate_filename:
      src?.degree_certificate_filename ||
      src?.user?.degree_certificate_filename ||
      "",
  });

  const [formData, setFormData] = useState(createFormData(profileSource));
  const [baselineFormData, setBaselineFormData] = useState(
    createFormData(profileSource),
  );

  const pendingChanges = useMemo(() => {
    const changes = {};
    pendingRequests.forEach((req) => {
      if (Array.isArray(req.items)) {
        req.items.forEach((item) => {
          if (item.status === "pending") {
            changes[item.field_name] = item.new_value;
          }
        });
      } else if (req.field_name && req.field_name !== "multiple_fields") {
        if (req.status === "pending") {
          changes[req.field_name] = req.new_value;
        }
      }
    });
    return changes;
  }, [pendingRequests]);

  const effectiveAadhaarPath =
    formData.aadhaar_document_path ||
    pendingChanges.aadhaar_document_path ||
    profileSource?.aadhaar_document_path ||
    profileSource?.user?.aadhaar_document_path;
  const hasAadhaarDoc = Boolean(effectiveAadhaarPath);

  const effectivePanPath =
    formData.pan_document_path ||
    pendingChanges.pan_document_path ||
    profileSource?.pan_document_path ||
    profileSource?.user?.pan_document_path;
  const hasPanDoc = Boolean(effectivePanPath);

  const effectiveResumePath =
    formData.resume_url ||
    pendingChanges.resume_url ||
    profileSource?.resume_url ||
    profileSource?.user?.resume_url;
  const hasResume = Boolean(effectiveResumePath);

  const effectiveCertificatePath =
    formData.degree_certificate_url ||
    pendingChanges.degree_certificate_url ||
    profileSource?.degree_certificate_url ||
    profileSource?.user?.degree_certificate_url;
  const hasDegreeCertificate = Boolean(effectiveCertificatePath);

  const hasUnsavedChanges = useMemo(() => {
    return (
      !isReadOnlyView &&
      JSON.stringify(formData) !== JSON.stringify(baselineFormData)
    );
  }, [formData, baselineFormData, isReadOnlyView]);

  const openDocPreview = (path, title) => {
    const url = buildAssetUrl(path);
    if (!url) {
      addToast("Document not found", "error");
      return;
    }
    const ext = url.split(".").pop().toLowerCase();
    const isPdf = ext.includes("pdf");
    setDocPreviewData({ url, title, type: isPdf ? "pdf" : "image" });
    setDocPreviewOpen(true);
  };

  useEffect(() => {
    if (!profileSource) return;

    // Check if the user is in first-time mode
    const isFirstTime = !user?.application_submitted;

    // Prevent auto form-wipe while actively editing
    if (!isReadOnlyView && (isEditing || isFirstTime)) {
      return;
    }

    const next = createFormData(profileSource);
    setFormData(next);
    setBaselineFormData(next);
  }, [user, employeeProfile, viewedProfile, isReadOnlyView, isEditing]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPhotoModalOpen(false);
        return;
      }
      const tag = e.target?.tagName?.toLowerCase();
      if (e.key === "Enter" && ["input", "textarea", "select"].includes(tag)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "You have unsaved changes. Leave without saving?";
      return event.returnValue;
    };

    const handleHistoryNavigation = (action) => {
      if (!hasUnsavedChanges) {
        action();
        return;
      }
      pendingLeaveActionRef.current = action;
      setLeavePromptOpen(true);
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = (...args) => {
      handleHistoryNavigation(() =>
        originalPushState.apply(window.history, args),
      );
    };
    window.history.replaceState = (...args) => {
      handleHistoryNavigation(() =>
        originalReplaceState.apply(window.history, args),
      );
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      pendingLeaveActionRef.current = null;
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await api.get("/applications");
        const app = Array.isArray(res.data) && res.data[0] ? res.data[0] : null;
        const fallback = resolveEmployeeDisplayId(user);
        setCandidateInfo({
          candidateId: fallback,
          position: app?.position_title || app?.job_title || "Not provided",
          status:
            app?.status ||
            (user?.application_submitted ? "Submitted" : "In Progress"),
          lastUpdated:
            user?.updated_at || user?.last_updated
              ? formatLastUpdatedValue(user.updated_at || user.last_updated)
              : app?.applied_at
                ? new Date(app.applied_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Not available",
        });
      } catch {
        setCandidateInfo({
          candidateId: resolveEmployeeDisplayId(user),
          position: "Not provided",
          status: user?.application_submitted ? "Submitted" : "In Progress",
          lastUpdated:
            user?.updated_at || user?.last_updated
              ? formatLastUpdatedValue(user.updated_at || user.last_updated)
              : "Not available",
        });
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (isReadOnlyView) {
      setPhotoModalOpen(false);
      return;
    }
    const params = new URLSearchParams(location.search);
    if (params.get("photo") === "edit") {
      setPhotoModalOpen(true);
    }
  }, [isReadOnlyView, location.search]);

  useEffect(() => {
    if (!isReadOnlyView || !viewedEmployeeId) {
      setViewedProfile(null);
      setViewedProfileLoading(false);
      setViewedProfileError(false);
      setPendingRequests([]);
      setProfileVerification(defaultProfileVerification);
      return;
    }

    let isMounted = true;
    const loadViewedProfile = async () => {
      setViewedProfileLoading(true);
      setViewedProfileError(false);
      try {
        const { data } = await api.get(`/employees/${viewedEmployeeId}`);
        if (!isMounted) return;

        const mergedProfile = {
          ...(data?.user || {}),
          ...data,
          user: data?.user,
        };
        setViewedProfile(mergedProfile);
        setViewedProfileError(false);
      } catch (error) {
        if (!isMounted) return;
        setViewedProfile(null);
        setViewedProfileError(true);
        addToast(
          error?.response?.data?.detail || "Unable to load employee profile",
          "error",
        );
      } finally {
        if (isMounted) {
          setViewedProfileLoading(false);
        }
      }
    };

    const loadPendingRequests = async () => {
      try {
        const { data } = await api.get(
          "/admin/update-requests?include_all=true",
        );
        if (!isMounted) return;

        const employeeRequests = (Array.isArray(data) ? data : [])
          .filter(
            (request) =>
              Number(request.employee_id) === Number(viewedEmployeeId),
          )
          .sort(
            (left, right) =>
              new Date(right.created_at || 0) - new Date(left.created_at || 0),
          );

        const pendingRequests = employeeRequests.filter(
          (request) => request.status === "pending",
        );
        setEmployeeRequests(employeeRequests);
        setPendingRequests(pendingRequests);
      } catch (error) {
        if (!isMounted) return;
        setEmployeeRequests([]);
        setPendingRequests([]);
        setProfileVerification(defaultProfileVerification);
      }
    };

    loadViewedProfile();
    loadPendingRequests();
    return () => {
      isMounted = false;
    };
  }, [addToast, isReadOnlyView, viewedEmployeeId]);

  useEffect(() => {
    if (isReadOnlyView || !user?.id) {
      setEmployeeProfile(null);
      return;
    }

    let isMounted = true;
    const loadEmployeeProfile = async () => {
      try {
        const { data } = await api.get("/employees/me/profile");
        if (!isMounted) return;
        setEmployeeProfile(data);
      } catch {
        if (!isMounted) return;
        setEmployeeProfile(null);
      }
    };

    loadEmployeeProfile();
    return () => {
      isMounted = false;
    };
  }, [isReadOnlyView, user?.id]);

  useEffect(() => {
    if (!profileSource) return;

    const backendStatus = getBackendVerificationStatus(profileSource);
    if (backendStatus) {
      const rejectionReason =
        profileSource.verification_rejection_reason ||
        profileSource.rejection_reason ||
        "";
      setProfileVerification(
        getProfileVerificationStateFromBackend(backendStatus, ""),
      );
      return;
    }

    setProfileVerification(
      deriveProfileVerification(profileSource, pendingRequests),
    );
  }, [
    isReadOnlyView,
    viewedProfile,
    employeeProfile,
    user,
    pendingRequests,
    profileSource,
  ]);

  useEffect(() => {
    const unsubscribe = subscribeToEmployeeProfileUpdates(() => {
      if (isReadOnlyView && viewedEmployeeId) {
        api
          .get(`/employees/${viewedEmployeeId}`)
          .then(({ data }) => {
            const mergedProfile = {
              ...(data?.user || {}),
              ...data,
              user: data?.user,
            };
            setViewedProfile(mergedProfile);
          })
          .catch(() => {});
        return;
      }

      if (authUser?.id) {
        api
          .get("/me")
          .then(({ data }) => {
            const mergedProfile = {
              ...(authUser || {}),
              ...(data || {}),
              user: data?.user || authUser?.user || null,
            };
            updateUser(mergedProfile);
          })
          .catch(() => {});
        fetchFreshRequestsForSelf();
      }
    });

    return unsubscribe;
  }, [authUser, isReadOnlyView, viewedEmployeeId, updateUser]);

  useEffect(() => {
    if (isReadOnlyView || !user?.id) {
      return;
    }

    let isMounted = true;
    const loadOwnProfileRequests = async () => {
      try {
        const { data } = await api.get(
          "/admin/update-requests?include_all=true",
        );
        if (!isMounted) return;

        const employeeRequests = (Array.isArray(data) ? data : [])
          .filter((request) => Number(request.employee_id) === Number(user.id))
          .sort(
            (left, right) =>
              new Date(right.created_at || 0) - new Date(left.created_at || 0),
          );

        const pendingRequests = employeeRequests.filter(
          (request) => request.status === "pending",
        );
        setPendingRequests(pendingRequests);
        setProfileVerification(
          deriveProfileVerification(employeeProfile || user, employeeRequests),
        );
      } catch (error) {
        // Intentionally silent
        if (!isMounted) return;
        setPendingRequests([]);
        setProfileVerification(defaultProfileVerification);
      }
    };

    loadOwnProfileRequests();
    return () => {
      isMounted = false;
    };
  }, [addToast, isReadOnlyView, user?.id, employeeProfile]);

  useEffect(() => {
    const targetId = isReadOnlyView ? viewedEmployeeId : user?.id;
    if (!targetId) {
      setHasPreviousProfileSnapshot(false);
      return;
    }
    let isMounted = true;
    const loadProfileChangesInfo = async () => {
      try {
        const endpoint = isReadOnlyView
          ? `/admin/employees/${targetId}/profile-changes`
          : `/employees/me/profile-changes`;
        const { data } = await api.get(endpoint);
        if (!isMounted) return;
        setHasPreviousProfileSnapshot(
          data.has_previous_snapshot && data.snapshot_field_count > 0,
        );
        setProfileChangesShowingCurrent(
          data.current_snapshot_type !== "previous",
        );
      } catch {
        if (!isMounted) return;
        setHasPreviousProfileSnapshot(false);
      }
    };
    loadProfileChangesInfo();
    return () => {
      isMounted = false;
    };
  }, [isReadOnlyView, viewedEmployeeId, user?.id]);

  const handleClosePhotoModal = () => {
    resetCropState();
    setPhotoModalOpen(false);
    if (location.search.includes("photo=edit")) {
      navigate("/profile", { replace: true });
    }
  };

  const isProfileCompleted = Boolean(user?.application_submitted);
  const isFirstTime = !isProfileCompleted;
  const showEditMode = !isReadOnlyView && (isEditing || isFirstTime);

  const getInputCls = (fieldKey) =>
    `${inputCls} ${
      errors[fieldKey]
        ? "border-red-500 focus:border-red-500 focus:ring-red-100 ring-1 ring-red-500"
        : ""
    }`;

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field] && value && String(value).trim() !== "") {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    let firstInvalidKey = null;

    const mandatoryFields = [
      {
        key: "full_name",
        val: formData.full_name || profileSource?.full_name,
        label: "Full Name",
      },
      {
        key: "phone",
        val: formData.phone || profileSource?.phone,
        label: "Phone Number",
      },
      {
        key: "date_of_birth",
        val: formData.date_of_birth || profileSource?.date_of_birth,
        label: "Date of Birth",
      },
      {
        key: "location",
        val: formData.location || profileSource?.location,
        label: "Current City & State",
      },
      {
        key: "degree",
        val: formData.degree || profileSource?.degree,
        label: "Highest Qualification",
      },
      {
        key: "university",
        val:
          formData.university ||
          profileSource?.university ||
          formData.college ||
          profileSource?.college,
        label: "College / University",
      },
      {
        key: "graduation_year",
        val: formData.graduation_year || profileSource?.graduation_year,
        label: "Graduation Year",
      },
      {
        key: "skills",
        val: formData.skills || profileSource?.skills,
        label: "Skills / Expertise",
      },
      {
        key: "resume",
        val: effectiveResumePath ? "uploaded" : "",
        label: "Resume",
      },
      {
        key: "aadhaar_number",
        val: formData.aadhaar_number || profileSource?.aadhaar_number,
        label: "Aadhaar Number",
      },
      {
        key: "pan_number",
        val: formData.pan_number || profileSource?.pan_number,
        label: "PAN Number",
      },
    ];

    mandatoryFields.forEach(({ key, val, label }) => {
      if (!val || (typeof val === "string" && !val.trim())) {
        newErrors[key] = `${label} is required.`;
        if (!firstInvalidKey) firstInvalidKey = key;
        isValid = false;
      }
    });

    if (
      !newErrors.aadhaar_number &&
      formData.aadhaar_number &&
      formData.aadhaar_number.length !== 12
    ) {
      newErrors.aadhaar_number = "Aadhaar number must be exactly 12 digits.";
      if (!firstInvalidKey) firstInvalidKey = "aadhaar_number";
      isValid = false;
    }

    if (
      !newErrors.pan_number &&
      formData.pan_number &&
      formData.pan_number.length !== 10
    ) {
      newErrors.pan_number = "PAN number must be exactly 10 characters.";
      if (!firstInvalidKey) firstInvalidKey = "pan_number";
      isValid = false;
    }

    return { isValid, newErrors, firstInvalidKey };
  };

  const handleEditToggle = () => {
    if (isEditing) {
      const next = createFormData(profileSource);
      setFormData(next);
      setBaselineFormData(next);
      setErrors({});
      setDeclarationAccepted(false);
      setPrivacyAccepted(false);
      setSaveMessage("");
      setIsEditing(false);
      return;
    }
    setErrors({});
    setDeclarationAccepted(false);
    setPrivacyAccepted(false);
    setSaveMessage("");
    setBaselineFormData(createFormData(profileSource));
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    const { isValid, newErrors, firstInvalidKey } = validateForm();

    if (!isValid) {
      setErrors(newErrors);
      setSaveMessage("Please fix the highlighted fields.");
      addToast(
        Object.values(newErrors)[0] || "Please complete all required fields.",
        "error",
      );

      if (firstInvalidKey) {
        setTimeout(() => {
          const el = document.getElementById(`field-${firstInvalidKey}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            if (typeof el.focus === "function") {
              el.focus();
            }
          }
        }, 100);
      }
      return;
    }

    if (isFirstTime && (!declarationAccepted || !privacyAccepted)) {
      setErrors((prev) => ({
        ...prev,
        declaration: "Please confirm both declarations before saving.",
      }));
      setSaveMessage("Please confirm both declarations before saving.");
      addToast("Please confirm both declarations before saving.", "error");
      return;
    }

    setIsSaving(true);
    setSaveMessage("Saving profile...");
    try {
      const payload = {
        ...createFormData(profileSource),
        ...formData,
        pincode: formData.pin_code, // Backup key sync
        pin_code: formData.pin_code,
      };
      await api.put("/employees/me/profile", payload);

      const userPayload = {
        application_submitted: true,
        application_submitted_at: new Date().toISOString(),
      };
      try {
        await api.patch("/me", userPayload);
      } catch (e) {}

      const refreshedProfileRes = await api.get("/me");
      const refreshedProfile = refreshedProfileRes.data;
      updateUser(refreshedProfile);

      await fetchFreshRequestsForSelf();

      notifyEmployeeProfileUpdated();
      const next = createFormData(refreshedProfile);
      setFormData(next);
      setBaselineFormData(next);
      setErrors({});
      setDeclarationAccepted(false);
      setPrivacyAccepted(false);
      setSaveMessage("Profile submitted successfully.");
      setIsEditing(false);
      addToast("Profile submitted successfully.", "success");
    } catch (err) {
      let msg =
        err?.response?.data?.detail ||
        "Unable to save profile. Please try again.";
      if (Array.isArray(msg)) {
        msg = msg.map((m) => m.msg).join(", ");
      }
      setErrors((prev) => ({ ...prev, form: msg }));
      setSaveMessage(msg);
      addToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocumentUpload = async (fileType, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileType === "aadhaar") setIsUploadingAadhaar(true);
    if (fileType === "pan") setIsUploadingPan(true);
    const payload = new FormData();
    if (fileType === "aadhaar") payload.append("aadhaar_file", file);
    else payload.append("pan_file", file);
    try {
      const res = await api.post("/employees/me/upload-documents", payload);
      const data = res.data;
      const nextAadhaar =
        data.aadhaar_document_path || formData.aadhaar_document_path;
      const nextPan = data.pan_document_path || formData.pan_document_path;
      const ts = data.last_updated || new Date();
      setFormData((prev) => ({
        ...prev,
        aadhaar_document_path: nextAadhaar,
        pan_document_path: nextPan,
      }));
      updateUser({
        ...user,
        aadhaar_document_path: nextAadhaar,
        pan_document_path: nextPan,
        updated_at: ts,
      });
      await fetchFreshRequestsForSelf();
      addToast(
        `${fileType === "aadhaar" ? "Aadhaar" : "PAN"} document uploaded successfully.`,
        "success",
      );
    } catch (err) {
      let msg = err?.response?.data?.detail || "Unable to upload document.";
      if (Array.isArray(msg)) msg = msg.map((m) => m.msg).join(", ");
      addToast(msg, "error");
    } finally {
      if (fileType === "aadhaar") setIsUploadingAadhaar(false);
      if (fileType === "pan") setIsUploadingPan(false);
      event.target.value = "";
    }
  };

  const handleResumeChoice = async (shouldAutoFill) => {
    setResumeChoiceOpen(false);

    if (!shouldAutoFill) {
      setPendingResumeFile(null);
      setResumePreviewData(null);
      return;
    }

    if (!pendingResumeFile) return;

    setIsUploadingResume(true);

    try {
      const payload = new FormData();
      payload.append("file", pendingResumeFile);
      const res = await api.post("/me/resume/parse", payload);
      const parsed = res.data?.parsed || {};

      const mapped = {
        full_name: String(parsed.fullName || parsed.full_name || "").trim(),
        phone: String(parsed.phone || "")
          .replace(/\D/g, "")
          .slice(0, 10),
        linkedin: String(parsed.linkedin || "").trim(),
        github: String(parsed.github || "").trim(),
        college: String(parsed.college || "").trim(),
        degree: String(parsed.degree || "").trim(),
        graduation_year: String(
          parsed.graduationYear || parsed.graduation_year || "",
        ).trim(),
        skills: String(parsed.skills || "").trim(),
      };

      const detected = [];

      Object.entries(mapped).forEach(([key, value]) => {
        if (!value) return;
        const currentValue = String(formData[key] || user?.[key] || "").trim();
        if (!currentValue) {
          detected.push({
            key,
            label:
              {
                full_name: "Name",
                phone: "Phone",
                linkedin: "LinkedIn",
                github: "GitHub",
                college: "College",
                degree: "Degree",
                graduation_year: "Graduation Year",
                skills: "Skills",
              }[key] || key,
            value,
          });
        }
      });

      setResumePreviewData(detected);
      setResumeSummaryData({
        imported: detected.map((item) => item.label),
        skipped: [],
      });
      if (detected.length > 0) {
        setResumeSummaryOpen(false);
      }
    } catch (err) {
      const detail = err?.response?.data?.detail || "Unable to load resume.";
      addToast(
        detail === "Resume file not found."
          ? "Resume file not found."
          : "Unable to load resume.",
        "error",
      );
    } finally {
      setIsUploadingResume(false);
      setPendingResumeFile(null);
    }
  };

  const handleResumeFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedExtensions = [".pdf", ".doc", ".docx"];
    const extension = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
      : "";

    if (!allowedExtensions.includes(extension)) {
      addToast(
        "Unsupported file type. Please upload a PDF, DOC, or DOCX file.",
        "error",
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast("File size must be 5 MB or less.", "error");
      event.target.value = "";
      return;
    }

    setIsUploadingResume(true);

    try {
      const payload = new FormData();
      payload.append("file", file);
      const res = await api.post("/me/resume/parse", payload);
      const resumeUrl = res.data?.resume_url || user?.resume_url;
      const resumeFilename = res.data?.resume_filename || user?.resume_filename;
      const nextUser = {
        ...user,
        resume_url: resumeUrl,
        resume_filename: resumeFilename,
      };
      updateUser(nextUser);
      setFormData((prev) => ({
        ...prev,
        resume_url: resumeUrl || prev.resume_url,
        resume_filename: resumeFilename || prev.resume_filename,
      }));

      await fetchFreshRequestsForSelf();

      setPendingResumeFile(file);
      addToast("Resume uploaded successfully.", "success");
    } catch (err) {
      const detail = err?.response?.data?.detail || "Unable to upload resume.";
      addToast(
        detail === "Resume file not found."
          ? "Resume file not found."
          : "Unable to upload resume.",
        "error",
      );
    } finally {
      setIsUploadingResume(false);
      event.target.value = "";
    }
  };

  const handlePhotoSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const ext = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
      : "";
    if (
      !allowed.includes(file.type) &&
      ![".jpg", ".jpeg", ".png", ".webp"].includes(ext)
    ) {
      setPhotoError("Invalid file type.");
      addToast("Invalid file type.", "error");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image size exceeds 5 MB.");
      addToast("Image size exceeds 5 MB.", "error");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resetCropState();
      setCropImageSrc(String(reader.result));
      setPhotoError("");
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const resetCropState = () => {
    setCropImageSrc("");
    setCropPreviewUrl("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setShowCropper(false);
  };

  const createCroppedCanvas = async (pixels) => {
    if (!cropImageSrc || !pixels) return null;

    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener("load", () => resolve(img));
      img.addEventListener("error", (error) => reject(error));
      img.src = cropImageSrc;
    });

    const sourceWidth = image.naturalWidth || image.width || 0;
    const sourceHeight = image.naturalHeight || image.height || 0;
    if (!sourceWidth || !sourceHeight) return null;

    const rotRad = (rotation * Math.PI) / 180;
    const sinA = Math.abs(Math.sin(rotRad));
    const cosA = Math.abs(Math.cos(rotRad));
    const bboxW = Math.round(sourceWidth * cosA + sourceHeight * sinA);
    const bboxH = Math.round(sourceWidth * sinA + sourceHeight * cosA);

    const rotatedCanvas = document.createElement("canvas");
    rotatedCanvas.width = bboxW;
    rotatedCanvas.height = bboxH;
    const rotCtx = rotatedCanvas.getContext("2d");
    if (!rotCtx) return null;

    rotCtx.translate(bboxW / 2, bboxH / 2);
    rotCtx.rotate(rotRad);
    rotCtx.translate(-sourceWidth / 2, -sourceHeight / 2);
    rotCtx.drawImage(image, 0, 0, sourceWidth, sourceHeight);

    const cropX = Math.round(pixels.x);
    const cropY = Math.round(pixels.y);
    const cropW = Math.max(1, Math.round(pixels.width));
    const cropH = Math.max(1, Math.round(pixels.height));

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = cropW;
    outputCanvas.height = cropH;
    const outCtx = outputCanvas.getContext("2d");
    if (!outCtx) return null;

    outCtx.imageSmoothingEnabled = true;
    outCtx.imageSmoothingQuality = "high";
    outCtx.drawImage(
      rotatedCanvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH,
    );

    return outputCanvas;
  };

  const getCropPreviewUrl = async (pixels) => {
    const canvas = await createCroppedCanvas(pixels);
    if (!canvas) return "";
    return canvas.toDataURL("image/png");
  };

  const onCropComplete = async (_, croppedAreaPixelsValue) => {
    setCroppedAreaPixels(croppedAreaPixelsValue);
    const previewUrl = await getCropPreviewUrl(croppedAreaPixelsValue);

    if (previewUrl) setCropPreviewUrl(previewUrl);
  };

  const getCroppedImageBlob = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return null;
    const canvas = await createCroppedCanvas(croppedAreaPixels);
    if (!canvas) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const handleSavePhoto = async () => {
    if (!cropImageSrc) return;
    if (!croppedAreaPixels) {
      setPhotoError("Please adjust the crop before saving.");
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError("");
    setErrors({});
    try {
      const blob = await getCroppedImageBlob();
      if (!blob) throw new Error("Unable to create cropped image.");

      const file = new File([blob], `profile-photo-${Date.now()}.png`, {
        type: "image/png",
      });
      const payload = new FormData();
      payload.append("file", file);

      const res = await api.post("/me/profile-photo", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const refreshedMe = await api.get("/me");
      updateUser(refreshedMe.data);
      setFormData((prev) => ({
        ...prev,
        profile_photo:
          refreshedMe.data?.profile_photo || res.data?.profile_photo || "",
      }));
      resetCropState();

      await fetchFreshRequestsForSelf();

      setPhotoModalOpen(false);
      addToast("Profile photo updated successfully.", "success");
      notifyEmployeeProfileUpdated();
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Unable to upload profile photo. Please try again.";
      setPhotoError(detail);
      addToast(detail, "error");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    setDeletePhotoConfirmOpen(false);
    setIsDeletingPhoto(true);
    setPhotoError("");
    try {
      try {
        await api.delete("/me/profile-photo");
      } catch (deleteErr) {
        if (
          deleteErr?.response?.status === 404 ||
          deleteErr?.response?.status === 405
        ) {
          try {
            await api.patch("/me", { profile_photo: null });
          } catch (e) {}
        } else {
          throw deleteErr;
        }
      }
      const refreshedMe = await api.get("/me");
      updateUser(refreshedMe.data);
      setFormData((prev) => ({ ...prev, profile_photo: "" }));
      resetCropState();

      await fetchFreshRequestsForSelf();

      setPhotoModalOpen(false);
      notifyEmployeeProfileUpdated();
      addToast("Profile photo removed successfully.", "success");
    } catch (err) {
      const detail =
        err?.response?.data?.detail || "Unable to remove profile photo";
      setPhotoError(detail);
      addToast(detail, "error");
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  const handleViewResume = async () => {
    if (!effectiveResumePath) {
      addToast("Resume file not found.", "error");
      return;
    }
    openDocPreview(effectiveResumePath, "Resume");
  };

  const handleCertificateFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingCertificate(true);

    try {
      const payload = new FormData();
      payload.append("file", file);
      const res = await api.post("/me/degree-certificate", payload);
      const certificateUrl =
        res.data?.degree_certificate_url || user?.degree_certificate_url;
      const certificateFilename =
        res.data?.degree_certificate_filename ||
        user?.degree_certificate_filename;
      const nextUser = {
        ...user,
        degree_certificate_url: certificateUrl,
        degree_certificate_filename: certificateFilename,
      };
      updateUser(nextUser);
      setFormData((prev) => ({
        ...prev,
        degree_certificate_url: certificateUrl || prev.degree_certificate_url,
        degree_certificate_filename:
          certificateFilename || prev.degree_certificate_filename,
      }));

      await fetchFreshRequestsForSelf();

      addToast("Degree certificate uploaded successfully.", "success");
    } catch (err) {
      const detail =
        err?.response?.data?.detail || "Unable to upload degree certificate.";
      addToast(detail, "error");
    } finally {
      setIsUploadingCertificate(false);
      event.target.value = "";
    }
  };

  const handleViewCertificate = async () => {
    if (!effectiveCertificatePath) {
      addToast("Degree certificate file not found.", "error");
      return;
    }
    openDocPreview(effectiveCertificatePath, "Degree Certificate");
  };

  // ==== FIX: ONLY ADMIN CAN TOGGLE ====
  const handleToggleActiveStatus = async () => {
    if (!isReadOnlyView) return;
    setIsTogglingStatus(true);

    try {
      const nextStatus = !employeeActiveStatus;
      const statusText = nextStatus ? "Active" : "Inactive";

      // 1. Optimistic Update (Admin View)
      if (viewedProfile) {
        setViewedProfile((prev) => ({
          ...prev,
          status: statusText,
          is_active: nextStatus,
          user: {
            ...(prev?.user || {}),
            status: statusText,
            is_active: nextStatus,
          },
        }));
      }

      // 2. Safely Update via API (Admin Endpoint or fallback)
      let updatedProfile = null;
      if (viewedEmployeeId) {
        try {
          const { data } = await api.patch(`/admin/employees/${viewedEmployeeId}/status`, {
            is_active: nextStatus,
            status: statusText,
          });
          updatedProfile = {
            ...(data?.user || {}),
            ...data,
            user: data?.user || null,
            status: data?.status || statusText,
            is_active: data?.user?.is_active ?? nextStatus,
          };
          setViewedProfile((prev) => ({
            ...(prev || {}),
            ...(updatedProfile || {}),
            user: updatedProfile?.user || prev?.user || null,
          }));
        } catch (e) {
          try {
            await api.put(`/employees/${viewedEmployeeId}`, {
              ...formData,
              status: statusText,
              employmentStatus: statusText,
              is_active: nextStatus,
            });
          } catch (fallbackErr) {
            // Fallback handled
          }
        }
      }

      notifyEmployeeProfileUpdated();
      addToast(`Status updated to ${statusText}`, "success");
    } catch (err) {
      addToast("Failed to update status", "error");
    } finally {
      setIsTogglingStatus(false);
    }
  };
  // =================================================

  const groupedPendingRequests = useMemo(() => {
    if (!reviewRequestId) return pendingRequests;
    return pendingRequests.filter((req) => req.request_id === reviewRequestId);
  }, [pendingRequests, reviewRequestId]);

  const reviewHistoryGroups = useMemo(() => {
    return Object.values(
      employeeRequests.reduce((groups, request) => {
        if (!request.request_id) return groups;
        if (!groups[request.request_id]) {
          groups[request.request_id] = {
            request_id: request.request_id,
            request_type: request.request_type,
            employee_id: request.employee_id,
            created_at: request.created_at,
            status: request.status,
            requests: [],
          };
        }
        groups[request.request_id].requests.push(request);
        return groups;
      }, {}),
    ).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [employeeRequests]);

  const reviewDataByField = useMemo(() => {
    const map = {};
    groupedPendingRequests.forEach((request) => {
      if (!request.field_name) return;
      const currentRaw = request.old_value ?? user?.[request.field_name];
      const requestedRaw = request.new_value ?? "";
      map[request.field_name] = {
        currentValue: formatPendingValue(currentRaw),
        requestedValue: formatPendingValue(requestedRaw),
        currentRaw,
        requestedRaw,
        isDocument: isDocumentField(request.field_name),
      };
    });
    return map;
  }, [groupedPendingRequests, user]);

  const reviewDataFor = (fieldName) => {
    const aliases = getReviewFieldAliases(fieldName);
    for (const alias of aliases) {
      if (reviewDataByField[alias]) return reviewDataByField[alias];
    }
    return null;
  };

  const profileCompletion = useMemo(() => {
    const profile = viewedProfile || authUser || user;
    if (!profile) return 0;
    const requiredFields = [
      "full_name",
      "phone",
      "date_of_birth",
      "location",
      "degree",
      "university",
      "graduation_year",
      "skills",
      "resume_url",
      "aadhaar_number",
      "pan_number",
      "profile_photo",
    ];
    const filledCount = requiredFields.reduce((count, field) => {
      const value = formData[field] || profile[field];
      if (typeof value === "string" && value.trim()) return count + 1;
      return count;
    }, 0);
    return Math.round((filledCount / requiredFields.length) * 100);
  }, [authUser, formData, viewedProfile, user]);

  const currentReviewGroup = useMemo(() => {
    return (
      reviewHistoryGroups.find(
        (group) => group.request_id === reviewRequestId,
      ) || null
    );
  }, [reviewHistoryGroups, reviewRequestId]);

  const skillTags = buildSkillTags(formData.skills || user?.skills);
  const profileLastUpdatedValue = getProfileLastUpdatedValue(
    isReadOnlyView ? viewedProfile || user : user,
  );
  const profilePhotoUrl = buildAssetUrl(
    formData.profile_photo ||
      profileSource?.profile_photo ||
      user?.profile_photo,
  );

  const pendingProfileUpdateItems = useMemo(() => {
    if (!isReadOnlyView) return [];
    const reqId = reviewRequestId;
    let matching = [];
    if (reqId) {
      matching = employeeRequests.filter(
        (r) =>
          r.request_id === reqId &&
          r.status === "pending" &&
          r.request_type === "profile_update",
      );
    }
    if (!matching.length) {
      matching = employeeRequests.filter(
        (r) => r.status === "pending" && r.request_type === "profile_update",
      );
    }
    if (!matching.length) return [];

    const allItems = [];
    matching.forEach((req) => {
      if (Array.isArray(req.items) && req.items.length > 0) {
        req.items.forEach((item) => {
          if (item.status === "pending") {
            allItems.push({
              id: item.id,
              request_id: req.request_id || req.id,
              field_name: item.field_name,
              old_value: item.old_value,
              new_value: item.new_value,
            });
          }
        });
      } else if (req.field_name && req.field_name !== "multiple_fields") {
        allItems.push({
          id: req.id,
          request_id: req.request_id || req.id,
          field_name: req.field_name,
          old_value: req.old_value,
          new_value: req.new_value,
        });
      }
    });

    const map = new Map();
    allItems.forEach((item) => {
      if (!map.has(item.field_name)) map.set(item.field_name, item);
    });
    return Array.from(map.values());
  }, [isReadOnlyView, reviewRequestId, employeeRequests]);

  const handleSetFieldDecision = (fieldName, decision) => {
    setFieldDecisions((prev) => ({
      ...prev,
      [fieldName]: decision,
    }));
  };

  const executeReviewDecision = async (approvedFields, rejectedFields) => {
    if (!pendingProfileUpdateItems.length) return;
    const targetReqId = pendingProfileUpdateItems[0].request_id;
    setIsProcessingReview(true);
    try {
      await api.post(`/admin/update-requests/${targetReqId}/process`, {
        approved_fields: approvedFields,
        rejected_fields: rejectedFields,
      });

      addToast("Profile update request processed successfully.", "success");
      setFieldDecisions({});
      notifyEmployeeProfileUpdated();

      if (viewedEmployeeId) {
        const { data: updatedProf } = await api.get(
          `/employees/${viewedEmployeeId}`,
        );
        setViewedProfile({
          ...(updatedProf?.user || {}),
          ...updatedProf,
          user: updatedProf?.user,
        });

        const { data: reqs } = await api.get(
          "/admin/update-requests?include_all=true",
        );
        const employeeReqs = (Array.isArray(reqs) ? reqs : []).filter(
          (r) => Number(r.employee_id) === Number(viewedEmployeeId),
        );
        setEmployeeRequests(employeeReqs);
        setPendingRequests(employeeReqs.filter((r) => r.status === "pending"));
      }
    } catch (err) {
      addToast(
        err?.response?.data?.detail ||
          "Unable to process profile update request",
        "error",
      );
    } finally {
      setIsProcessingReview(false);
    }
  };

  const handleSaveChanges = () => {
    const approved = pendingProfileUpdateItems
      .filter((item) => fieldDecisions[item.field_name] === "yes")
      .map((item) => item.field_name);
    const rejected = pendingProfileUpdateItems
      .filter((item) => fieldDecisions[item.field_name] === "no")
      .map((item) => item.field_name);

    if (!approved.length && !rejected.length) {
      addToast(
        "Please select at least one decision ([✓ Yes] or [✗ No]).",
        "error",
      );
      return;
    }
    executeReviewDecision(approved, rejected);
    setReviewModalOpen(false);
  };

  const handleVerifyProfileDecision = async () => {
    const employeeId =
      viewedEmployeeId ||
      (viewedProfile && (viewedProfile.id || viewedProfile.employeeId)) ||
      (user && user.id);

    if (!employeeId) {
      addToast("Employee ID is missing. Cannot verify.", "error");
      return;
    }

    setIsVerifying(true);
    try {
      if (reviewRequestId && requestType === "profile_verification") {
        await api.post(`/admin/update-requests/${reviewRequestId}/approve`);
      } else {
        await api.post(`/admin/employees/${employeeId}/verify`);
      }

      const [profileRes, requestsRes] = await Promise.all([
        api.get(`/employees/${employeeId}`),
        api.get("/admin/update-requests?include_all=true"),
      ]);

      const mergedProfile = {
        ...(profileRes.data?.user || {}),
        ...profileRes.data,
        user: profileRes.data?.user,
      };
      setViewedProfile(mergedProfile);

      const allRequests = Array.isArray(requestsRes.data)
        ? requestsRes.data
        : [];
      const empRequests = allRequests
        .filter((r) => Number(r.employee_id) === Number(employeeId))
        .sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
        );
      const pending = empRequests.filter((r) => r.status === "pending");
      setEmployeeRequests(empRequests);
      setPendingRequests(pending);

      notifyEmployeeProfileUpdated();
      setVerificationModalOpen(false);
      setVerificationDecision(null);
      setVerificationComment("");
      addToast("Profile verified successfully.", "success");
    } catch (error) {
      addToast(
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Verification request failed.",
        "error",
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRejectProfileDecision = async () => {
    const targetId =
      viewedEmployeeId ||
      (viewedProfile && (viewedProfile.id || viewedProfile.employeeId)) ||
      (user && user.id);
    if (!targetId) return;

    setIsRejecting(true);
    try {
      if (reviewRequestId) {
        await api.post(`/admin/update-requests/${reviewRequestId}/reject`, {
          reason: verificationComment.trim() || undefined,
        });
      } else {
        await api.post(`/admin/employees/${targetId}/reject`, {
          reason: verificationComment.trim() || undefined,
        });
      }

      const rejectionText = verificationComment.trim();
      setViewedProfile((prev) =>
        prev
          ? {
              ...prev,
              verification_status: "Rejected",
              verification_rejection_reason: rejectionText,
              user: prev.user
                ? {
                    ...prev.user,
                    verification_status: "Rejected",
                    verification_rejection_reason: rejectionText,
                  }
                : null,
            }
          : prev,
      );
      setProfileVerification(
        getProfileVerificationStateFromBackend("Rejected", rejectionText),
      );
      setVerificationModalOpen(false);
      setVerificationDecision(null);
      setVerificationComment("");
      notifyEmployeeProfileUpdated();
      addToast("Profile rejected successfully.", "success");
    } catch (error) {
      addToast(
        error?.response?.data?.detail || "Unable to reject employee profile.",
        "error",
      );
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCancelVerification = () => {
    setVerificationModalOpen(false);
    setVerificationDecision(null);
    setVerificationComment("");
  };

  const handleToggleVerificationStatus = async () => {
    if (!isReadOnlyView || !viewedEmployeeId) return;
    const nextValue = verificationToggleValue === "Verified" ? "Pending" : "Verified";
    setIsUpdatingVerification(true);
    try {
      const { data } = await api.patch(`/admin/employees/${viewedEmployeeId}/verification-status`, {
        status: nextValue,
      });

      const mergedProfile = {
        ...(data?.user || {}),
        ...data,
        user: data?.user,
      };
      setViewedProfile(mergedProfile);
      setProfileVerification(
        getProfileVerificationStateFromBackend(nextValue, ""),
      );
      notifyEmployeeProfileUpdated();
      addToast(
        nextValue === "Verified"
          ? "Verification set to Verified."
          : "Verification set to Pending.",
        "success",
      );
    } catch (error) {
      addToast(
        error?.response?.data?.detail || "Unable to update verification status.",
        "error",
      );
    } finally {
      setIsUpdatingVerification(false);
    }
  };

  const handleSendMessage = async () => {
    const targetId = viewedEmployeeId || user?.id;
    const message = sendMessageText.trim();
    if (!targetId) {
      addToast("Employee not found.", "error");
      return;
    }
    if (!message) {
      addToast("Please enter a message before sending.", "error");
      return;
    }

    try {
      await api.post(`/admin/employees/${targetId}/send-message`, {
        message,
      });
      setSendMessageModalOpen(false);
      setSendMessageText("");
      addToast("Message sent to employee.", "success");
    } catch (error) {
      addToast(
        error?.response?.data?.detail || "Unable to send message to employee.",
        "error",
      );
    }
  };

  if (loading || (isReadOnlyView && viewedProfileLoading)) {
    return (
      <div className="flex min-h-[20rem] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading profile...
        </div>
      </div>
    );
  }
  if (isReadOnlyView && viewedProfileError && !viewedProfile) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
        Employee not found.
      </div>
    );
  }
  if (!user && !loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
        Unable to load profile.
      </div>
    );
  }

  return (
    // FIX: Outer container's padding is not responsive, making it too narrow on mobile.
    // Making it responsive.
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-10 space-y-5 overflow-x-hidden">
      <div className="flex flex-col lg:flex-row items-start gap-6">
        <div className="flex-1 min-w-0 space-y-6 w-full">
          <PageHeader
            title={isReadOnlyView ? "Employee Profile" : "My Profile"}
            subtitle={
              isReadOnlyView
                ? "View and verify employee profile information."
                : "A clean view of your account and profile details"
            }
          />

          <ContentContainer className="overflow-hidden">
            <div className="flex flex-col items-center justify-between gap-4 text-center lg:flex-row lg:items-start lg:text-left">
              <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-start lg:text-left">
                <div className="relative flex justify-center">
                  <button
                    type="button"
                    onClick={() => !isReadOnlyView && setPhotoModalOpen(true)}
                    className={`block overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-lg ${
                      isReadOnlyView ? "cursor-default" : ""
                    }`}
                  >
                    {profilePhotoUrl ? (
                      <img
                        src={profilePhotoUrl}
                        alt="Profile"
                        className="h-[120px] w-[90px] object-cover object-center"
                      />
                    ) : (
                      <div className="flex h-[120px] w-[90px] items-center justify-center bg-cyan-600 text-2xl font-semibold text-white">
                        {(formData.full_name || user?.full_name || "CU")
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                    )}
                  </button>
                </div>
                <div className="flex flex-col items-center gap-2 lg:items-start">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {formData.full_name || user?.full_name || "Employee User"}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-slate-500 lg:justify-start">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                      {formData.role || user?.role || "Not provided"}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span>
                      Emp ID:{" "}
                      <span className="font-semibold text-slate-700">
                        {candidateInfo?.candidateId ||
                          resolveEmployeeDisplayId(user) ||
                          "Not available"}
                      </span>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span>
                      DOB:{" "}
                      <span className="font-semibold text-slate-700">
                        {formData.date_of_birth
                          ? dvDate(formData.date_of_birth)
                          : "Not provided"}
                      </span>
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Employee Status
                    </p>
                    <div className="mt-2 flex items-center justify-center lg:justify-start gap-3">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${employeeActiveStatus ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
                      >
                        <span>{employeeActiveStatus ? "🟢" : "🔴"}</span>
                        <span>
                          {employeeActiveStatus ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {isReadOnlyView && (
                        <button
                          type="button"
                          disabled={isTogglingStatus}
                          onClick={handleToggleActiveStatus}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                            employeeActiveStatus
                              ? "bg-emerald-500"
                              : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              employeeActiveStatus
                                ? "translate-x-5"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {isReadOnlyView && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Verification Status
                      </p>
                      <div className="mt-2 flex items-center justify-center lg:justify-start gap-3">
                        <div
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${verificationToggleValue === "Verified" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                        >
                          <span>{verificationToggleValue === "Verified" ? "🟢" : "⚪"}</span>
                          <span>{verificationToggleValue === "Verified" ? "Verified" : "Pending"}</span>
                        </div>

                        <button
                          type="button"
                          disabled={isUpdatingVerification}
                          onClick={handleToggleVerificationStatus}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                            verificationToggleValue === "Verified"
                              ? "bg-emerald-500"
                              : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              verificationToggleValue === "Verified"
                                ? "translate-x-5"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}

                  {hasPreviousProfileSnapshot && isReadOnlyView && (
                    <div className="mt-2 flex items-center justify-center lg:justify-start gap-4">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Profile Version
                      </span>
                      <button
                        type="button"
                        disabled={isRevertingProfile}
                        onClick={() => setProfileChangesConfirmOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Manage Versions
                      </button>
                      <span
                        className={`text-xs font-bold ${
                          profileChangesShowingCurrent
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        {isRevertingProfile
                          ? "Updating..."
                          : profileChangesShowingCurrent
                            ? "Current Changes"
                            : "Previous Changes"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex w-full flex-col items-center gap-3 lg:w-auto lg:items-end">
                {isReadOnlyView ? (
                  <div className="flex w-full flex-wrap items-center justify-center gap-2 lg:w-auto lg:justify-end">
                    <button
                      type="button"
                      onClick={() => setHistoryModalOpen(true)}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 lg:w-auto"
                    >
                      <RotateCcw className="h-4 w-4" /> History
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendMessageModalOpen(true)}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 lg:w-auto"
                    >
                      <MessageSquareText className="h-4 w-4" /> Send Message
                    </button>
                    {showVerificationAction ? (
                      <button
                        type="button"
                        onClick={() => setVerificationModalOpen(true)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 lg:w-auto"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {verificationActionLabel}
                      </button>
                    ) : isReviewMode && pendingProfileUpdateItems.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setReviewModalOpen(true)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 lg:w-auto shadow-sm shadow-amber-500/20"
                      >
                        <Eye className="h-4 w-4" /> Review Changes
                      </button>
                    ) : (
                      <div className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                        <Check className="h-4 w-4" /> Verified
                      </div>
                    )}
                  </div>
                ) : (
                  !isFirstTime && (
                    <div className="flex w-full flex-wrap items-center justify-center gap-2 lg:w-auto lg:justify-end">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={isSaving}
                            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Edit2 className="h-4 w-4" />
                            )}
                            {isSaving ? "Saving..." : "Save Changes"}
                          </button>
                          <button
                            type="button"
                            onClick={handleEditToggle}
                            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 lg:w-auto"
                          >
                            <X className="h-4 w-4" /> Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleEditToggle}
                          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 lg:w-auto"
                        >
                          <Edit2 className="h-4 w-4" /> Edit Profile
                        </button>
                      )}
                    </div>
                  )
                )}
                <div className="text-center lg:text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Last Updated
                  </p>
                  <p className="text-xs font-semibold text-slate-700">
                    {profileLastUpdatedValue}
                  </p>
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                      Profile Status
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        profileVerification.label === "Verified"
                          ? "text-emerald-600"
                          : profileVerification.label === "Pending Review" ||
                              profileVerification.label ===
                                "Pending Verification" ||
                              profileVerification.label === "Pending"
                            ? "text-amber-600"
                            : "text-rose-600"
                      }`}
                    >
                      {profileVerification.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {profileVerification.message}
                    </p>
                    {profileVerification.label !== "Pending Review" &&
                      profileVerification.label !== "Pending Verification" &&
                      profileVerification.label !== "Pending" && (
                        <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
                          Updated:{" "}
                          {formatDateTimeIST(
                            profileSource?.verification_updated_at ||
                              profileSource?.updated_at ||
                              profileSource?.created_at,
                          )}
                        </p>
                      )}
                  </div>
                </div>
                {isEditing && hasUnsavedChanges && (
                  <p className="text-xs font-medium text-amber-600">
                    Unsaved changes
                  </p>
                )}
                {saveMessage && (
                  <p
                    className={`text-xs font-medium ${
                      isSaving ? "text-cyan-600" : "text-emerald-600"
                    }`}
                  >
                    {isSaving ? "Saving your profile…" : saveMessage}
                  </p>
                )}
              </div>
            </div>
          </ContentContainer>

          <input
            ref={aadhaarInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleDocumentUpload("aadhaar", e)}
          />
          <input
            ref={panInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleDocumentUpload("pan", e)}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              icon={<ShieldCheck size={18} />}
              title="Identity Verification"
            >
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={labelCls}>Aadhaar Card Number</p>
                      {showEditMode ? (
                        <div className="relative">
                          <input
                            id="field-aadhaar_number"
                            type={showAadhaar ? "text" : "password"}
                            value={formData.aadhaar_number}
                            onChange={(e) =>
                              handleFieldChange(
                                "aadhaar_number",
                                e.target.value.replace(/\D/g, "").slice(0, 12),
                              )
                            }
                            inputMode="numeric"
                            className={`${getInputCls("aadhaar_number")} pr-10`}
                            placeholder="12-digit Aadhaar number"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAadhaar(!showAadhaar)}
                            className="absolute right-3 top-[12px] text-slate-400 hover:text-slate-600"
                          >
                            {showAadhaar ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                          {errors.aadhaar_number && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {errors.aadhaar_number}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1.5 text-sm font-medium text-slate-900">
                          {maskAadhaar(
                            formData.aadhaar_number ||
                              profileSource?.aadhaar_number,
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-2 sm:pt-0">
                      {!hasAadhaarDoc ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                          Not Uploaded
                        </span>
                      ) : pendingChanges.aadhaar_document_path ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                          Pending Approval
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          ✓ Uploaded
                        </span>
                      )}

                      {showEditMode ? (
                        <>
                          {hasAadhaarDoc && (
                            <button
                              type="button"
                              onClick={() =>
                                openDocPreview(
                                  effectiveAadhaarPath,
                                  "Aadhaar Card",
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-cyan-700 hover:bg-slate-50 transition"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => aadhaarInputRef.current?.click()}
                            disabled={isUploadingAadhaar}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                          >
                            {isUploadingAadhaar ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}{" "}
                            {hasAadhaarDoc ? "Replace" : "Upload"}
                          </button>
                        </>
                      ) : (
                        hasAadhaarDoc && (
                          <button
                            type="button"
                            onClick={() =>
                              openDocPreview(
                                effectiveAadhaarPath,
                                "Aadhaar Card",
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-cyan-700 hover:bg-slate-50 transition"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={labelCls}>PAN Card Number</p>
                      {showEditMode ? (
                        <div className="relative">
                          <input
                            id="field-pan_number"
                            type={showPan ? "text" : "password"}
                            value={formData.pan_number}
                            onChange={(e) =>
                              handleFieldChange(
                                "pan_number",
                                e.target.value.toUpperCase().slice(0, 10),
                              )
                            }
                            className={`${getInputCls("pan_number")} pr-10`}
                            placeholder="ABCDE1234F"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPan(!showPan)}
                            className="absolute right-3 top-[12px] text-slate-400 hover:text-slate-600"
                          >
                            {showPan ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          {errors.pan_number && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              {errors.pan_number}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1.5 text-sm font-medium text-slate-900">
                          {maskPan(
                            formData.pan_number || profileSource?.pan_number,
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-2 sm:pt-0">
                      {!hasPanDoc ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                          Not Uploaded
                        </span>
                      ) : pendingChanges.pan_document_path ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                          Pending Approval
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          ✓ Uploaded
                        </span>
                      )}

                      {showEditMode ? (
                        <>
                          {hasPanDoc && (
                            <button
                              type="button"
                              onClick={() =>
                                openDocPreview(effectivePanPath, "PAN Card")
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-cyan-700 hover:bg-slate-50 transition"
                            >
                              <Eye className="h-3.5 w-3.5" /> View
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => panInputRef.current?.click()}
                            disabled={isUploadingPan}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                          >
                            {isUploadingPan ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}{" "}
                            {hasPanDoc ? "Replace" : "Upload"}
                          </button>
                        </>
                      ) : (
                        hasPanDoc && (
                          <button
                            type="button"
                            onClick={() =>
                              openDocPreview(effectivePanPath, "PAN Card")
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-cyan-700 hover:bg-slate-50 transition"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
                {errors.form && (
                  <p className="text-sm text-red-600">{errors.form}</p>
                )}
              </div>
            </SectionCard>

            <SectionCard
              className="w-full"
              icon={<UserRound size={18} />}
              title="Personal Information"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <FieldBox
                  label="Full Name"
                  reviewData={isReviewMode ? reviewDataFor("full_name") : null}
                >
                  {showEditMode ? (
                    <>
                      <input
                        id="field-full_name"
                        type="text"
                        value={formData.full_name || ""}
                        onChange={(e) =>
                          handleFieldChange("full_name", e.target.value)
                        }
                        className={getInputCls("full_name")}
                        placeholder="Full Name"
                      />
                      {errors.full_name && (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          {errors.full_name}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className={valueCls}>
                      {dv(formData.full_name || profileSource?.full_name)}
                    </p>
                  )}
                </FieldBox>
                <FieldBox label="Email Address">
                  <p className={`${valueCls} break-all`}>{dv(user?.email)}</p>
                </FieldBox>
                <FieldBox
                  label="Phone Number"
                  reviewData={isReviewMode ? reviewDataFor("phone") : null}
                >
                  {showEditMode ? (
                    <>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                          +91
                        </span>
                        <input
                          id="field-phone"
                          type="text"
                          value={formData.phone}
                          onChange={(e) =>
                            handleFieldChange(
                              "phone",
                              e.target.value.replace(/\D/g, "").slice(0, 10),
                            )
                          }
                          inputMode="numeric"
                          className={`${inputCls} mt-0 ${
                            errors.phone
                              ? "border-red-500 focus:border-red-500 focus:ring-red-100 ring-1 ring-red-500"
                              : ""
                          }`}
                          placeholder="10-digit mobile"
                        />
                      </div>
                      {errors.phone && (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          {errors.phone}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className={valueCls}>
                      {formData.phone
                        ? `+91 ${formData.phone}`
                        : "Not provided"}
                    </p>
                  )}
                </FieldBox>
                <FieldBox
                  label="Date of Birth"
                  reviewData={
                    isReviewMode ? reviewDataFor("date_of_birth") : null
                  }
                >
                  {showEditMode ? (
                    <>
                      <input
                        id="field-date_of_birth"
                        type="date"
                        value={
                          formData.date_of_birth
                            ? new Date(formData.date_of_birth)
                                .toISOString()
                                .slice(0, 10)
                            : ""
                        }
                        onChange={(e) =>
                          handleFieldChange("date_of_birth", e.target.value)
                        }
                        className={getInputCls("date_of_birth")}
                      />
                      {errors.date_of_birth && (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          {errors.date_of_birth}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className={valueCls}>
                      {dvDate(
                        formData.date_of_birth || profileSource?.date_of_birth,
                      )}
                    </p>
                  )}
                </FieldBox>
                <FieldBox
                  label="Gender"
                  reviewData={isReviewMode ? reviewDataFor("gender") : null}
                >
                  {showEditMode ? (
                    <input
                      type="text"
                      value={formData.gender}
                      onChange={(e) =>
                        handleFieldChange("gender", e.target.value)
                      }
                      className={inputCls}
                      placeholder="Male / Female / Other"
                    />
                  ) : (
                    <p className={valueCls}>
                      {dv(formData.gender || profileSource?.gender)}
                    </p>
                  )}
                </FieldBox>
                <FieldBox
                  label="Emergency Contact Number"
                  reviewData={
                    isReviewMode ? reviewDataFor("emergency_contact") : null
                  }
                >
                  {showEditMode ? (
                    <input
                      type="text"
                      value={formData.emergency_contact}
                      onChange={(e) =>
                        handleFieldChange(
                          "emergency_contact",
                          e.target.value.replace(/\D/g, "").slice(0, 10),
                        )
                      }
                      inputMode="numeric"
                      className={inputCls}
                      placeholder="10-digit number"
                    />
                  ) : (
                    <p className={valueCls}>
                      {dv(
                        formData.emergency_contact ||
                          profileSource?.emergency_contact,
                      )}
                    </p>
                  )}
                </FieldBox>
              </div>
            </SectionCard>

            <SectionCard
              className="w-full"
              icon={<BriefcaseBusiness size={18} />}
              title="Employee Information"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <FieldBox label="Employee ID">
                  <p className={valueCls}>
                    {candidateInfo?.candidateId ||
                      user?.employee_id ||
                      "Not available"}
                  </p>
                </FieldBox>
                <FieldBox
                  label="Role"
                  reviewData={isReviewMode ? reviewDataFor("role") : null}
                >
                  {showEditMode ? (
                    <input
                      type="text"
                      value={formData.role}
                      onChange={(e) =>
                        handleFieldChange("role", e.target.value)
                      }
                      className={inputCls}
                    />
                  ) : (
                    <p className={valueCls}>
                      {dv(formData.role || profileSource?.role)}
                    </p>
                  )}
                </FieldBox>
                <FieldBox label="Joined Date">
                  <p className={valueCls}>
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Recently joined"}
                  </p>
                </FieldBox>
                <FieldBox label="Last Updated">
                  <p className={valueCls}>
                    {profileLastUpdatedValue ||
                      candidateInfo?.lastUpdated ||
                      "Not available"}
                  </p>
                </FieldBox>
              </div>
            </SectionCard>

            <SectionCard
              className="w-full"
              icon={<MapPin size={18} />}
              title="Address Information"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-3">
                  <FieldBox
                    label="Current City & State"
                    reviewData={isReviewMode ? reviewDataFor("location") : null}
                  >
                    {showEditMode ? (
                      <>
                        <input
                          id="field-location"
                          type="text"
                          value={formData.location}
                          onChange={(e) =>
                            handleFieldChange("location", e.target.value)
                          }
                          className={getInputCls("location")}
                          placeholder="City, State"
                        />
                        {errors.location && (
                          <p className="mt-1 text-xs font-medium text-red-600">
                            {errors.location}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className={valueCls}>
                        {dv(formData.location || profileSource?.location)}
                      </p>
                    )}
                  </FieldBox>
                  <FieldBox
                    label="PIN Code"
                    reviewData={isReviewMode ? reviewDataFor("pin_code") : null}
                  >
                    {showEditMode ? (
                      <input
                        type="text"
                        value={formData.pin_code}
                        onChange={(e) =>
                          handleFieldChange(
                            "pin_code",
                            e.target.value.replace(/\D/g, "").slice(0, 6),
                          )
                        }
                        inputMode="numeric"
                        className={inputCls}
                        placeholder="PIN code"
                      />
                    ) : (
                      <p className={valueCls}>
                        {dv(
                          formData.pin_code ||
                            profileSource?.pin_code ||
                            profileSource?.pincode,
                        )}
                      </p>
                    )}
                  </FieldBox>
                </div>
                <FieldBox
                  label="Permanent Address"
                  reviewData={
                    isReviewMode ? reviewDataFor("permanent_address") : null
                  }
                >
                  {showEditMode ? (
                    <textarea
                      value={formData.permanent_address}
                      onChange={(e) =>
                        handleFieldChange("permanent_address", e.target.value)
                      }
                      className={`${inputCls} min-h-[80px] resize-none`}
                      rows="3"
                      placeholder="Full residential address"
                    />
                  ) : (
                    <p className={valueCls}>
                      {dv(
                        formData.permanent_address ||
                          profileSource?.permanent_address,
                      )}
                    </p>
                  )}
                </FieldBox>
              </div>
            </SectionCard>

            <SectionCard
              icon={<BadgeCheck size={18} />}
              title="Professional Information"
            >
              <div className="grid grid-cols-1 gap-3">
                <FieldBox
                  label="Expertise"
                  reviewData={isReviewMode ? reviewDataFor("skills") : null}
                >
                  {showEditMode ? (
                    <>
                      <input
                        id="field-skills"
                        type="text"
                        value={formData.skills}
                        onChange={(e) =>
                          handleFieldChange("skills", e.target.value)
                        }
                        className={getInputCls("skills")}
                        placeholder="Python, React, FastAPI"
                      />
                      {errors.skills && (
                        <p className="mt-1 text-xs font-medium text-red-600">
                          {errors.skills}
                        </p>
                      )}
                    </>
                  ) : skillTags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {skillTags.map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-800"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className={valueCls}>Not provided</p>
                  )}
                </FieldBox>
                <FieldBox
                  label="LinkedIn"
                  reviewData={isReviewMode ? reviewDataFor("linkedin") : null}
                >
                  {showEditMode ? (
                    <input
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) =>
                        handleFieldChange("linkedin", e.target.value)
                      }
                      className={inputCls}
                      placeholder="https://linkedin.com/in/username"
                    />
                  ) : (
                    <p className={`${valueCls} break-all`}>
                      {formData.linkedin || profileSource?.linkedin ? (
                        <a
                          href={formData.linkedin || profileSource?.linkedin}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-700 hover:underline break-all"
                        >
                          {dvLink(formData.linkedin || profileSource?.linkedin)}
                        </a>
                      ) : (
                        "Not Added"
                      )}
                    </p>
                  )}
                </FieldBox>
                <FieldBox
                  label="Resume"
                  reviewData={isReviewMode ? reviewDataFor("resume_url") : null}
                >
                  <div
                    id="field-resume"
                    className={`mt-2 flex flex-col gap-2 rounded-xl p-2 transition md:flex-row md:items-center md:justify-between ${
                      errors.resume ? "border border-red-500 bg-red-50/50" : ""
                    }`}
                  >
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-slate-900">
                        {hasResume
                          ? formData.resume_filename ||
                            pendingChanges.resume_filename ||
                            profileSource?.resume_filename ||
                            "Resume uploaded"
                          : "No Resume Uploaded"}
                      </p>
                      {pendingChanges.resume_url && (
                        <span className="mt-1 self-start inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                          Pending Approval
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hasResume ? (
                        <>
                          <button
                            type="button"
                            onClick={handleViewResume}
                            disabled={isLoadingResume}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            <Eye className="h-4 w-4" />{" "}
                            {isLoadingResume ? "Loading..." : "View Resume"}
                          </button>
                          {showEditMode && !isReadOnlyView && (
                            <button
                              type="button"
                              onClick={() => resumeInputRef.current?.click()}
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <Upload className="h-4 w-4" /> Replace Resume
                            </button>
                          )}
                        </>
                      ) : (
                        showEditMode &&
                        !isReadOnlyView && (
                          <button
                            type="button"
                            onClick={() => resumeInputRef.current?.click()}
                            disabled={isUploadingResume}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Upload className="h-4 w-4" />{" "}
                            {isUploadingResume
                              ? "Uploading..."
                              : "Upload Resume"}
                          </button>
                        )
                      )}
                      <input
                        ref={resumeInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeFile}
                      />
                    </div>
                  </div>
                  {errors.resume && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {errors.resume}
                    </p>
                  )}
                  {isUploadingResume && (
                    <p className="mt-2 text-sm text-cyan-700">
                      Uploading and parsing resume...
                    </p>
                  )}
                </FieldBox>
              </div>
            </SectionCard>

            <SectionCard
              icon={<GraduationCap size={18} />}
              title="Education Information"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.3fr_0.7fr]">
                  <FieldBox
                    label="Highest Qualification"
                    className="h-full"
                    reviewData={isReviewMode ? reviewDataFor("degree") : null}
                  >
                    {showEditMode ? (
                      <>
                        <input
                          id="field-degree"
                          type="text"
                          value={formData.degree}
                          onChange={(e) =>
                            handleFieldChange("degree", e.target.value)
                          }
                          className={getInputCls("degree")}
                          placeholder="e.g. B.Tech / B.E."
                        />
                        {errors.degree && (
                          <p className="mt-1 text-xs font-medium text-red-600">
                            {errors.degree}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className={valueCls}>
                        {dv(formData.degree || profileSource?.degree)}
                      </p>
                    )}
                  </FieldBox>

                  <FieldBox
                    label="College / University"
                    className="h-full"
                    reviewData={
                      isReviewMode ? reviewDataFor("university") : null
                    }
                  >
                    {showEditMode ? (
                      <>
                        <input
                          id="field-university"
                          type="text"
                          value={formData.university || formData.college || ""}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            handleFieldChange("university", nextValue);
                            handleFieldChange("college", nextValue);
                          }}
                          className={getInputCls("university")}
                          placeholder="University / College Name"
                          autoComplete="off"
                        />
                        {errors.university && (
                          <p className="mt-1 text-xs font-medium text-red-600">
                            {errors.university}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className={valueCls}>
                        {dv(
                          formData.university ||
                            profileSource?.university ||
                            formData.college ||
                            profileSource?.college,
                        )}
                      </p>
                    )}
                  </FieldBox>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <FieldBox
                    label="Branch / Field of Study"
                    className="h-full"
                    reviewData={isReviewMode ? reviewDataFor("branch") : null}
                  >
                    {showEditMode ? (
                      <input
                        type="text"
                        value={formData.branch}
                        onChange={(e) =>
                          handleFieldChange("branch", e.target.value)
                        }
                        className={inputCls}
                        placeholder="Computer Science"
                      />
                    ) : (
                      <p className={valueCls}>
                        {dv(formData.branch || profileSource?.branch)}
                      </p>
                    )}
                  </FieldBox>

                  <FieldBox
                    label="Graduation Year"
                    className="h-full"
                    reviewData={
                      isReviewMode ? reviewDataFor("graduation_year") : null
                    }
                  >
                    {showEditMode ? (
                      <>
                        <input
                          id="field-graduation_year"
                          type="text"
                          value={formData.graduation_year}
                          onChange={(e) =>
                            handleFieldChange("graduation_year", e.target.value)
                          }
                          className={getInputCls("graduation_year")}
                          placeholder="2024"
                        />
                        {errors.graduation_year && (
                          <p className="mt-1 text-xs font-medium text-red-600">
                            {errors.graduation_year}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className={valueCls}>
                        {dv(
                          formData.graduation_year ||
                            profileSource?.graduation_year,
                        )}
                      </p>
                    )}
                  </FieldBox>

                  <FieldBox
                    label="CGPA"
                    className="h-full"
                    reviewData={isReviewMode ? reviewDataFor("cgpa") : null}
                  >
                    {showEditMode ? (
                      <>
                        <input
                          id="field-cgpa"
                          type="text"
                          value={formData.cgpa}
                          onChange={(e) =>
                            handleFieldChange("cgpa", e.target.value)
                          }
                          className={getInputCls("cgpa")}
                          placeholder="8.60"
                          inputMode="decimal"
                        />
                        {formData.cgpa &&
                          !/^((?:[0-9]|10)(?:\.[0-9]{1,2})?|0(?:\.[0-9]{1,2})?)$/.test(
                            String(formData.cgpa),
                          ) && (
                            <p className="mt-1 text-xs font-medium text-red-600">
                              CGPA must be between 0.00 and 10.00 with up to 2
                              decimal places.
                            </p>
                          )}
                        {errors.cgpa && (
                          <p className="mt-1 text-xs font-medium text-red-600">
                            {errors.cgpa}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className={valueCls}>
                        {dv(formData.cgpa || profileSource?.cgpa)}
                      </p>
                    )}
                  </FieldBox>
                </div>

                <FieldBox
                  label="Degree / Marksheet"
                  reviewData={
                    isReviewMode
                      ? reviewDataFor("degree_certificate_url")
                      : null
                  }
                >
                  <div
                    id="field-degree-certificate"
                    className="mt-2 flex flex-col gap-2 rounded-xl p-2 transition md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-slate-900">
                        {hasDegreeCertificate
                          ? formData.degree_certificate_filename ||
                            pendingChanges.degree_certificate_filename ||
                            profileSource?.degree_certificate_filename ||
                            "degree_certificate.pdf"
                          : "No degree/marksheet uploaded"}
                      </p>
                      {pendingChanges.degree_certificate_url && (
                        <span className="mt-1 self-start inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                          Pending Approval
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hasDegreeCertificate ? (
                        <>
                          <button
                            type="button"
                            onClick={handleViewCertificate}
                            disabled={isLoadingCertificate}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            <Eye className="h-4 w-4" />{" "}
                            {isLoadingCertificate ? "Loading..." : "View"}
                          </button>
                          {showEditMode && !isReadOnlyView && (
                            <button
                              type="button"
                              onClick={() =>
                                certificateInputRef.current?.click()
                              }
                              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <Upload className="h-4 w-4" /> Replace
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={!showEditMode}
                          onClick={() =>
                            showEditMode && certificateInputRef.current?.click()
                          }
                          className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium transition ${
                            showEditMode
                              ? "text-slate-700 hover:bg-slate-50"
                              : "text-slate-400"
                          }`}
                        >
                          <Upload className="h-4 w-4" />{" "}
                          {showEditMode ? "Upload" : "No Degree/Marksheet"}
                        </button>
                      )}
                      {showEditMode && (
                        <input
                          ref={certificateInputRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleCertificateFile}
                        />
                      )}
                    </div>
                  </div>
                  {isUploadingCertificate && (
                    <p className="mt-2 text-sm text-cyan-700">
                      Uploading certificate...
                    </p>
                  )}
                </FieldBox>
              </div>
            </SectionCard>
          </div>

          {!isReadOnlyView && isFirstTime && (
            <div className="mt-10 w-full">
              <ContentContainer className="w-full">
                <div className="flex w-full flex-col items-center text-center">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Declaration & Profile Submission
                  </h3>

                  <div className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left text-sm text-slate-700 sm:p-6">
                    <p>
                      I hereby declare that the information provided above is
                      true, complete, and accurate to the best of my knowledge.
                    </p>

                    <p className="mt-2">
                      I understand that any false information may affect my
                      employment records and internal account access.
                    </p>

                    <div className="mt-5 space-y-3">
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={declarationAccepted}
                          onChange={(e) =>
                            setDeclarationAccepted(e.target.checked)
                          }
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span>
                          I certify that the information provided in this
                          profile is true, complete, and correct.
                        </span>
                      </label>

                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={privacyAccepted}
                          onChange={(e) => setPrivacyAccepted(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span>
                          I agree to the Silk Optima Privacy Policy and data
                          processing terms.
                        </span>
                      </label>
                    </div>

                    {errors.declaration && (
                      <p className="mt-4 text-sm text-red-600">
                        {errors.declaration}
                      </p>
                    )}

                    <div className="mt-6 flex flex-col items-center justify-center border-t border-slate-200 pt-6">
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        disabled={
                          isSaving || !declarationAccepted || !privacyAccepted
                        }
                        className="inline-flex min-h-[50px] w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                      >
                        {isSaving ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Edit2 className="h-5 w-5" />
                        )}
                        {isSaving ? "Saving Profile..." : "Save Profile"}
                      </button>

                      <div className="mt-3 text-center">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                          Last Updated
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                          {profileLastUpdatedValue}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ContentContainer>
            </div>
          )}

          {profileChangesConfirmOpen && (
            <Modal
              isOpen={profileChangesConfirmOpen}
              title="Manage Profile Version"
              description="Choose which approved version of the profile to display."
              onClose={() => setProfileChangesConfirmOpen(false)}
            >
              <div className="flex flex-col gap-3 mt-4">
                <button
                  disabled={isRevertingProfile}
                  onClick={async () => {
                    if (!viewedEmployeeId) return;
                    setIsRevertingProfile(true);
                    try {
                      await api.post(
                        `/admin/employees/${viewedEmployeeId}/revert-profile`,
                        { revert_to: "current" },
                      );
                      const { data: freshData } = await api.get(
                        `/employees/${viewedEmployeeId}`,
                      );
                      setViewedProfile({
                        ...(freshData?.user || {}),
                        ...freshData,
                        user: freshData?.user,
                      });
                      setProfileChangesShowingCurrent(true);
                      addToast(
                        "Profile restored to current approved data.",
                        "success",
                      );
                      setProfileChangesConfirmOpen(false);
                    } catch (err) {
                      addToast(
                        err?.response?.data?.detail ||
                          "Failed to switch profile.",
                        "error",
                      );
                    } finally {
                      setIsRevertingProfile(false);
                    }
                  }}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 text-left disabled:opacity-50 transition"
                >
                  Restore Newest (Current) Changes
                  <div className="text-xs font-normal text-emerald-600 mt-1">
                    Bring back the latest approved modifications.
                  </div>
                </button>

                <button
                  disabled={isRevertingProfile}
                  onClick={async () => {
                    if (!viewedEmployeeId) return;
                    setIsRevertingProfile(true);
                    try {
                      await api.post(
                        `/admin/employees/${viewedEmployeeId}/revert-profile`,
                        { revert_to: "previous" },
                      );
                      const { data: freshData } = await api.get(
                        `/employees/${viewedEmployeeId}`,
                      );
                      setViewedProfile({
                        ...(freshData?.user || {}),
                        ...freshData,
                        user: freshData?.user,
                      });
                      setProfileChangesShowingCurrent(false);
                      addToast(
                        "Profile reverted to previous approved data.",
                        "success",
                      );
                      setProfileChangesConfirmOpen(false);
                    } catch (err) {
                      addToast(
                        err?.response?.data?.detail ||
                          "Failed to switch profile.",
                        "error",
                      );
                    } finally {
                      setIsRevertingProfile(false);
                    }
                  }}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-100 text-left disabled:opacity-50 transition"
                >
                  Restore Previous Changes
                  <div className="text-xs font-normal text-amber-600 mt-1">
                    Revert to the profile state before the last changes.
                  </div>
                </button>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setProfileChangesConfirmOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </Modal>
          )}

          {isReadOnlyView && historyModalOpen && (
            <Modal
              isOpen={historyModalOpen}
              title="Profile Changes History"
              description="Viewing changes from the last 30 days."
              onClose={() => setHistoryModalOpen(false)}
              width="min(95vw, 900px)"
            >
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col max-h-[60vh]">
                <div className="hidden md:grid grid-cols-[1fr,1fr,0.2fr,1fr,1fr,1fr] items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0">
                  <div>Field Name</div>
                  <div>Old Value</div>
                  <div></div>
                  <div>New Value</div>
                  <div>Status</div>
                  <div>Date & Time (IST)</div>
                </div>
                <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                  {(() => {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    const historyItems = [];
                    employeeRequests.forEach((req) => {
                      const reqDate = new Date(
                        req.created_at || req.updated_at,
                      );
                      if (reqDate >= thirtyDaysAgo) {
                        if (Array.isArray(req.items)) {
                          req.items.forEach((item) =>
                            historyItems.push({
                              ...item,
                              created_at: req.created_at,
                              updated_at: req.updated_at,
                              status: item.status || req.status,
                            }),
                          );
                        } else if (
                          req.field_name &&
                          req.field_name !== "multiple_fields"
                        ) {
                          historyItems.push({ ...req });
                        }
                      }
                    });

                    historyItems.sort(
                      (a, b) => new Date(b.created_at) - new Date(a.created_at),
                    );

                    if (historyItems.length === 0) {
                      return (
                        <div className="p-8 text-center text-slate-500">
                          No changes in the last 30 days.
                        </div>
                      );
                    }

                    return historyItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col md:grid md:grid-cols-[1fr,1fr,0.2fr,1fr,1fr,1fr] gap-4 items-center px-5 py-4 hover:bg-slate-50/50 transition"
                      >
                        <div className="w-full md:w-auto font-semibold text-slate-700 md:text-sm">
                          {getPendingFieldLabel(item.field_name)}
                        </div>
                        <div className="w-full md:w-auto text-slate-500 text-sm break-all">
                          {item.old_value || "—"}
                        </div>
                        <div className="hidden md:flex text-slate-300 font-bold">
                          →
                        </div>
                        <div className="w-full md:w-auto font-medium text-cyan-700 text-sm break-all">
                          {item.new_value || "—"}
                        </div>
                        <div className="w-full md:w-auto">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${getRequestStatusClasses(item.status)} border`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="w-full md:w-auto text-xs text-slate-500">
                          {formatDateTimeIST(
                            item.updated_at || item.created_at,
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close History
                </button>
              </div>
            </Modal>
          )}

          <Modal
            isOpen={reviewModalOpen}
            title="Pending Profile Changes"
            description="Review requested field changes and select decisions."
            onClose={() => setReviewModalOpen(false)}
            width="min(95vw, 900px)"
            footer={
              <div className="flex w-full items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isProcessingReview}
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessingReview}
                  onClick={handleSaveChanges}
                  className="rounded-xl bg-emerald-600 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 shadow-sm"
                >
                  {isProcessingReview ? "Saving..." : "Save Changes"}
                </button>
              </div>
            }
          >
            <div
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col"
              style={{ maxHeight: "60vh" }}
            >
              <div className="hidden md:grid grid-cols-[1.2fr,1fr,0.2fr,1fr,1.3fr] items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0">
                <div>Field Name</div>
                <div>Old Value</div>
                <div className="text-center"></div>
                <div>New Value</div>
                <div className="text-center w-full">Decision</div>
              </div>
              <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                {pendingProfileUpdateItems.map((item) => {
                  const decision = fieldDecisions[item.field_name];
                  return (
                    <div
                      key={item.field_name}
                      className="flex flex-col md:grid md:grid-cols-[1.2fr,1fr,0.2fr,1fr,1.3fr] gap-4 items-center px-5 py-4 hover:bg-slate-50/50 transition"
                    >
                      <div className="w-full md:w-auto font-semibold text-slate-700 md:text-sm text-center md:text-left">
                        {getPendingFieldLabel(item.field_name)}
                      </div>
                      <div className="w-full md:w-auto text-slate-500 text-sm break-all text-center md:text-left bg-slate-50 md:bg-transparent rounded-lg p-2 md:p-0">
                        {item.old_value || (
                          <span className="text-slate-300">—</span>
                        )}
                      </div>
                      <div className="hidden md:flex text-slate-300 items-center justify-center font-bold">
                        →
                      </div>
                      <div className="md:hidden text-slate-300 flex items-center justify-center w-full font-bold">
                        ↓
                      </div>
                      <div className="w-full md:w-auto font-medium text-cyan-700 text-sm break-all text-center md:text-left bg-cyan-50/30 md:bg-transparent rounded-lg p-2 md:p-0">
                        {item.new_value || (
                          <span className="text-slate-300">—</span>
                        )}
                      </div>
                      <div className="w-full flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleSetFieldDecision(item.field_name, "yes")
                          }
                          className={`flex-1 min-w-[70px] inline-flex items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-semibold transition border ${
                            decision === "yes"
                              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                          }`}
                        >
                          <Check className="h-3 w-3" /> Yes
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSetFieldDecision(item.field_name, "no")
                          }
                          className={`flex-1 min-w-[70px] inline-flex items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-semibold transition border ${
                            decision === "no"
                              ? "border-rose-600 bg-rose-600 text-white shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                          }`}
                        >
                          <X className="h-3 w-3" /> No
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={sendMessageModalOpen}
            title="Send Message to Employee"
            description="Write a brief note that will appear in the employee notification panel."
            onClose={() => {
              setSendMessageModalOpen(false);
              setSendMessageText("");
            }}
            width="min(95vw, 520px)"
          >
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Message
                </label>
                <textarea
                  value={sendMessageText}
                  onChange={(e) => setSendMessageText(e.target.value)}
                  rows={5}
                  placeholder="Type your message here..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSendMessageModalOpen(false);
                    setSendMessageText("");
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!sendMessageText.trim()}
                  onClick={handleSendMessage}
                  className="rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={verificationModalOpen}
            title="Verification Decision"
            description="Review all information and uploaded documents before making a decision."
            onClose={handleCancelVerification}
            width="min(95vw, 680px)"
          >
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setVerificationDecision("verify")}
                  className={`w-full rounded-3xl border p-4 text-left transition ${
                    verificationDecision === "verify"
                      ? "border-emerald-200 bg-emerald-50/80 shadow-sm"
                      : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${verificationDecision === "verify" ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700"}`}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Verify Profile
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        All information is correct and valid.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVerificationDecision("reject")}
                  className={`w-full rounded-3xl border p-4 text-left transition ${
                    verificationDecision === "reject"
                      ? "border-rose-200 bg-rose-50/80 shadow-sm"
                      : "border-slate-200 bg-white hover:border-rose-200 hover:bg-rose-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${verificationDecision === "reject" ? "bg-rose-600 text-white" : "bg-rose-100 text-rose-700"}`}
                    >
                      <X className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Reject Profile
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Information is incorrect or incomplete.
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Comments (Optional)
                </label>
                <textarea
                  value={verificationComment}
                  onChange={(e) => setVerificationComment(e.target.value)}
                  rows={4}
                  placeholder="Add comments..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                ></textarea>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancelVerification}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={verificationDecision !== "reject" || isRejecting}
                  onClick={handleRejectProfileDecision}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRejecting ? "Rejecting..." : "Reject"}
                </button>
                <button
                  type="button"
                  disabled={verificationDecision !== "verify" || isVerifying}
                  onClick={handleVerifyProfileDecision}
                  className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifying ? "Verifying..." : "Verify"}
                </button>
              </div>
            </div>
          </Modal>

          <ConfirmationDialog
            isOpen={resumeChoiceOpen}
            title="Resume Detected"
            message="Would you like to automatically fill your profile information using the uploaded resume?"
            confirmLabel="Yes, Autofill"
            cancelLabel="No, I'll Fill Manually"
            onConfirm={() => handleResumeChoice(true)}
            onClose={() => {
              setResumeChoiceOpen(false);
              setPendingResumeFile(null);
              setResumePreviewData(null);
            }}
          />

          <ConfirmationDialog
            isOpen={resumePreviewData !== null && resumePreviewData.length > 0}
            title="Resume Fields Detected"
            message={
              resumePreviewData
                ? resumePreviewData.map((item) => `✓ ${item.label}`).join("\n")
                : ""
            }
            confirmLabel="Apply Fields"
            cancelLabel="Cancel"
            onConfirm={() => {
              const nextForm = { ...formData };
              let applied = 0;
              resumePreviewData.forEach((item) => {
                const currentValue = String(
                  formData[item.key] || user?.[item.key] || "",
                ).trim();
                if (currentValue) return;
                nextForm[item.key] = item.value;
                applied += 1;
              });
              setFormData(nextForm);
              setResumePreviewData(null);
              setResumeSummaryData({
                imported: resumePreviewData.map((item) => item.label),
                skipped: [],
              });
              setResumeSummaryOpen(true);
              addToast(
                `${applied} field${applied === 1 ? "" : "s"} applied from resume.`,
                "success",
              );
            }}
            onClose={() => {
              setResumePreviewData(null);
            }}
          />

          <ConfirmationDialog
            isOpen={resumeSummaryOpen}
            title="Imported Successfully"
            message={
              resumeSummaryData
                ? [
                    ...resumeSummaryData.imported.map((label) => `✓ ${label}`),
                    "",
                    resumeSummaryData.skipped.length > 0
                      ? `Skipped:\n${resumeSummaryData.skipped
                          .map((item) => `${item} (already filled)`)
                          .join("\n")}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join("\n")
                : ""
            }
            confirmLabel="Apply Changes"
            cancelLabel="Cancel"
            onConfirm={() => setResumeSummaryOpen(false)}
            onClose={() => setResumeSummaryOpen(false)}
          />

          <ConfirmationDialog
            isOpen={leavePromptOpen}
            title="You have unsaved changes."
            message="Leave without saving?"
            confirmLabel="Leave"
            cancelLabel="Stay"
            onConfirm={() => {
              const action = pendingLeaveActionRef.current;
              pendingLeaveActionRef.current = null;
              setLeavePromptOpen(false);
              if (typeof action === "function") action();
            }}
            onClose={() => {
              pendingLeaveActionRef.current = null;
              setLeavePromptOpen(false);
            }}
          />

          <ConfirmationDialog
            isOpen={deletePhotoConfirmOpen}
            title="Delete Profile Photo?"
            message="Are you sure you want to remove your profile photo?"
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onConfirm={handleDeletePhoto}
            onClose={() => setDeletePhotoConfirmOpen(false)}
          />

          {photoModalOpen && (
            <>
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-[3px] px-4"
                onClick={handleClosePhotoModal}
              >
                <div
                  id="photo-cropper-modal"
                  className="relative flex flex-col bg-white overflow-hidden w-full max-w-[960px] max-h-[90vh] rounded-xl shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex-shrink-0 flex items-center justify-between px-7 pt-5 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-[17px] font-bold text-slate-900 leading-tight">
                        Profile Photo
                      </h3>
                      <p className="mt-0.5 text-[13px] text-slate-500 leading-snug">
                        Position your face inside the square. Your final photo
                        will be cropped as a passport/profile picture.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClosePhotoModal}
                      aria-label="Close"
                      className="ml-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-1 min-h-0 overflow-hidden">
                    <div
                      className="flex flex-1 min-w-0 items-center justify-center"
                      style={{ background: "#F3F4F6" }}
                    >
                      {showCropper && cropImageSrc ? (
                        <div
                          ref={cropperContainerRef}
                          className="relative overflow-hidden"
                          style={{
                            width: 'min(78vw,350px)',
                            height: 'min(78vw,350px)',
                            borderRadius: 8,
                            border: '2px solid #CBD5E1',
                            boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
                            background: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          <Cropper
                            image={cropImageSrc}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={passportPhotoAspect}
                            cropSize={{ width: 340, height: 340 }}
                            cropShape="rect"
                            showGrid={true}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onRotationChange={setRotation}
                            onCropComplete={onCropComplete}
                            objectFit="contain"
                            minZoom={0.5}
                            maxZoom={4}
                            style={{
                              containerStyle: { borderRadius: 6 },
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-4">
                          <div
                            style={{
                              width: 'min(60vw,200px)',
                              height: 'min(60vw,200px)',
                              borderRadius: 8,
                              overflow: 'hidden',
                              border: '2px dashed #94A3B8',
                              background: '#fff',
                            }}
                            className="flex items-center justify-center"
                          >
                            {profilePhotoUrl ? (
                              <img
                                src={profilePhotoUrl}
                                alt="Current profile"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-slate-400">
                                <Camera className="h-10 w-10" />
                                <span className="text-sm">No photo yet</span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            disabled={isUploadingPhoto}
                            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-60"
                          >
                            <Upload className="h-4 w-4" />
                            {profilePhotoUrl ? "Change Photo" : "Upload Photo"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="w-full md:w-60 md:flex-shrink-0 flex flex-col justify-between border-l border-slate-100 bg-white p-5">
                      <div className="space-y-5">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">
                            Preview
                          </p>
                          <div className="flex items-center gap-3">
                            <div
                              style={{
                                width: 80,
                                height: 80,
                                borderRadius: 8,
                                overflow: "hidden",
                                border: "1.5px solid #E2E8F0",
                                background: "#F8FAFC",
                                flexShrink: 0,
                              }}
                              className="flex items-center justify-center"
                            >
                              {cropPreviewUrl ? (
                                <img
                                  src={cropPreviewUrl}
                                  alt="Preview"
                                  className="h-full w-full object-cover"
                                />
                              ) : profilePhotoUrl ? (
                                <img
                                  src={profilePhotoUrl}
                                  alt="Current"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full w-full text-slate-300">
                                  <Camera className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-[12px] font-semibold text-slate-700">
                                Profile
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Square crop
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Zoom
                            </p>
                            <ZoomIn className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                          <input
                            type="range"
                            min={0.5}
                            max={4}
                            step={0.01}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            disabled={!showCropper || !cropImageSrc}
                            className="w-full accent-cyan-600 disabled:opacity-40"
                            aria-label="Zoom"
                            style={{ height: 4 }}
                          />
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>0.5×</span>
                            <span>4×</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-2">
                            Rotate
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              id="rotate-left-btn"
                              disabled={!showCropper || !cropImageSrc}
                              onClick={() =>
                                setRotation((r) => (r - 90 + 360) % 360)
                              }
                              className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
                              title="Rotate left 90°"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              Left
                            </button>
                            <button
                              type="button"
                              id="rotate-right-btn"
                              disabled={!showCropper || !cropImageSrc}
                              onClick={() => setRotation((r) => (r + 90) % 360)}
                              className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
                              title="Rotate right 90°"
                            >
                              <RotateCw className="h-3.5 w-3.5" />
                              Right
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <button
                            type="button"
                            id="change-photo-btn"
                            onClick={() => photoInputRef.current?.click()}
                            disabled={isUploadingPhoto || isDeletingPhoto}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {profilePhotoUrl ? "Change Photo" : "Upload Photo"}
                          </button>
                          {profilePhotoUrl && (
                            <button
                              type="button"
                              id="delete-photo-btn"
                              onClick={() => setDeletePhotoConfirmOpen(true)}
                              disabled={isUploadingPhoto || isDeletingPhoto}
                              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                            >
                              {isDeletingPhoto ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
                              ) : (
                                <X className="h-3.5 w-3.5 text-red-500" />
                              )}
                              Delete Photo
                            </button>
                          )}
                          <button
                            type="button"
                            id="reset-crop-btn"
                            disabled={!showCropper || !cropImageSrc}
                            onClick={() => {
                              setCrop({ x: 0, y: 0 });
                              setZoom(1);
                              setRotation(0);
                            }}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Reset
                          </button>
                        </div>

                        {photoError && (
                          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                            {photoError}
                          </div>
                        )}
                      </div>

                      {showCropper && cropImageSrc && (
                        <p className="text-[11px] text-slate-400 text-center leading-relaxed mt-3">
                          Drag to reposition · Pinch or scroll to zoom
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center justify-between px-7 py-4 border-t border-slate-100 bg-white">
                    <button
                      type="button"
                      id="cancel-photo-btn"
                      onClick={handleClosePhotoModal}
                      disabled={isUploadingPhoto}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      id="save-photo-btn"
                      onClick={handleSavePhoto}
                      disabled={
                        !showCropper ||
                        !cropImageSrc ||
                        !croppedAreaPixels ||
                        isUploadingPhoto
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                        </>
                      ) : (
                        <>Save Photo</>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoSelection}
              />
            </>
          )}

          {docPreviewOpen && (
            <Modal
              isOpen={docPreviewOpen}
              title={`Preview: ${docPreviewData.title}`}
              description="View uploaded document."
              onClose={() => setDocPreviewOpen(false)}
              width="min(95vw, 800px)"
            >
              <div className="mt-4 flex h-[65vh] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-2 relative">
                {docPreviewData.type === "pdf" ? (
                  <iframe
                    src={docPreviewData.url}
                    className="h-full w-full rounded-lg bg-white"
                    title={docPreviewData.title}
                  />
                ) : (
                  <img
                    src={docPreviewData.url}
                    alt={docPreviewData.title}
                    className="h-full w-full object-contain rounded-lg"
                  />
                )}
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDocPreviewOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Close Preview
                </button>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
