import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  BaseEntity,
} from "typeorm";
import { ObjectType, Field, ID } from "type-graphql";
import { Category } from "./Category";
import { Brand } from "./Brand";
import { User } from "./User";

@ObjectType()
@Entity()
export class Product extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: string;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column()
  cover: string;

  @Field()
  @Column("longtext")
  description: string;

  @Field()
  @Column("decimal")
  price: number;

  @Field(() => Brand)
  @ManyToOne(() => Brand, (brand) => brand.products)
  brand: Brand;

  @Field(() => Category)
  @ManyToOne(() => Category, (category) => category.products)
  category: Category;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.products)
  vendor: User; // Vendor who owns the product
}
