import {
  Authorized,
  Field,
  Int,
  ObjectType,
  registerEnumType,
} from "type-graphql";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  OneToMany,
} from "typeorm";
import { Min, Max, IsEmail } from "class-validator";
import { Product } from "./Product";
export enum UserRole {
  BUYER = "buyer",
  ADMIN = "admin",
  VENDOR = "vendor",
}

registerEnumType(UserRole, {
  name: "UserRole",
  description: "The roles of the users",
});
@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column("varchar", { unique: true, nullable: false })
  @IsEmail()
  email: string;

  @Field()
  @Column("varchar", { nullable: false })
  @Min(2)
  @Min(255)
  firstName: string;

  @Field()
  @Column("varchar", { nullable: false })
  @Min(2)
  @Min(255)
  lastName: string;

  @Column("text")
  password: string;

  @Field()
  @Column("bool", { default: false })
  verified: boolean;

  @Field(() => Int, { nullable: true })
  @Column("int", { nullable: true, default: null })
  otp: number | null;

  @Field(() => UserRole)
  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.BUYER,
  })
  role: UserRole;

  @Field(() => [Product], { nullable: true })
  @OneToMany(() => Product, (product) => product.vendor)
  products?: Product[]; // Only vendors will have products
}
