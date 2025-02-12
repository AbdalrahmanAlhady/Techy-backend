import {
  Resolver,
  Query,
  Mutation,
  Arg,
  UseMiddleware,
  Authorized,
  Int,
  Field,
  ObjectType,
} from "type-graphql";
import { Category } from "../entity/Category";
import { Product } from "../entity/Product";
import { User, UserRole } from "../entity/User";
import { isAuthunticated } from "../middleware/isAuthunticated";
import { QueryOptionsInput } from "../types/QueryOptionsInput";
import { createQueryOptions } from "../utils/apiUtils";
import { Brand } from "../entity/Brand";
@ObjectType()
class PriceRange {
  @Field()
  min: number;
  @Field()
  max: number;
}
@ObjectType()
class ProductName {
  @Field()
  id: string;
  @Field()
  name: string;
  @Field()
  cover: string;
}
@Resolver(Product)
export class ProductResolver {
  @Query(() => Int)
  async productsCount(
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<number> {
    const qb = Product.createQueryBuilder("Product");
    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: options?.filters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["brand", "category", "vendor"], // Default relation
    });
    return queryOptions.getCount();
  }
  @Query(() => PriceRange)
  async productsPriceRange(
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<PriceRange> {
    const qb = Product.createQueryBuilder("Product");
    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: options?.filters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["brand", "category", "vendor"], // Default relation
    });
    const products = await queryOptions.getMany();
    const prices = products.map((product) => product.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }
  @Query(() => [ProductName])
  async productsNames(
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<ProductName[]> {
    const qb = Product.createQueryBuilder("Product");
    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: options?.filters,
      searchField: options?.searchField,
      searchTerm: options?.searchTerm,
      relations: options?.relations || ["brand", "category", "vendor"], // Default relation
    });
    const products = await queryOptions.getMany();
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      cover: product.cover,
    }));
  }
  @Query(() => [Product])
  async products(
    @Arg("id", { nullable: true }) id: string,
    @Arg("options", () => QueryOptionsInput, { nullable: true })
    options?: QueryOptionsInput
  ): Promise<Product[]> {
    if (id) {
      return Product.find({
        where: { id },
        relations: ["brand", "category", "vendor"],
      });
    }
    const qb = Product.createQueryBuilder("Product");
    const queryOptions = createQueryOptions(qb, {
      page: options?.page,
      limit: options?.limit,
      sortField: options?.sortField,
      sortOrder: options?.sortOrder,
      filters: options?.filters,
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
    @Arg("cover", { nullable: true }) cover: string,
    @Arg("description") description: string,
    @Arg("price") price: number,
    @Arg("brandId") brandId: string,
    @Arg("categoryId") categoryId: string,
    @Arg("vendorId") vendorId: string,
    @Arg("inventory") inventory: number
  ): Promise<Product> {
    try {
      const brand = await Brand.findOne({ where: { id: brandId } });
      if (!brand) throw new Error("brand not found");
      const category = await Category.findOne({ where: { id: categoryId } });
      if (!category) throw new Error("Category not found");
      const vendor = await User.findOne({ where: { id: vendorId } });
      if (!vendor) {
        throw new Error("User not found");
      }
      const product = Product.create({
        name,
        cover,
        description,
        price,
        brand,
        category,
        vendor,
        inventory,
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
    @Arg("id") id: string,
    @Arg("name", { nullable: true }) name?: string,
    @Arg("cover", { nullable: true }) cover?: string,
    @Arg("price", { nullable: true }) price?: number,
    @Arg("inventory", { nullable: true }) inventory?: number,
  ): Promise<Product | null> {
    const product = await Product.update({ id }, { name, cover, price, inventory });
    if (product.affected === 0) {
      throw new Error("update failed");
    }
    const updatedProduct = await Product.findOne({ where: { id } , relations: ["brand", "category", "vendor"]});
    return updatedProduct;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthunticated)
  @Authorized([UserRole.ADMIN, UserRole.VENDOR])
  async deleteProduct(@Arg("id") id: string): Promise<boolean> {
    const result = await Product.delete({ id });
    return result.affected! > 0;
  }
}
