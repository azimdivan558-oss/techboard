import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function GoogleButton() {

  const navigate = useNavigate();

  const handleSuccess = async (response) => {

    try {

      const res = await API.post(
        "/auth/google",
        {
          credential: response.credential,
        }
      );

      localStorage.setItem(
        "token",
        res.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(res.data.user)
      );

      window.dispatchEvent(new Event("auth-changed"));

      const role = res.data.user.role;

      if (role === "company") {

        navigate("/company-dashboard");

      } else if (role === "admin") {

        navigate("/admin-dashboard");

      } else {

        navigate("/dashboard");

      }

    } catch (error) {

      console.error(error);

      alert(
        error.response?.data?.message ||
        "Google login failed"
      );

    }
  };

  const handleError = () => {
    alert("Google Login Failed");
  };

  return (
    <div className="google-button">

      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
      />

    </div>
  );
}