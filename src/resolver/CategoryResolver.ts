import {
  Resolver,
  Query,
  Mutation,
  Arg,
  MiddlewareFn,
  UseMiddleware,
  Authorized,
  Int,
} from "type-graphql";
import { Category } from "../entity/Category";

import { Request, Response } from "express";
import { UserRole } from "../entity/User";
import { isAuthunticated } from "../middleware/isAuthunticated";
import { QueryOptionsInput } from "../types/QueryOptionsInput";
import { createQueryOptions } from "../utils/apiUtils";

@Resolver(Category)
export class CategoryResolver {
  @Query(() => Int)
  async categoriesCount(
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<number> {
    const qb = Category.createQueryBuilder("Category");
    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters:  options?.filters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["products"], // Default relation
    });
    return queryOptions.getCount();
  }

  @Query(() => [Category])
  async categories(
    @Arg("id", { nullable: true }) id: string,
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<Category[]> {
    if (id) {
      return Category.find({ where: { id }, relations: ["products"] });
    }

    const qb = Category.createQueryBuilder("Category");

    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters:  options?.filters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["products"], // Default relation
    });

    return queryOptions.getMany();
  }

  @Mutation(() => Category)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  createCategory(@Arg("name") name: string): Promise<Category> {
    const category = Category.create({ name });
    return Category.save(category);
  }

  @Mutation(() => Category || null)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async updateCategory(
    @Arg("id") id: string,
    @Arg("name") name: string
  ): Promise<Category | null> {
    const category = await Category.update({ id }, { name });
    if (category.affected === 0) {
      throw new Error("update failed");
    }
    return await Category.findOne({ where: { id } , relations: ["products"]});
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async deleteCategory(@Arg("id") id: string): Promise<boolean> {
    const result = await Category.delete({ id });
    return result.affected! > 0;
  }
}
