import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiUserPlus,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
  FiXCircle,
  FiCheck,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import {
  registerUser,
  sendRegisterOtp,
  verifyRegisterOtp,
} from "../services/auth";
import { useToast } from "../components/common/ToastProvider";
import Modal from "../components/common/Modal"; // Login file wala same Modal import

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP & Verification States
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");
  const email = watch("email");
  const phone = watch("phone");

  const passwordChecks = useMemo(() => {
    const value = password || "";
    return {
      minLength: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
    };
  }, [password]);

  const passwordValid = Object.values(passwordChecks).every(Boolean);
  const phoneValid = /^\d{10}$/.test(phone || "");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
  const registerDisabled =
    !watch("name") ||
    !isEmailVerified ||
    !phoneValid ||
    !passwordValid ||
    password !== confirmPassword;

  // STEP 1: OTP Send Karna (Email ke bagal wale button se)
  const handleSendOtp = async () => {
    const isEmailValid = await trigger("email");
    if (!isEmailValid) return;

    setIsSubmitting(true);
    try {
      await sendRegisterOtp({ email: getValues("email").toLowerCase() });
      addToast("Verification code sent to your email", "success");
      setOtpCode(""); // Naya OTP bheja toh purana clear kar do
      setShowOtpModal(true); // Modal kholo
    } catch (error) {
      addToast(error?.response?.data?.detail || "Failed to send OTP", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2: Modal ke andar OTP Verify karna
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      addToast("Please enter a valid 6-digit code", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyRegisterOtp({
        email: getValues("email").toLowerCase(),
        otp: otpCode,
      });
      addToast("Email verified successfully!", "success");
      setIsEmailVerified(true); // Yahan se neeche ke fields unlock honge
      setShowOtpModal(false); // Modal band karo
    } catch (error) {
      addToast(
        error?.response?.data?.detail || "Invalid or expired OTP",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 3: Final Account Creation
  const onSubmit = async (data) => {
    if (!isEmailVerified) {
      addToast("Please verify your email first", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await registerUser({
        email: data.email.toLowerCase(),
        full_name: data.name,
        password: data.password,
        phone: data.phone,
        role: "candidate",
      });
      login({ accessToken: response.access_token, user: response.user });
      addToast("Account created successfully", "success");
      navigate("/profile");
    } catch (error) {
      addToast(
        error?.response?.data?.detail || "Unable to create your account",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl lg:flex-row">
        {/* Left Side (Branding) */}
        <div className="flex flex-1 flex-col justify-center bg-gradient-to-br from-cyan-900 via-slate-800 to-slate-700 p-8 sm:p-12 lg:p-16">
          <div className="max-w-md">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">
              Join Silk Optima
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
              Create your employee profile
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              Access your employee portal with a polished, secure profile
              experience.
            </p>
          </div>
        </div>

        {/* Right Side (Form Area) */}
        <div className="flex flex-1 flex-col justify-center bg-white p-8 text-slate-800 sm:p-12 lg:p-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-3xl font-semibold text-slate-900">
                Register
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Set up your profile in a few simple steps.
              </p>
            </div>

            <form
              className="space-y-4"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              {/* 1. Name Field (Always Enabled) */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-200">
                  <FiUser className="mr-3 text-slate-400" />
                  <input
                    className="w-full bg-transparent outline-none"
                    placeholder="Alex Morgan"
                    {...register("name", { required: "Name is required" })}
                  />
                </div>
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* 2. Email Field with Inline "Send OTP" Button */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div
                  className={`flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1.5 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-200 ${isEmailVerified ? "bg-emerald-50/50 border-emerald-200" : ""}`}
                >
                  <div className="flex flex-1 items-center px-2">
                    <FiMail
                      className={`mr-3 ${isEmailVerified ? "text-emerald-500" : "text-slate-400"}`}
                    />
                    <input
                      type="email"
                      className="w-full bg-transparent outline-none disabled:text-slate-500"
                      placeholder="alex@example.com"
                      disabled={isEmailVerified} // Ek baar verify ho gaya toh edit mat karne do
                      {...register("email", {
                        required: "Email is required",
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Enter a valid email address",
                        },
                      })}
                    />
                  </div>
                  {/* Button Inside the Email box */}
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={!emailValid || isSubmitting || isEmailVerified}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all ${
                      isEmailVerified
                        ? "bg-emerald-500 cursor-default"
                        : "bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    }`}
                  >
                    {isSubmitting ? (
                      "Sending..."
                    ) : isEmailVerified ? (
                      <span className="flex items-center gap-1">
                        <FiCheck /> Verified
                      </span>
                    ) : (
                      "Verify"
                    )}
                  </button>
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* --- DISABLED SECTIONS BEFORE VERIFICATION --- */}

              {/* 3. Phone Field (Disabled if email not verified) */}
              <div
                className={
                  !isEmailVerified
                    ? "opacity-50 grayscale select-none pointer-events-none transition-all"
                    : "transition-all"
                }
              >
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-200">
                  <span className="mr-2 text-sm font-medium text-slate-600">
                    +91
                  </span>
                  <FiPhone className="mr-3 text-slate-400" />
                  <input
                    className="w-full bg-transparent outline-none"
                    placeholder="9876543210"
                    inputMode="numeric"
                    maxLength={10}
                    disabled={!isEmailVerified}
                    {...register("phone", {
                      required: "Phone number is required",
                      validate: (value) =>
                        /^\d{10}$/.test(value || "") ||
                        "Please enter a valid 10-digit mobile number.",
                    })}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* 4. Password Field (Disabled if email not verified) */}
              <div
                className={
                  !isEmailVerified
                    ? "opacity-50 grayscale select-none pointer-events-none transition-all"
                    : "transition-all"
                }
              >
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-200">
                  <FiLock className="mr-3 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-transparent outline-none"
                    placeholder="••••••••"
                    disabled={!isEmailVerified}
                    {...register("password", {
                      required: "Password is required",
                      validate: (value) => {
                        if (!value) return "Password is required";
                        return (
                          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(
                            value,
                          ) || "Password must meet policy"
                        );
                      },
                    })}
                  />
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={!isEmailVerified}
                    className="ml-2 text-slate-500"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>

                {isEmailVerified && (
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    {[
                      ["Minimum 8 characters", passwordChecks.minLength],
                      ["One uppercase letter", passwordChecks.uppercase],
                      ["One lowercase letter", passwordChecks.lowercase],
                      ["One number", passwordChecks.number],
                      ["One special character", passwordChecks.special],
                    ].map(([label, isValid]) => (
                      <div key={label} className="flex items-center gap-2">
                        {isValid ? (
                          <FiCheckCircle className="text-emerald-600" />
                        ) : (
                          <FiXCircle className="text-slate-400" />
                        )}
                        <span
                          className={
                            isValid ? "text-emerald-600" : "text-slate-500"
                          }
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* 5. Confirm Password (Disabled if email not verified) */}
              <div
                className={
                  !isEmailVerified
                    ? "opacity-50 grayscale select-none pointer-events-none transition-all"
                    : "transition-all"
                }
              >
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm Password
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-200">
                  <FiLock className="mr-3 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full bg-transparent outline-none"
                    placeholder="••••••••"
                    disabled={!isEmailVerified}
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) =>
                        value === password || "Passwords do not match",
                    })}
                  />
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={!isEmailVerified}
                    className="ml-2 text-slate-500"
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-2 text-sm text-red-600">
                    Passwords do not match
                  </p>
                )}
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Final Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || registerDisabled || !isEmailVerified}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FiUserPlus />
                {isSubmitting ? "Creating account..." : "Register Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-cyan-600 hover:text-cyan-700"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      <Modal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        title="Verify your email"
        description={`A 6-digit verification code has been sent to ${email}`}
        footer={null}
        width="400px"
      >
        <div className="space-y-6 pt-4">
          <div>
            <input
              type="text"
              value={otpCode}
              onChange={(e) =>
                setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl tracking-[0.5em] font-bold text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={handleVerifyOtp}
            disabled={isSubmitting || otpCode.length !== 6}
            className="flex w-full items-center justify-center rounded-xl bg-cyan-600 px-4 py-3.5 font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70 shadow-md shadow-cyan-600/20"
          >
            {isSubmitting ? "Verifying..." : "Verify OTP"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default RegisterPage;
