import { AuthChecker } from "type-graphql";
import { UserRole } from "../entity/User";
import { verify } from "jsonwebtoken";
import { Context } from "../types/Context";
import { log } from "console";

export const isAuthorized: AuthChecker<Context> = async (
  { context },
  roles
) => {
  const authorization = context.req.headers["authorization"];
  if (!authorization) {
    throw new Error("not authorized");
  }
  try {
    const token = authorization.split(" ")[1];
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!) as {
      id: number;
      role: UserRole;
    };
    
    if (payload.role) {
      return roles.includes(payload.role);
    } else {
      throw new Error(`not authorized`);
    }
  } catch (err) {
    console.log(err);
    throw new Error(`not authorized`);
  }
};
