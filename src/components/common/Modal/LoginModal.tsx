"use client";
import CommonModal from "@/components/common/Modal/CommonModal";
import InputField from "@/components/common/formik/inputField/InputField";
import CommonButton from "@/components/common/ui/commonButton/CommonButton";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
interface LoginModalProps {
  show: boolean;
  handleClose: () => void;
  onSignUpClick?: () => void;
}

const LoginModal = ({ show, handleClose, onSignUpClick }: LoginModalProps) => {
  const router = useRouter()
  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: Yup.object({
      email: Yup.string().email("Invalid email address").required("Required"),
      password: Yup.string().required("Required"),
    }),
    onSubmit: () => {
      handleClose();
      formik.resetForm();
    },
  });

  const onModalClose = () => {
    handleClose();
    formik.resetForm();
  };

  return (
    <CommonModal
      show={show}
      handleClose={onModalClose}
      heading="Login"
      className="login_modal"
      variant="small"
    >
      <form onSubmit={formik.handleSubmit} className="login_modal_body">
        <p className="login_modal_subtitle">Welcome back! Please sign in to continue.</p>

        <div className="mb-3">
          <InputField
            label="Email"
            name="email"
            type="email"
            placeholder="Enter your email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && formik.errors.email ? formik.errors.email : undefined}
          />
        </div>

        <div className="mb-4">
          <InputField
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && formik.errors.password ? formik.errors.password : undefined}
          />
        </div>

        <CommonButton
          title="Login"
          fluid
          type="submit"
          className="login_modal_btn"
          onClick={() => router.push("/notes")}
          disabled={!(formik.isValid && formik.dirty)}
        />

        <p className="login_modal_signup_text mt-3 text-center">
          Don&apos;t have an account?{" "}
          <CommonButton
            className="login_modal_signup_link"
            onClick={onSignUpClick}
            type="button"
          >
            Sign Up
          </CommonButton>
        </p>
      </form>
    </CommonModal>
  );
};

export default LoginModal;
