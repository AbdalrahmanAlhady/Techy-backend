import {
  Resolver,
  Query,
  Arg,
  Mutation,
  ObjectType,
  Field,
  Ctx,
} from "type-graphql";
import "reflect-metadata";
import { User, UserRole } from "../entity/User";
import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { Response } from "express";
import "dotenv/config";

import { sendEmail } from "../utils/sendMail";
import { verify } from "jsonwebtoken";
@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
  @Field()
  refreshToken: string;
  @Field()
  user: User;
}
@Resolver()
export class AuthResolver {
  @Mutation(() => Boolean)
  async register(
    @Arg("firstName") firstName: string,
    @Arg("lastName") lastName: string,
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Arg("cPassword") cPassword: string,
    @Arg("role", () => UserRole) role: UserRole
  ): Promise<boolean> {
    const hashedPassword = await hash(password, 12);
    try {
      if (await User.findOne({ where: { email } }))
        throw new Error("User with this email already exist");
      if (password !== cPassword)
        throw new Error("Password does not match confirm-password");
      await User.insert({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        verified: false,
        role,
      });
    } catch (err) {
      console.log(err);
      throw err;
    }
    return true;
  }

  @Mutation(() => LoginResponse)
  async login(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Ctx() { res }: { res: Response } //for setting cookies
  ): Promise<LoginResponse> {
    const foundUser = await User.findOne({ where: { email } });
    if (!foundUser) {
      throw new Error("User not found");
    }
    const passwordMatched = await compare(password, foundUser.password);
    if (!passwordMatched) {
      throw new Error("Invalid credentials");
    }
    const accessToken = sign(
      { id: foundUser.id, role: foundUser.role },
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: "1h",
      }
    );
    const refreshToken = sign(
      { id: foundUser.id },
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "1d",
      }
    );

    return { user: foundUser, accessToken, refreshToken };
  }

  @Mutation(() => Boolean)
  async sendMail(
    @Arg("email") email: string,
    @Arg("reason") reason: "reset_password" | "verify_email"
  ): Promise<boolean> {
    let message: string = "";
    const foundUser = await User.findOne({ where: { email } });
    if (!foundUser) {
      throw new Error("Credintials not found");
    }
    const otp = Math.floor(100000 + Math.random() * 900000);
    foundUser.otp = otp;
    await foundUser.save();
    message = `Your ${reason} code is: ${otp || "unknown"}`;
    sendEmail(email, message, reason);
    return true;
  }
  @Mutation(() => Boolean)
  async resetPassword(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Arg("cPassword") cPassword: string,
    @Arg("currentPassword", { nullable: true }) currentPassword: string,
    @Arg("code", { nullable: true }) code: string
  ): Promise<Boolean> {
    try {
      const foundUser = await User.findOne({ where: { email } });
      if (!foundUser) {
        throw new Error("Credintials not found");
      }
      if (password !== cPassword) {
        throw new Error("Password not matched");
      }
      if (currentPassword) {
        const passwordMatched = await compare(
          currentPassword,
          foundUser.password
        );
        if (!passwordMatched) {
          throw new Error("Invalid credentials");
        }
        foundUser.password = await hash(password, 12);
        return true;
      }
      if (code && foundUser.otp === parseInt(code)) {
        const hashedPassword = await hash(password, 12);
        foundUser.password = hashedPassword;
        foundUser.otp = null;
        foundUser.save();
        return true;
      } else {
        throw new Error("Invalid code");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error("An unknown error occurred");
      }
    }
  }
  @Mutation(() => Boolean || Error)
  async verifyEmail(
    @Arg("email") email: string,
    @Arg("code") code: string
  ): Promise<boolean | Error> {
    const foundUser = await User.findOne({ where: { email } });
    if (!foundUser) {
      throw new Error("Credintials not found");
    }
    if (foundUser.otp === parseInt(code)) {
      foundUser.verified = true;
      foundUser.otp = null;
      await foundUser.save();
      return true;
    } else {
      return new Error("Invalid code");
    }
  }
  @Mutation(() => String || Error)
  async refreshAccessToken(
    @Arg("refreshToken") refreshToken: string
  ): Promise<String | Error> {
    if (!refreshToken) {
      return Promise.reject(new Error("Missing refresh token"));
    }
    return new Promise((resolve, reject) => {
      verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET!,
        async (err, decoded) => {
          if (err || !decoded) {
            reject(new Error("Invalid refresh token"));
          } else {
            const userId = (decoded as { id: string }).id;
            const foundUser = await User.findOne({ where: { id: userId } });
            if (!foundUser) {
              reject(new Error("User not found"));
            }
            const newAccessToken = sign(
              { id: userId, role: foundUser!.role },
              process.env.ACCESS_TOKEN_SECRET!,
              { expiresIn: "3h" }
            );
            resolve(newAccessToken);
          }
        }
      );
    });
  }
}
