import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendOtpEmail = async (to, otp) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("Email credentials not set. Logging OTP instead:", otp);
        return;
    }

    const mailOptions = {
        from: `"RenewSense" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Verify your email for RenewSense",
        text: `Your OTP for verification is: ${otp}. It will expire in 10 minutes.`,
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h2>Welcome to RenewSense!</h2>
        <p>Your one-time password (OTP) for verifying your account is:</p>
        <h1 style="color: #3b82f6; letter-spacing: 5px; background: #f3f4f6; padding: 10px; border-radius: 5px; display: inline-block;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP email sent to ${to}`);
    } catch (error) {
        console.error("Error sending OTP email:", error);
    }
};
