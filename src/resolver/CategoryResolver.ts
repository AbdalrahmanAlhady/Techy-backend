import {
  Resolver,
  Query,
  Mutation,
  Arg,
  MiddlewareFn,
  UseMiddleware,
  Authorized,
} from "type-graphql";
import { Category } from "../entity/Category";

import { Request, Response } from "express";
import { UserRole } from "../entity/User";
import { isAuthunticated } from "../middleware/isAuthunticated";

@Resolver(Category)
export class CategoryResolver {
  @Query(() => [Category])
  @UseMiddleware(isAuthunticated)
  categories(): Promise<Category[]> {
    return Category.find({ relations: ["products"] });
  }

  @Mutation(() => Category)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  createCategory(@Arg("name") name: string): Promise<Category> {
    const category = Category.create({ name });
    return Category.save(category);
  }
}
