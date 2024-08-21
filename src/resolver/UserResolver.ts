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
import { User } from "../entity/User";
import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { Response } from "express";
import "dotenv/config";
import { isAuth } from "../middleware/isAuth";

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
  @UseMiddleware(isAuth)
  users(): Promise<User[]> {
    return User.find();
  }

  @Mutation(() => Boolean)
  async register(
    @Arg("firstName") firstName: string,
    @Arg("lastName") lastName: string,
    @Arg("email") email: string,
    @Arg("password") password: string
  ) {
    const hashedPassword = await hash(password, 12);
    try {
      await User.insert({
        firstName,
        lastName,
        email,
        password: hashedPassword,
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
      { id: foundUser.id },
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
}
