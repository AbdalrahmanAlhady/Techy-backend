import { Request, Response } from "express";
import { verify, TokenExpiredError } from "jsonwebtoken";
import { MiddlewareFn } from "type-graphql";
import { User, UserRole } from "../entity/User";


export const isAuthunticated: MiddlewareFn<{ req: Request; res: Response }> = async ({ context }, next) => {
  const authorization = context.req.headers["authorization"];
  if (!authorization) {
    throw new Error("not authenticated");
  }

  try {
    const token = authorization.split(" ")[1];
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
      id: string;
      role: UserRole;
    };
    const user = await User.findOne({ where: { id: payload.id } });
    if (user) {
      return next();
    } else {
      throw new Error("User not found");
    }
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new Error("Token expired");
    }
    throw new Error("not authenticated");
  }
};
