
import AuthService from '../services/auth.service.js';


export default class AuthController {
  static async signup(req, res, next) {
    try {
      const { fullname, email, phonenumber, password, role } = req.body;
      const message = await AuthService.signup({ fullname, email, phonenumber, password, role });
      res.status(201).json({ message });
    } catch (err) {
      next(err);
    }
  }

  static async verifyOtp(req, res, next) {
    try {
      const { email, otp } = req.body;
      const { accessToken, refreshToken } = await AuthService.verifyOtp(email, otp);
      res.json({ accessToken, refreshToken });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken } = await AuthService.login(email, password);
      res.json({ accessToken, refreshToken });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const message = await AuthService.forgotPassword(email);
      res.json({ message });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { email, otp, password } = req.body;
      const message = await AuthService.resetPassword(email, otp, password);
      res.json({ message });
    } catch (err) {
      next(err);
    }
  }
}


