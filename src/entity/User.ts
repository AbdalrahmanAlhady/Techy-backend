import { Field, Int, ObjectType } from "type-graphql";
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";
import {Min,Max,IsEmail, min} from "class-validator"
@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()

  @Column("varchar", { unique: true})
  @IsEmail()
  email: string;

  @Field()
  @Column()
  @Min(2)
  @Min(255)
  firstName: string;
  
  @Field()
  @Column()
  @Min(2)
  @Min(255)
  lastName: string;

  @Column("text")
  password: string;
}
