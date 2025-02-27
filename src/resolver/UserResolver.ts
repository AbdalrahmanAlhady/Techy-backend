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
import { hash } from "bcryptjs";
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

  @Mutation(() => User)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async createUser(
    @Arg("firstName") firstName: string,
    @Arg("lastName") lastName: string,
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Arg("role", () => UserRole) role: UserRole
  ): Promise<User> {
    const hashedPassword = await hash(password, 12);
    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
    }).save();
    return user;
  }
  @Mutation(() => User || null)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async updateUser(
    //by admin
    @Arg("id") id: string,
    @Arg("firstName") firstName: string,
    @Arg("lastName") lastName: string,
    @Arg("email") email: string,
    @Arg("role", () => UserRole) role: UserRole,
    @Arg("verified") verified: boolean,
    @Arg("password", { nullable: true }) password?: string
  ): Promise<User | null> {
    let result ;
    if (password) {
      password = await hash(password, 12);
      result = await User.update(
        { id },
        { firstName, lastName, email, password, role, verified }
      );
    } else {
      result = await User.update(
        { id },
        { firstName, lastName, email, role, verified }
      );
    }
    return result ? User.findOne({ where: { id } }) : null;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async deleteUser(@Arg("id") id: string): Promise<boolean> {
    let result = await User.delete(id);
    return result.affected! > 0;
  }
}
