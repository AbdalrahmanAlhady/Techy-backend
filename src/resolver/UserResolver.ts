import {
  Resolver,
  Query,
  Arg,
  Mutation,
  ObjectType,
  Field,
  Ctx,
  UseMiddleware,
  Int,
  Authorized,
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

@Resolver()
export class UserResolver {
  @Query(() => Int)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async usersCount(
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<number> {
    const qb = User.createQueryBuilder("User");
    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: options?.filters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["products"], // Default relation
    });
    return queryOptions.getCount();
  }
  @Query(() => [User])
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async users(
    @Arg("id", { nullable: true }) id: string,
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<User[]> {
    if (id) {
      return User.find({
        where: { id },
        relations: ["products"],
      });
    }
    const qb = User.createQueryBuilder("User");
    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: options?.filters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["products"], // Default relation
    });

    return queryOptions.getMany();
  }
}
