// import { Resend } from "resend";

// const resend = new Resend(process.env.RESEND_API_KEY);

// const sendOtpEmail = async (to, otp) => {
//   try {
//     await resend.emails.send({
//       from: "onboarding@resend.dev",
//       to: to,
//       subject: "Your OTP for Login",
//       text: `OTP for login is ${otp}`,
//     });
//   } catch (err) {
//     console.log(err);
//   }
// };

// export default sendOtpEmail;

// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   host: "smtp-relay.brevo.com",
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.brevo_user,
//     pass: process.env.brevo_pass,
//   },
// });

// const sendOtpEmail = async (to, otp) => {
//   try {
//     await transporter.sendMail({
//       from: "manishaggarwal8304@gmail.com",
//       to,
//       subject: "Your OTP",
//       text: `OTP for login is ${otp}`,
//     });
//   } catch (err) {
//     console.log("Email error:", err);
//   }
// };

// export default sendOtpEmail;


import SibApiV3Sdk from "sib-api-v3-sdk";

const client = SibApiV3Sdk.ApiClient.instance;

client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendOtpEmail = async (to, otp) => {
  try {
    await apiInstance.sendTransacEmail({
      sender: { email: "manishaggarwal8304@gmail.com" },
      to: [{ email: to }],
      subject: "Your OTP",
      textContent: `OTP for login is ${otp}`,
    });
  } catch (err) {
    console.log("Email error:", err);
  }
};

export default sendOtpEmail;