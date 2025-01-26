import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  BaseEntity,
  EntityManager,
} from "typeorm";
import { ObjectType, Field, ID, InputType } from "type-graphql";
import { Order } from "./Order";
import { Product } from "./Product";
@InputType()
@ObjectType()
@Entity()
export class OrderItem extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: string;

  @Field()
  @Column()
  quantity: number;

  @Field()
  @Column("decimal")
  unitPrice: number;

  @Field()
  @Column("decimal")
  totalPrice: number;

  @Field(() => Order)
  @ManyToOne(() => Order, (order) => order.orderItems, { cascade: true })
  order: Order;

  @Field(() => Product)
  @ManyToOne(() => Product, product => product.orderItems)
  product: Product;

  async updateTotalPrice(
    OrderItemId: string,
    transactionalEntityManager: EntityManager
  ): Promise<OrderItem|null> {
    try {
      let orderItem = await transactionalEntityManager.findOne(OrderItem, {
        where: { id: OrderItemId },
        relations: ["order", "product"],
      });
      orderItem!.totalPrice = orderItem!.unitPrice * orderItem!.quantity;
    return  await transactionalEntityManager.save(orderItem);
    } catch (error) {
      console.error("Error updating total price:", error);
      throw error;
    }
  }
}
