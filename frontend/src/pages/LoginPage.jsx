import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { FiMail, FiLock, FiLogIn, FiEye, FiEyeOff, FiArrowLeft } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { loginUser, resetForgotPassword, sendForgotPasswordOtp, verifyForgotPasswordOtp } from "../services/auth";
import { useToast } from "../components/common/ToastProvider";
import Modal from "../components/common/Modal";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const rememberMe = watch("rememberMe");

  useEffect(() => {
    if (!cooldownSeconds) return undefined;
    const timer = window.setInterval(() => setCooldownSeconds((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const passwordChecks = useMemo(() => {
    const value = newPassword || "";
    return {
      minLength: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
    };
  }, [newPassword]);

  const passwordValid = Object.values(passwordChecks).every(Boolean);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await loginUser({
        email: data.email,
        password: data.password,
      });

      login({
        accessToken: response.access_token,
        user: response.user,
        rememberMe: Boolean(data.rememberMe),
      });

      addToast("Signed in successfully", "success");
      navigate("/profile");
    } catch (error) {
      addToast(
        error?.response?.data?.detail ||
          error.message ||
          "Unable to sign in right now",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForgotFlow = () => {
    setForgotStep("email");
    setForgotEmail("");
    setOtpCode("");
    setNewPassword("");
    setConfirmPassword("");
    setCooldownSeconds(0);
    setShowForgotModal(false);
  };

  const handleForgotPasswordSend = async () => {
    if (!forgotEmail.trim()) {
      addToast("Please enter your email address", "error");
      return;
    }

    setForgotLoading(true);
    try {
      await sendForgotPasswordOtp({ email: forgotEmail.trim().toLowerCase() });
      setForgotStep("otp");
      setCooldownSeconds(30);
      addToast("Verification code sent to your email", "success");
    } catch (error) {
      addToast(error?.response?.data?.detail || "Unable to send a reset code", "error");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotPasswordVerify = async () => {
    if (!otpCode.trim()) {
      addToast("Please enter the verification code", "error");
      return;
    }

    setForgotLoading(true);
    try {
      await verifyForgotPasswordOtp({ email: forgotEmail.trim().toLowerCase(), otp: otpCode.trim() });
      setForgotStep("reset");
      addToast("Code verified. You can now set a new password.", "success");
    } catch (error) {
      addToast(error?.response?.data?.detail || "Unable to verify the code", "error");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotPasswordReset = async () => {
    if (!newPassword || !confirmPassword) {
      addToast("Please complete the password fields", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast("Passwords do not match", "error");
      return;
    }
    if (!passwordValid) {
      addToast("Password must match the required policy", "error");
      return;
    }

    setForgotLoading(true);
    try {
      await resetForgotPassword({
        email: forgotEmail.trim().toLowerCase(),
        otp: otpCode.trim(),
        new_password: newPassword,
      });
      addToast("Password reset successfully", "success");
      resetForgotFlow();
    } catch (error) {
      addToast(error?.response?.data?.detail || "Unable to reset your password", "error");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fa] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      {/* Main Card Container */}
      <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl lg:flex-row">
        {/* Left Side (Dark Branding Area) */}
        <div className="relative flex flex-1 flex-col justify-center bg-slate-900 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-12 lg:p-16 overflow-hidden">
          <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-md">
            <img
              src="/logo.png"
              alt="SilkOptima"
              className="h-12 w-auto mb-8 brightness-0 invert opacity-90 drop-shadow-lg"
            />

            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-4">
              Welcome Back
            </p>
            <h1 className="text-4xl font-bold leading-tight sm:text-5xl text-white mb-6">
              Manage your <br /> professional profile.
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed font-light">
              Access your employee dashboard, update your information, and track
              your submissions securely all in one place.
            </p>
          </div>
        </div>

        {/* Right Side (Form Area) */}
        <div className="flex flex-1 flex-col justify-center bg-white p-8 text-slate-800 sm:p-12 lg:px-20 lg:py-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold text-slate-900">
                Sign in
              </h2>
              <p className="mt-2 text-sm text-slate-500 font-medium">
                Enter your details to access your portal.
              </p>
            </div>

            <form
              className="space-y-6"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              {/* Email Input */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 transition-all focus-within:border-cyan-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-cyan-100 hover:border-slate-300">
                  <FiMail className="mr-3 text-slate-400 text-lg" />
                  <input
                    type="email"
                    className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-400 font-medium"
                    placeholder="you@company.com"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Enter a valid email address",
                      },
                    })}
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-500 font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 transition-all focus-within:border-cyan-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-cyan-100 hover:border-slate-300">
                  <FiLock className="mr-3 text-slate-400 text-lg" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-400 font-medium"
                    placeholder="••••••••"
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                    })}
                  />
                  <button
                    type="button"
                    tabIndex={0}
                    className="ml-2 text-slate-500"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-500 font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-sm mt-2">
                <label className="flex items-center gap-2 text-slate-600 font-medium cursor-pointer hover:text-slate-800 transition">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                    {...register("rememberMe")}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className="font-semibold text-cyan-600 hover:text-cyan-700 hover:underline transition"
                  onClick={() => {
                    setForgotEmail("");
                    setOtpCode("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setForgotStep("email");
                    setShowForgotModal(true);
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-slate-900/20 transition-all hover:bg-slate-800 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <>
                    <FiLogIn className="text-lg" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm font-medium text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-bold text-cyan-600 hover:text-cyan-700 hover:underline transition"
              >
                Register here
              </Link>
            </p>

            <Modal
              isOpen={showForgotModal}
              title="Reset your password"
              description="Secure your account with a quick verification step."
              onClose={() => setShowForgotModal(false)}
              width="min(95vw, 560px)"
              footer={null}
            >
              <div className="space-y-4">
                {forgotStep === "email" && (
                  <>
                    <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(event) => setForgotEmail(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-500"
                      placeholder="you@company.com"
                    />
                    <button
                      type="button"
                      onClick={handleForgotPasswordSend}
                      disabled={forgotLoading}
                      className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {forgotLoading ? "Sending..." : "Send verification code"}
                    </button>
                  </>
                )}

                {forgotStep === "otp" && (
                  <>
                    <label className="block text-sm font-semibold text-slate-700">Verification code</label>
                    <input
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-cyan-500"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                    />
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <button
                        type="button"
                        onClick={handleForgotPasswordVerify}
                        disabled={forgotLoading || otpCode.length !== 6}
                        className="flex-1 rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {forgotLoading ? "Verifying..." : "Verify code"}
                      </button>
                      <button
                        type="button"
                        onClick={handleForgotPasswordSend}
                        disabled={forgotLoading || cooldownSeconds > 0}
                        className="rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {forgotLoading ? "Sending..." : cooldownSeconds > 0 ? `Resend (${cooldownSeconds}s)` : "Resend"}
                      </button>
                    </div>
                  </>
                )}

                {forgotStep === "reset" && (
                  <>
                    <label className="block text-sm font-semibold text-slate-700">New password</label>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className="w-full bg-transparent outline-none"
                        placeholder="Create a strong password"
                      />
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      {[
                        ["Minimum 8 characters", passwordChecks.minLength],
                        ["One uppercase letter", passwordChecks.uppercase],
                        ["One lowercase letter", passwordChecks.lowercase],
                        ["One number", passwordChecks.number],
                        ["One special character", passwordChecks.special],
                      ].map(([label, isValid]) => (
                        <div key={label} className="flex items-center gap-2">
                          {isValid ? <span className="text-emerald-600">✓</span> : <span className="text-slate-400">•</span>}
                          <span className={isValid ? "text-emerald-600" : "text-slate-500"}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <label className="block text-sm font-semibold text-slate-700">Confirm password</label>
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className="w-full bg-transparent outline-none"
                        placeholder="Confirm your new password"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleForgotPasswordReset}
                      disabled={forgotLoading || !passwordValid}
                      className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {forgotLoading ? "Resetting..." : "Reset password"}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (forgotStep === "email") {
                      setShowForgotModal(false);
                    } else {
                      setForgotStep((current) => (current === "otp" ? "email" : "otp"));
                    }
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
                >
                  <FiArrowLeft />
                  {forgotStep === "email" ? "Back to sign in" : "Back"}
                </button>
              </div>
            </Modal>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
