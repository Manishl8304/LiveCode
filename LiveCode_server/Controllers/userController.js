import User from "../Models/userModel.js";
import sendOtpEmail from "../Utils/email.js";
import jwt from "jsonwebtoken";

/* 
- Login Controller
- fetches email from req.body
- sends error if email is not provided
- creates an OTP, store it in a map
- sends the otp to provided email using user-defined nodemailer helper funtion
- sends error if failed to send otp
- returns by the sending the successful message
*/
const otpStore = new Map();
const login = async (req, res) => {
  let { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "email not provided",
    });
  }

  const otp = Math.floor(1000 + Math.random() * 9000);
  otpStore.set(email, otp);

  try {
    await sendOtpEmail(email, otp);
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Failed to send OTP",
    });
  }

  res
    .status(200)
    .json({ message: "otp has been sent to email, please verify" });
};

/*
 - verifyOtp controller
 - fetches email and otp from req.body
 - if either email or otp are undefind returns an error
 - fetches storedOtp from map
 - returns an error if otp is not found(when an email is provided which is not set)
 - check whether the provided opt matches or not, followed by returning an error
 - creates a ner user if user is not present in database
 - creates a jwt token using userId and email
 - set token in cookie
 - returns a successfull message
*/
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      message: "Email and OTP are required",
    });
  }

  const storedOtp = otpStore.get(email);
  if (!storedOtp) {
    return res.status(400).json({
      message: "OTP expired or not requested for the email provided",
    });
  }
  if (otp != storedOtp) {
    return res.status(400).json({
      message: "wrong otp",
    });
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email });
  }

  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
    },
    process.env.jwt_secret,
    { expiresIn: "7d" },
  );

  res.cookie("token", token, {
    httpOnly: true, // document.cookie() gives undefined
    secure: false, //cookies sent even if http or https
    sameSite: "lax", // relaxed version of strict
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    message: "login succesfull",
  });
};

/*
- me controller
- fetches token from cookie
- returns an error if cookie is not stored
- decodes the token
- send response
*/
const me = (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "not authenticated" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.jwt_secret);
  } catch {
    return res.status(401).json({ message: "not authenticated" });
  }

  res.status(200).send({
    userId: decoded.userId,
    email: decoded.email,
  });
};
export { login, verifyOtp, me };
