"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "react-bootstrap";
import { apiJson } from "@/lib/api/client";
import { AUTH } from "@/lib/api/urls";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import InputField from "@/components/common/formik/inputField/InputField";
import { CloseEyeIcon, OpenEyeIcon } from "@/assets/icons/svgIcon";
import Image from "next/image";
import logo from "../../../../public/images/logo_icon.png";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    apiJson(AUTH.LOGIN, {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
      skipLoader: true,
    })
      .then(() => router.replace("/admin/dashboard"))
      .catch((e: unknown) => {
        const msg = e && typeof e === "object" && "message" in e ? String(e.message) : "";
        setError(msg || "Invalid admin credentials.");
      });
  };

  return (
    <section className="admin_login_page">
      <Card className="admin_card admin_login_card admin_login_card_redesign">
        <Card.Body className="p-4">
          <div className="admin_login_brand mb-4">
            <span className="admin_login_logo">
              <Image src={logo} alt="Sara Royal Boutique" />
            </span>
            <p className="text-secondary mb-0 admin_login_subtitle">
              Sign in to manage boutique products and collections.
            </p>
          </div>

          <form className="admin_form" onSubmit={onSubmit}>
            <div className="">
              <InputField
                label="Email"
                name="email"
                type="email"
                placeholder="admin@sararoyal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="admin_password_group mb-3">
              <label className="form-label" htmlFor="admin-password">
                Password
              </label>
              <div className="admin_password_wrap">
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="admin_password_toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <OpenEyeIcon /> : <CloseEyeIcon />}
                </button>
              </div>
            </div>

            {error && <div className="admin_error_banner mb-3">{error}</div>}

            <CommonButton type="submit" className="admin_primary_btn w-100 mt-4">
              Login
            </CommonButton>

            <p className="text-secondary text-center mt-3 mb-0 admin_login_hint">
              Demo: admin@sararoyal.com / admin123
            </p>
          </form>
        </Card.Body>
      </Card>
    </section>
  );
}
