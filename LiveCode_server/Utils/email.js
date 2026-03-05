import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOtpEmail = async (to, otp) => {
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: to,
    subject: "Your OTP for Login",
    text: `OTP for login is ${otp}`,
  });
};

export default sendOtpEmail;