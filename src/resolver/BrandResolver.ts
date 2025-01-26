import {
  Resolver,
  Query,
  Mutation,
  Arg,
  UseMiddleware,
  Authorized,
  Int,
} from "type-graphql";
import { Brand } from "../entity/Brand";
import { UserRole } from "../entity/User";
import { isAuthunticated } from "../middleware/isAuthunticated";
import { QueryOptionsInput } from "../types/QueryOptionsInput";
import { createQueryOptions } from "../utils/apiUtils";

@Resolver(Brand)
export class BrandResolver {
  @Query(() => Int)
  async brandsCount(
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<number> {
    const qb = Brand.createQueryBuilder("Brand");
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

  @Query(() => [Brand])
  async brands(
    @Arg("id", { nullable: true }) id: string,
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<Brand[]> {
    if (id) {
      return Brand.find({ where: { id }, relations: ["products"] });
    }

    const qb = Brand.createQueryBuilder("brand");

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
  @Mutation(() => Brand)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  createBrand(@Arg("name") name: string): Promise<Brand> {
    const brand = Brand.create({ name });
    return Brand.save(brand);
  }

  @Mutation(() => Brand || null)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async updateBrand(
    @Arg("id") id: string,
    @Arg("name") name: string
  ): Promise<Brand | null> {
    const brand = await Brand.update({ id }, { name });
    if (brand.affected === 0) {
      throw new Error("update failed");
    }
    return await Brand.findOne({ where: { id } });
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  async deleteBrand(@Arg("id") id: string): Promise<boolean> {
    const result = await Brand.delete({ id });
    return result.affected! > 0;
  }
}
