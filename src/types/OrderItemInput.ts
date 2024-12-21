import { InputType, Field, Int } from "type-graphql";

@InputType()
export class OrderItemInput {
    @Field()
    quantity: number;
  
    @Field()
    unitPrice: number;
  
    @Field()
    totalPrice: number;

    @Field()
    productId: string;
}