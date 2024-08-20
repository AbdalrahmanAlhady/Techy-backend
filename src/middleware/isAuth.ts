import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { MiddlewareFn } from "type-graphql";

export const isAuth: MiddlewareFn<{req:Request, res:Response}> = ({ context }, next) => {
  const authorization = context.req.headers["authorization"];
  if (!authorization) {
    throw new Error("not authenticated");
  }
  try {
    console.log(authorization)
    const token = authorization.split(" ")[1];
    const payload = verify(token , process.env.ACCESS_TOKEN_SECRET!);
  } catch(err) { 
    console.log(err)
    throw new Error("not authenticated");}
  return next();
};
