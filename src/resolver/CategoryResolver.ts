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
import { QueryOptionsInput } from "../types/QueryOptionsInput";
import { createQueryOptions } from "../utils/apiUtils";

@Resolver(Category)
export class CategoryResolver {
  @Query(() => [Category])
  async categories(
    @Arg("id", { nullable: true }) id: number,
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<Category[]> {
    if (id) {
      return Category.find({ where: { id }, relations: ["products"] });
    }
    const parsedFilters = options?.filters ? JSON.parse(options.filters) : {};

    const qb = Category.createQueryBuilder("Category");

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
    @Arg("id") id: number,
    @Arg("name") name: string
  ): Promise<Category | null> {
    const category = await Category.update({ id }, { name });
    if (category.affected === 0) {
      throw new Error("update failed");
    }
    return await Category.findOne({ where: { id } });
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async deleteCategory(@Arg("id") id: number): Promise<boolean> {
    const result = await Category.delete({ id });
    return result.affected! > 0;
  }
}
