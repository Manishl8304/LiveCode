import nodemailer from "nodemailer";
import dns from "dns"; // Import Node's built-in dns module

// Force Node to use IPv4. This is a common fix for Render timeouts!
dns.setDefaultResultOrder("ipv4first");
/*
 - createTransport
 - it is function of nodemailer(object)
 - takes an object as a parameter
 - object should contain two keys
   - service : "gmail"
   - auth : {
      user:
      pass:
   }
 - returns a transporter(Object) which is used to send email  
*/
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.smtp_user,
    pass: process.env.smtp_pass,
  },
});

/*
- sendMail
- it a function of transporter(object)
- takes an object as a parameter
- object should contain keys
- from
- to
- subject
- text

*/
const sendOtpEmail = async (to, otp) => {
  transporter.verify(function (error, success) {
    if (error) {
      console.log("SMTP Error:", error);
    } else {
      console.log("SMTP Server is ready to send emails");
    }
  });
  await transporter.sendMail({
    from: process.env.smtp_user,
    to,
    subject: "Your OTP for Login",
    text: `otp for login is ${otp}`,
  });
};

export default sendOtpEmail;
