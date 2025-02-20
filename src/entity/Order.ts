import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  BaseEntity,
  OneToMany,
  EntityManager,
} from "typeorm";
import { ObjectType, Field, ID, registerEnumType } from "type-graphql";
import { User } from "./User";
import { OrderItem } from "./OrderItem";

export enum OrderStatus {
  PENDING = "PENDING",
  SHIPPED = "SHIPPED",
  DELIVERED = "DELIVERED",
  CANCELED = "CANCELED",
}
registerEnumType(OrderStatus, {
  name: "OrderStatus",
  description: "The status of the order",
});
@ObjectType()
@Entity()
export class Order extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id: string;

  @Field(() => OrderStatus)
  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  orderStatus: OrderStatus;
  
  @Field()
  @Column("longtext")
  address: string;

  @Field()
  @Column({ type: "decimal", default: 5.0 })
  deliveryFee: number;

  @Field()
  @Column("decimal")
  totalAmount: number;

  @Field()
  @Column()
  stripePaymentId: string;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.orders)
  user: User; // user who ordered the order

  @Field(() => [OrderItem])
  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    onDelete: "CASCADE",
  })
  orderItems: OrderItem[];

  async updateTotalAmount(
    orderId: string,
    transactionalEntityManager: EntityManager
  ): Promise<Order> {
    try {
      let order = await transactionalEntityManager.findOne(Order, {
        where: { id: orderId },
        relations: ["user", "orderItems"],
      });
      order!.totalAmount = 0;
      order!.totalAmount = order!.orderItems!.reduce(
        (total, item) =>
          total + parseFloat(item.totalPrice as unknown as string),
        0
      );
      order!.totalAmount += parseFloat(order?.deliveryFee as unknown as string);

      return await transactionalEntityManager.save(order!);
    } catch (error) {
      console.error("Error updating total amount:", error);
      throw error;
    }
  }
}
