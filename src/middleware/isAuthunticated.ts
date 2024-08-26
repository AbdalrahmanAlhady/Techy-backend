import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { MiddlewareFn } from "type-graphql";
import { User, UserRole } from "../entity/User";
import { Context } from "../types/Context";

export const isAuthunticated: MiddlewareFn<Context> = async ({ context }, next) => {
  const authorization = context.req.headers["authorization"];
  if (!authorization) {
    throw new Error("not authenticated");
  }
  try {
    const token = authorization.split(" ")[1];
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
      id: number;
      role: UserRole;
    };
    const user = await User.findOne({ where: { id: payload.id } });
    if (user) {
      return next();
    } else {
      throw new Error("not authenticated");
    }
  } catch (err) {
    console.log(err);
    throw new Error("not authenticated");
  }
};
