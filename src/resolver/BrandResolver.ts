import {
  Resolver,
  Query,
  Mutation,
  Arg,
  UseMiddleware,
  Authorized,
} from "type-graphql";
import { Brand } from "../entity/Brand";

import { UserRole } from "../entity/User";
import { isAuthunticated } from "../middleware/isAuthunticated";

@Resolver(Brand)
export class BrandResolver {
  @Query(() => [Brand])
  @UseMiddleware(isAuthunticated)
  brands(): Promise<Brand[]> {
    return Brand.find({ relations: ["products"] });
  }

  @Mutation(() => Brand)
  @UseMiddleware(isAuthunticated)
  @Authorized(UserRole.ADMIN)
  createBrand(@Arg("name") name: string): Promise<Brand> {
    const brand = Brand.create({ name });
    return Brand.save(brand);
  }
}
