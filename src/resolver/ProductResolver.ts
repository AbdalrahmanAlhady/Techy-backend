import {
  Resolver,
  Query,
  Mutation,
  Arg,
  UseMiddleware,
  Authorized,
  Int,
} from "type-graphql";
import { Category } from "../entity/Category";
import { Product } from "../entity/Product";
import { User, UserRole } from "../entity/User";
import { isAuthunticated } from "../middleware/isAuthunticated";
import { QueryOptionsInput } from "../types/QueryOptionsInput";
import { createQueryOptions } from "../utils/apiUtils";
import { Brand } from "../entity/Brand";

@Resolver(Product)
export class ProductResolver {
  @Query(() => Int)
  async productsCount(
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<number> {
    const parsedFilters = options?.filters ? JSON.parse(options.filters) : {};
    const qb = Product.createQueryBuilder("Product");
    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: parsedFilters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["brand", "category", "vendor"], // Default relation
    });
    return queryOptions.getCount();
  }

  @Query(() => [Product])
  async products(
    @Arg("id", { nullable: true })  id: string,
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<Product[]> {
    if (id) {
      return Product.find({
        where: { id },
        relations: ["brands", "categories"],
      });
    }
    const parsedFilters = options?.filters ? JSON.parse(options.filters) : {};

    const qb = Product.createQueryBuilder("Product");

    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: parsedFilters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["brand", "category", "vendor"], // Default relation
    });

    return queryOptions.getMany();
  }

  @Mutation(() => Product)
  @UseMiddleware(isAuthunticated)
  @Authorized([UserRole.ADMIN, UserRole.VENDOR])
  async createProduct(
    @Arg("name") name: string,
    @Arg("cover") cover: string,
    @Arg("description") description: string,
    @Arg("price") price: number,
    @Arg("brandId") brandId: string,
    @Arg("categoryId") categoryId: string,
    @Arg("vendorId") vendorId: string
  ): Promise<Product> {
    try {
      const brand = await Brand.findOne({ where: { id: brandId } });
      if (!brand) throw new Error("brand not found");
      const category = await Category.findOne({ where: { id: categoryId } });
      if (!category) throw new Error("Category not found");
      const vendor = await User.findOne({ where: { id: vendorId } });
      if (!vendor || vendor.role !== UserRole.VENDOR) {
        throw new Error("User not found or not a vendor");
      }
      const product = Product.create({
        name,
        cover,
        description,
        price,
        brand,
        category,
        vendor,
      });
      return Product.save(product);
    } catch (error: any) {
      console.log(error);

      throw new Error(error.message + "");
    }
  }

  @Mutation(() => Product || null)
  @UseMiddleware(isAuthunticated)
  @Authorized([UserRole.ADMIN, UserRole.VENDOR])
  async updateProduct(
    @Arg("id")  id: string,
    @Arg("name", { nullable: true }) name?: string,
    @Arg("cover", { nullable: true }) cover?: string,
    @Arg("price", { nullable: true }) price?: number
  ): Promise<Product | null> {
    const product = await Product.update({ id }, { name, cover, price });
    if (product.affected === 0) {
      throw new Error("update failed");
    }
    const updatedProduct = await Product.findOne({ where: { id } });
    return updatedProduct;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthunticated)
  @Authorized([UserRole.ADMIN, UserRole.VENDOR])
  async deleteProduct(@Arg("id")  id: string): Promise<boolean> {
    const result = await Product.delete({ id });
    return result.affected! > 0;
  }
}
