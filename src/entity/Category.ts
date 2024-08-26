import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany, BaseEntity } from 'typeorm';
import { ObjectType, Field, ID } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
@Entity()
export class Category  extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  name: string;

  @Field(() => [Product])
  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
