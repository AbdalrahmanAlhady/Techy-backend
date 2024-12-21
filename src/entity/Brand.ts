import { Entity, PrimaryGeneratedColumn, Column, OneToMany, BaseEntity } from "typeorm";
import { ObjectType, Field, ID } from "type-graphql";
import { Product } from "./Product";

@ObjectType()
@Entity()
export class Brand extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: string;

  @Field()
  @Column()
  name: string;

  @Field(() => [Product])
  @OneToMany(() => Product, (product) => product.brand, { onDelete: "CASCADE" })
  products: Product[];
}
