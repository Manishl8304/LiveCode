import express from "express";
import { login, verifyOtp, me } from "../Controllers/userController.js";


// Router is a function method of express which return an object
const router = express.Router();


router.post("/login", login);
router.post("/verifyOtp", verifyOtp);
router.get("/me", me);

export default router;
