import {
  Resolver,
  Query,
  Mutation,
  Arg,
  UseMiddleware,
  Authorized,
} from "type-graphql";
import { Product } from "../entity/Product";
import { Category } from "../entity/Category";
import { Brand } from "../entity/Brand";
import { In } from "typeorm";
import { User, UserRole } from "../entity/User";
import { isAuthunticated } from "../middleware/isAuthunticated";
import { log } from "console";

@Resolver(Product)
export class ProductResolver {
  @Query(() => [Product])
  @UseMiddleware(isAuthunticated)
  async products(): Promise<Product[]> {
    return Product.find({ relations: ["brand", "categories"] });
  }

  @Mutation(() => Product)
  @UseMiddleware(isAuthunticated)
  @Authorized([UserRole.ADMIN, UserRole.VENDOR])
  async createProduct(
    @Arg("name") name: string,
    @Arg("description") description: string,
    @Arg("price") price: number,
    @Arg("brandId") brandId: number,
    @Arg("categoryId") categoryId: number,
    @Arg("vendorId") vendorId: number
  ): Promise<Product> {
    try {
      const brand = await Brand.findOne({ where: { id: brandId } });
      if (!brand) throw new Error("Brand not found");
      const category = await Category.findOne({ where: { id: categoryId } });
      if (!category) throw new Error("Category not found");
      const vendor = await User.findOne({ where: { id: vendorId } });
      if (!vendor || vendor.role !== UserRole.VENDOR) {
        throw new Error("User not found or not a vendor");
      }
      const product = Product.create({
        name,
        description,
        price,
        brand,
        category,
        vendor,
      });
      return Product.save(product);
    } catch (error:any) {
        console.log(error);
        
      throw new Error(error.message + "");
    }
  }
}
