import {
  Resolver,
  Query,
  Arg,
  Mutation,
  ObjectType,
  Field,
  Ctx,
  UseMiddleware,
} from "type-graphql";
import "reflect-metadata";
import { User, UserRole } from "../entity/User";
import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { Response } from "express";
import "dotenv/config";

import { sendEmail } from "../utils/sendMail";
import { isAuthunticated } from "../middleware/isAuthunticated";
import { QueryOptionsInput } from "../types/QueryOptionsInput";
import { createQueryOptions } from "../utils/apiUtils";
import { Code } from "typeorm";
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
export class UserResolver {
  @Query(() => [User])
  @UseMiddleware(isAuthunticated)
  async users(
    @Arg("id", { nullable: true }) id: number,
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<User[]> {
    if (id) {
      return User.find({
        where: { id },
        relations: ["products"],
      });
    }
    const parsedFilters = options?.filters ? JSON.parse(options.filters) : {};

    const qb = User.createQueryBuilder("User");

    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: parsedFilters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["products"], // Default relation
    });

    return queryOptions.getMany();
  }

  @Mutation(() => Boolean)
  async register(
    @Arg("firstName") firstName: string,
    @Arg("lastName") lastName: string,
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Arg("role", () => UserRole) role: UserRole
  ) {
    const hashedPassword = await hash(password, 12);
    try {
      await User.insert({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
      });
    } catch (err) {
      console.log(err);
      return false;
    }
    return true;
  }

  @Mutation(() => LoginResponse)
  async login(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Ctx() { res }: { res: Response }
  ): Promise<LoginResponse> {
    const foundUser = await User.findOne({ where: { email } });
    if (!foundUser) {
      throw new Error("User not found");
    }
    const passwordMatched = await compare(password, foundUser.password);
    if (!passwordMatched) {
      throw new Error("Invalid credentia");
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
    res.cookie("RFToken", refreshToken, {
      httpOnly: true,
    });
    return { user: foundUser, accessToken, refreshToken };
  }

  @Mutation(() => Boolean)
  async sendMail(
    @Arg("email") email: string,
    @Arg("reason") reason: "reset password" | "verify email"
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
  @Mutation(() => User || Error)
  async resetPassword(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Arg("cpassword") cpassword: string,
    @Arg("code") code: number
  ): Promise<User | Error> {
    const foundUser = await User.findOne({ where: { email } });
    if (!foundUser) {
      throw new Error("Credintials not found");
    }
    if (password !== cpassword) {
      throw new Error("Password not matched");
    }
    if (foundUser.otp === code) {
      foundUser.password = password;
      foundUser.otp = null;
      foundUser.save();
      return foundUser;
    } else {
      throw new Error("Invalid code");
    }
  }
  @Mutation(() => String || Error)
  async verifyEmail(
    @Arg("email") email: string,
    @Arg("code") code: number
  ): Promise<string | Error> {
    const foundUser = await User.findOne({ where: { email } });
    if (!foundUser) {
      throw new Error("Credintials not found");
    }
    if (foundUser.otp === code) {
      foundUser.verified = true;
      foundUser.otp = null;
      await foundUser.save();
      return "email verified successfully";
    } else {
      return new Error("Invalid code");
    }
  }
}
